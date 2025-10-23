// Script de test de connexion admin par défaut
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

async function testDefaultAdminLogin() {
  console.log('🧪 Test de connexion administrateur par défaut\n');

  try {
    console.log('1️⃣ Tentative de connexion avec admin@gmail.com / admin123...');

    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Erreur ${loginResponse.status}: ${errorData.message}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Connexion réussie!');
    console.log('👤 Utilisateur:', loginData.user.firstName, loginData.user.lastName);
    console.log('🎭 Rôle:', loginData.user.role);
    console.log('🔑 Token généré:', loginData.token ? 'Oui' : 'Non');

    // Tester l'accès à une route protégée
    console.log('\n2️⃣ Test d\'accès à une route protégée...');

    const protectedResponse = await fetch(`${API_BASE}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (protectedResponse.ok) {
      const profileData = await protectedResponse.json();
      console.log('✅ Accès autorisé au profil');
      console.log('📧 Email du profil:', profileData.data.email);
    } else {
      console.log('⚠️ Accès refusé (normal si la route n\'existe pas encore)');
    }

    console.log('\n🎉 Test terminé avec succès!');
    console.log('\n💡 L\'administrateur par défaut peut maintenant se connecter:');
    console.log('   📧 Email: admin@gmail.com');
    console.log('   🔑 Mot de passe: admin123');
    console.log('   🎭 Rôle: ADMIN');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n🔧 Vérifiez que:');
    console.log('   - Le serveur est démarré (npm run dev)');
    console.log('   - MongoDB est connecté');
    console.log('   - L\'administrateur a été créé au démarrage');
  }
}

testDefaultAdminLogin();
