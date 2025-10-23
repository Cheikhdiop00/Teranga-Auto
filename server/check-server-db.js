// Script pour vérifier la base de données utilisée par le serveur
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.ts';

async function checkServerDB() {
  console.log('🔍 Vérification de la base de données utilisée par le serveur\n');

  try {
    // Utiliser la même connexion que le serveur
    await connectDB(process.env.MONGO_URI || '');

    console.log('📊 Base de données connectée:', mongoose.connection.db.databaseName);
    console.log('🌐 URI utilisée:', process.env.MONGO_URI);

    // Vérifier les utilisateurs
    const User = (await import('./src/models/User.ts')).default;
    const users = await User.find({}, 'email role status firstName lastName').lean();

    console.log('\n👥 Utilisateurs trouvés:', users.length);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ${user.status}`);
    });

    // Vérifier spécifiquement l'admin
    const admin = await User.findOne({ email: 'admin@gmail.com' }).select('+password');
    if (admin) {
      console.log('\n✅ Admin trouvé:');
      console.log('   Email:', admin.email);
      console.log('   Rôle:', admin.role);
      console.log('   Statut:', admin.status);
      console.log('   Hash existe:', !!admin.password);
    } else {
      console.log('\n❌ Admin non trouvé dans cette base de données');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkServerDB();
