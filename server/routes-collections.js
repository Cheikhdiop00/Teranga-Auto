// Routes pour les collections MongoDB
// À intégrer dans votre serveur Express existant

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt';
const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'TerangaAuto';

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

// Connexion MongoDB
let db;
MongoClient.connect(MONGODB_URI)
  .then(client => {
    db = client.db(DB_NAME);
    console.log('✅ Connecté à MongoDB Atlas pour les collections');
  })
  .catch(error => console.error('❌ Erreur MongoDB:', error));

// Helper pour gérer les requêtes génériques de collection
async function handleCollectionRequest(collectionName, req, res) {
  try {
    const { action, query, sort, limit } = req.body;
    const collection = db.collection(collectionName);
    
    // Conversion des _id en ObjectId si nécessaire
    const processedQuery = convertIdsInQuery(query);
    
    if (action === 'find') {
      let cursor = collection.find(processedQuery);
      
      if (sort) {
        cursor = cursor.sort(sort);
      }
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const data = await cursor.toArray();
      
      // Convertir _id en string pour le frontend
      const processedData = data.map(doc => ({
        ...doc,
        id: doc._id.toString(),
        _id: doc._id.toString()
      }));
      
      return res.json({ data: processedData });
    }
    
    if (action === 'findOne') {
      const data = await collection.findOne(processedQuery);
      
      if (data) {
        data.id = data._id.toString();
        data._id = data._id.toString();
      }
      
      return res.json({ data });
    }
    
    return res.status(400).json({ error: 'Action invalide' });
  } catch (error) {
    console.error(`❌ Erreur ${collectionName}:`, error);
    res.status(500).json({ error: error.message });
  }
}

// Convertir les ID string en ObjectId dans les queries
function convertIdsInQuery(query) {
  if (!query) return query;
  
  const processed = { ...query };
  
  // Convertir _id
  if (processed._id && typeof processed._id === 'string') {
    try {
      processed._id = new ObjectId(processed._id);
    } catch (e) {
      // Si ce n'est pas un ObjectId valide, garder tel quel
    }
  }
  
  // Convertir les autres champs *_id
  Object.keys(processed).forEach(key => {
    if (key.endsWith('_id') && typeof processed[key] === 'string') {
      try {
        processed[key] = new ObjectId(processed[key]);
      } catch (e) {
        // Garder tel quel si conversion échoue
      }
    }
  });
  
  return processed;
}

// Routes pour les collections

module.exports = function(app) {
  
  // ==================== PROFILES ====================
  
  // Recherche de profils
  app.post('/api/profiles', authenticateToken, (req, res) => {
    handleCollectionRequest('profiles', req, res);
  });
  
  // Comptage de profils
  app.post('/api/profiles/count', authenticateToken, async (req, res) => {
    try {
      const { query } = req.body;
      const processedQuery = convertIdsInQuery(query);
      const count = await db.collection('profiles').countDocuments(processedQuery);
      res.json({ count });
    } catch (error) {
      console.error('❌ Erreur count profiles:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Mise à jour de profil
  app.put('/api/profiles', authenticateToken, async (req, res) => {
    try {
      const { filter, update } = req.body;
      const processedFilter = convertIdsInQuery(filter);
      
      await db.collection('profiles').updateOne(processedFilter, update);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erreur update profile:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ==================== SERVICES ====================
  
  // Recherche de services
  app.post('/api/services', authenticateToken, (req, res) => {
    handleCollectionRequest('services', req, res);
  });
  
  // Comptage de services
  app.post('/api/services/count', authenticateToken, async (req, res) => {
    try {
      const { query } = req.body;
      const processedQuery = convertIdsInQuery(query);
      const count = await db.collection('services').countDocuments(processedQuery);
      res.json({ count });
    } catch (error) {
      console.error('❌ Erreur count services:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Mise à jour de service
  app.put('/api/services', authenticateToken, async (req, res) => {
    try {
      const { filter, update } = req.body;
      const processedFilter = convertIdsInQuery(filter);
      
      await db.collection('services').updateOne(processedFilter, update);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Erreur update service:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ==================== REPORTS ====================
  
  // Comptage de reports
  app.post('/api/reports/count', authenticateToken, async (req, res) => {
    try {
      const { query } = req.body;
      const processedQuery = convertIdsInQuery(query);
      const count = await db.collection('reports').countDocuments(processedQuery);
      res.json({ count });
    } catch (error) {
      console.error('❌ Erreur count reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ Routes de collections configurées');
};
