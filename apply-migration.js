import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sql = readFileSync(join(__dirname, 'init_migration.sql'), 'utf8');

    console.log('Applying database migration...');
    console.log('SQL length:', sql.length, 'characters');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
