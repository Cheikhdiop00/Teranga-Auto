// Test de l'inscription avec attente pour voir les logs d'email
import fetch from 'node-fetch';

async function testRegisterWithEmailLogs() {
  console.log('🔍 Test de l\'inscription avec logs d\'email\n');

  const testData = {
    firstName: 'Test',
    lastName: 'Email',
    email: `test-email-${Date.now()}@example.com`,
    password: 'test123456',
    role: 'CLIENT',
    phoneNumber: '+221781234567',
    nationalId: '1234567890',
    address: '123 Rue de Test'
  };

  console.log('📤 Tentative d\'inscription...');

  try {
    const response = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Erreur d\'inscription:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Inscription réussie!');
    console.log('👤 Utilisateur créé:', data.user?.email);
    console.log('🔑 Token généré:', !!data.token);

    // Attendre quelques secondes pour voir les logs d'email asynchrones
    console.log('\n⏳ Attente des logs d\'email (5 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🎯 Test terminé. Vérifiez les logs du serveur pour voir si l\'email a été envoyé.');

  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testRegisterWithEmailLogs();
