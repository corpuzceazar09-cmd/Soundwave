const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = `testuser_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const password = 'testpassword123';

  console.log('--- Testing Supabase Auth signUp ---');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error('Supabase signUp FAILED:', signUpError.message, signUpError);
    return;
  }

  const user = signUpData.user;
  const session = signUpData.session;
  console.log('Supabase signUp SUCCESS!');
  console.log('User ID:', user.id);
  console.log('Email:', user.email);

  const dummyPodcastId = '874f9af4-8c7d-4ade-b65c-a7900c35acb0';
  console.log('\n--- Testing user_follows write with new User ID ---');
  const { data: followData, error: followError } = await supabase
    .from('user_follows')
    .upsert({ user_id: user.id, podcast_id: dummyPodcastId }, { onConflict: 'user_id, podcast_id' })
    .select();

  if (followError) {
    console.error('Follow Write FAILED:', followError.message, followError);
  } else {
    console.log('Follow Write SUCCESS:', followData);
  }
}

test();
