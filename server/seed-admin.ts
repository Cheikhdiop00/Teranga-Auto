import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import Admin from './src/models/admin.js';

const DEFAULT_ADMINS = [
  {
    firstName: 'Admin',
    lastName: 'Principal',
    email: 'admin@gmail.com',
    password: 'admin123',
    position: 'Super Admin',
    permissions: ['ALL']
  }
];

export async function seedAdmins() {

  for (const admin of DEFAULT_ADMINS) {
    let user = await User.findOne({ email: admin.email });
    if (!user) {
      // Ne pas hasher manuellement - le middleware du modèle User le fait automatiquement
      user = await User.create({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: admin.password, // Mot de passe en clair - le modèle le hash
        role: 'ADMIN',
        status: 'active'
      });
      console.log(`✔️ Utilisateur admin créé: ${admin.email}`);
    } else {
      console.log(`ℹ️ Utilisateur admin déjà présent: ${admin.email}`);
    }

    const adminProfile = await Admin.findOne({ user: user._id });
    if (!adminProfile) {
      await Admin.create({
        user: user._id,
        position: admin.position,
        permissions: admin.permissions
      });
      console.log(`✔️ Profil admin créé pour: ${admin.email}`);
    } else {
      console.log(`ℹ️ Profil admin déjà présent pour: ${admin.email}`);
    }
  }
}

seedAdmins()
  .then(() => {
    console.log('Seeding admin terminé.');
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur lors du seeding admin:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
