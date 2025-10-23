// Test détaillé de la connexion admin
import fetch from 'node-fetch';

async function detailedAdminTest() {
  const API_BASE = 'http://localhost:4000/api';

  console.log('🔍 Test détaillé de la connexion admin\n');

  try {
    // 1. Test de santé du serveur
    console.log('1️⃣ Test de santé du serveur...');
    const healthResponse = await fetch('http://localhost:4000/health');
    if (healthResponse.ok) {
      console.log('✅ Serveur accessible\n');
    } else {
      console.log('❌ Serveur non accessible\n');
      return;
    }

    // 2. Test de connexion admin
    console.log('2️⃣ Test de connexion admin...');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: admin123');

    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();

    console.log('📡 Status:', loginResponse.status);
    console.log('📄 Response:', JSON.stringify(loginData, null, 2));

    if (loginResponse.ok) {
      console.log('\n✅ Connexion admin réussie!');
      console.log('🔑 Token généré:', loginData.token ? 'Oui' : 'Non');
      console.log('👤 Utilisateur:', loginData.user?.firstName, loginData.user?.lastName);
      console.log('🎭 Rôle:', loginData.user?.role);
    } else {
      console.log('\n❌ Échec de connexion admin');
      console.log('💡 Raison:', loginData.message);

      // Suggestions de dépannage
      console.log('\n🔧 Suggestions:');
      console.log('   - Vérifiez que MongoDB est connecté');
      console.log('   - L\'admin par défaut a-t-il été créé ?');
      console.log('   - Les logs du serveur montrent-ils la création de l\'admin ?');
    }

  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    console.log('\n🔧 Vérifications:');
    console.log('   - Serveur démarré: npm run dev');
    console.log('   - Port correct: 4000');
    console.log('   - MongoDB accessible');
  }
}

detailedAdminTest();
