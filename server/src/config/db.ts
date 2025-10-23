import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  if (!uri) throw new Error('MONGO_URI is not defined');

  try {
    console.log('[DB] Tentative de connexion à MongoDB Atlas...');
    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });

    const dbName = mongoose.connection.name;
    console.log(`[DB] ✅ Connected to MongoDB Atlas database "${dbName}"`);

    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('[DB] Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DB] Déconnecté de MongoDB Atlas');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] Reconnecté à MongoDB Atlas');
    });

    return mongoose.connection;

  } catch (error) {
    console.error('[DB] ❌ Erreur de connexion à MongoDB Atlas:', (error as Error).message);

    // En développement seulement, essayer une connexion locale
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] 🔄 Tentative de connexion à MongoDB local...');

      try {
        const localUri = 'mongodb://localhost:27017/terangaauto_db';
        await mongoose.connect(localUri, {
          connectTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
        });

        const dbName = mongoose.connection.name;
        console.log('[DB] ✅ Connecté à MongoDB local (mode développement)');
        console.log('[DB] 📍 Base de données locale:', dbName);

        return mongoose.connection;

      } catch (localError) {
        console.error('[DB] ❌ Impossible de se connecter à MongoDB local:', (localError as Error).message);
      }
    }

    throw error;
  }
}
