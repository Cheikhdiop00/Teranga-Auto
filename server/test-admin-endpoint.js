// Test complet de l'endpoint admin avec token
import fetch from 'node-fetch';

async function testAdminEndpoint() {
  console.log('🔍 Test de l\'endpoint admin avec token\n');

  try {
    // 1. Connexion admin pour obtenir le token
    console.log('1️⃣ Connexion admin...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Échec de connexion');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✅ Token obtenu:', token.substring(0, 50) + '...');

    // 2. Test de l'endpoint admin avec le token
    console.log('\n2️⃣ Test de GET /api/admin/users...');

    const adminResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 Status:', adminResponse.status);

    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log('✅ Accès autorisé!');
      console.log('👥 Utilisateurs trouvés:', adminData.users?.length || 0);

      // Afficher les premiers utilisateurs
      if (adminData.users && adminData.users.length > 0) {
        console.log('📋 Premier utilisateur:', {
          email: adminData.users[0].email,
          role: adminData.users[0].role,
          status: adminData.users[0].status
        });
      }
    } else {
      const errorData = await adminResponse.text();
      console.log('❌ Accès refusé:', errorData);
    }

  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testAdminEndpoint();
