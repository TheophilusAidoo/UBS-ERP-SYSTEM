-- Create storage bucket for company assets (logos)
-- This script creates a public bucket for storing company logos

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true, -- Public bucket
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access for company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company-assets" ON storage.objects;

-- Policy: Allow public read access
CREATE POLICY "Public Access for company-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to company-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update company-assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete company-assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated'
);

