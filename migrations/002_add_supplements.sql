/*
  # Add Supplements Tables

  1. New Tables
    - `supplements` - User supplement schedules
    - `supplement_logs` - Supplement intake tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Supplements table
CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dose VARCHAR(100),
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'daily',
  schedule_times TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reminder_enabled BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id);

-- Supplement logs table
CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID REFERENCES supplements(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplement_logs_supplement ON supplement_logs(supplement_id, scheduled_time DESC);

-- Enable RLS
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplements
CREATE POLICY "Users can view own supplements"
  ON supplements FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own supplements"
  ON supplements FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own supplements"
  ON supplements FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own supplements"
  ON supplements FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for supplement_logs
CREATE POLICY "Users can view own supplement logs"
  ON supplement_logs FOR SELECT
  TO authenticated
  USING (supplement_id IN (SELECT id FROM supplements WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert own supplement logs"
  ON supplement_logs FOR INSERT
  TO authenticated
  WITH CHECK (supplement_id IN (SELECT id FROM supplements WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can update own supplement logs"
  ON supplement_logs FOR UPDATE
  TO authenticated
  USING (supplement_id IN (SELECT id FROM supplements WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())))
  WITH CHECK (supplement_id IN (SELECT id FROM supplements WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));
