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
    const systemPrompt = `你是一位专业的企业信息分析师，需要对两份企业报告进行详细的对比分析。

请按照以下结构进行分析：

## 综合对比分析

### 信息完整性对比
深入分析两份报告在信息覆盖范围上的差异：
- 基础信息完整度对比及其影响
- 详细程度差异的原因分析
- 信息维度缺失的潜在后果
- 不要只描述现象，要分析差异原因和深层含义

### 数据准确性对比
重点关注数据的一致性和准确性，深入挖掘问题：
- 核心数据差异及其严重程度（如注册资本、股东信息、地址等）
- 数据逻辑性检查（如股东比例总和是否等于100%）
- 致命性错误识别和影响分析
- 数据不一致对报告可信度的毁灭性打击
- 分析哪个报告的数据更可靠及原因

### 逻辑性与结构对比
深入分析报告的逻辑结构问题：
- 信息组织方式的优劣对比
- 逻辑流畅性差异及其影响
- 内部逻辑一致性问题（如数据矛盾）
- 结构清晰度对理解的影响

### 专业性与表述对比
具体评估报告的专业水准差异：
- 具体指出哪些表述更专业，哪些存在问题
- 专业术语使用的准确性对比
- 表述可能带来的歧义或不严谨问题
- 格式规范性差异及其影响

**重要要求：**
- 绝对不要在开头给出"差异0.0%"或"报告相同"等错误结论
- 必须深入分析差异原因、潜在影响、深层含义，不要停留在表面描述
- 重点突出关键矛盾和致命差异
- 给出客观的分析结论，不要包含评分或优化建议`;

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
    const recommendationsPrompt = `基于前面的分析结果和硬性指标对比，请给出聚焦且有价值的报告优化建议。

**优化建议要求：**
1. **优先级明确**：明确指出最紧急、最重要的改进点（如数据核实）
2. **聚焦核心问题**：重点解决当前发现的关键差异和错误，不要偏离核心目标
3. **具体可操作**：提供详细的操作步骤，如建议具体的数据来源验证方法
4. **避免宏大建议**：不要提出"案例分析"、"用户反馈机制"等过于宏大的建议
5. **分类建议**：按紧急程度分类（立即修正、短期改进、长期完善）

请重点关注：
- 数据不一致问题的解决方案
- 逻辑错误的修正建议  
- 表述规范性改进
- 信息完整性提升

提供实用且聚焦的改进建议，避免泛泛而谈。`;

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