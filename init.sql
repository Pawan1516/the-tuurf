-- Initialize PostgreSQL database for The Turf
-- This file runs automatically when PostgreSQL starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas (optional, for organization)
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS logs;

-- Log table for tracking changes
CREATE TABLE IF NOT EXISTS logs.audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255),
  operation VARCHAR(20),
  record_id VARCHAR(255),
  changed_data JSONB,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON logs.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON logs.audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON logs.audit_log(operation);

-- Confirm setup
SELECT 'PostgreSQL initialization complete' as status;
