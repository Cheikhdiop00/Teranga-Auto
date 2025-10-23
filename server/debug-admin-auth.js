// Test détaillé pour identifier le problème d'authentification admin
import fetch from 'node-fetch';

async function debugAdminAuth() {
  console.log('🔍 Debug détaillé de l\'authentification admin\n');

  try {
    // 1. Connexion admin
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
      const error = await loginResponse.text();
      console.log('❌ Échec de connexion:', error);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✅ Connexion réussie');
    console.log('🔑 Token obtenu (longueur):', token.length);

    // 2. Test avec différents formats de headers
    console.log('\n2️⃣ Test des différents formats de headers...\n');

    // Format 1: Authorization: Bearer <token>
    console.log('📡 Test 1: Authorization: Bearer <token>');
    const response1 = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('   Status:', response1.status);
    if (!response1.ok) {
      const error = await response1.text();
      console.log('   Erreur:', error);
    } else {
      const data = await response1.json();
      console.log('   ✅ Succès! Utilisateurs:', data.users?.length || 0);
    }

    // Format 2: authorization (minuscule)
    console.log('\n📡 Test 2: authorization (minuscule)');
    const response2 = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'authorization': `Bearer ${token}`
      }
    });
    console.log('   Status:', response2.status);
    if (!response2.ok) {
      const error = await response2.text();
      console.log('   Erreur:', error);
    }

    // Format 3: Sans Bearer
    console.log('\n📡 Test 3: Authorization sans Bearer');
    const response3 = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': token
      }
    });
    console.log('   Status:', response3.status);
    if (!response3.ok) {
      const error = await response3.text();
      console.log('   Erreur:', error);
    }

    // 3. Vérification du contenu du token
    console.log('\n3️⃣ Analyse du token...');
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.decode(token);
    console.log('   Token décodé:', JSON.stringify(decoded, null, 2));

    // 4. Test direct avec curl pour comparaison
    console.log('\n4️⃣ Test avec curl (pour comparaison)...');
    const curlCommand = `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${token.substring(0, 50)}..." http://localhost:4000/api/admin/users`;
    console.log('   Commande curl:', curlCommand);

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
  }
}

debugAdminAuth();
