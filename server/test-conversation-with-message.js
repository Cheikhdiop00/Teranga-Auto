// Script de test pour la création de conversation avec message initial
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

// Tokens JWT (à remplacer par vos vrais tokens après connexion)
let userToken = '';
let mechanicToken = '';

async function testConversationWithMessage() {
  console.log('🆕 Test: Création de conversation avec message initial\n');

  try {
    // 1. Connexion d'un utilisateur admin
    console.log('1️⃣ Connexion utilisateur...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Échec de connexion');
    }

    const loginData = await loginResponse.json();
    userToken = loginData.token;
    console.log('✅ Utilisateur connecté\n');

    // 2. Créer un utilisateur mécanicien pour les tests
    console.log('2️⃣ Création d\'un utilisateur mécanicien...');
    const createMechanicResponse = await fetch(`${API_BASE}/auth/register`, {
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

    let mechanicId;
    if (createMechanicResponse.ok) {
      const mechanicData = await createMechanicResponse.json();
      mechanicId = mechanicData.user.id;
      mechanicToken = mechanicData.token;
      console.log('✅ Mécanicien créé\n');
    } else {
      // Si l'utilisateur existe déjà, récupérer son ID
      console.log('🔄 Mécanicien existe déjà, récupération de l\'ID...');
      // Pour cet exemple, on utilise un ID fictif - remplacez par la vraie logique
      mechanicId = '68f8f91d6cea703d43058b7a'; // Remplacer par un vrai ID
    }

    // 3. Test de création de conversation AVEC message initial
    console.log('3️⃣ Création de conversation avec message initial...');

    const conversationData = {
      participantId: mechanicId,
      content: "Bonjour, j'ai besoin d'aide pour ma voiture. Pouvez-vous m'aider ?",
      messageType: "text"
    };

    console.log('📤 Requête:', JSON.stringify(conversationData, null, 2));

    const createConversationResponse = await fetch(`${API_BASE}/messages/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversationData)
    });

    if (!createConversationResponse.ok) {
      const errorData = await createConversationResponse.json();
      throw new Error(`Erreur ${createConversationResponse.status}: ${errorData.message}`);
    }

    const conversationResult = await createConversationResponse.json();
    console.log('✅ Conversation créée avec succès!');
    console.log('📋 Résultat:', JSON.stringify(conversationResult, null, 2));

    // 4. Vérifier que la conversation apparaît dans la liste
    console.log('\n4️⃣ Vérification de la liste des conversations...');
    const conversationsResponse = await fetch(`${API_BASE}/messages/conversations`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log(`✅ ${conversations.data.length} conversation(s) trouvée(s)`);
      console.log('📝 Dernière conversation:', JSON.stringify(conversations.data[0], null, 2));
    }

    console.log('\n🎉 Test terminé avec succès!');
    console.log('\n📖 Utilisation dans votre application:');

    console.log(`
POST ${API_BASE}/messages/conversations
Authorization: Bearer <votre_token>
Content-Type: application/json

{
  "participantId": "id_de_l_interlocuteur",
  "content": "Votre message initial",
  "messageType": "text"
}
    `);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n🔧 Vérifiez que:');
    console.log('   - Le serveur est démarré (npm run dev)');
    console.log('   - MongoDB est connecté');
    console.log('   - Vous avez remplacé l\'ID du participant par un ID valide');
  }
}

testConversationWithMessage();
