import { useState } from 'react';
import { Database, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export function SetupPage() {
  const [copied, setCopied] = useState(false);

  const migrationSQL = `-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Core schema for BariTech
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  height_cm DECIMAL(5,2),
  current_weight_kg DECIMAL(5,2),
  surgery_date DATE,
  surgery_type VARCHAR(100),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(migrationSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup Required</h1>
          <p className="text-gray-600">
            BariTech needs database tables to be created before you can use the app.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Quick Setup Steps</h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Copy the SQL migration below</li>
                  <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a></li>
                  <li>Navigate to: SQL Editor → New Query</li>
                  <li>Paste and run the SQL</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-900">Migration SQL</label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy SQL
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                {migrationSQL}
              </pre>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">After Setup</h3>
                <p className="text-sm text-green-800">
                  Once the migration is complete, refresh this page and you will be redirected to the login screen to begin using BariTech.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold"
            >
              I've Run the Migration - Check Again
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Need help? Check the{' '}
            <a href="/README.md" className="text-teal-600 hover:underline">README.md</a>
            {' '}or the{' '}
            <a href="/init_migration.sql" className="text-teal-600 hover:underline">complete migration file</a>
          </p>
        </div>
      </div>
    </div>
  );
}
