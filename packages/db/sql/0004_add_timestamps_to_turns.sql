-- 0004_add_timestamps_to_turns.sql
-- Add created_at and updated_at columns to turns

ALTER TABLE turns
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_turns_updated_at ON turns;

CREATE TRIGGER update_turns_updated_at
BEFORE UPDATE ON turns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
