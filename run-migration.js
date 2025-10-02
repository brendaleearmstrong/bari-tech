import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    const migration1 = readFileSync('./migrations/001_initial_schema.sql', 'utf8');
    const migration2 = readFileSync('./migrations/002_add_supplements.sql', 'utf8');
    const migration3 = readFileSync('./migrations/003_update_daily_summaries.sql', 'utf8');

    console.log('Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('✓ Database connected, tables need to be created');
      console.log('\nPlease run these migrations manually in your Supabase SQL Editor:');
      console.log('1. Go to: https://supabase.com/dashboard/project/bqfxvexbakqvxinnykys/sql/new');
      console.log('2. Copy and paste the contents of:');
      console.log('   - migrations/001_initial_schema.sql');
      console.log('   - migrations/002_add_supplements.sql');
      console.log('   - migrations/003_update_daily_summaries.sql');
      console.log('3. Run each migration in order\n');
    } else if (testError) {
      console.error('Database error:', testError.message);
    } else {
      console.log('✓ Database is already set up!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigrations();
