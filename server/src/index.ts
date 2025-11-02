import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import User from './models/User.js';
import Admin from './models/admin.js';
import Client from './models/Client.js';
import Mechanic from './models/Mechanic.js';
import Ad from './models/Ad.js';
import Advice from './models/Advice.js';
import Breakdown from './models/Breakdown.js';
import Complaint from './models/Complaint.js';
import Conversation from './models/Conversation.js';
import Service from './models/Service.js';
import Message from './models/Message.js';
import History from './models/History.js';
import Notification from './models/Notification.js';
import Review from './models/Review.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI as string;
const SHOULD_SEED_DEMO = process.env.SEED_DEMO_DATA === 'true';

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

    if (SHOULD_SEED_DEMO) {
      // Seed de données de démonstration (une seule fois)
      await seedDemoData();
    } else {
      console.log('⏭️  SEED_DEMO_DATA activé uniquement lorsqu\'il vaut "true" - aucun seed exécuté');
    }

    const { server } = createApp();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Server accessible on network at http://192.168.1.50:${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
      console.log(`WebSocket server ready for real-time messaging`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

// Seed de données par défaut pour les tables demandées
async function seedDemoData() {
  try {
    console.log('🔧 Vérification des données de démonstration...');

    // 1) Créer utilisateurs démo (client et mécanicien) si manquants
    let demoClientUser = await User.findOne({ email: 'client.demo@example.com' });
    if (!demoClientUser) {
      demoClientUser = await User.create({
        firstName: 'Client',
        lastName: 'Demo',
        email: 'client.demo@example.com',
        password: '12345678',
        role: 'CLIENT',
        status: 'active',
        phoneNumber: '+221770000001'
      });
    }

    let demoMechanicUser = await User.findOne({ email: 'mechanic.demo@example.com' });
    if (!demoMechanicUser) {
      demoMechanicUser = await User.create({
        firstName: 'Mecano',
        lastName: 'Demo',
        email: 'mechanic.demo@example.com',
        password: '12345678',
        role: 'MECANICIEN',
        status: 'active',
        phoneNumber: '+221770000002'
      });
    }

    // 2) Créer documents liés Client et Mechanic si manquants
    let demoClient = await Client.findOne({ user: demoClientUser._id });
    if (!demoClient) {
      demoClient = await Client.create({ user: demoClientUser._id, address: 'Dakar, SN', latitude: 14.6937, longitude: -17.4441 });
    }

    let demoMechanic = await Mechanic.findOne({ user: demoMechanicUser._id });
    if (!demoMechanic) {
      demoMechanic = await Mechanic.create({ user: demoMechanicUser._id, specialty: 'Générale', address: 'Dakar, SN', latitude: 14.705, longitude: -17.450 });
    }

    // 3) Publicités (Ads)
    const adsCount = await Ad.countDocuments();
    if (adsCount === 0) {
      await Ad.create([
        {
          title: 'Promo Vidange -20%',
          description: 'Réduction immédiate sur la vidange complète.',
          imageUrl: 'https://via.placeholder.com/600x300.png?text=Promo+Vidange',
          category: 'PROMOTION',
          isPublished: true,
          publishedBy: demoMechanicUser._id,
          targetRoles: ['ALL'],
          priority: 8,
          active: true
        },
        {
          title: 'Conseil Sécurité',
          description: 'Vérifiez vos freins tous les 10 000 km.',
          imageUrl: 'https://via.placeholder.com/600x300.png?text=Conseil+Securite',
          category: 'INFORMATION',
          isPublished: true,
          publishedBy: demoMechanicUser._id,
          targetRoles: ['CLIENT'],
          priority: 5,
          active: true
        }
      ]);
      console.log('✅ Publicités par défaut créées');
    }

    // 4) Conseils (Advice)
    const adviceCount = await Advice.countDocuments();
    if (adviceCount === 0) {
      await Advice.create([
        { title: 'Entretien batterie', content: 'Évitez les courts trajets fréquents.', author: demoMechanicUser._id },
        { title: 'Pression des pneus', content: 'Contrôlez la pression chaque mois.', author: demoMechanicUser._id }
      ]);
      console.log('✅ Conseils par défaut créés');
    }

    // 5) Pannes (Breakdowns)
    const breakdownCount = await Breakdown.countDocuments();
    if (breakdownCount === 0) {
      await Breakdown.create([
        { client: demoClient._id, description: 'Panne moteur sur la VDN', latitude: 14.73, longitude: -17.46, status: 'open' },
        { client: demoClient._id, description: 'Batterie faible au Plateau', latitude: 14.67, longitude: -17.43, status: 'in_progress', mechanic: demoMechanic._id }
      ]);
      console.log('✅ Pannes par défaut créées');
    }

    // 6) Plaintes (Complaints)
    const complaintCount = await Complaint.countDocuments();
    if (complaintCount === 0) {
      await Complaint.create([
        { user: demoClientUser._id, description: 'Intervention en retard', status: 'open' },
        { user: demoClientUser._id, description: 'Facturation incorrecte', status: 'in_progress' }
      ]);
      console.log('✅ Plaintes par défaut créées');
    }

    // 7) Conversations (entre client et mécanicien)
    const convCount = await Conversation.countDocuments();
    let demoConversation: any = await Conversation.findOne({ participants: { $all: [demoClientUser._id, demoMechanicUser._id] } });
    if (convCount === 0 || !demoConversation) {
      demoConversation = await Conversation.create({ participants: [demoClientUser._id, demoMechanicUser._id], isActive: true });
      console.log('✅ Conversation par défaut créée');
    }

    // 8) Messages (attachés à la conversation)
    const msgCount = await Message.countDocuments({ conversation: demoConversation._id });
    if (msgCount === 0) {
      await Message.create([
        { conversation: demoConversation._id, sender: demoClientUser._id, content: 'Bonjour, j’ai un souci avec ma voiture.', read: false, messageType: 'text' },
        { conversation: demoConversation._id, sender: demoMechanicUser._id, content: 'Bonjour, je peux vous aider. Où êtes-vous ?', read: false, messageType: 'text' },
      ]);
      console.log('✅ Messages par défaut créés');
    }

    // 9) Services (catalogue)
    const servicesCount = await Service.countDocuments();
    if (servicesCount === 0) {
      await Service.create([
        { name: 'Vidange', description: 'Vidange moteur complète', basePrice: 30000, active: true },
        { name: 'Diagnostic', description: 'Diagnostic électronique', basePrice: 15000, active: true },
        { name: 'Freinage', description: 'Contrôle et remplacement des freins', basePrice: 40000, active: true },
      ]);
      console.log('✅ Services par défaut créés');
    }

    // 10) Historique (History)
    const historyCount = await History.countDocuments();
    if (historyCount === 0) {
      const anyBreakdown = await Breakdown.findOne({ client: demoClient._id });
      if (anyBreakdown) {
        await History.create([
          { client: demoClient._id, mechanic: demoMechanic._id, breakdown: anyBreakdown._id, status: 'in_progress' },
        ]);
        console.log('✅ Historique par défaut créé');
      }
    }

    // 11) Notifications
    const notifCount = await Notification.countDocuments({ user: demoClientUser._id });
    if (notifCount === 0) {
      await Notification.create([
        { user: demoClientUser._id, title: 'Bienvenue', content: 'Bienvenue sur TerangaAuto !', type: 'system' },
        { user: demoMechanicUser._id, title: 'Nouvelle demande', content: 'Un client a besoin d’aide.', type: 'system' },
      ]);
      console.log('✅ Notifications par défaut créées');
    }

    // 12) Avis/Reviews
    const reviewCount = await Review.countDocuments({ client: demoClient._id, mechanic: demoMechanic._id });
    if (reviewCount === 0) {
      await Review.create({ client: demoClient._id, mechanic: demoMechanic._id, rating: 5, comment: 'Service excellent !' });
      console.log('✅ Avis par défaut créé');
    }

    console.log('🎉 Données de démonstration vérifiées.');
  } catch (err) {
    console.error('❌ Erreur seedDemoData:', err);
  }
}
