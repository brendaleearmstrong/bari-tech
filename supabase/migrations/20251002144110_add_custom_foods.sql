/*
  # Add Custom Foods Support
  
  1. New Tables
    - `custom_foods`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `food_name` (varchar) - name of the custom food
      - `description` (text) - optional description
      - `serving_size` (varchar) - e.g., "1 cup", "100g"
      - `protein_g` (numeric) - protein per serving
      - `calories` (numeric) - calories per serving
      - `carbs_g` (numeric) - carbs per serving
      - `fat_g` (numeric) - fat per serving
      - `fiber_g` (numeric) - fiber per serving
      - `is_favorite` (boolean) - if user marked as favorite
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to meal_entries
    - Add `food_name` column to store the name of what was eaten
    - Add `portion_size` column to track serving size
    - Add `custom_food_id` to reference custom foods
  
  3. Security
    - Enable RLS on custom_foods table
    - Add policies for authenticated users to manage their own custom foods
*/

CREATE TABLE IF NOT EXISTS custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  food_name varchar(200) NOT NULL,
  description text,
  serving_size varchar(100) DEFAULT '1 serving',
  protein_g numeric(6,2) DEFAULT 0,
  calories numeric(6,2) DEFAULT 0,
  carbs_g numeric(6,2) DEFAULT 0,
  fat_g numeric(6,2) DEFAULT 0,
  fiber_g numeric(6,2) DEFAULT 0,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_foods_user_id ON custom_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_foods_user_name ON custom_foods(user_id, food_name);

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom foods"
  ON custom_foods FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own custom foods"
  ON custom_foods FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own custom foods"
  ON custom_foods FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own custom foods"
  ON custom_foods FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_entries' AND column_name = 'food_name'
  ) THEN
    ALTER TABLE meal_entries ADD COLUMN food_name varchar(200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_entries' AND column_name = 'portion_size'
  ) THEN
    ALTER TABLE meal_entries ADD COLUMN portion_size varchar(100) DEFAULT '1 serving';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_entries' AND column_name = 'custom_food_id'
  ) THEN
    ALTER TABLE meal_entries ADD COLUMN custom_food_id uuid REFERENCES custom_foods(id) ON DELETE SET NULL;
  END IF;
END $$;
