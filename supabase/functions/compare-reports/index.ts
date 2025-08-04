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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report1, report2, customPrompt }: ComparisonRequest = await req.json();

    // System prompt for comprehensive analysis
    const systemPrompt = `你是一个专业的报告分析专家。请对两份报告进行全面对比分析，包括：
1. 模块使用差异
2. 数据差异  
3. 分析维度差异
4. 结构差异
5. 逻辑差异

请以"一句话结论+详细分析"的形式给出令人信服的优劣对比结论。`;

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
    const metricsPrompt = `请提取以下硬性指标，以JSON格式返回：
1. 字数统计：{"wordCount": {"report1": 数字, "report2": 数字}}
2. 模块/字段来源对比：{"moduleComparison": [{"module": "模块名", "report1": true/false, "report2": true/false}]}
3. 数据验证对比：{"dataValidation": [{"dataPoint": "数据点", "report1": true/false, "report2": true/false}]}

请仔细分析两份报告，提取所有重要模块和数据点。返回完整的JSON对象。`;

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
        dataValidation: []
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