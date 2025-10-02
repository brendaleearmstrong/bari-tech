import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('Key present:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAuthAndUsers() {
  console.log('\n=== BariTech Auth & User Setup ===\n');

  try {
    console.log('Step 1: Reading migration file...');
    const migrationSQL = readFileSync('./migrations/001_initial_schema.sql', 'utf8');

    console.log('Step 2: Applying database migration...');
    const { data: migrationData, error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.log('Note: Direct SQL execution not available via RPC.');
      console.log('Migration needs to be applied via Supabase Dashboard.\n');
      console.log('Please follow these steps:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Create a new query');
      console.log('5. Paste the contents of migrations/001_initial_schema.sql');
      console.log('6. Run the query');
      console.log('\nAfter completing the migration, run this script again.\n');
    } else {
      console.log('✓ Migration applied successfully');
    }

    console.log('\nStep 3: Creating test users...');

    const testUsers = [
      {
        email: 'admin@baritech.app',
        password: 'Admin123!',
        role: 'admin',
        name: 'Admin User'
      },
      {
        email: 'test@baritech.app',
        password: 'Test123!',
        role: 'user',
        name: 'Test User'
      }
    ];

    for (const testUser of testUsers) {
      console.log(`\nCreating ${testUser.role}: ${testUser.email}...`);

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          name: testUser.name,
          role: testUser.role
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`  ℹ User ${testUser.email} already exists`);

          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (!listError) {
            const existingUser = users.find(u => u.email === testUser.email);
            if (existingUser) {
              console.log(`  ✓ Found existing user with ID: ${existingUser.id}`);

              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('auth_user_id', existingUser.id)
                .maybeSingle();

              if (profileError) {
                console.log(`  ℹ Profile lookup error (table may not exist yet):`, profileError.message);
              } else if (!profile) {
                console.log(`  ℹ User profile not found in users table (will be created on first login)`);
              } else {
                console.log(`  ✓ User profile exists in database`);
              }
            }
          }
        } else {
          console.error(`  ✗ Error creating user:`, authError.message);
        }
        continue;
      }

      if (authData.user) {
        console.log(`  ✓ Auth user created with ID: ${authData.user.id}`);

        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: testUser.email,
            name: testUser.name,
            onboarding_completed: testUser.role === 'admin'
          });

        if (profileError) {
          if (profileError.code === '42P01') {
            console.log(`  ℹ Users table doesn't exist yet - profile will be created on first login`);
          } else {
            console.log(`  ℹ Profile creation note:`, profileError.message);
          }
        } else {
          console.log(`  ✓ User profile created in database`);
        }
      }
    }

    console.log('\n=== Setup Summary ===\n');
    console.log('Test Accounts Created:');
    console.log('\n1. Admin Account:');
    console.log('   Email: admin@baritech.app');
    console.log('   Password: Admin123!');
    console.log('\n2. Test Account:');
    console.log('   Email: test@baritech.app');
    console.log('   Password: Test123!');
    console.log('\n✓ You can now log in with these credentials!\n');

  } catch (error) {
    console.error('\nSetup error:', error);
  }
}

setupAuthAndUsers();
