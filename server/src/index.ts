import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import User from './models/User.js';
import Admin from './models/admin.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI as string;

// Fonction pour créer l'admin par défaut
async function seedDefaultAdmin() {
  try {
    console.log('🔧 Vérification de l\'administrateur par défaut...');

    // Vérifier si l'admin existe déjà
    const existingUser = await User.findOne({ email: 'admin@gmail.com' });

    if (existingUser) {
      console.log('✅ Administrateur par défaut déjà présent');
      return;
    }

    // Créer l'utilisateur admin
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Principal',
      email: 'admin@gmail.com',
      password: '12345678', // Mot de passe actuel
      role: 'ADMIN',
      status: 'active'
    });

    // Créer le profil admin
    await Admin.create({
      user: adminUser._id,
      position: 'Super Admin',
      permissions: ['ALL']
    });

    console.log('🎉 Administrateur par défaut créé avec succès!');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Mot de passe: 12345678');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin par défaut:', error);
  }
}

async function bootstrap() {
  try {
    await connectDB(MONGO_URI);

    // Créer l'admin par défaut si nécessaire
    await seedDefaultAdmin();

    const { server } = createApp();
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
      console.log(`WebSocket server ready for real-time messaging`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
