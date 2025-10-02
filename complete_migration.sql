/*
  # Initial BariTech Schema - Core Tables

  1. New Tables
    - `users` - Patient profiles
    - `meal_directory` - Curated meals catalog
    - `meal_entries` - User meal logs
    - `meal_items` - Individual food items
    - `weight_entries` - Weight tracking
    - `water_logs` - Hydration tracking
    - `phases` - Surgery phases
    - `daily_summaries` - Daily aggregated metrics

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  dob DATE,
  gender VARCHAR(20),
  height_cm DECIMAL(5,2),
  baseline_weight_kg DECIMAL(5,2),
  current_weight_kg DECIMAL(5,2),
  surgery_date DATE,
  surgery_type VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  consent_image_training BOOLEAN DEFAULT false,
  consent_clinic_sharing BOOLEAN DEFAULT false,
  consent_conversation_logging BOOLEAN DEFAULT true,
  consent_anonymized_research BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Phases table
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phase_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_offset_start INTEGER,
  day_offset_end INTEGER,
  rules JSONB DEFAULT '{"allowed_tags": [], "forbidden_tags": [], "max_portion_ml": 250}'::jsonb,
  protein_target_g INTEGER DEFAULT 60,
  fluid_target_ml INTEGER DEFAULT 1800,
  calories_target INTEGER,
  clinician_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phases_user ON phases(user_id, start_date DESC);

-- Meal directory table
CREATE TABLE IF NOT EXISTS meal_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_tags TEXT[] NOT NULL DEFAULT '{}',
  ingredients JSONB DEFAULT '[]'::jsonb,
  default_portion_size DECIMAL(6,2) NOT NULL,
  portion_unit VARCHAR(20) NOT NULL DEFAULT 'g',
  protein_g_per_portion DECIMAL(5,2) NOT NULL,
  calories_per_portion INTEGER NOT NULL,
  fat_g DECIMAL(5,2) DEFAULT 0,
  carbs_g DECIMAL(5,2) DEFAULT 0,
  fiber_g DECIMAL(5,2) DEFAULT 0,
  allergens TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  prep_instructions TEXT,
  prep_time_minutes INTEGER,
  image_urls TEXT[] DEFAULT '{}',
  clinician_approved BOOLEAN DEFAULT false,
  source VARCHAR(50) DEFAULT 'curated',
  locale VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_phase_tags ON meal_directory USING GIN(phase_tags);
CREATE INDEX IF NOT EXISTS idx_meal_tags ON meal_directory USING GIN(tags);

-- Meal entries table
CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase_id UUID REFERENCES phases(id),
  meal_type VARCHAR(50),
  total_protein_g DECIMAL(6,2) DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  total_carbs_g DECIMAL(6,2) DEFAULT 0,
  total_fat_g DECIMAL(6,2) DEFAULT 0,
  total_fiber_g DECIMAL(6,2) DEFAULT 0,
  source VARCHAR(50) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID REFERENCES meal_entries(id) ON DELETE CASCADE,
  meal_directory_id UUID REFERENCES meal_directory(id),
  custom_name VARCHAR(255),
  quantity DECIMAL(6,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  protein_g DECIMAL(6,2) NOT NULL,
  calories INTEGER NOT NULL,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,
  fiber_g DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_items_entry ON meal_items(meal_entry_id);

-- Weight entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual',
  bmi DECIMAL(4,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, measured_at DESC);

-- Water logs table
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, logged_at DESC);

-- Daily summaries table
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  protein_consumed_g DECIMAL(6,2) DEFAULT 0,
  protein_target_g INTEGER DEFAULT 0,
  calories_consumed INTEGER DEFAULT 0,
  water_consumed_ml INTEGER DEFAULT 0,
  water_target_ml INTEGER DEFAULT 0,
  meals_logged INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_directory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for meal_directory (public read)
CREATE POLICY "Authenticated users can view meal directory"
  ON meal_directory FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for meal_entries
CREATE POLICY "Users can view own meal entries"
  ON meal_entries FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own meal entries"
  ON meal_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own meal entries"
  ON meal_entries FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own meal entries"
  ON meal_entries FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for meal_items
CREATE POLICY "Users can view own meal items"
  ON meal_items FOR SELECT
  TO authenticated
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert own meal items"
  ON meal_items FOR INSERT
  TO authenticated
  WITH CHECK (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- RLS Policies for water_logs
CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own water logs"
  ON water_logs FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for weight_entries
CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for phases
CREATE POLICY "Users can view own phases"
  ON phases FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own phases"
  ON phases FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for daily_summaries
CREATE POLICY "Users can view own daily summaries"
  ON daily_summaries FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own daily summaries"
  ON daily_summaries FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own daily summaries"
  ON daily_summaries FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
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
