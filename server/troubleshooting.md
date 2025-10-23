// Guide de résolution des problèmes MongoDB Atlas
// ================================================

/*
PROBLÈME: "Could not connect to any servers in your MongoDB Atlas cluster"

SOLUTION 1: Configuration IP Whitelist (RECOMMANDÉ)
---------------------------------------------------
1. Aller sur https://cloud.mongodb.com/
2. Se connecter à votre compte
3. Sélectionner votre projet "terangaauto"
4. Aller dans "Network Access" (menu gauche)
5. Cliquer sur "Add IP Address"
6. Ajouter votre IP actuelle ou utiliser "Allow Access from Anywhere (0.0.0.0/0)"
7. Sauvegarder

SOLUTION 2: MongoDB Local (TEMPORAIRE)
--------------------------------------
Si vous n'avez pas accès à Atlas, le serveur essaiera automatiquement
de se connecter à MongoDB local sur mongodb://localhost:27017/terangaauto_db

Installation MongoDB Local:
1. Télécharger MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Installer et démarrer MongoDB
3. Le serveur se connectera automatiquement en local

PROBLÈME: Erreurs CORS

SOLUTION: Configuration CORS
---------------------------
Le serveur permet maintenant:
- Toutes les origines localhost:* en développement
- Les requêtes sans origin (Postman, apps mobiles)
- L'URL configurée dans FRONTEND_URL

Si vous avez encore des problèmes CORS:
1. Vérifiez que votre frontend utilise http://localhost:PORT
2. Ajoutez l'en-tête 'Authorization' dans vos requêtes
3. Utilisez les credentials si nécessaire
*/

// Test de connexion rapide
import fetch from 'node-fetch';

async function testConnection() {
  const API_BASE = 'http://localhost:4000/api';

  try {
    console.log('🔍 Test de connexion au serveur...\n');

    // Test endpoint health
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
    if (healthResponse.ok) {
      console.log('✅ Serveur accessible');
    } else {
      console.log('❌ Serveur non accessible');
      return;
    }

    // Test connexion admin
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok) {
      console.log('✅ Connexion admin réussie!');
      console.log('👤 Admin:', loginData.user.firstName, loginData.user.lastName);
      console.log('🎭 Rôle:', loginData.user.role);
    } else {
      console.log('❌ Échec connexion admin:');
      console.log('Status:', loginResponse.status);
      console.log('Message:', loginData.message);
    }

  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    console.log('\n🔧 Vérifications:');
    console.log('   - Serveur démarré: npm run dev');
    console.log('   - Port correct: 4000');
    console.log('   - MongoDB connecté');
    console.log('   - IP whitelistée sur Atlas');
  }
}

// Exécuter le test: node test-connection.js
// testConnection();
