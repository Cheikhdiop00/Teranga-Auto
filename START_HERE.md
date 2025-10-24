# 🎯 COMMENCEZ ICI - Instructions Simples

## ⚠️ CE QUI S'EST PASSÉ

Vous avez eu une erreur car **MongoDB ne fonctionne pas dans React Native**.

J'ai corrigé le problème en changeant l'architecture :
- **AVANT** : Frontend → MongoDB ❌
- **MAINTENANT** : Frontend → Backend API → MongoDB ✅

## ✅ CE QUI EST FAIT

1. ✅ Tous vos fichiers frontend sont corrigés
2. ✅ Le code backend est prêt dans `server/routes-collections.js`
3. ✅ La documentation complète est disponible

## 🚀 CE QUE VOUS DEVEZ FAIRE (3 étapes)

### Étape 1 : Intégrer les routes backend (2 minutes)

Dans votre fichier `server/src/index.js` ou similaire, ajoutez :

```javascript
const setupCollectionRoutes = require('./routes-collections');
setupCollectionRoutes(app);
```

C'est tout ! Les routes sont prêtes.

### Étape 2 : Démarrer le backend

```bash
cd server
npm run dev
```

Le serveur doit démarrer sur `http://localhost:3000`

### Étape 3 : Mettre à jour l'URL dans le frontend

Créez un fichier `.env` à la racine :

```env
# Pour développement sur ordinateur
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Pour Android, décommentez cette ligne :
# NEXT_PUBLIC_API_URL=http://10.0.2.2:3000/api

# Pour iOS ou appareil physique, utilisez votre IP :
# NEXT_PUBLIC_API_URL=http://192.168.1.XXX:3000/api

# Mode de test
EXPO_PUBLIC_USE_MOCK_AUTH=false
```

Pour trouver votre IP : 
- Windows : tapez `ipconfig` dans cmd
- Mac/Linux : tapez `ifconfig` dans terminal

## 🎉 Démarrer l'application

```bash
# Terminal 1 : Backend
cd server
npm run dev

# Terminal 2 : Frontend  
npx expo start
```

## 📚 Documentation Détaillée

Si vous avez besoin de plus d'informations :

1. **`ARCHITECTURE_IMPORTANTE.md`** → Comprendre l'architecture
2. **`INTEGRATION_BACKEND.md`** → Guide détaillé d'intégration
3. **`RESUME_MIGRATION.md`** → Vue d'ensemble de la migration
4. **`server/api-example.js`** → Exemple complet d'API

## 🆘 Problèmes Courants

### "Failed to fetch" / "Network request failed"
➡️ Le backend n'est pas démarré ou l'URL est incorrecte
- Vérifiez que le backend tourne (`cd server && npm run dev`)
- Vérifiez `NEXT_PUBLIC_API_URL` dans `.env`

### "401 Unauthorized"
➡️ Vous devez vous connecter dans l'app
- Créez un compte ou connectez-vous
- Le token sera automatiquement stocké

### L'app ne trouve pas le backend sur Android
➡️ Utilisez `10.0.2.2` au lieu de `localhost`
```env
NEXT_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

### L'app ne trouve pas le backend sur iOS/Physique
➡️ Utilisez l'IP de votre ordinateur
```env
NEXT_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
```

## ✅ Test Rapide

Pour vérifier que tout fonctionne :

```bash
# 1. Tester que le backend répond
curl http://localhost:3000/api/profiles/count

# 2. Créer un compte de test
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+221771234567",
    "address": "Dakar",
    "userType": "client"
  }'

# 3. Se connecter et récupérer le token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

Si ça marche, votre backend est prêt ! 🎉

## 🎯 Résumé en 1 ligne

**Ajoutez 2 lignes de code dans votre serveur, démarrez-le, et l'app fonctionnera !**

---

**Questions ?** Consultez les autres fichiers de documentation ou les logs du serveur.
