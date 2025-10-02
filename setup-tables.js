import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function runSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function setup() {
  console.log('Setting up database tables...\n');
  console.log('Please run the migrations manually:');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/bqfxvexbakqvxinnykys/sql/new');
  console.log('\n2. Copy and paste each migration file content in order:');
  console.log('   a) migrations/001_initial_schema.sql');
  console.log('   b) migrations/002_add_supplements.sql');
  console.log('   c) migrations/003_update_daily_summaries.sql');
  console.log('\n3. Click "Run" for each migration\n');
  console.log('The migration files are ready in the migrations/ directory.');
}

setup().catch(console.error);
