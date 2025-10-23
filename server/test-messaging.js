import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Tokens JWT (à remplacer par des vrais tokens après connexion)
let userToken = '';
let mechanicToken = '';

async function testMessaging() {
  console.log('🚀 Test de la messagerie en temps réel\n');

  try {
    // 1. Connexion des utilisateurs
    console.log('1️⃣ Connexion des utilisateurs...');

    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Échec de connexion admin');
    }

    const loginData = await loginResponse.json();
    userToken = loginData.token;
    console.log('✅ Admin connecté avec succès\n');

    // 2. Créer un compte mécanicien pour les tests
    console.log('2️⃣ Création d\'un compte mécanicien...');

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'mechanic@test.com',
        password: 'password123',
        phoneNumber: '+221781234567',
        role: 'MECANICIEN',
        nationalId: '123456789',
        address: '123 Rue de Dakar'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      mechanicToken = registerData.token;
      console.log('✅ Mécanicien créé et connecté\n');
    } else {
      // Si le compte existe déjà, se connecter
      console.log('🔄 Tentative de connexion du mécanicien existant...');
      const mechanicLoginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'mechanic@test.com',
          password: 'password123'
        })
      });

      if (mechanicLoginResponse.ok) {
        const mechanicLoginData = await mechanicLoginResponse.json();
        mechanicToken = mechanicLoginData.token;
        console.log('✅ Mécanicien connecté\n');
      }
    }

    // 3. Tester les conversations
    console.log('3️⃣ Test des conversations...');

    const conversationsResponse = await fetch(`${API_BASE}/messages/conversations`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log(`✅ ${conversations.data.length} conversations trouvées`);
    }

    // 4. Démarrer une conversation
    console.log('4️⃣ Démarrage d\'une conversation...');

    const startConversationResponse = await fetch(`${API_BASE}/messages/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantId: 'USER_ID_DU_MECANICIEN' // À remplacer par l'ID réel
      })
    });

    if (startConversationResponse.ok) {
      const conversation = await startConversationResponse.json();
      console.log('✅ Conversation démarrée\n');
    }

    // 5. Instructions pour les tests en temps réel
    console.log('5️⃣ Instructions pour les tests en temps réel:');
    console.log('\n📱 Ouvrez deux navigateurs ou onglets séparés:');
    console.log('   - Onglet 1: Interface admin (avec userToken)');
    console.log('   - Onglet 2: Interface mécanicien (avec mechanicToken)');
    console.log('\n🔗 URLs de test:');
    console.log(`   Admin: ${FRONTEND_URL}/chat?token=${userToken}`);
    console.log(`   Mécanicien: ${FRONTEND_URL}/chat?token=${mechanicToken}`);
    console.log('\n📡 Événements Socket.IO disponibles:');
    console.log('   - send_message: Envoyer un message');
    console.log('   - mark_as_read: Marquer comme lu');
    console.log('   - join_conversation: Rejoindre une conversation');
    console.log('   - typing_start/typing_stop: Indicateurs de frappe');

    console.log('\n🎉 Configuration terminée ! Le serveur de messagerie est prêt.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n🔧 Vérifiez que:');
    console.log('   - Le serveur est démarré (npm run dev)');
    console.log('   - MongoDB est connecté');
    console.log('   - Les variables d\'environnement sont configurées');
  }
}

// Fonction pour créer un utilisateur de test
async function createTestUsers() {
  console.log('👤 Création d\'utilisateurs de test...\n');

  const users = [
    {
      firstName: 'Alice',
      lastName: 'Client',
      email: 'client@test.com',
      password: 'password123',
      role: 'CLIENT',
      nationalId: '111111111',
      address: '123 Rue Client'
    },
    {
      firstName: 'Bob',
      lastName: 'Mécanicien',
      email: 'mechanic@test.com',
      password: 'password123',
      role: 'MECANICIEN',
      nationalId: '222222222',
      address: '456 Rue Mécanicien'
    }
  ];

  for (const user of users) {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (response.status === 409) {
        console.log(`ℹ️  Utilisateur ${user.email} existe déjà`);
      } else if (response.ok) {
        console.log(`✅ Utilisateur ${user.email} créé`);
      } else {
        console.log(`❌ Erreur création ${user.email}:`, response.status);
      }
    } catch (error) {
      console.log(`❌ Erreur réseau pour ${user.email}:`, error.message);
    }
  }

  console.log('\n📝 Utilisateurs de test disponibles:');
  console.log('   Client: client@test.com / password123');
  console.log('   Mécanicien: mechanic@test.com / password123');
  console.log('   Admin: admin@gmail.com / admin123\n');
}

// Exécuter les tests
async function runTests() {
  await createTestUsers();
  await testMessaging();
}

runTests();
