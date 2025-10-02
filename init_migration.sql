/*
  # BariTech - Core Schema

  ## Overview
  Complete database schema for a bariatric surgery patient management application
  with nutrition tracking, AI assistant, phase management, and clinical integration.

  ## 1. New Tables

  ### User Management
  - `users` - Patient profiles with surgery details and preferences
  - `clinicians` - Healthcare provider accounts (Phase 2)
  - `clinics` - Healthcare facilities (Phase 2)

  ### Phase & Progress Tracking
  - `phases` - Bariatric surgery phases (pre-op, clear liquid, pureed, etc.)
  - `weight_entries` - Weight tracking with BMI calculations
  - `daily_summaries` - Aggregated daily nutrition and adherence metrics

  ### Nutrition
  - `meal_directory` - Curated catalog of phase-appropriate meals (500+ items)
  - `meal_entries` - User meal logs with macros
  - `meal_items` - Individual food items within meal entries
  - `water_logs` - Hydration tracking

  ### Supplements & Reminders
  - `supplements` - Supplement schedules (vitamins, minerals)
  - `supplement_logs` - Adherence tracking
  - `reminders` - Scheduled notifications

  ### AI & Images
  - `food_images` - Uploaded food photos with ML analysis
  - `conversations` - AI assistant chat history
  - `conversation_messages` - Individual messages in conversations

  ### Clinical Integration (Phase 2)
  - `care_plans` - Clinician-managed patient plans
  - `clinician_notes` - Provider notes and communications
  - `clinician_patient_access` - Consent-based access control
  - `audit_logs` - Compliance and security audit trail

  ## 2. Security
  - Row Level Security (RLS) enabled on all user-facing tables
  - Policies ensure users only access their own data
  - Clinician access requires explicit patient consent
  - Audit logging for all sensitive operations

  ## 3. Key Features
  - Full-text search on meal directory
  - Automatic BMI calculation triggers
  - Phase-aware meal filtering
  - Consent management for data sharing
  - Comprehensive indexing for performance
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE USER & CLINIC TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

  -- Consent flags
  consent_image_training BOOLEAN DEFAULT false,
  consent_clinic_sharing BOOLEAN DEFAULT false,
  consent_conversation_logging BOOLEAN DEFAULT true,
  consent_anonymized_research BOOLEAN DEFAULT false,

  clinic_id UUID REFERENCES clinics(id),
  onboarding_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);

-- =====================================================
-- PHASES
-- =====================================================

CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phase_type VARCHAR(50) NOT NULL, -- 'pre_op', 'clear_liquid', 'full_liquid', 'pureed', 'soft', 'regular', 'maintenance'
  start_date DATE NOT NULL,
  end_date DATE,
  day_offset_start INTEGER,
  day_offset_end INTEGER,

  -- Phase rules stored as JSONB
  rules JSONB DEFAULT '{"allowed_tags": [], "forbidden_tags": [], "max_portion_ml": 250}'::jsonb,

  protein_target_g INTEGER DEFAULT 60,
  fluid_target_ml INTEGER DEFAULT 1800,
  calories_target INTEGER,

  clinician_override BOOLEAN DEFAULT false,
  created_by UUID,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phases_user ON phases(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_phases_dates ON phases(user_id, start_date, end_date);

-- =====================================================
-- MEAL DIRECTORY (Seeded Content)
-- =====================================================

CREATE TABLE IF NOT EXISTS meal_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Phase compatibility
  phase_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Ingredients (structured data)
  ingredients JSONB DEFAULT '[]'::jsonb,

  -- Portion & macros
  default_portion_size DECIMAL(6,2) NOT NULL,
  portion_unit VARCHAR(20) NOT NULL DEFAULT 'g',

  protein_g_per_portion DECIMAL(5,2) NOT NULL,
  calories_per_portion INTEGER NOT NULL,
  fat_g DECIMAL(5,2) DEFAULT 0,
  carbs_g DECIMAL(5,2) DEFAULT 0,
  fiber_g DECIMAL(5,2) DEFAULT 0,

  -- Dietary info
  allergens TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Preparation
  prep_instructions TEXT,
  prep_time_minutes INTEGER,

  -- Images
  image_urls TEXT[] DEFAULT '{}',

  -- Approval & sourcing
  clinician_approved BOOLEAN DEFAULT false,
  source VARCHAR(50) DEFAULT 'curated',
  locale VARCHAR(10) DEFAULT 'en',

  -- Full-text search
  search_vector tsvector,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_phase_tags ON meal_directory USING GIN(phase_tags);
CREATE INDEX IF NOT EXISTS idx_meal_tags ON meal_directory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_meal_allergens ON meal_directory USING GIN(allergens);
CREATE INDEX IF NOT EXISTS idx_meal_search ON meal_directory USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_meal_protein ON meal_directory(protein_g_per_portion DESC);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION meal_directory_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.canonical_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meal_directory_search_update ON meal_directory;
CREATE TRIGGER meal_directory_search_update
  BEFORE INSERT OR UPDATE ON meal_directory
  FOR EACH ROW
  EXECUTE FUNCTION meal_directory_search_trigger();

-- =====================================================
-- MEAL LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase_id UUID REFERENCES phases(id),
  meal_type VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack'

  -- Aggregated totals
  total_protein_g DECIMAL(6,2) DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  total_carbs_g DECIMAL(6,2) DEFAULT 0,
  total_fat_g DECIMAL(6,2) DEFAULT 0,
  total_fiber_g DECIMAL(6,2) DEFAULT 0,

  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'photo', 'barcode', 'assistant', 'voice'
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID REFERENCES meal_entries(id) ON DELETE CASCADE,
  meal_directory_id UUID REFERENCES meal_directory(id),

  -- Allow custom items not in directory
  custom_name VARCHAR(255),

  quantity DECIMAL(6,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,

  -- Macros for this specific portion
  protein_g DECIMAL(6,2) NOT NULL,
  calories INTEGER NOT NULL,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,
  fiber_g DECIMAL(6,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_items_entry ON meal_items(meal_entry_id);

-- =====================================================
-- WEIGHT TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'scale', 'healthkit', 'google_fit'
  bmi DECIMAL(4,2),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, measured_at DESC);

-- Auto-calculate BMI on insert/update
CREATE OR REPLACE FUNCTION calculate_bmi() RETURNS trigger AS $$
DECLARE
  user_height DECIMAL(5,2);
BEGIN
  SELECT height_cm INTO user_height FROM users WHERE id = NEW.user_id;

  IF user_height IS NOT NULL AND user_height > 0 THEN
    NEW.bmi := NEW.weight_kg / ((user_height / 100.0) * (user_height / 100.0));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS weight_bmi_calculation ON weight_entries;
CREATE TRIGGER weight_bmi_calculation
  BEFORE INSERT OR UPDATE ON weight_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bmi();

-- =====================================================
-- WATER INTAKE
-- =====================================================

CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'voice', 'quick_add'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, logged_at DESC);

-- =====================================================
-- SUPPLEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dose VARCHAR(100), -- '500mg', '1 tablet', etc.

  schedule_type VARCHAR(50) DEFAULT 'daily', -- 'daily', 'twice_daily', 'weekly', 'custom'
  schedule_times TIME[], -- e.g., ['08:00', '20:00']

  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  reminder_enabled BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID REFERENCES supplements(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'taken', 'missed', 'snoozed'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_supplement ON supplement_logs(supplement_id, scheduled_time DESC);

-- =====================================================
-- REMINDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- 'vitamin', 'water', 'weight', 'meal', 'custom'
  title VARCHAR(255) NOT NULL,
  message TEXT,

  schedule_type VARCHAR(50) DEFAULT 'daily',
  schedule_time TIME,
  schedule_cron VARCHAR(100),

  enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  snooze_count INTEGER DEFAULT 0,
  snooze_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

-- =====================================================
-- FOOD IMAGES & AI ANALYSIS
-- =====================================================

CREATE TABLE IF NOT EXISTS food_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_entry_id UUID REFERENCES meal_entries(id),

  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- ML analysis results (JSONB for flexibility)
  analysis_result JSONB DEFAULT '{}'::jsonb,
  analysis_version VARCHAR(20),

  -- User confirmations/corrections
  user_confirmed_items JSONB DEFAULT '[]'::jsonb,

  phase_compatibility_score DECIMAL(3,2),
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'failed'

  pii_removed BOOLEAN DEFAULT false,
  consent_for_training BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_images_user ON food_images(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_images_meal ON food_images(meal_entry_id);

-- =====================================================
-- AI ASSISTANT CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),

  -- Snapshot of user context at conversation start
  context_snapshot JSONB DEFAULT '{}'::jsonb,

  -- Detected safety flags
  safety_flags JSONB DEFAULT '[]'::jsonb,

  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,

  -- For voice messages
  audio_url TEXT,

  -- For image messages
  image_ids UUID[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages ON conversation_messages(conversation_id, created_at ASC);

-- =====================================================
-- DAILY SUMMARIES (Aggregated Metrics)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Nutrition
  protein_consumed_g DECIMAL(6,2) DEFAULT 0,
  protein_target_g INTEGER DEFAULT 0,
  calories_consumed INTEGER DEFAULT 0,
  water_consumed_ml INTEGER DEFAULT 0,
  water_target_ml INTEGER DEFAULT 0,

  -- Activity
  meals_logged INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,

  -- Adherence
  supplements_taken INTEGER DEFAULT 0,
  supplements_scheduled INTEGER DEFAULT 0,
  supplements_compliance DECIMAL(3,2) DEFAULT 0,
  phase_compliance DECIMAL(3,2) DEFAULT 1.0,

  -- Calculated at end of day
  calculated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);

-- =====================================================
-- PHASE 2: CLINICAL INTEGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  clinic_id UUID REFERENCES clinics(id),

  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100), -- 'dietitian', 'surgeon', 'nurse', 'admin'
  credentials TEXT,
  phone VARCHAR(50),

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinician_patient_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID REFERENCES clinicians(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,

  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID, -- patient grants access
  revoked_at TIMESTAMPTZ,

  access_level VARCHAR(50) DEFAULT 'full', -- 'full', 'limited', 'read_only'

  UNIQUE(clinician_id, patient_id)
);

CREATE TABLE IF NOT EXISTS care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clinician_id UUID REFERENCES clinicians(id),

  -- Overrides
  phase_overrides JSONB DEFAULT '[]'::jsonb,
  protein_target_override INTEGER,
  fluid_target_override INTEGER,
  calories_target_override INTEGER,

  -- Custom approved meals
  custom_meal_ids UUID[],

  active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinician_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID REFERENCES clinicians(id),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,

  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'progress', 'concern', 'plan_update'

  attachments TEXT[],

  action_required BOOLEAN DEFAULT false,
  read_by_patient BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinician_notes_patient ON clinician_notes(patient_id, created_at DESC);

-- =====================================================
-- AUDIT LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id UUID,
  actor_type VARCHAR(50), -- 'user', 'clinician', 'system'

  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,

  details JSONB DEFAULT '{}'::jsonb,

  ip_address INET,
  user_agent TEXT,

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

-- Meal directory is read-only for all authenticated users
ALTER TABLE meal_directory ENABLE ROW LEVEL SECURITY;

-- User policies: users can only access their own data
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

-- Phases policies
CREATE POLICY "Users can view own phases"
  ON phases FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own phases"
  ON phases FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own phases"
  ON phases FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Meal entries policies
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

-- Meal items policies (access through meal_entries)
CREATE POLICY "Users can view own meal items"
  ON meal_items FOR SELECT
  TO authenticated
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert own meal items"
  ON meal_items FOR INSERT
  TO authenticated
  WITH CHECK (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can update own meal items"
  ON meal_items FOR UPDATE
  TO authenticated
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())))
  WITH CHECK (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can delete own meal items"
  ON meal_items FOR DELETE
  TO authenticated
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Weight entries policies
CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own weight entries"
  ON weight_entries FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own weight entries"
  ON weight_entries FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Water logs policies
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

-- Supplements policies
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

-- Supplement logs policies
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

-- Reminders policies
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Food images policies
CREATE POLICY "Users can view own food images"
  ON food_images FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own food images"
  ON food_images FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own food images"
  ON food_images FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Conversation messages policies
CREATE POLICY "Users can view own conversation messages"
  ON conversation_messages FOR SELECT
  TO authenticated
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert own conversation messages"
  ON conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Daily summaries policies
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

-- Meal directory policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view meal directory"
  ON meal_directory FOR SELECT
  TO authenticated
  USING (true);

-- Clinician notes policies
CREATE POLICY "Users can view notes about them"
  ON clinician_notes FOR SELECT
  TO authenticated
  USING (patient_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Care plans policies
CREATE POLICY "Users can view own care plans"
  ON care_plans FOR SELECT
  TO authenticated
  USING (patient_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
