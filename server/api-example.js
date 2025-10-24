// Exemple d'API backend pour l'authentification avec MongoDB
// À placer dans votre dossier server/

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuration MongoDB
const MONGODB_URI = process.env.EXPO_PUBLIC_MONGODB_URI;
const DB_NAME = 'TerangaAuto';
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt';

let db;

// Connexion à MongoDB
MongoClient.connect(MONGODB_URI)
  .then(client => {
    db = client.db(DB_NAME);
    console.log('Connecté à MongoDB Atlas');
  })
  .catch(error => console.error('Erreur de connexion MongoDB:', error));

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Route: Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      address, 
      userType,
      specialties,
      idCardNumber 
    } = req.body;

    // Vérification si l'utilisateur existe déjà
    const profilesCollection = db.collection('profiles');
    const existingUser = await profilesCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création du profil utilisateur
    const newProfile = {
      email,
      password: hashedPassword,
      user_type: userType,
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      specialties: specialties || [],
      id_card_number: idCardNumber || null,
      is_available: userType === 'mechanic' ? false : undefined,
      is_blocked: false,
      rating_average: 0,
      rating_count: 0,
      photo_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await profilesCollection.insertOne(newProfile);
    const userId = result.insertedId.toString();

    // Génération du token JWT
    const token = jwt.sign(
      { userId, email, userType },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      userId,
      message: 'Compte créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route: Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Recherche de l'utilisateur
    const profilesCollection = db.collection('profiles');
    const user = await profilesCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérification du mot de passe
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérification si l'utilisateur est bloqué
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Votre compte a été bloqué' });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      userId: user._id.toString(),
      message: 'Connexion réussie'
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route: Mise à jour du mot de passe
app.post('/api/auth/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Récupération de l'utilisateur
    const profilesCollection = db.collection('profiles');
    const user = await profilesCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérification de l'ancien mot de passe
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hashage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mise à jour
    await profilesCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          password: hashedPassword,
          updated_at: new Date()
        } 
      }
    );

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route: Mise à jour de l'email
app.post('/api/auth/update-email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.userId;

    // Vérification si le nouvel email existe déjà
    const profilesCollection = db.collection('profiles');
    const existingUser = await profilesCollection.findOne({ 
      email,
      _id: { $ne: new ObjectId(userId) }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Mise à jour de l'email
    await profilesCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          email,
          updated_at: new Date()
        } 
      }
    );

    res.json({ message: 'Email mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'email:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route: Récupération du profil
app.get('/api/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const profilesCollection = db.collection('profiles');
    const profile = await profilesCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // Exclure le mot de passe
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;
