/*
  # Add Weight Goals and Milestones
  
  1. New Tables
    - `weight_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `goal_weight_kg` (numeric) - target weight
      - `goal_date` (date) - when they want to reach this goal
      - `is_active` (boolean) - whether this is the current goal
      - `achieved_at` (timestamptz) - when goal was reached
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `weight_milestones`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `milestone_type` (varchar) - e.g., '10kg_lost', '25kg_lost', 'halfway', 'goal_reached'
      - `milestone_weight_kg` (numeric) - weight at which milestone occurred
      - `achieved_at` (timestamptz)
      - `title` (varchar) - milestone title
      - `description` (text)
      - `created_at` (timestamptz)
  
  2. Changes to users table
    - Add `goal_weight_kg` column if not exists
  
  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  goal_weight_kg numeric(5,2) NOT NULL,
  goal_date date,
  is_active boolean DEFAULT true,
  achieved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_goals_user_id ON weight_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_active ON weight_goals(user_id, is_active);

ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight goals"
  ON weight_goals FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight goals"
  ON weight_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own weight goals"
  ON weight_goals FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own weight goals"
  ON weight_goals FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS weight_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  milestone_type varchar(50) NOT NULL,
  milestone_weight_kg numeric(5,2) NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  title varchar(200) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_milestones_user_id ON weight_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_milestones_date ON weight_milestones(user_id, achieved_at DESC);

ALTER TABLE weight_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight milestones"
  ON weight_milestones FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight milestones"
  ON weight_milestones FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own weight milestones"
  ON weight_milestones FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own weight milestones"
  ON weight_milestones FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'goal_weight_kg'
  ) THEN
    ALTER TABLE users ADD COLUMN goal_weight_kg numeric(5,2);
  END IF;
END $$;
