import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, FileText, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportUploaderProps {
  onReportsUploaded: (report1: string, report2: string, customPrompt?: string, report1Name?: string, report2Name?: string) => void;
  isLoading: boolean;
}

export const ReportUploader = ({ onReportsUploaded, isLoading }: ReportUploaderProps) => {
  const [report1, setReport1] = useState("");
  const [report2, setReport2] = useState("");
  const [report1Name, setReport1Name] = useState("报告 1");
  const [report2Name, setReport2Name] = useState("报告 2");
  const [customPrompt, setCustomPrompt] = useState("");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, setReport: (content: string) => void) => {
    try {
      const fileContent = await file.text();
      setReport(fileContent);
      toast({
        title: "文件上传成功",
        description: `${file.name} 已成功读取`,
      });
    } catch (error) {
      toast({
        title: "文件读取失败",
        description: "请确保文件是文本格式",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = () => {
    if (report1.trim() && report2.trim()) {
      onReportsUploaded(report1, report2, customPrompt || undefined, report1Name, report2Name);
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
              第一份报告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">报告名称</label>
              <Input
                placeholder="输入报告名称"
                value={report1Name}
                onChange={(e) => setReport1Name(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">上传文件</label>
              <div className="mt-1">
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFile1(file);
                      handleFileUpload(file, setReport1);
                    }
                  }}
                  className="hidden"
                  id="file1"
                />
                <label
                  htmlFor="file1"
                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="text-center">
                    <File className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {file1 ? file1.name : "点击上传文件或拖拽到此处"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">或直接粘贴内容</label>
              <Textarea
                placeholder="也可以直接粘贴报告内容..."
                value={report1}
                onChange={(e) => setReport1(e.target.value)}
                className="mt-1 min-h-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              第二份报告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">报告名称</label>
              <Input
                placeholder="输入报告名称"
                value={report2Name}
                onChange={(e) => setReport2Name(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">上传文件</label>
              <div className="mt-1">
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFile2(file);
                      handleFileUpload(file, setReport2);
                    }
                  }}
                  className="hidden"
                  id="file2"
                />
                <label
                  htmlFor="file2"
                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="text-center">
                    <File className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {file2 ? file2.name : "点击上传文件或拖拽到此处"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">或直接粘贴内容</label>
              <Textarea
                placeholder="也可以直接粘贴报告内容..."
                value={report2}
                onChange={(e) => setReport2(e.target.value)}
                className="mt-1 min-h-[200px]"
              />
            </div>
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