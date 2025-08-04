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
    report1Value: string | number;
    report2Value: string | number;
    status: 'correct' | 'incorrect' | 'suspicious';
    reason: string;
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
    const systemPrompt = `你是企业调研报告的专业分析师，请对两份报告进行深入的对比分析。

请重点关注以下方面：
1. 信息完整性：两份报告在内容覆盖的广度和深度上的差异
2. 数据准确性：关键数据的一致性和可信度对比
3. 逻辑性：论证逻辑的严密性和合理性
4. 结构清晰度：组织结构和表述的清晰程度
5. 专业性：语言表达的专业水准

请提供客观的对比分析和结论，不要包含任何评分或优化建议。`;

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

2. 模块/字段来源对比：{"moduleComparison": [{"module": "具体字段内容或引用来源", "report1": true/false, "report2": true/false}]}
   请提取两份报告中出现的具体字段内容和引用来源，如"注册资本：1000万元"、"数据来源：企查查"等具体表述
   注意：只列出两份报告中至少有一份包含的具体内容（两份报告内容的并集），不应该出现两份报告都不包含的内容

3. 数字数据验证对比：{"dataValidation": [{"dataPoint": "数据点名称", "report1Value": "报告1中的具体数值", "report2Value": "报告2中的具体数值", "status": "correct/incorrect/suspicious", "reason": "判断理由详细说明"}]}
   专注于数字数据的对比验证，如注册资本、营收、员工数、成立时间等关键数字信息。
   验证逻辑：
   - 首先比较两份报告中相同数据点的数值是否一致
   - 如果数值不同，分析哪个更可能正确（基于逻辑合理性、数据来源、时间一致性等）
   - status说明：correct=数据一致或明确正确，incorrect=明确错误，suspicious=存疑需进一步核实
   - reason需要详细说明判断依据，如"两份报告数据一致"、"报告1数据明显不合理（如员工数为负数）"、"报告2缺乏数据来源"等

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