import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Key present:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('\n=== Setting up BariBuddy Database ===\n');

  try {
    console.log('Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('Tables do not exist. Database needs to be set up.');
      console.log('\nIMPORTANT: The database migration needs to be applied manually.');
      console.log('Please contact support or use the Supabase dashboard to apply init_migration.sql');
    } else if (testError) {
      console.log('Connection successful, but encountered error:', testError.message);
      console.log('This is expected if tables exist but are protected by RLS.');
    } else {
      console.log('✓ Database is accessible and tables exist');
    }

    console.log('\nChecking meal directory...');
    const { data: meals, error: mealsError } = await supabase
      .from('meal_directory')
      .select('count');

    if (mealsError) {
      console.log('Meal directory check:', mealsError.message);
    } else {
      console.log('✓ Meal directory is accessible');
    }

  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

setupDatabase();
