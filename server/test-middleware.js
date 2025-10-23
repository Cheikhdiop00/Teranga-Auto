// Test du middleware requireAuth directement
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testRequireAuth() {
  console.log('🔍 Test direct du middleware requireAuth\n');

  try {
    // Générer un token JWT valide manuellement
    const secret = 'b1d4c8ca3d6b84957e4ec29cf3ccd616c9b6d282c73e8e7b77391910e09e834b';
    const payload = {
      id: 'test-admin-id',
      role: 'ADMIN'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    console.log('🔑 Token généré manuellement:', token.substring(0, 50) + '...');

    // Tester avec ce token
    const response = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Middleware requireAuth fonctionne!');
      console.log('👥 Utilisateurs:', data.users?.length || 0);
    } else {
      const error = await response.text();
      console.log('❌ Middleware requireAuth échoue:', error);
    }

    // Maintenant tester avec le vrai token de connexion
    console.log('\n🔄 Test avec un vrai token de connexion...\n');

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
    const realToken = loginData.token;

    console.log('🔑 Token de connexion obtenu');

    const realResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${realToken}`
      }
    });

    console.log('📡 Status avec vrai token:', realResponse.status);

    if (realResponse.ok) {
      const data = await realResponse.json();
      console.log('✅ Vrai token fonctionne!');
      console.log('👥 Utilisateurs:', data.users?.length || 0);
    } else {
      const error = await realResponse.text();
      console.log('❌ Vrai token échoue:', error);
    }

  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testRequireAuth();
