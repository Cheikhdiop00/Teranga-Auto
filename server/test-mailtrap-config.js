// Script pour tester la configuration Mailtrap
import 'dotenv/config';
import { sendActivationEmail } from './src/utils/email.js';

async function testMailtrapConfig() {
  console.log('🧪 Test de la configuration Mailtrap\n');

  console.log('📧 Configuration actuelle:');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***CONFIGURÉ***' : '***NON CONFIGURÉ***');

  if (process.env.EMAIL_USER === 'COLLEZ_VOTRE_USERNAME_MAILTRAP_ICI' ||
      process.env.EMAIL_PASS === 'COLLEZ_VOTRE_PASSWORD_MAILTRAP_ICI') {
    console.log('\n❌ ERREUR: Les identifiants Mailtrap ne sont pas configurés !');
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Allez sur https://mailtrap.io');
    console.log('2. Connectez-vous à votre compte');
    console.log('3. Email Testing → Inboxes → My Inbox → SMTP Settings');
    console.log('4. Copiez Username et Password');
    console.log('5. Remplacez dans le fichier .env');
    console.log('6. Redémarrez le serveur: npm run dev');
    console.log('7. Relancez ce test');
    return;
  }

  console.log('\n📤 Envoi d\'email de test...');

  try {
    const result = await sendActivationEmail('test@example.com', 'test-token-123');

    console.log('\n✅ SUCCÈS ! Configuration Mailtrap valide');
    console.log('📨 Email envoyé avec succès');
    console.log('🔢 Message ID:', result.messageId);

    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Vérifiez votre inbox Mailtrap');
    console.log('2. Vous devriez voir l\'email de test');
    console.log('3. Testez une vraie inscription: node test-full-registration.js');

  } catch (error) {
    console.log('\n❌ ÉCHEC: Problème avec la configuration');
    console.log('📝 Erreur:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n🔐 Problème d\'authentification:');
      console.log('- Vérifiez que Username et Password sont corrects');
      console.log('- Recopiez les identifiants depuis Mailtrap');
    }

    if (error.code === 'ECONNREFUSED') {
      console.log('\n🌐 Problème de connexion:');
      console.log('- Vérifiez votre connexion internet');
      console.log('- Le port 2525 pourrait être bloqué');
    }

    console.log('\n💡 Vérifiez votre configuration dans .env');
  }
}

testMailtrapConfig();
