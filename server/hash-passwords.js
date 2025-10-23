import 'dotenv/config';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

async function hashExistingPasswords() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connecté à la base de données');

    const users = await User.find({}).select('+password');
    console.log(`Trouvé ${users.length} utilisateurs`);

    for (const user of users) {
      // Vérifier si le mot de passe est déjà hashé (commence par $2)
      if (!user.password.startsWith('$2')) {
        console.log(`Hashing password for user: ${user.email}`);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
      } else {
        console.log(`Password already hashed for user: ${user.email}`);
      }
    }

    console.log('Tous les mots de passe ont été vérifiés/hashés');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

hashExistingPasswords();
