-- M2: helpful index + optional consent method tracking
create index if not exists idx_interviews_session_id on interviews (session_id);

alter table interviews
  add column if not exists consent_method text;  -- 'ui' | 'voice' (text to keep it simple)
