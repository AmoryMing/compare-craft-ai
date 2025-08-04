import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, BarChart3, FileText, Lightbulb } from "lucide-react";

interface ComparisonResultsProps {
  results: {
    comprehensiveAnalysis: string;
    hardMetrics: {
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
        report1: string;
        report2: string;
        isConsistent: boolean;
        possibleError: string;
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
    };
    optimizationRecommendations: string;
  };
  reportNames: {
    report1: string;
    report2: string;
  };
}

export const ComparisonResults = ({ results, reportNames }: ComparisonResultsProps) => {
  const { comprehensiveAnalysis, hardMetrics, optimizationRecommendations } = results;

  // 计算差异百分比和比较结果
  const wordCount1 = hardMetrics.wordCount.report1;
  const wordCount2 = hardMetrics.wordCount.report2;
  const diffPercentage = Math.abs(((wordCount1 - wordCount2) / Math.max(wordCount1, wordCount2)) * 100).toFixed(1);
  const comparisonSymbol = wordCount1 > wordCount2 ? '>' : wordCount1 < wordCount2 ? '<' : '=';
  const higherReport = wordCount1 > wordCount2 ? reportNames.report1 : reportNames.report2;
  const lowerReport = wordCount1 > wordCount2 ? reportNames.report2 : reportNames.report1;

  return (
    <div className="space-y-6">
      {/* 对比结论 */}
      <Card>
        <CardContent className="pt-6">
          <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
            <div className="text-lg font-medium text-foreground">
              两份报告差异 <span className="text-primary font-bold">{diffPercentage}%</span>，
              {comparisonSymbol === '=' ? (
                <span className="mx-1">{higherReport} <span className="text-primary font-bold">=</span> {lowerReport}</span>
              ) : (
                <span className="mx-1">{higherReport} <span className="text-primary font-bold">{comparisonSymbol}</span> {lowerReport}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 综合分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            综合对比分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-foreground">
              {comprehensiveAnalysis}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 硬性指标对比 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            硬性指标对比
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 字数对比 */}
          <div>
            <h4 className="font-semibold mb-3">字数对比</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{hardMetrics.wordCount.report1}</div>
                <div className="text-sm text-muted-foreground">{reportNames.report1} 字数</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{hardMetrics.wordCount.report2}</div>
                <div className="text-sm text-muted-foreground">{reportNames.report2} 字数</div>
              </div>
            </div>
          </div>

          {/* 模块对比 */}
          {hardMetrics.moduleComparison.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">模块/字段来源对比</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模块名称</TableHead>
                    <TableHead className="text-center">{reportNames.report1}</TableHead>
                    <TableHead className="text-center">{reportNames.report2}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hardMetrics.moduleComparison.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.module}</TableCell>
                      <TableCell className="text-center">
                        {item.report1 ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.report2 ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 数据验证对比 */}
          {hardMetrics.dataValidation.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">数据验证对比</h4>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>数据点</TableHead>
                     <TableHead className="text-center">{reportNames.report1}</TableHead>
                     <TableHead className="text-center">{reportNames.report2}</TableHead>
                     <TableHead className="text-center">一致性</TableHead>
                     <TableHead className="text-center">可能错误</TableHead>
                   </TableRow>
                </TableHeader>
                 <TableBody>
                   {hardMetrics.dataValidation.map((item, index) => (
                     <TableRow key={index}>
                       <TableCell className="font-medium">{item.dataPoint}</TableCell>
                       <TableCell className="text-center">
                         <span className="text-sm">{item.report1}</span>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className="text-sm">{item.report2}</span>
                       </TableCell>
                       <TableCell className="text-center">
                         {item.isConsistent ? (
                           <Badge variant="default" className="text-xs">
                             一致
                           </Badge>
                         ) : (
                           <Badge variant="destructive" className="text-xs">
                             不一致
                           </Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-center">
                         {item.possibleError !== 'none' ? (
                           <Badge variant="outline" className="text-xs">
                             {item.possibleError === 'report1' ? reportNames.report1 : 
                              item.possibleError === 'report2' ? reportNames.report2 :
                              item.possibleError === 'both' ? '两者皆可能' : '-'}
                           </Badge>
                         ) : (
                           <span className="text-xs text-muted-foreground">-</span>
                         )}
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 优化建议 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            报告优化建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-foreground">
              {optimizationRecommendations}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};