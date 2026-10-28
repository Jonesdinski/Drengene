-- Run in Supabase SQL Editor. Do not make this bucket public.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('lejrbalet','lejrbalet',false,4194304,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- No browser RLS policies are needed: only verified server requests access Storage.
