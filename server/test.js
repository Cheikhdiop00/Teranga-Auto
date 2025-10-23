import { MongoClient } from 'mongodb';

async function testConnection() {
  const uri = "mongodb+srv://terangaauto:YV8uSuUGZExjGmBX@cluster0.twzhbrs.mongodb.net/terangaauto_db?retryWrites=true&w=majority&appName=Cluster0";
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    console.log('Tentative de connexion...');
    await client.connect();
    console.log('✅ Connexion réussie à MongoDB Atlas');
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('📂 Collections disponibles:', collections.map(c => c.name));
  } catch (e) {
    console.error('❌ Erreur de connexion:', e.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}

testConnection();