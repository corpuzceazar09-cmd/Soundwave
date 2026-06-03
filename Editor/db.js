const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' }); // Assuming server is run from Editor/

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/soundwave_editor";

const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB for Editor DB");
    const db = client.db('soundwave_editor');
    return db;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB", error);
    process.exit(1);
  }
}

module.exports = { connectToDatabase, client };
