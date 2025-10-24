# Migration de Supabase vers MongoDB Atlas

## ✅ Changements effectués

### 1. Configuration MongoDB
- **Fichier `lib/supabase.ts`** : Configuré pour MongoDB Atlas au lieu de Supabase
- Ajout de fonctions utilitaires : `getCollection()`, `storage`

### 2. Fichiers mis à jour

#### Contexte d'authentification (`contexts/AuthContext.tsx`)
- ✅ Remplacement de l'authentification Supabase par des appels API REST
- ✅ Utilisation d'AsyncStorage pour la gestion des tokens
- ✅ Modification de `signIn()`, `signUp()`, `signOut()`, `updateProfile()`
- ✅ Suppression des dépendances à `@supabase/supabase-js`

#### Admin (`app/(admin)/(tabs)/`)
- ✅ `index.tsx` : Mise à jour des statistiques avec MongoDB
- ✅ `users.tsx` : Gestion des utilisateurs avec MongoDB

#### Mécanicien (`app/(mechanic)/(tabs)/`)
- ✅ `index.tsx` : Chargement des services avec MongoDB
- ✅ `profile.tsx` : Mise à jour du profil avec API REST

#### Client (`app/(client)/(tabs)/`)
- ✅ `index.tsx` : Recherche de mécaniciens avec MongoDB

## 📝 Configuration requise

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
# Configuration MongoDB Atlas
EXPO_PUBLIC_MONGODB_URI=mongodb+srv://jalibatoul07_db_user:eQmncAFhhF4H6YKr@cluster0.aheqai2.mongodb.net/TerangaAuto?retryWrites=true&w=majority

# Configuration d'authentification
EXPO_PUBLIC_USE_MOCK_AUTH=false
EXPO_PUBLIC_MOCK_USER_TYPE=mechanic

# Configuration du serveur backend
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Configuration JWT
JWT_SECRET=monsecret123

# Configuration Node
NODE_ENV=development
PORT=3000
```

### 2. Dépendances à installer

```bash
npm install mongodb @react-native-async-storage/async-storage
npm uninstall @supabase/supabase-js
```

### 3. Structure de la base de données MongoDB

Créez les collections suivantes dans MongoDB Atlas :

#### Collection `profiles`
```javascript
{
  _id: ObjectId,
  user_type: "client" | "mechanic" | "admin",
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  address: String,
  photo_url: String (optionnel),
  id_card_number: String (optionnel),
  specialties: Array<String> (pour mécaniciens),
  is_available: Boolean (pour mécaniciens),
  is_blocked: Boolean,
  rating_average: Number,
  rating_count: Number,
  latitude: Number (optionnel),
  longitude: Number (optionnel),
  created_at: Date,
  updated_at: Date
}
```

#### Collection `services`
```javascript
{
  _id: ObjectId,
  client_id: String,
  mechanic_id: String (optionnel),
  service_type: String,
  description: String,
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled",
  location_address: String,
  distance_km: Number (optionnel),
  accepted_at: Date (optionnel),
  created_at: Date,
  updated_at: Date
}
```

#### Collection `reports`
```javascript
{
  _id: ObjectId,
  reporter_id: String,
  reported_user_id: String,
  reason: String,
  status: "pending" | "reviewed" | "resolved",
  created_at: Date,
  updated_at: Date
}
```

## ⚠️ Backend API requis

Vous devez créer un backend Node.js/Express avec les endpoints suivants :

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `POST /api/auth/update-password` - Mise à jour du mot de passe
- `POST /api/auth/update-email` - Mise à jour de l'email

### Structure de réponse attendue

#### Login/Register
```json
{
  "token": "jwt_token_here",
  "userId": "user_id_here"
}
```

## 🔧 Problèmes TypeScript connus

### Erreur ObjectId
MongoDB utilise `ObjectId` pour les IDs, mais le code utilise des `string`. Pour résoudre :

**Option 1** : Utiliser des strings comme IDs dans MongoDB
```typescript
// Dans lib/supabase.ts, lors de la création de documents
await collection.insertOne({
  _id: generateUniqueId(), // Fonction pour générer un string unique
  // autres champs...
});
```

**Option 2** : Convertir les strings en ObjectId
```typescript
import { ObjectId } from 'mongodb';

// Lors des requêtes
const profileData = await profilesCollection.findOne({ 
  _id: new ObjectId(userId) 
});
```

**Option recommandée** : Utiliser Option 2 et mettre à jour les types

### Conversion de types
Remplacez les conversions `as any` par des conversions plus sûres :
```typescript
// Au lieu de
setUsers(users as Profile[]);

// Utilisez
setUsers(users.map(u => ({ ...u, id: u._id.toString() })) as Profile[]);
```

## 🚀 Prochaines étapes

1. **Créer le backend API** pour gérer l'authentification
2. **Tester la connexion** à MongoDB Atlas
3. **Migrer les données** existantes de Supabase vers MongoDB (si applicable)
4. **Implémenter la gestion des images** (upload vers un service comme Cloudinary ou AWS S3)
5. **Ajouter la validation** des données avec Mongoose ou Joi
6. **Sécuriser les endpoints** avec des middlewares d'authentification

## 📚 Ressources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [AsyncStorage React Native](https://react-native-async-storage.github.io/async-storage/)
- [JWT Authentication](https://jwt.io/)

## 🐛 Débogage

Si vous rencontrez des erreurs :

1. **Vérifiez la connexion MongoDB** : Testez votre URI dans MongoDB Compass
2. **Vérifiez les variables d'environnement** : Assurez-vous qu'elles sont bien chargées
3. **Vérifiez les collections** : Assurez-vous que les collections existent
4. **Consultez les logs** : Utilisez `console.log()` pour déboguer les requêtes

## 💡 Conseils

- Utilisez MongoDB Compass pour visualiser vos données
- Activez les logs MongoDB pour le débogage
- Créez des index sur les champs fréquemment recherchés (email, user_type, etc.)
- Implémentez une validation des données côté serveur
- Utilisez des transactions MongoDB pour les opérations critiques

---

**Migration effectuée le** : {{ date }}
**Version** : 1.0.0
