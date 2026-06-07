const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

const uri = process.env.MONGODB_URI;

if (!uri || uri.includes('<username>')) {
  console.error("❌ Invalid MONGODB_URI. Please make sure you added the real URI in your .env file.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db('soundwave_editor');
    const editorsCol = db.collection('editors');

    // Create an initial editor
    const initialEditor = {
      editorId: "ED-999-999",
      password: "admin", // In a real app, this should be hashed (e.g., bcrypt)
      name: "Super Editor",
      createdAt: new Date()
    };

    // Check if it already exists
    const existing = await editorsCol.findOne({ editorId: "ED-999-999" });
    if (!existing) {
      await editorsCol.insertOne(initialEditor);
      console.log("✅ Successfully created initial editor!");
      console.log("-----------------------------------------");
      console.log("Editor ID: ED-999-999");
      console.log("Password:  admin");
      console.log("-----------------------------------------");
    } else {
      console.log("⚠️ Editor already exists in the database.");
      console.log("-----------------------------------------");
      console.log("Editor ID: ED-999-999");
      console.log("Password:  admin");
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.close();
  }
}

seed();
