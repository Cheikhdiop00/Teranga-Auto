import 'dotenv/config';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connecté à la base de données');

    const user = await User.findOne({ email: 'admin@gmail.com' }).select('+password');
    if (!user) {
      console.log('Utilisateur admin non trouvé');
      process.exit(1);
    }

    const newPassword = 'admin123'; // Mot de passe temporaire
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    console.log(`Mot de passe réinitialisé pour admin@gmail.com. Nouveau mot de passe : ${newPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

resetAdminPassword();
