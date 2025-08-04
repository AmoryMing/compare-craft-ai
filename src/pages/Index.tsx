import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportUploader } from "@/components/ReportUploader";
import { ComparisonResults } from "@/components/ComparisonResults";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const Index = () => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleReportsUploaded = async (report1: string, report2: string, customPrompt?: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('compare-reports', {
        body: { report1, report2, customPrompt }
      });

      if (error) {
        throw error;
      }

      setResults(data);
      toast({
        title: "分析完成",
        description: "报告对比分析已完成，请查看结果。",
      });
    } catch (error) {
      console.error('Error comparing reports:', error);
      toast({
        title: "分析失败",
        description: "报告对比分析失败，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {results ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                onClick={handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                返回上传页面
              </Button>
            </div>
            <ComparisonResults results={results} />
          </div>
        ) : (
          <ReportUploader 
            onReportsUploaded={handleReportsUploaded}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
