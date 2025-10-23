// Script pour décoder et analyser le token JWT
import jwt from 'jsonwebtoken';

async function analyzeToken() {
  console.log('🔍 Analyse du token JWT admin\n');

  try {
    // Simuler la connexion pour obtenir le token
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

    console.log('✅ Token obtenu');

    // Décoder le token sans vérification (pour voir le contenu)
    const decoded = jwt.decode(token);
    console.log('📄 Contenu du token (décodé):');
    console.log(JSON.stringify(decoded, null, 2));

    // Vérifier avec la clé secrète
    const secret = 'b1d4c8ca3d6b84957e4ec29cf3ccd616c9b6d282c73e8e7b77391910e09e834b';
    const verified = jwt.verify(token, secret);
    console.log('\n🔐 Token vérifié avec succès:');
    console.log(JSON.stringify(verified, null, 2));

    // Tester manuellement la logique du middleware
    console.log('\n🧪 Test de la logique requireRoles:');
    console.log('   - req.user existe:', !!verified);
    console.log('   - rôle de l\'utilisateur:', verified.role);
    console.log('   - rôles autorisés: ["ADMIN"]');
    console.log('   - accès autorisé:', ['ADMIN'].includes(verified.role));

  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

analyzeToken();
