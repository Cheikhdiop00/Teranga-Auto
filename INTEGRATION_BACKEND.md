# 🚀 Guide d'Intégration Backend - URGENT

## ⚡ Actions Immédiates (5 minutes)

### Étape 1: Copier le fichier des routes
Le fichier `server/routes-collections.js` contient tous les endpoints nécessaires.

### Étape 2: Intégrer dans votre serveur

**Option A - Si vous avez déjà un serveur Express :**

Dans votre fichier principal (probablement `server/src/index.ts` ou `server/src/index.js`):

```javascript
// Ajoutez après vos imports existants
const setupCollectionRoutes = require('./routes-collections');

// Ajoutez après la configuration de votre app Express
setupCollectionRoutes(app);
```

**Option B - Nouveau serveur (utilisez api-example.js) :**

```javascript
const express = require('express');
const app = express();
const setupCollectionRoutes = require('./routes-collections');

// Middleware
app.use(express.json());
app.use(require('cors')());

// Routes d'authentification (api-example.js)
// ... vos routes auth existantes ...

// Routes de collections (NOUVEAU)
setupCollectionRoutes(app);

app.listen(3000, () => {
  console.log('✅ Serveur démarré sur le port 3000');
});
```

### Étape 3: Variables d'environnement

Assurez-vous que votre `.env` contient :

```env
MONGO_URI=mongodb+srv://jalibatoul07_db_user:eQmncAFhhF4H6YKr@cluster0.aheqai2.mongodb.net/TerangaAuto?retryWrites=true&w=majority
JWT_SECRET=monsecret123
PORT=3000
```

### Étape 4: Démarrer le serveur

```bash
cd server
npm run dev
```

## 🧪 Tester les Endpoints

### Test 1: Vérifier que le serveur répond
```bash
curl http://localhost:3000/api/profiles/count \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"query": {}}'
```

### Test 2: Login et récupérer un token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

Vous devriez recevoir :
```json
{
  "token": "eyJhbGc...",
  "userId": "..."
}
```

### Test 3: Utiliser le token pour une requête
```bash
# Remplacez YOUR_TOKEN par le token reçu
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "find",
    "query": {"user_type": "mechanic"},
    "limit": 5
  }'
```

## 📱 Configurer le Frontend

### 1. Mettre à jour `.env`

Pour le développement local sur Android/iOS, utilisez l'IP de votre ordinateur :

```env
# Pour Web
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Pour Android Emulator
# NEXT_PUBLIC_API_URL=http://10.0.2.2:3000/api

# Pour iOS Simulator ou appareil physique (remplacez par votre IP)
# NEXT_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
```

Pour trouver votre IP :
- **Windows** : `ipconfig` dans cmd
- **Mac/Linux** : `ifconfig` dans terminal

### 2. Désactiver le mode Mock

Dans `.env` :
```env
EXPO_PUBLIC_USE_MOCK_AUTH=false
```

### 3. Redémarrer l'app
```bash
npx expo start --clear
```

## 🔍 Endpoints Disponibles

Tous ces endpoints sont maintenant disponibles :

### Authentification
- ✅ `POST /api/auth/register` - Inscription
- ✅ `POST /api/auth/login` - Connexion
- ✅ `POST /api/auth/update-password` - Changer mot de passe
- ✅ `POST /api/auth/update-email` - Changer email

### Profiles
- ✅ `POST /api/profiles` - Rechercher des profils
- ✅ `POST /api/profiles/count` - Compter les profils
- ✅ `PUT /api/profiles` - Mettre à jour un profil

### Services
- ✅ `POST /api/services` - Rechercher des services
- ✅ `POST /api/services/count` - Compter les services
- ✅ `PUT /api/services` - Mettre à jour un service

### Reports
- ✅ `POST /api/reports/count` - Compter les signalements

## 🐛 Dépannage Rapide

### Le frontend ne se connecte pas au backend

1. **Vérifier que le backend tourne** :
   ```bash
   curl http://localhost:3000/api/profiles/count
   ```

2. **Vérifier l'URL dans le frontend** :
   - Ouvrir `lib/supabase.ts`
   - Vérifier `API_URL`
   - Pour Android : utiliser `10.0.2.2` au lieu de `localhost`
   - Pour iOS/Physique : utiliser l'IP de votre PC

3. **Vérifier les CORS** :
   Dans votre serveur, assurez-vous que CORS est activé :
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```

### Erreur "401 Unauthorized"

Le token n'est pas valide ou expiré. Reconnectez-vous :
1. Ouvrir l'app
2. Aller sur login
3. Se connecter avec un compte valide

### Erreur "500 Internal Server Error"

1. Regarder les logs du serveur backend
2. Vérifier que MongoDB est accessible
3. Tester la connexion :
   ```bash
   mongosh "mongodb+srv://jalibatoul07_db_user:eQmncAFhhF4H6YKr@cluster0.aheqai2.mongodb.net/TerangaAuto"
   ```

## 📊 Structure des Requêtes

### Recherche (find)
```javascript
{
  "action": "find",
  "query": { "user_type": "mechanic" },
  "sort": { "rating_average": -1 },
  "limit": 10
}
```

### Recherche unique (findOne)
```javascript
{
  "action": "findOne",
  "query": { "_id": "507f1f77bcf86cd799439011" }
}
```

### Mise à jour (updateOne)
```javascript
{
  "filter": { "_id": "507f1f77bcf86cd799439011" },
  "update": { 
    "$set": { 
      "is_available": true,
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### Comptage (countDocuments)
```javascript
{
  "query": { "user_type": "client" }
}
```

## ✅ Checklist de Vérification

- [ ] Routes ajoutées au serveur backend
- [ ] Serveur backend démarre sans erreur
- [ ] MongoDB accessible depuis le serveur
- [ ] Variables d'environnement correctes
- [ ] CORS activé sur le serveur
- [ ] Frontend configuré avec la bonne API_URL
- [ ] Test de login réussi
- [ ] Token stocké dans AsyncStorage
- [ ] Test d'une requête authentifiée réussi

## 🎉 Prêt !

Une fois toutes les étapes complétées :

1. **Backend** : `cd server && npm run dev`
2. **Frontend** : `npx expo start`
3. **Tester** : Se connecter dans l'app

L'application devrait maintenant fonctionner complètement avec MongoDB Atlas ! 🚀

---

**Temps estimé** : 5-10 minutes
**Difficulté** : ⭐ Facile (copier-coller)
