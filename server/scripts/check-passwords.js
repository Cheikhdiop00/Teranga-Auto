import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

async function checkAndFixPasswords() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connecté à la base de données');

    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('+password');
    console.log(`Nombre d'utilisateurs trouvés : ${users.length}`);

    let updatedCount = 0;
    
    for (const user of users) {
      // Vérifier si le mot de passe est déjà haché (commence par $2a$ ou $2b$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`Mise à jour du mot de passe pour l'utilisateur: ${user.email}`);
        
        // Hacher le mot de passe
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        
        // Sauvegarder l'utilisateur
        await user.save();
        updatedCount++;
      }
    }

    console.log(`\nRésumé :`);
    console.log(`- Utilisateurs vérifiés : ${users.length}`);
    console.log(`- Mots de passe mis à jour : ${updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la vérification des mots de passe :', error);
    process.exit(1);
  }
}

checkAndFixPasswords();
