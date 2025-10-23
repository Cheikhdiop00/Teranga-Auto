// Script qui utilise exactement la même logique que le serveur
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import { connectDB } from './src/config/db.js';

async function testServerLogic() {
  console.log('🔍 Test avec la même logique que le serveur\n');

  try {
    // Connexion avec la même URI que le serveur
    await connectDB(process.env.MONGO_URI!);

    // Recherche avec .select('+password') comme dans le serveur
    const user = await User.findOne({ email: 'admin@gmail.com' }).select('+password');

    console.log('👤 Utilisateur trouvé:', {
      email: user?.email,
      status: user?.status,
      role: user?.role,
      hasPassword: !!user?.password
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    if (user.status !== 'active') {
      console.log('❌ Utilisateur non actif:', user.status);
      return;
    }

    // Test du mot de passe avec bcrypt.compare comme dans le serveur
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('🔑 Test bcrypt.compare("admin123", hash):', isValid);

    // Afficher le hash pour debug
    console.log('🔒 Hash en base:', user.password.substring(0, 20) + '...');

    // Tester avec différents mots de passe
    const testPasswords = ['admin123', 'admin', 'password'];
    console.log('\n🔍 Tests avec différents mots de passe:');
    for (const testPass of testPasswords) {
      const valid = await bcrypt.compare(testPass, user.password);
      console.log(`   "${testPass}": ${valid ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testServerLogic();
