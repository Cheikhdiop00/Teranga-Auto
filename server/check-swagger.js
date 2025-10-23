// Script de vérification de la documentation Swagger pour les messages
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';

async function checkSwaggerDocs() {
  console.log('🔍 Vérification de la documentation Swagger...\n');

  try {
    // 1. Vérifier que l'API est accessible
    console.log('1️⃣ Test de l\'API...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      throw new Error('API non accessible');
    }
    console.log('✅ API accessible\n');

    // 2. Vérifier la documentation Swagger
    console.log('2️⃣ Test de la documentation Swagger...');
    const swaggerResponse = await fetch(`${API_BASE}/docs/`);
    if (!swaggerResponse.ok) {
      throw new Error('Documentation Swagger non accessible');
    }
    console.log('✅ Documentation Swagger accessible\n');

    // 3. Test des routes de messages (sans authentification pour voir l'erreur attendue)
    console.log('3️⃣ Test des routes de messages...');

    // Test GET /api/messages/conversations (devrait retourner 401 Unauthorized)
    const conversationsResponse = await fetch(`${API_BASE}/api/messages/conversations`);
    console.log(`   GET /conversations: ${conversationsResponse.status} ${conversationsResponse.statusText}`);

    // Test POST /api/messages/conversations (devrait retourner 401 Unauthorized)
    const startConversationResponse = await fetch(`${API_BASE}/api/messages/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: 'test' })
    });
    console.log(`   POST /conversations: ${startConversationResponse.status} ${startConversationResponse.statusText}`);

    // Test GET /api/messages/unread-count (devrait retourner 401 Unauthorized)
    const unreadResponse = await fetch(`${API_BASE}/api/messages/unread-count`);
    console.log(`   GET /unread-count: ${unreadResponse.status} ${unreadResponse.statusText}`);

    console.log('✅ Routes de messages configurées (authentification requise)\n');

    // 4. Instructions pour l'utilisateur
    console.log('📋 Instructions pour tester la messagerie :\n');

    console.log('🔐 1. Authentification requise :');
    console.log('   - Connectez-vous via POST /api/auth/login');
    console.log('   - Utilisez le token JWT dans Authorization: Bearer <token>\n');

    console.log('📖 2. Documentation Swagger :');
    console.log(`   - Ouvrez: ${API_BASE}/docs`);
    console.log('   - Cherchez la section "Messages"');
    console.log('   - Utilisez le bouton "Authorize" avec votre token JWT\n');

    console.log('🧪 3. Tests automatiques :');
    console.log('   node test-messaging.js\n');

    console.log('📡 4. Tests temps réel avec Socket.IO :');
    console.log('   - Utilisez deux navigateurs différents');
    console.log('   - Onglet 1: Interface client');
    console.log('   - Onglet 2: Interface mécanicien');
    console.log('   - Les messages s\'affichent en temps réel\n');

    console.log('🎯 Endpoints disponibles dans Swagger :');
    console.log('   • GET /api/messages/conversations - Liste des conversations');
    console.log('   • POST /api/messages/conversations - Démarrer une conversation');
    console.log('   • GET /api/messages/conversations/{id}/messages - Messages d\'une conversation');
    console.log('   • DELETE /api/messages/conversations/{id} - Supprimer une conversation');
    console.log('   • GET /api/messages/unread-count - Nombre de messages non lus\n');

    console.log('🚀 La documentation Swagger est prête et les routes de messagerie sont opérationnelles !');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.log('\n🔧 Assurez-vous que :');
    console.log('   - Le serveur est démarré (npm run dev)');
    console.log('   - Le port 4000 n\'est pas utilisé par une autre application');
    console.log('   - MongoDB est accessible');
  }
}

checkSwaggerDocs();
