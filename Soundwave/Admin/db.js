const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  console.warn('   The server will run with mock data only.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');

async function testConnection() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Supabase not configured — running in mock mode.');
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .limit(5);
    if (error) throw error;
    console.log('✅ Connected to Supabase. Tables:', data.map(t => t.table_name).join(', '));
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

module.exports = { supabase, testConnection };
