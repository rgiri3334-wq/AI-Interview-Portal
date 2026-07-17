-- Supabase / PostgreSQL Migration
-- Adds admin_termination_reason column to interview_sessions

ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS admin_termination_reason VARCHAR DEFAULT NULL;
