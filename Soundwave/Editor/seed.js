const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EDITOR_EMAIL = process.env.EDITOR_EMAIL || 'editor@soundwave.com';
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || 'editor123';

async function seed() {
  try {
    // 1. Sign up the editor user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: EDITOR_EMAIL,
      password: EDITOR_PASSWORD,
    });

    if (signUpError) {
      // If user already exists, that's fine — try sign in
      if (signUpError.message.includes('already') || signUpError.message.includes('exists')) {
        console.log(`⚠️  Editor ${EDITOR_EMAIL} already exists in Auth. Trying to set role...`);
      } else {
        console.error("❌ Failed to create editor:", signUpError.message);
        // User might already exist — try signing in instead
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: EDITOR_EMAIL,
          password: EDITOR_PASSWORD,
        });
        if (signInError) {
          console.error("❌ Cannot sign in either:", signInError.message);
          return;
        }
        await ensureRole(signInData.user.id);
        return;
      }
    }

    if (signUpData?.user) {
      console.log(`✅ Editor user created: ${EDITOR_EMAIL}`);
      await ensureRole(signUpData.user.id);
    }

  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

async function ensureRole(userId) {
  // 2. Check if user_roles entry exists
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (existing) {
    console.log(`⚠️  Editor role already set: ${existing.role}`);
    printSuccess();
    return;
  }

  // 3. Create the Editor role entry
  const { error: insertError } = await supabase
    .from('user_roles')
    .insert({ id: userId, role: 'Editor' });

  if (insertError) {
    console.error("❌ Failed to set editor role:", insertError.message);
    return;
  }

  console.log("✅ Editor role set successfully!");
  printSuccess();
}

function printSuccess() {
  console.log("-----------------------------------------");
  console.log("Email:    " + EDITOR_EMAIL);
  console.log("Password: " + EDITOR_PASSWORD);
  console.log("Role:     Editor");
  console.log("-----------------------------------------");
  console.log("Start the server: node server.js");
  console.log("Login at:         http://localhost:8080/login");
}

seed();
