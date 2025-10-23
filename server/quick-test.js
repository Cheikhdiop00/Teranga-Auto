// Script rapide de test de connexion admin
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001/api';

async function quickTest() {
  try {
    console.log('🔍 Test de connexion admin sur port 4001...\n');

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Connexion réussie!');
      console.log('👤 Utilisateur:', data.user.firstName, data.user.lastName);
      console.log('🎭 Rôle:', data.user.role);
    } else {
      console.log('❌ Échec de connexion:');
      console.log('Status:', response.status);
      console.log('Message:', data.message);
    }

  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    console.log('🔍 Vérifiez que le serveur fonctionne sur le port 4001');
  }
}

quickTest();
