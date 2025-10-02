/*
  # Add Exercise and Activity Tracking
  
  1. New Tables
    - `exercise_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `activity_type` (varchar) - type of exercise
      - `duration_minutes` (integer) - how long the exercise lasted
      - `calories_burned` (integer) - estimated calories burned
      - `intensity` (varchar) - light, moderate, vigorous
      - `distance_km` (numeric) - optional distance for activities like walking/running
      - `logged_at` (timestamptz) - when the activity occurred
      - `notes` (text) - additional notes
      - `source` (varchar) - manual, fitbit, apple_watch, etc.
      - `created_at` (timestamptz)
    
    - `body_measurements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `chest_cm` (numeric)
      - `waist_cm` (numeric)
      - `hips_cm` (numeric)
      - `thigh_cm` (numeric)
      - `arm_cm` (numeric)
      - `neck_cm` (numeric)
      - `measured_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own records
*/

CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  activity_type varchar(100) NOT NULL,
  duration_minutes integer NOT NULL,
  calories_burned integer DEFAULT 0,
  intensity varchar(20) DEFAULT 'moderate',
  distance_km numeric(6,2),
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  source varchar(50) DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, logged_at DESC);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise logs"
  ON exercise_logs FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own exercise logs"
  ON exercise_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own exercise logs"
  ON exercise_logs FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own exercise logs"
  ON exercise_logs FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chest_cm numeric(5,2),
  waist_cm numeric(5,2),
  hips_cm numeric(5,2),
  thigh_cm numeric(5,2),
  arm_cm numeric(5,2),
  neck_cm numeric(5,2),
  measured_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measured_at DESC);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body measurements"
  ON body_measurements FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own body measurements"
  ON body_measurements FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own body measurements"
  ON body_measurements FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own body measurements"
  ON body_measurements FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
