# Backend API - Teranga Auto (MongoDB)

## 🚀 Installation

```bash
cd server
npm install mongodb
```

## 📝 Configuration

### 1. Fichier `.env`

Créez un fichier `.env` dans le dossier `server/` :

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://jalibatoul07_db_user:eQmncAFhhF4H6YKr@cluster0.aheqai2.mongodb.net/TerangaAuto?retryWrites=true&w=majority

# JWT
JWT_SECRET=monsecret123

# Serveur
PORT=3000
NODE_ENV=development

# Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASSWORD=your_password
```

### 2. Démarrage du serveur

```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

## 📡 Endpoints API

### Authentification

#### POST /api/auth/register
Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Prénom",
  "lastName": "Nom",
  "phone": "+221771234567",
  "address": "Dakar, Sénégal",
  "userType": "client|mechanic|admin",
  "specialties": ["Mécanique générale"] // Optionnel, pour mécaniciens
}
```

**Réponse:**
```json
{
  "token": "jwt_token",
  "userId": "user_id",
  "message": "Compte créé avec succès"
}
```

#### POST /api/auth/login
Connexion utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse:**
```json
{
  "token": "jwt_token",
  "userId": "user_id",
  "message": "Connexion réussie"
}
```

#### POST /api/auth/update-password
Mise à jour du mot de passe (nécessite authentification).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

#### POST /api/auth/update-email
Mise à jour de l'email (nécessite authentification).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "email": "newemail@example.com"
}
```

#### GET /api/profile/:userId
Récupérer un profil utilisateur (nécessite authentification).

**Headers:**
```
Authorization: Bearer <token>
```

## 🗄️ Structure de la base de données

### Collection: profiles
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashé avec bcrypt),
  user_type: String, // "client", "mechanic", "admin"
  first_name: String,
  last_name: String,
  phone: String,
  address: String,
  specialties: Array<String>,
  id_card_number: String,
  is_available: Boolean, // Pour mécaniciens
  is_blocked: Boolean,
  rating_average: Number,
  rating_count: Number,
  photo_url: String,
  latitude: Number,
  longitude: Number,
  created_at: Date,
  updated_at: Date
}
```

### Collection: services
```javascript
{
  _id: ObjectId,
  client_id: String,
  mechanic_id: String,
  service_type: String,
  description: String,
  status: String, // "pending", "accepted", "in_progress", "completed", "cancelled"
  location_address: String,
  latitude: Number,
  longitude: Number,
  distance_km: Number,
  accepted_at: Date,
  created_at: Date,
  updated_at: Date
}
```

### Collection: reports
```javascript
{
  _id: ObjectId,
  reporter_id: String,
  reported_user_id: String,
  reason: String,
  description: String,
  status: String, // "pending", "reviewed", "resolved"
  admin_notes: String,
  created_at: Date,
  updated_at: Date
}
```

## 🔒 Sécurité

### Hashage des mots de passe
Les mots de passe sont hashés avec bcryptjs (10 rounds).

### JWT
Les tokens JWT expirent après 30 jours. Utilisez un secret fort en production.

### Variables d'environnement
Ne jamais commiter le fichier `.env`. Utilisez `.env.example` comme template.

### CORS
Configurez les origines autorisées en production :

```javascript
app.use(cors({
  origin: ['https://votre-domaine.com'],
  credentials: true
}));
```

## 📊 Monitoring

### Logs
Le serveur utilise Morgan pour les logs HTTP. En production, configurez un système de logs persistant.

### Erreurs
Toutes les erreurs sont loggées dans la console. En production, utilisez un service comme Sentry.

## 🧪 Tests

### Test de connexion MongoDB
```bash
node -e "require('mongodb').MongoClient.connect(process.env.MONGO_URI).then(() => console.log('OK')).catch(e => console.error(e))"
```

### Test d'un endpoint avec curl
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+221771234567",
    "address": "Dakar",
    "userType": "client"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🚨 Dépannage

### Erreur de connexion MongoDB
- Vérifiez que votre IP est autorisée dans MongoDB Atlas
- Vérifiez la validité de votre URI de connexion
- Vérifiez que le réseau autorise les connexions sortantes

### Erreur JWT
- Vérifiez que JWT_SECRET est défini
- Vérifiez la validité du token (non expiré)
- Vérifiez le format du header Authorization

### CORS
- Vérifiez que le frontend utilise la bonne URL
- Vérifiez la configuration CORS du serveur

## 📝 TODO

- [ ] Implémenter la récupération de mot de passe par email
- [ ] Ajouter la validation des données avec Joi
- [ ] Implémenter le rate limiting
- [ ] Ajouter des tests unitaires
- [ ] Configurer un système de logs persistant
- [ ] Ajouter la gestion des fichiers (upload d'images)
- [ ] Implémenter les notifications push
- [ ] Ajouter la recherche géographique avec indexes géospatiaux

## 📚 Ressources

- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Express.js](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [bcrypt](https://www.npmjs.com/package/bcryptjs)
