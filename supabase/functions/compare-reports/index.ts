import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const zhipuApiKey = Deno.env.get('ZHIPU_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Helper function to call AI models with fallback
async function callAIModel(messages: any[], modelConfig = { temperature: 0.3 }) {
  // Try ZhiPu GLM-4.5 first if API key is available
  if (zhipuApiKey) {
    try {
      console.log('Trying ZhiPu GLM-4-Flash...');
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${zhipuApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: messages,
          temperature: modelConfig.temperature,
          max_tokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('ZhiPu GLM-4-Flash response received');
        return data.choices[0].message.content;
      } else {
        const errorText = await response.text();
        console.log(`ZhiPu GLM-4-Flash failed: ${response.status} - ${errorText}`);
        console.log('Falling back to OpenAI...');
      }
    } catch (error) {
      console.error('ZhiPu GLM-4-Flash error:', error);
      console.log('Falling back to OpenAI...');
    }
  }

  // Fallback to OpenAI GPT-4.1
  if (openAIApiKey) {
    console.log('Using OpenAI GPT-4.1...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        temperature: modelConfig.temperature,
        max_tokens: 4000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('OpenAI GPT-4.1 response received');
      return data.choices[0].message.content;
    } else {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API failed: ${response.status}`);
    }
  }

  console.error('No AI API keys available or all APIs failed');
  throw new Error('No AI API keys available or all APIs failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function started, processing request...');
    const { report1, report2, customPrompt }: ComparisonRequest = await req.json();
    console.log('Request parsed successfully');

    // System prompt for comprehensive analysis
    const systemPrompt = `你是一位专业的企业信息分析师，需要对两份企业报告进行详细的对比分析。

请按照以下结构进行分析：

## 综合对比分析

### 信息完整性对比
**分析要求：直接引用原文进行对比，避免空泛陈述**
- 具体引用：用"报告1中提到'[原文内容]'，而报告2中显示'[原文内容]'"的格式
- 重点分析实质性信息差异，如具体数据、关键事实的缺失或不同
- 分析信息缺失对报告使用者决策的具体影响
- 禁止使用"基础信息完整度对比及其影响"等空泛表述

### 数据准确性对比
**优先进行数据逻辑性检查，以具体计算验证为准**
- 股东比例验证：直接计算并显示"报告1：50%+46%+1%=97%（不等于100%，存在逻辑错误）"
- 核心数据对比：逐项列出"注册资本：报告1为97万元，报告2为100万元"
- 引用原文：每个差异点都要标明"如报告1第X段所述'[原文]'"
- 影响分析：基于具体差异分析对报告可信度的实际冲击
- 禁止使用"数据准确性是评估报告可信度的重要因素"等显而易见的陈述

### 逻辑性与结构对比
**从具体例子出发进行分析**
- 引用具体段落：指出"报告1在描述股东结构时出现逻辑矛盾：[具体原文引用]"
- 结构问题举例：具体指出哪个段落的组织方式存在问题
- 避免泛泛而谈的"信息组织方式优劣对比"
- 只保留对报告使用产生实际影响的结构性问题

### 专业性与表述对比
**具体对比表述差异，引用原文**
- 表述对比：直接引用"报告1使用'完成工商登记'，报告2使用'成立于'"
- 专业性问题举例："'怀揣梦想'等表述缺乏专业性"
- 术语准确性：具体指出哪些术语使用不当，如何影响理解
- 避免"语言表达的专业水准"等抽象评价

**强制要求：**
- 每个分析点必须引用具体原文内容作为证据
- 禁止任何"显而易见"的一般性陈述
- 优先分析数据逻辑性问题（如计算验证）
- 从具体例子开始论述，而非抽象概念
- 绝对不要给出"差异0.0%"等错误结论`;

    const userPrompt = customPrompt || "请对比这两份报告，分析它们的差异和优劣。";

    // First API call: Comprehensive analysis
    console.log('Starting comprehensive analysis...');
    const comprehensiveAnalysis = await callAIModel([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${userPrompt}\n\n报告1：\n${report1}\n\n报告2：\n${report2}` }
    ], { temperature: 0.3 });
    console.log('Comprehensive analysis completed');

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

    console.log('Starting metrics extraction...');
    const metricsText = await callAIModel([
      { role: 'system', content: '你是一个数据分析专家，请严格按照JSON格式返回分析结果。' },
      { role: 'user', content: `${metricsPrompt}\n\n报告1：\n${report1}\n\n报告2：\n${report2}` }
    ], { temperature: 0.1 });
    console.log('Metrics extraction completed');
    let hardMetrics: HardMetrics;
    
    try {
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

    console.log('Starting optimization recommendations...');
    const optimizationRecommendations = await callAIModel([
      { role: 'system', content: '你是一个报告优化专家，请提供实用的改进建议。' },
      { role: 'user', content: `${recommendationsPrompt}\n\n分析结果：${comprehensiveAnalysis}\n\n硬性指标：${JSON.stringify(hardMetrics)}` }
    ], { temperature: 0.4 });
    console.log('Optimization recommendations completed');

    console.log('All analysis completed, sending response...');
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