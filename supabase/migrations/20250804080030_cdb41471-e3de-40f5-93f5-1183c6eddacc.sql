-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Create policies for report uploads
CREATE POLICY "Anyone can upload reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Anyone can view reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reports');

CREATE POLICY "Anyone can update reports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'reports');

CREATE POLICY "Anyone can delete reports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'reports');