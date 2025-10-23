// Script de test rapide de la connexion
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

async function testConnection() {
  try {
    console.log('🔍 Test de connexion au serveur...\n');

    // Test endpoint health
    const healthResponse = await fetch(`http://localhost:4000/health`);
    if (healthResponse.ok) {
      console.log('✅ Serveur accessible');
    } else {
      console.log('❌ Serveur non accessible');
      return;
    }

    // Test connexion admin
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok) {
      console.log('✅ Connexion admin réussie!');
      console.log('👤 Admin:', loginData.user.firstName, loginData.user.lastName);
      console.log('🎭 Rôle:', loginData.user.role);
    } else {
      console.log('❌ Échec connexion admin:');
      console.log('Status:', loginResponse.status);
      console.log('Message:', loginData.message);
    }

  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    console.log('\n🔧 Vérifications:');
    console.log('   - Serveur démarré: npm run dev');
    console.log('   - Port correct: 4000');
    console.log('   - MongoDB connecté (Atlas ou local)');
    console.log('   - IP whitelistée sur Atlas si utilisé');
  }
}

testConnection();
