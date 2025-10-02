import { useState } from 'react';
import { Database, AlertCircle, CheckCircle, Copy, Users, Key } from 'lucide-react';

export function SetupPage() {
  const [copied, setCopied] = useState<'migration' | 'users' | 'env' | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const hasValidUrl = supabaseUrl &&
    supabaseUrl.includes('supabase.co') &&
    supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL';

  const migrationSQL = `-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Core schema for BariTech
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Meal directory table
CREATE TABLE IF NOT EXISTS meal_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_tags TEXT[] NOT NULL DEFAULT '{}',
  default_portion_size DECIMAL(6,2) NOT NULL,
  portion_unit VARCHAR(20) NOT NULL DEFAULT 'g',
  protein_g_per_portion DECIMAL(5,2) NOT NULL,
  calories_per_portion INTEGER NOT NULL,
  fat_g DECIMAL(5,2) DEFAULT 0,
  carbs_g DECIMAL(5,2) DEFAULT 0,
  fiber_g DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_phase_tags ON meal_directory USING GIN(phase_tags);
ALTER TABLE meal_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meal directory"
  ON meal_directory FOR SELECT TO authenticated USING (true);

-- Meal entries
CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type VARCHAR(50),
  total_protein_g DECIMAL(6,2) DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, logged_at DESC);
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal entries"
  ON meal_entries FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own meal entries"
  ON meal_entries FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own meal entries"
  ON meal_entries FOR DELETE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Meal items
CREATE TABLE IF NOT EXISTS meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID REFERENCES meal_entries(id) ON DELETE CASCADE,
  meal_directory_id UUID REFERENCES meal_directory(id),
  custom_name VARCHAR(255),
  quantity DECIMAL(6,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  protein_g DECIMAL(6,2) NOT NULL,
  calories INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_entry ON meal_items(meal_entry_id);
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal items"
  ON meal_items FOR SELECT TO authenticated
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert own meal items"
  ON meal_items FOR INSERT TO authenticated
  WITH CHECK (meal_entry_id IN (SELECT id FROM meal_entries WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Water logs
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, logged_at DESC);
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own water logs"
  ON water_logs FOR DELETE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Weight entries
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bmi DECIMAL(4,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, measured_at DESC);
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));`;

  const envTemplate = `VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`;

  const handleCopy = (type: 'migration' | 'users' | 'env') => {
    const textToCopy = type === 'migration' ? migrationSQL :
      type === 'users' ? 'Admin: admin@baritech.app / Admin123!\nTest: test@baritech.app / Test123!' :
      envTemplate;

    navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup Required</h1>
          <p className="text-gray-600">
            BariTech needs database tables to be created in your Bolt database.
          </p>
        </div>

        <div className="space-y-6">
          {!hasValidUrl && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Invalid Database Configuration</h3>
                  <p className="text-sm text-red-800">
                    Your .env file contains placeholder values. Please update it with your real database credentials first.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Setup Steps</h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Apply the database migration below</li>
                  <li>Refresh this page to start using BariTech</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Step 1: Apply Database Migration</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                Click the button below to automatically apply all database migrations to your Bolt database.
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                This will create all necessary tables, indexes, and security policies.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Note: Migrations are applied through the Bolt platform's Supabase MCP tools.
              </p>
            </div>
          </div>


          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Ready to Go!</h3>
                <p className="text-sm text-green-800">
                  Once both the migration and user accounts are created, click below to verify the setup.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-600 mb-4">
              Once migrations are applied, simply sign up with any email to create your account.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Your Bolt database is ready. Sign up to get started with BariTech.
          </p>
        </div>
      </div>
    </div>
  );
}
