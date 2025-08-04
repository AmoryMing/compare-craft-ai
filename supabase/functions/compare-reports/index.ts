import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparisonRequest {
  report1: string;
  report2: string;
  customPrompt?: string;
}

interface HardMetrics {
  wordCount: {
    report1: number;
    report2: number;
  };
  moduleComparison: {
    module: string;
    report1: boolean;
    report2: boolean;
  }[];
  dataValidation: {
    dataPoint: string;
    report1: boolean;
    report2: boolean;
  }[];
  dimensionScores: {
    fieldSelection: {
      report1: number;
      report2: number;
    };
    informationUsage: {
      report1: number;
      report2: number;
    };
    logicalReasonableness: {
      report1: number;
      report2: number;
    };
    clarityStructure: {
      report1: number;
      report2: number;
    };
    languageQuality: {
      report1: number;
      report2: number;
    };
    totalScore: {
      report1: number;
      report2: number;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report1, report2, customPrompt }: ComparisonRequest = await req.json();

    // System prompt for comprehensive analysis
    const systemPrompt = `系统提示词：企业调研报告评估规则

你现在是 **企业调研报告的专业评估师**，需严格按照以下 **《企业调研报告质量与来源评估标准》**，对 中文企业调研报告 进行评分（特别用于对比 「规则提取字段生成报告」 和 「大模型自主选择字段生成报告」 的优劣）。评分需覆盖 **5大维度**，总权重100分，流程如下：

▶ 核心任务：
1. 逐项打分：对每份报告，按5个维度的标准逐项判断，给出对应分数；
2. 对比分析：基于两份报告的得分，总结二者在"字段选择、逻辑、语言"等维度的长短，明确优劣差异；
3. 输出结论：结合评分，给出"哪类报告更优（或各有优势）"的判断，以及优化建议。

▶ 评分维度与规则（共5项，合计100分）：

1. 字段选择合理性（相关性+全面性）- 20分
✔ 需覆盖 企业概况、历史、主营业务、财务、管理层/股东、品牌资质、风险信用 等关键领域。
▸ 高分（17–20）：字段全、无遗漏，完美匹配企业核心信息；
▸ 中等（9–16）：覆盖主要领域，但有轻微缺失；
▸ 低分（0–8）：缺关键信息，或堆砌无关内容。

2. 信息运用与来源引用 - 20分
✔ 关键数据需 **融入论述+明确标注来源**（如"根据XX数据，企业营收增长30%"）。
▸ 高分（17–20）：数据用得准、来源清，支撑论点强；
▸ 中等（9–16）：主要数据有引用，运用较合理；
▸ 低分（0–8）：数据没用好，或来源模糊/错误。

3. 逻辑合理性 - 20分
✔ 论点→论据→结论 **连贯自洽**（如"财务数据差→推导风险高"逻辑链完整）。
▸ 高分（17–20）：通篇逻辑严密，论证无漏洞；
▸ 中等（9–16）：逻辑基本通顺，有少量跳跃；
▸ 低分（0–8）：逻辑混乱，或结论与论据矛盾。

4. 清晰度与条理性 - 20分
✔ 结构分层清晰（如"一级标题→二级模块"），行文好懂。
▸ 高分（17–20）：结构明、条理顺，读者秒懂；
▸ 中等（9–16）：能看懂，但结构/表述有优化空间；
▸ 低分（0–8）：结构混乱，读起来费劲。

5. 语言质量与语气 - 20分
✔ 语言 **准确、专业、流畅**（符合企业报告正式 tone，无歧义）。
▸ 高分（17–20）：文字流畅，专业又好读；
▸ 中等（9–16）：基本通顺，偶有表述瑕疵；
▸ 低分（0–8）：语言差，影响内容理解。

▶ 输出要求：
1. 总分计算：5个维度得分相加（满分100）；
2. 对比重点：明确 规则生成报告 vs 大模型生成报告 在每个维度的表现差异；
3. 结论格式：
【对比结论】：A在XX维度更优，B在XX维度更突出；整体XX更胜一筹，但XX可借鉴对方的XX优点。

请按照以上标准进行专业评估。`;

    const userPrompt = customPrompt || "请对比这两份报告，分析它们的差异和优劣。";

    // First API call: Comprehensive analysis
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userPrompt}\n\n报告1：\n${report1}\n\n报告2：\n${report2}` }
        ],
        temperature: 0.3,
      }),
    });

    const analysisData = await analysisResponse.json();
    const comprehensiveAnalysis = analysisData.choices[0].message.content;

    // Second API call: Hard metrics extraction
    const metricsPrompt = `请按照企业调研报告评估规则，提取以下硬性指标，以JSON格式返回：

1. 字数统计：{"wordCount": {"report1": 数字, "report2": 数字}}

2. 模块/字段来源对比：{"moduleComparison": [{"module": "模块名", "report1": true/false, "report2": true/false}]}
   请检查是否包含：企业概况、历史、主营业务、财务、管理层/股东、品牌资质、风险信用等关键领域

3. 数据验证对比：{"dataValidation": [{"dataPoint": "数据点", "report1": true/false, "report2": true/false}]}
   请检查关键数据是否有明确来源引用和正确运用

4. 维度评分对比：{"dimensionScores": {
   "fieldSelection": {"report1": 分数(0-20), "report2": 分数(0-20)},
   "informationUsage": {"report1": 分数(0-20), "report2": 分数(0-20)},
   "logicalReasonableness": {"report1": 分数(0-20), "report2": 分数(0-20)},
   "clarityStructure": {"report1": 分数(0-20), "report2": 分数(0-20)},
   "languageQuality": {"report1": 分数(0-20), "report2": 分数(0-20)},
   "totalScore": {"report1": 总分(0-100), "report2": 总分(0-100)}
}}

请严格按照企业调研报告评估标准进行评分，并返回完整的JSON对象。`;

    const metricsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是一个数据分析专家，请严格按照JSON格式返回分析结果。' },
          { role: 'user', content: `${metricsPrompt}\n\n报告1：\n${report1}\n\n报告2：\n${report2}` }
        ],
        temperature: 0.1,
      }),
    });

    const metricsData = await metricsResponse.json();
    let hardMetrics: HardMetrics;
    
    try {
      const metricsText = metricsData.choices[0].message.content;
      const jsonMatch = metricsText.match(/\{[\s\S]*\}/);
      hardMetrics = JSON.parse(jsonMatch ? jsonMatch[0] : metricsText);
    } catch (error) {
      console.error('Error parsing metrics JSON:', error);
      // Fallback metrics
      hardMetrics = {
        wordCount: {
          report1: report1.length,
          report2: report2.length
        },
        moduleComparison: [],
        dataValidation: [],
        dimensionScores: {
          fieldSelection: { report1: 0, report2: 0 },
          informationUsage: { report1: 0, report2: 0 },
          logicalReasonableness: { report1: 0, report2: 0 },
          clarityStructure: { report1: 0, report2: 0 },
          languageQuality: { report1: 0, report2: 0 },
          totalScore: { report1: 0, report2: 0 }
        }
      };
    }

    // Third API call: Optimization recommendations
    const recommendationsPrompt = `基于前面的分析，请给出有用户价值的报告优化建议。
考虑到报告的优劣对比，如果一份报告胜出，也要考虑另一份报告的可取之处。
请提供具体、可操作的改进建议。`;

    const recommendationsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是一个报告优化专家，请提供实用的改进建议。' },
          { role: 'user', content: `${recommendationsPrompt}\n\n分析结果：${comprehensiveAnalysis}\n\n硬性指标：${JSON.stringify(hardMetrics)}` }
        ],
        temperature: 0.4,
      }),
    });

    const recommendationsData = await recommendationsResponse.json();
    const optimizationRecommendations = recommendationsData.choices[0].message.content;

    return new Response(JSON.stringify({
      comprehensiveAnalysis,
      hardMetrics,
      optimizationRecommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compare-reports function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});