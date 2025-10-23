// Test direct de la fonction sendActivationEmail avec logs détaillés
import 'dotenv/config';
import { sendActivationEmail } from './src/utils/email.js';

async function testEmailDirectly() {
  console.log('🧪 Test direct de sendActivationEmail\n');

  const testEmail = 'test@example.com';
  const testToken = 'test-token-12345';

  console.log('📧 Configuration actuelle:');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);

  console.log('\n📤 Test d\'envoi vers:', testEmail);
  console.log('🔑 Token de test:', testToken);

  try {
    console.log('\n⏳ Envoi en cours...');
    const startTime = Date.now();

    const result = await sendActivationEmail(testEmail, testToken);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✅ Email envoyé avec succès !');
    console.log('⏱️ Temps d\'envoi:', duration, 'ms');
    console.log('📨 Résultat détaillé:', JSON.stringify(result, null, 2));

    if (result.messageId) {
      console.log('🎯 Message ID:', result.messageId);
    }

  } catch (error) {
    console.log('\n❌ Échec de l\'envoi d\'email:');
    console.log('📝 Message d\'erreur:', error.message);
    console.log('🔢 Code d\'erreur:', error.code);

    if (error.code === 'EAUTH') {
      console.log('\n🔐 Problème d\'authentification Gmail:');
      console.log('   - Vérifiez que EMAIL_USER et EMAIL_PASS sont corrects');
      console.log('   - Pour Gmail, utilisez un "mot de passe d\'application"');
      console.log('   - Activez l\'authentification à 2 facteurs sur votre compte Gmail');
    }

    if (error.code === 'ECONNREFUSED') {
      console.log('\n🌐 Problème de connexion:');
      console.log('   - Vérifiez que le port 587 n\'est pas bloqué');
      console.log('   - Vérifiez la configuration du pare-feu');
    }

    console.log('\n💡 Solutions alternatives:');
    console.log('   1. Utiliser Mailtrap pour les tests (recommandé)');
    console.log('   2. Désactiver temporairement l\'envoi d\'email');
    console.log('   3. Utiliser un autre fournisseur SMTP');
  }
}

testEmailDirectly();
