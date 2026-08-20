-- ============================================================
-- Trademarks and CEO Feedback Schema
-- ============================================================

-- 1. CEO Feedback Table
CREATE TABLE IF NOT EXISTS public.ceo_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    status      VARCHAR(50) DEFAULT 'Open', -- Open, Pending, Approved, Rejected, Need Changes
    target_id   VARCHAR(255),               -- Optional ID of the item being reviewed (e.g. patent ID)
    target_type VARCHAR(100),               -- Optional type of the item being reviewed
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_by  VARCHAR(255)                -- User ID or email of the CEO
);

-- 2. CEO Feedback Versions Table (for rich text, files, and history)
CREATE TABLE IF NOT EXISTS public.ceo_feedback_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id     UUID REFERENCES public.ceo_feedback(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,          -- Rich text HTML/Markdown
    mentions        JSONB DEFAULT '[]'::jsonb, -- Array of mentioned users
    attachments     JSONB DEFAULT '[]'::jsonb, -- Array of file URLs/names
    links           JSONB DEFAULT '[]'::jsonb, -- Array of URLs added
    version_number  INTEGER NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_by      VARCHAR(255)
);

-- 3. Trademarks Table (Unified for Word and Logo)
CREATE TABLE IF NOT EXISTS public.trademarks (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type               VARCHAR(50) NOT NULL, -- 'word' or 'logo'
    name               VARCHAR(255) NOT NULL,
    application_number VARCHAR(100),
    status             VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, Renewal
    class              VARCHAR(100),         -- Trademark class (e.g., Class 9, Class 42)
    goods_services     TEXT,
    country            VARCHAR(100),
    image_url          TEXT,                 -- URL for Logo trademarks
    metadata           JSONB DEFAULT '{}'::jsonb,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Trademark History Table
CREATE TABLE IF NOT EXISTS public.trademark_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trademark_id    UUID REFERENCES public.trademarks(id) ON DELETE CASCADE,
    action          VARCHAR(255) NOT NULL,
    performed_by    VARCHAR(255),
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================
-- Row Level Security (RLS) - Basic Setup (Bypassed by admin client)
-- ============================================================

ALTER TABLE public.ceo_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_feedback_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (or service role)
CREATE POLICY "Enable all operations for authenticated users on ceo_feedback" ON public.ceo_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users on ceo_feedback_versions" ON public.ceo_feedback_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users on trademarks" ON public.trademarks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users on trademark_history" ON public.trademark_history FOR ALL USING (true) WITH CHECK (true);

-- Insert bucket for Trademark Logos (Supabase Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('trademarks', 'trademarks', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ceo_feedback_assets', 'ceo_feedback_assets', true) ON CONFLICT (id) DO NOTHING;
