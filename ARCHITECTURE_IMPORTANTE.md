# ⚠️ ARCHITECTURE IMPORTANTE - OBLIGATOIRE

## 🚨 Problème Critique Résolu

**MongoDB NE PEUT PAS fonctionner directement dans React Native !**

Le driver MongoDB nécessite des modules Node.js (`stream`, `fs`, `net`, etc.) qui n'existent pas dans React Native/Expo.

## ✅ Solution Implémentée : Architecture REST API

```
┌─────────────────┐         HTTP/REST        ┌──────────────┐         MongoDB        ┌──────────┐
│  React Native   │ ───────────────────────> │   Backend    │ ──────────────────────> │ MongoDB  │
│   (Frontend)    │ <─────────────────────── │   Node.js    │ <────────────────────── │  Atlas   │
└─────────────────┘         JSON             └──────────────┘       Driver            └──────────┘
```

### Frontend (React Native)
- Fait des appels HTTP avec `fetch()`
- Utilise `AsyncStorage` pour les tokens
- **NE communique JAMAIS directement avec MongoDB**

### Backend (Node.js/Express)
- Reçoit les requêtes HTTP du frontend
- Communique avec MongoDB Atlas
- Retourne les résultats en JSON

## 📁 Fichier Modifié : `lib/supabase.ts`

Le fichier a été **complètement réécrit** pour utiliser des appels API REST au lieu de MongoDB direct.

### Avant (❌ Ne fonctionne pas)
```typescript
import { MongoClient } from 'mongodb'; // ❌ Erreur dans React Native !
const client = new MongoClient(uri);
await client.connect();
```

### Après (✅ Fonctionne)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appel HTTP vers le backend
const response = await fetch(`${API_URL}/profiles`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ query: {...} })
});
```

## 🔧 Fonction `getCollection()` - Nouvelle Implémentation

L'ancienne fonction retournait une collection MongoDB. La nouvelle simule l'interface MongoDB mais fait des appels API.

### Exemple d'utilisation (le code frontend ne change pas!)
```typescript
// Votre code existant continue de fonctionner !
const usersCollection = await getCollection('profiles');
const users = await usersCollection.find({ user_type: 'client' }).toArray();
```

### Ce qui se passe en réalité
```typescript
// Transformé en appel HTTP vers le backend
fetch('http://localhost:3000/api/profiles', {
  method: 'POST',
  body: JSON.stringify({
    action: 'find',
    query: { user_type: 'client' }
  })
})
```

## 🛠️ Backend Requis - Endpoints Obligatoires

Vous **DEVEZ** créer ces endpoints dans votre backend :

### 1. Authentification (déjà dans `api-example.js`)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/update-password`
- `POST /api/auth/update-email`

### 2. Collections (NOUVEAU - à implémenter)

#### Profiles
```javascript
// POST /api/profiles
app.post('/api/profiles', authenticateToken, async (req, res) => {
  const { action, query, sort, limit } = req.body;
  const collection = db.collection('profiles');
  
  if (action === 'find') {
    let cursor = collection.find(query);
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    const data = await cursor.toArray();
    return res.json({ data });
  }
  
  if (action === 'findOne') {
    const data = await collection.findOne(query);
    return res.json({ data });
  }
});

// POST /api/profiles/count
app.post('/api/profiles/count', authenticateToken, async (req, res) => {
  const { query } = req.body;
  const collection = db.collection('profiles');
  const count = await collection.countDocuments(query);
  res.json({ count });
});

// PUT /api/profiles
app.put('/api/profiles', authenticateToken, async (req, res) => {
  const { filter, update } = req.body;
  const collection = db.collection('profiles');
  await collection.updateOne(filter, update);
  res.json({ success: true });
});
```

#### Services
```javascript
// POST /api/services
app.post('/api/services', authenticateToken, async (req, res) => {
  const { action, query, sort, limit } = req.body;
  const collection = db.collection('services');
  
  if (action === 'find') {
    let cursor = collection.find(query);
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    const data = await cursor.toArray();
    return res.json({ data });
  }
  
  if (action === 'findOne') {
    const data = await collection.findOne(query);
    return res.json({ data });
  }
});

// POST /api/services/count
app.post('/api/services/count', authenticateToken, async (req, res) => {
  const { query } = req.body;
  const collection = db.collection('services');
  const count = await collection.countDocuments(query);
  res.json({ count });
});

// PUT /api/services
app.put('/api/services', authenticateToken, async (req, res) => {
  const { filter, update } = req.body;
  const collection = db.collection('services');
  await collection.updateOne(filter, update);
  res.json({ success: true });
});
```

#### Reports
```javascript
// POST /api/reports/count
app.post('/api/reports/count', authenticateToken, async (req, res) => {
  const { query } = req.body;
  const collection = db.collection('reports');
  const count = await collection.countDocuments(query);
  res.json({ count });
});
```

## 📝 Fichier Backend Complet à Créer

Créez `server/src/routes/collections.js` :

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Middleware d'authentification (à importer)
const authenticateToken = require('../middleware/auth');

// Helper pour gérer les requêtes de collection
async function handleCollectionRequest(db, collectionName, req, res) {
  const { action, query, sort, limit } = req.body;
  const collection = db.collection(collectionName);
  
  try {
    if (action === 'find') {
      let cursor = collection.find(query);
      if (sort) cursor = cursor.sort(sort);
      if (limit) cursor = cursor.limit(limit);
      const data = await cursor.toArray();
      return res.json({ data });
    }
    
    if (action === 'findOne') {
      const data = await collection.findOne(query);
      return res.json({ data });
    }
    
    res.status(400).json({ error: 'Action invalide' });
  } catch (error) {
    console.error(`Erreur ${collectionName}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = (db) => {
  // Profiles
  router.post('/profiles', authenticateToken, (req, res) => {
    handleCollectionRequest(db, 'profiles', req, res);
  });
  
  router.post('/profiles/count', authenticateToken, async (req, res) => {
    const { query } = req.body;
    const count = await db.collection('profiles').countDocuments(query);
    res.json({ count });
  });
  
  router.put('/profiles', authenticateToken, async (req, res) => {
    const { filter, update } = req.body;
    await db.collection('profiles').updateOne(filter, update);
    res.json({ success: true });
  });

  // Services
  router.post('/services', authenticateToken, (req, res) => {
    handleCollectionRequest(db, 'services', req, res);
  });
  
  router.post('/services/count', authenticateToken, async (req, res) => {
    const { query } = req.body;
    const count = await db.collection('services').countDocuments(query);
    res.json({ count });
  });
  
  router.put('/services', authenticateToken, async (req, res) => {
    const { filter, update } = req.body;
    await db.collection('services').updateOne(filter, update);
    res.json({ success: true });
  });

  // Reports
  router.post('/reports/count', authenticateToken, async (req, res) => {
    const { query } = req.body;
    const count = await db.collection('reports').countDocuments(query);
    res.json({ count });
  });

  return router;
};
```

Puis dans votre `server/src/index.js` :
```javascript
const collectionRoutes = require('./routes/collections');
app.use('/api', collectionRoutes(db));
```

## 🚀 Pour Tester Sans Backend

Utilisez le mode Mock dans `.env` :
```env
EXPO_PUBLIC_USE_MOCK_AUTH=true
EXPO_PUBLIC_MOCK_USER_TYPE=mechanic
```

## ✅ Checklist de Vérification

- [x] ❌ Supprimer `import mongodb` du frontend
- [x] ✅ Utiliser des appels fetch() vers le backend
- [ ] ⚠️ Implémenter les endpoints backend manquants
- [ ] ⚠️ Tester avec Postman/curl
- [ ] ⚠️ Démarrer le backend avant le frontend

## 🎯 Commandes pour Démarrer

```bash
# Terminal 1 - Backend (OBLIGATOIRE)
cd server
npm run dev

# Terminal 2 - Frontend
npx expo start
```

## 📞 En cas d'erreur

### "Failed to fetch" ou "Network request failed"
- ✅ Vérifiez que le backend est démarré
- ✅ Vérifiez l'URL dans NEXT_PUBLIC_API_URL
- ✅ Pour Android/iOS : utilisez l'IP de votre PC au lieu de `localhost`

### "401 Unauthorized"
- ✅ Vérifiez que le token est stocké dans AsyncStorage
- ✅ Vérifiez que le middleware d'authentification fonctionne

### "500 Internal Server Error"
- ✅ Consultez les logs du backend
- ✅ Vérifiez la connexion à MongoDB Atlas

---

**IMPORTANT** : Cette architecture est **obligatoire** pour que l'application fonctionne. MongoDB ne peut pas être utilisé directement dans React Native.
