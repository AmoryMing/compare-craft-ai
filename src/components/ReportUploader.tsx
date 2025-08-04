import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText } from "lucide-react";

interface ReportUploaderProps {
  onReportsUploaded: (report1: string, report2: string, customPrompt?: string) => void;
  isLoading: boolean;
}

export const ReportUploader = ({ onReportsUploaded, isLoading }: ReportUploaderProps) => {
  const [report1, setReport1] = useState("");
  const [report2, setReport2] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleSubmit = () => {
    if (report1.trim() && report2.trim()) {
      onReportsUploaded(report1, report2, customPrompt || undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">报告对比工具</h1>
        <p className="text-muted-foreground">上传两份报告进行AI智能对比分析</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            自定义提示词
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="输入自定义提示词来调整AI对比行为（可选）"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              报告 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="请粘贴第一份报告内容..."
              value={report1}
              onChange={(e) => setReport1(e.target.value)}
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              报告 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="请粘贴第二份报告内容..."
              value={report2}
              onChange={(e) => setReport2(e.target.value)}
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleSubmit}
          disabled={!report1.trim() || !report2.trim() || isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading ? "正在分析..." : "开始对比分析"}
        </Button>
      </div>
    </div>
  );
};