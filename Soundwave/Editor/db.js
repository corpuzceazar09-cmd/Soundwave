const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Direct REST client for operations that need explicit anon key auth
async function restQuery(method, path, body) {
  const url = supabaseUrl + '/rest/v1/' + path.replace(/^\//, '');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Prefer': 'return=representation',
    },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Supabase REST error');
  return data;
}

module.exports = { connectToDatabase, connectMongo, mongoConnected, supabase, restQuery };

async function connectToDatabase() {
  try {
    // Verify connection by fetching a single row
    const { error } = await supabase.from('categories').select('id').limit(1);
    if (error) throw error;
    console.log("✅ Successfully connected to Supabase for Editor DB");
    return supabase;
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error.message);
    console.log("⚠️ Starting server without DB connection. Server will run with limited functionality.");
    return null;
  }
}

let mongoConnected = false;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚠️  MONGODB_URI not set — MongoDB features disabled');
    return null;
  }
  try {
    await mongoose.connect(uri);
    mongoConnected = true;
    console.log('✅ Connected to MongoDB');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    return null;
  }
}

module.exports = { connectToDatabase, connectMongo, mongoConnected };
