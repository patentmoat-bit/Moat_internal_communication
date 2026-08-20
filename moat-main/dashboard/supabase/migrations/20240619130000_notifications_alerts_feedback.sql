-- ============================================================
-- Notifications Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255)  NOT NULL,
    description TEXT,
    type        VARCHAR(64)   NOT NULL DEFAULT 'system',
    priority    VARCHAR(32)   NOT NULL DEFAULT 'normal',
    created_by  VARCHAR(255),
    receiver    VARCHAR(255),
    is_read     BOOLEAN       NOT NULL DEFAULT false,
    is_archived BOOLEAN       NOT NULL DEFAULT false,
    metadata    JSONB,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver   ON public.notifications(receiver);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- Alerts Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255)  NOT NULL,
    description TEXT,
    type        VARCHAR(64)   NOT NULL DEFAULT 'system',
    priority    VARCHAR(32)   NOT NULL DEFAULT 'normal',
    status      VARCHAR(64)   NOT NULL DEFAULT 'open',
    assigned_to VARCHAR(255),
    created_by  VARCHAR(255),
    approved_by VARCHAR(255),
    rejected_by VARCHAR(255),
    comments    JSONB         NOT NULL DEFAULT '[]',
    history     JSONB         NOT NULL DEFAULT '[]',
    metadata    JSONB,
    due_date    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status     ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_type       ON public.alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority   ON public.alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- ============================================================
-- Feedback Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255)  NOT NULL,
    body        TEXT,
    body_html   TEXT,
    status      VARCHAR(64)   NOT NULL DEFAULT 'open',
    created_by  VARCHAR(255),
    mentions    JSONB         NOT NULL DEFAULT '[]',
    attachments JSONB         NOT NULL DEFAULT '[]',
    urls        JSONB         NOT NULL DEFAULT '[]',
    versions    JSONB         NOT NULL DEFAULT '[]',
    is_deleted  BOOLEAN       NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status     ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_by ON public.feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
