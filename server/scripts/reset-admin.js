import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connecté à la base de données');

    // Importer le modèle User
    const { default: User } = await import('../src/models/User.js');

    // Rechercher l'utilisateur admin
    const adminEmail = 'admin@gmail.com';
    const newPassword = 'admin123';
    
    let user = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!user) {
      console.log("L'utilisateur admin n'existe pas. Création...");
      // Créer l'utilisateur admin s'il n'existe pas
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      user = new User({
        firstName: 'Admin',
        lastName: 'System',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'active'
      });
      
      await user.save();
      console.log('Compte admin créé avec succès');
    } else {
      // Mettre à jour le mot de passe
      console.log(`Réinitialisation du mot de passe pour: ${adminEmail}`);
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.status = 'active';
      await user.save();
      console.log('Mot de passe admin réinitialisé avec succès');
    }
    
    console.log('\nInformations de connexion :');
    console.log(`Email: ${adminEmail}`);
    console.log(`Mot de passe: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe admin:', error);
    process.exit(1);
  }
}

resetAdminPassword();
