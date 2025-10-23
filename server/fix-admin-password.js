// Script pour corriger le mot de passe de l'admin
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import { connectDB } from './src/config/db.js';

async function fixAdminPassword() {
  console.log('🔧 Correction du mot de passe admin\n');

  try {
    // Connexion à la base de données
    await connectDB(process.env.MONGO_URI!);

    // Recherche de l'admin
    const admin = await User.findOne({ email: 'admin@gmail.com' });

    if (!admin) {
      console.log('❌ Admin non trouvé - Création en cours...');

      // Créer l'admin manuellement
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'Principal',
        email: 'admin@gmail.com',
        password: hashedPassword, // Le middleware du modèle va le re-hasher
        role: 'ADMIN',
        status: 'active'
      });

      console.log('✅ Nouvel admin créé:');
      console.log('   📧 Email:', newAdmin.email);
      console.log('   👤 Nom:', newAdmin.firstName, newAdmin.lastName);
      console.log('   🎭 Rôle:', newAdmin.role);

      return;
    }

    console.log('✅ Admin trouvé - Réinitialisation du mot de passe...');

    // Réinitialiser le mot de passe
    admin.password = 'admin123'; // Le middleware va le hasher automatiquement
    await admin.save();

    console.log('✅ Mot de passe réinitialisé pour:', admin.email);

    // Vérification
    const updatedAdmin = await User.findOne({ email: 'admin@gmail.com' }).select('+password');
    const isValid = await bcrypt.compare('admin123', updatedAdmin!.password);
    console.log('🔑 Vérification du nouveau mot de passe:', isValid ? '✅ VALIDE' : '❌ INVALIDE');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdminPassword();
