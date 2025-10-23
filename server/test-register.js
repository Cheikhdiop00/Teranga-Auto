// Test de l'endpoint register pour identifier le problème
import fetch from 'node-fetch';

async function testRegisterEndpoint() {
  console.log('🔍 Test de l\'endpoint register\n');

  const testData = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'test123456',
    role: 'CLIENT',
    phoneNumber: '+221781234567',
    nationalId: '1234567890',
    address: '123 Rue de Test'
  };

  console.log('📤 Données de test:', {
    ...testData,
    password: '[HIDDEN]'
  });

  try {
    console.log('\n1️⃣ Test de l\'inscription...');
    const startTime = Date.now();

    const response = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('📡 Status:', response.status);
    console.log('⏱️ Durée:', duration, 'ms');

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Inscription réussie!');
      console.log('👤 Utilisateur créé:', {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        status: data.user?.status
      });
    } else {
      const error = await response.text();
      console.log('❌ Erreur:', error);

      // Analyser l'erreur plus en détail
      try {
        const errorData = JSON.parse(error);
        console.log('📄 Détails de l\'erreur:', errorData);
      } catch (e) {
        console.log('📄 Erreur brute:', error);
      }
    }

  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
  }
}

testRegisterEndpoint();
