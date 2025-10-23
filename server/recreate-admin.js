// Script pour forcer la recréation de l'admin avec un mot de passe simple
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.ts';
import Admin from './src/models/admin.ts';
import { connectDB } from './src/config/db.ts';

async function recreateAdmin() {
  console.log('🔧 Recréation forcée de l\'admin\n');

  try {
    // Connexion avec la même URI que le serveur
    await connectDB(process.env.MONGO_URI || '');

    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ email: 'admin@gmail.com' });
    await Admin.deleteOne({ user: { $exists: true } }); // Supprimer aussi le profil admin

    console.log('🗑️ Ancien admin supprimé');

    // Créer un nouvel admin
    const plainPassword = '12345678';
    console.log('🔑 Mot de passe en clair:', plainPassword);

    // Hash manuel pour voir exactement ce qui se passe
    const manualHash = await bcrypt.hash(plainPassword, 10);
    console.log('🔒 Hash manuel créé:', manualHash.substring(0, 20) + '...');

    // Créer l'utilisateur (le middleware va re-hasher automatiquement)
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Principal',
      email: 'admin@gmail.com',
      password: plainPassword, // Le middleware du modèle va le hasher
      role: 'ADMIN',
      status: 'active'
    });

    console.log('✅ Nouvel admin créé');
    console.log('   ID:', adminUser._id);
    console.log('   Email:', adminUser.email);

    // Récupérer l'utilisateur avec le hash final
    const finalUser = await User.findById(adminUser._id).select('+password');
    console.log('🔒 Hash final en base:', finalUser?.password?.substring(0, 20) + '...');

    // Test immédiat du mot de passe
    const testResult = finalUser?.password ? await bcrypt.compare(plainPassword, finalUser.password) : false;
    console.log('🧪 Test immédiat du mot de passe:', testResult ? '✅ VALIDE' : '❌ INVALIDE');

    // Créer le profil admin
    await Admin.create({
      user: adminUser._id,
      position: 'Super Admin',
      permissions: ['ALL']
    });

    console.log('✅ Profil admin créé');

    console.log('\n🎉 Admin recréé avec succès!');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Mot de passe: 12345678');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

recreateAdmin();
