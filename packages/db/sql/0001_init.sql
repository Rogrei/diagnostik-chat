-- packages/db/sql/0001_init.sql
-- Migration 0001: Init schema for Diagnostik-chat

-- Skapa tabell för intervjuer
create table if not exists interviews (
    id uuid primary key default gen_random_uuid(),
    session_id text not null,
    customer_name text not null,
    company text,
    consent_at timestamptz,
    started_at timestamptz default now(),
    ended_at timestamptz,
    status text default 'created',
    notes text
);

-- Index för snabbare sökning på session_id
create index if not exists idx_interviews_session_id
    on interviews (session_id);

-- Index för status
create index if not exists idx_interviews_status
    on interviews (status);
