// Test de l'envoi d'email d'activation
import 'dotenv/config';
import { sendActivationEmail } from './src/utils/email.js';

async function testEmailSending() {
  console.log('🔍 Test de l\'envoi d\'email d\'activation\n');

  try {
    // Générer un faux token pour le test
    const testToken = 'test-activation-token-123';

    console.log('📧 Configuration email:');
    console.log('   Host:', process.env.SMTP_HOST);
    console.log('   Port:', process.env.SMTP_PORT);
    console.log('   User:', process.env.EMAIL_USER);
    console.log('   From:', process.env.EMAIL_FROM);
    console.log('   Frontend URL:', process.env.FRONTEND_URL);

    console.log('\n📤 Tentative d\'envoi d\'email...');

    const startTime = Date.now();
    const result = await sendActivationEmail('test@example.com', testToken);
    const endTime = Date.now();

    console.log('✅ Email envoyé avec succès!');
    console.log('⏱️ Temps d\'envoi:', endTime - startTime, 'ms');
    console.log('📨 Résultat:', result);

  } catch (error) {
    console.log('❌ Erreur lors de l\'envoi d\'email:');
    console.log('   Message:', error.message);
    console.log('   Code:', error.code);
    console.log('   Command:', error.command);

    console.log('\n🔧 Conseils de dépannage:');
    console.log('   1. Vérifiez que les identifiants Gmail sont corrects');
    console.log('   2. Activez l\'authentification à 2 facteurs et générez un mot de passe d\'application');
    console.log('   3. Vérifiez que le port 587 n\'est pas bloqué');
    console.log('   4. Utilisez un service comme Mailtrap pour les tests');
  }
}

testEmailSending();
