-- Phase 24: CEO Approvals Workflow Enhancements

-- Add new columns for CEO dashboard filtering and display
ALTER TABLE public.patent_documents 
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'Normal';

-- Ensure the review_comments table allows 'CEO' as a role
-- (This is just a conceptual note, as the 'role' column is a generic VARCHAR, so it naturally accepts 'CEO')

-- We also want to ensure any RLS policies natively inherit access to these new columns.
-- Since the table already has "Allow authenticated full access to patent_documents",
-- it automatically covers the new columns.
