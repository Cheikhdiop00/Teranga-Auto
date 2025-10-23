// Script pour vérifier l'état de l'admin en base de données
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import { connectDB } from './src/config/db.js';

async function checkAdminStatus() {
  console.log('🔍 Vérification de l\'état de l\'admin en base de données\n');

  try {
    // Connexion à la base de données
    await connectDB(process.env.MONGO_URI!);

    // Recherche de l'admin
    const admin = await User.findOne({ email: 'admin@gmail.com' }).select('+password');

    if (!admin) {
      console.log('❌ Admin non trouvé en base de données');
      console.log('💡 Solution: Redémarrer le serveur pour créer l\'admin automatiquement');
      return;
    }

    console.log('✅ Admin trouvé:');
    console.log('   📧 Email:', admin.email);
    console.log('   👤 Nom:', admin.firstName, admin.lastName);
    console.log('   🎭 Rôle:', admin.role);
    console.log('   📊 Statut:', admin.status);
    console.log('   🔒 Password hash exists:', !!admin.password);

    // Test du hash du mot de passe
    console.log('\n🔑 Test du mot de passe:');
    const testPasswords = ['admin123', 'admin1218', 'admin'];

    for (const testPass of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPass, admin.password);
        console.log(`   "${testPass}": ${isValid ? '✅ VALIDE' : '❌ invalide'}`);
      } catch (error) {
        console.log(`   "${testPass}": ❌ erreur (${error.message})`);
      }
    }

    // Créer un nouvel admin si nécessaire
    console.log('\n🔧 Actions possibles:');
    console.log('   1. Redémarrer le serveur (l\'admin sera recréé automatiquement)');
    console.log('   2. Modifier manuellement le mot de passe');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdminStatus();
