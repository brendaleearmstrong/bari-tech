/*
  # Update Daily Summaries Table

  1. Changes
    - Add supplement tracking columns to daily_summaries
*/

-- Add supplement columns to daily_summaries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_summaries' AND column_name = 'supplements_taken'
  ) THEN
    ALTER TABLE daily_summaries ADD COLUMN supplements_taken INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_summaries' AND column_name = 'supplements_scheduled'
  ) THEN
    ALTER TABLE daily_summaries ADD COLUMN supplements_scheduled INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_summaries' AND column_name = 'supplements_compliance'
  ) THEN
    ALTER TABLE daily_summaries ADD COLUMN supplements_compliance DECIMAL(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_summaries' AND column_name = 'phase_compliance'
  ) THEN
    ALTER TABLE daily_summaries ADD COLUMN phase_compliance DECIMAL(5,2) DEFAULT 0;
  END IF;
END $$;