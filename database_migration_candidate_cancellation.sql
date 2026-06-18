-- Run this in your Supabase SQL Editor to add the cancellation tracking columns

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR,
ADD COLUMN IF NOT EXISTS status_updated_at VARCHAR;
