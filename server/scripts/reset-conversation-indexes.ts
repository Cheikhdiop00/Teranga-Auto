import 'dotenv/config';
import mongoose from 'mongoose';
import Conversation from '../src/models/Conversation.js';

async function resetConversationIndexes() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI manquant dans les variables d'environnement");
    process.exit(1);
  }

  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connecté');

    console.log('🧹 Suppression des index existants sur conversations...');
    await Conversation.collection.dropIndexes().catch((err) => {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️ Aucun index à supprimer');
      } else {
        throw err;
      }
    });

    console.log("🔁 Création de l'index participantsHash unique...");
    await Conversation.collection.createIndex({ participantsHash: 1 }, { unique: true, sparse: true });

    console.log("🔁 Création de l'index participants (non unique) pour les recherches...");
    await Conversation.collection.createIndex({ participants: 1 });

    console.log('✅ Index recréés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la recréation des index :', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
  }
}

resetConversationIndexes();
