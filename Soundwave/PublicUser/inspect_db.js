const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
  const email = 'kennardlopez@gmail.com';
  // Test password - this will tell us if the user exists in Supabase or not
  // We don't need to know the actual password - just test signIn with a wrong password
  // to see if the user EXISTS (will get INVALID_LOGIN_CREDENTIALS) vs doesn't exist (will get user not found)
  
  console.log('--- Testing if user exists in Supabase ---');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: 'wrong_password_just_to_test_existence',
  });
  
  if (signInError) {
    console.log('SignIn error code:', signInError.status, signInError.message);
    // If error is "Invalid login credentials" the USER EXISTS
    // If error is something else, they don't exist
  } else {
    console.log('SignIn succeeded (unexpected):', signInData);
  }

  console.log('\n--- Checking existing users in user_follows ---');
  const { data: follows, error: followsErr } = await supabase.from('user_follows').select('*');
  console.log('user_follows rows:', follows?.length, followsErr?.message);

  console.log('\n--- Checking existing users in ratings ---');
  const { data: ratings, error: ratingsErr } = await supabase.from('ratings').select('*');
  console.log('ratings rows:', ratings?.length, ratingsErr?.message);
}

run();
