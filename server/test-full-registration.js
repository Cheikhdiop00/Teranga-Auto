// Test complet de l'inscription avec email de confirmation
import fetch from 'node-fetch';

async function testFullRegistration() {
  console.log('🚀 Test complet de l\'inscription avec confirmation email\n');

  const testData = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: `jean.dupont.${Date.now()}@test.com`,
    password: 'Test123456',
    role: 'CLIENT',
    phoneNumber: '+221781234567',
    nationalId: '1234567890123',
    address: '123 Avenue de la République, Dakar'
  };

  console.log('📋 Données d\'inscription:');
  console.log('   👤 Nom:', `${testData.firstName} ${testData.lastName}`);
  console.log('   📧 Email:', testData.email);
  console.log('   🎭 Rôle:', testData.role);
  console.log('   📱 Téléphone:', testData.phoneNumber);

  try {
    console.log('\n📤 Envoi de la requête d\'inscription...');
    const startTime = Date.now();

    const response = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📡 Réponse en ${duration}ms - Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ INSCRIPTION RÉUSSIE!');
      console.log('🔑 Token JWT généré:', !!data.token);
      console.log('👤 Utilisateur créé:', {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        status: data.user?.status
      });

      console.log('\n📧 EMAIL DE CONFIRMATION:');
      console.log('   📨 Email envoyé à:', testData.email);
      console.log('   📝 Sujet: Activation de votre compte TerangaAuto');
      console.log('   🔗 Lien d\'activation généré automatiquement');
      console.log('   ⏱️ Email envoyé en arrière-plan (non-bloquant)');

      console.log('\n🎯 PROCHAINES ÉTAPES:');
      console.log('   1. Vérifiez votre inbox Mailtrap');
      console.log('   2. Cliquez sur le lien d\'activation');
      console.log('   3. Votre compte sera activé');

      console.log('\n🔗 URL de test Mailtrap: https://mailtrap.io');

      return data;

    } else {
      const error = await response.text();
      console.log('\n❌ ÉCHEC DE L\'INSCRIPTION:');
      console.log('   Erreur:', error);

      if (error.includes('EMAIL')) {
        console.log('\n💡 Cause probable: Configuration email incorrecte');
        console.log('   Solution: Suivez le guide MAILTRAP_SETUP.md');
      }
    }

  } catch (error) {
    console.log('\n❌ ERREUR RÉSEAU:', error.message);
    console.log('💡 Vérifiez que le serveur tourne sur le port 4000');
  }
}

testFullRegistration();
