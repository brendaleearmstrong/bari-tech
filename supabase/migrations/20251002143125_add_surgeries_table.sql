/*
  # Add Surgeries Table for Multiple Surgery Tracking
  
  1. New Tables
    - `surgeries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `surgery_type` (varchar) - type of bariatric surgery
      - `surgery_date` (date) - when surgery was performed
      - `pre_surgery_weight_kg` (numeric) - weight before this surgery
      - `is_primary` (boolean) - whether this is the primary/first surgery
      - `is_revision` (boolean) - whether this is a revision surgery
      - `notes` (text) - additional notes about the surgery
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `surgeries` table
    - Add policies for authenticated users to manage their own surgery records
  
  3. Notes
    - Allows users to track multiple surgeries over time
    - Maintains backward compatibility with existing surgery_type and surgery_date fields in users table
    - Users can designate one surgery as primary for dashboard display
*/

CREATE TABLE IF NOT EXISTS surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  surgery_type varchar(100) NOT NULL,
  surgery_date date NOT NULL,
  pre_surgery_weight_kg numeric(5,2),
  is_primary boolean DEFAULT false,
  is_revision boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgeries_user_id ON surgeries(user_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_user_date ON surgeries(user_id, surgery_date DESC);

ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own surgeries"
  ON surgeries FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own surgeries"
  ON surgeries FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own surgeries"
  ON surgeries FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own surgeries"
  ON surgeries FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
