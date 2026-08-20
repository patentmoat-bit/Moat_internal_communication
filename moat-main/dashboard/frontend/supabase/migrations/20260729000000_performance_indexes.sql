-- ============================================================================
-- MOAT — PERFORMANCE OPTIMIZATION INDEXES
-- Adds indexes to frequently queried fields for faster dashboard and API response times.
-- Covers commonly queried fields: user_id, status, dates, etc.
-- ============================================================================

-- Inventions Table Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventions_status ON public.inventions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventions_created_at ON public.inventions(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventions_updated_at ON public.inventions(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventions_user_id ON public.inventions(user_id);

-- Prior Art Results Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prior_art_patent_number ON public.prior_art_results(patent_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prior_art_filing_date ON public.prior_art_results(filing_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prior_art_created_at ON public.prior_art_results(created_at DESC);

-- Activity Logs (Notifications/Audit) Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Alerts Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_is_active ON public.alerts(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- Audit Logs Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
