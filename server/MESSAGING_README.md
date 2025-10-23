# Système de Messagerie en Temps Réel - TerangaAuto

Ce guide explique comment utiliser le système de messagerie en temps réel entre clients et mécaniciens.

## 🚀 Démarrage Rapide

### 1. Installation des Dépendances
```bash
npm install socket.io @types/socket.io socket.io-client
```

### 2. Configuration de l'Environnement
Ajoutez ces variables dans votre fichier `.env` :
```env
FRONTEND_URL=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
```

### 3. Démarrage du Serveur
```bash
npm run dev
```

Le serveur démarrera avec Socket.IO sur le même port que votre API.

## 📖 Documentation Swagger

### Accès à la Documentation
Une fois le serveur démarré, accédez à la documentation complète :

**URL :** `http://localhost:4000/docs`

### Section Messages dans Swagger
1. **Ouvrez** `http://localhost:4000/docs`
2. **Cherchez** la section **"Messages"** dans le menu
3. **Cliquez** sur "Authorize" et entrez votre token JWT : `Bearer <votre_token>`
4. **Testez** tous les endpoints disponibles

### Endpoints Disponibles dans Swagger

#### Conversations
- `GET /api/messages/conversations` - Liste des conversations avec compteur non lus
- `POST /api/messages/conversations` - Démarrer une nouvelle conversation

#### Messages
- `GET /api/messages/conversations/{conversationId}/messages` - Messages d'une conversation
- `DELETE /api/messages/conversations/{conversationId}` - Supprimer une conversation
- `GET /api/messages/unread-count` - Nombre total de messages non lus

### Vérification Automatique
Pour vérifier que tout fonctionne :

```bash
node check-swagger.js
```

Ce script va :
- ✅ Vérifier l'accès à l'API
- ✅ Tester la documentation Swagger
- ✅ Valider les routes de messages
- ✅ Fournir des instructions détaillées

## 📡 Architecture

### Modèles de Données

#### Message
```typescript
interface IMessage {
  conversation: ObjectId;    // Conversation associée
  sender: ObjectId;         // Expéditeur
  content: string;          // Contenu du message
  read: boolean;           // Statut de lecture
  readAt?: Date;           // Date de lecture
  messageType: 'text' | 'image' | 'file'; // Type de message
  fileUrl?: string;        // URL du fichier (si applicable)
  fileName?: string;       // Nom du fichier
}
```

#### Conversation
```typescript
interface IConversation {
  participants: ObjectId[]; // Participants (toujours 2)
  lastMessage?: ObjectId;   // Dernier message
  isActive: boolean;       // Conversation active
}
```

### Routes API

#### Conversations
- `GET /api/messages/conversations` - Lister les conversations
- `POST /api/messages/conversations` - Démarrer une conversation
- `DELETE /api/messages/conversations/:id` - Supprimer une conversation

#### Messages
- `GET /api/messages/conversations/:id/messages` - Messages d'une conversation
- `GET /api/messages/unread-count` - Nombre de messages non lus

## 🔌 Événements Socket.IO

### Événements Client → Serveur

#### Envoyer un Message
```javascript
socket.emit('send_message', {
  conversationId: 'conversation_id',
  content: 'Hello World!',
  recipientId: 'user_id',
  messageType: 'text',
  fileUrl: null,
  fileName: null
});
```

#### Marquer comme Lu
```javascript
socket.emit('mark_as_read', {
  messageIds: ['message_id_1', 'message_id_2']
});
```

#### Rejoindre/Quitter une Conversation
```javascript
socket.emit('join_conversation', 'conversation_id');
socket.emit('leave_conversation', 'conversation_id');
```

#### Indicateurs de Frappe
```javascript
socket.emit('typing_start', {
  conversationId: 'conversation_id',
  recipientId: 'user_id'
});

socket.emit('typing_stop', {
  conversationId: 'conversation_id',
  recipientId: 'user_id'
});
```

### Événements Serveur → Client

#### Nouveau Message
```javascript
socket.on('new_message', (data) => {
  console.log('Nouveau message:', data);
  // data: { conversationId, message }
});
```

#### Messages Lus
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages lus:', data);
  // data: { messageIds, conversationId }
});
```

#### Mise à Jour de Conversation
```javascript
socket.on('conversation_updated', (data) => {
  console.log('Conversation mise à jour:', data);
  // data: { conversationId, lastMessage }
});
```

#### Indicateur de Frappe
```javascript
socket.on('user_typing', (data) => {
  console.log('Utilisateur tape:', data);
  // data: { conversationId, userId, isTyping }
});
```

## 🖥️ Implémentation Frontend

### Connexion Socket.IO
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'votre_jwt_token' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connecté au chat');
});

socket.on('disconnect', () => {
  console.log('Déconnecté du chat');
});
```

### Hook React Personnalisé
```javascript
import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export const useChat = (token: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:4000', {
      auth: { token }
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token]);

  const sendMessage = useCallback((data) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  }, [socket]);

  const fetchConversations = useCallback(async () => {
    const response = await fetch('/api/messages/conversations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setConversations(data.data);
  }, [token]);

  return { socket, conversations, messages, sendMessage, fetchConversations };
};
```

## 🧪 Tests

### Script de Test Automatique
```bash
node test-messaging.js
```

Ce script va :
1. Créer des utilisateurs de test
2. Tester les connexions
3. Valider les API REST
4. Fournir des instructions pour les tests temps réel

### Test Manuel

#### 1. Ouvrir Deux Navigateurs
- Onglet 1: Interface client
- Onglet 2: Interface mécanicien

#### 2. Se Connecter
```javascript
// Dans la console du navigateur
const socket = io('http://localhost:4000', {
  auth: { token: 'VOTRE_TOKEN_JWT' }
});
```

#### 3. Tester l'Envoi de Messages
```javascript
socket.emit('send_message', {
  conversationId: 'conversation_id',
  content: 'Hello World!',
  recipientId: 'recipient_user_id'
});
```

## 🔐 Sécurité

### Authentification
- Tous les utilisateurs doivent être authentifiés avec un JWT valide
- Le token est vérifié à la connexion Socket.IO
- Les permissions sont validées côté serveur

### Autorisation
- Un utilisateur ne peut voir que ses propres conversations
- Impossible d'envoyer des messages dans des conversations non autorisées
- Validation des participants côté serveur

### Validation des Données
- Sanitisation du contenu des messages
- Validation des types de fichiers autorisés
- Limite de taille des messages et fichiers

## 📊 Fonctionnalités Avancées

### Indicateurs de Lecture
- ✅ Message envoyé
- ✅✅ Message lu

### Indicateurs de Frappe
- Affichage en temps réel quand quelqu'un tape

### Notifications
- Badge de messages non lus
- Notifications push (à implémenter)

### Recherche
- Recherche dans les conversations
- Recherche dans les messages (à implémenter)

## 🚀 Déploiement

### Variables d'Environnement de Production
```env
NODE_ENV=production
FRONTEND_URL=https://votredomaine.com
SOCKET_CORS_ORIGIN=https://votredomaine.com
```

### Configuration Nginx (exemple)
```nginx
server {
  listen 80;
  server_name votredomaine.com;

  location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## 🐛 Dépannage

### Problèmes Courants

#### Erreur de Connexion Socket.IO
```
Error: Authentication failed
```
**Solution**: Vérifiez que le JWT token est valide et non expiré.

#### Messages Non Reçus
```
Messages envoyés mais non reçus
```
**Solution**: Vérifiez que l'utilisateur destinataire est connecté et que la conversation existe.

#### Erreur CORS
```
Cross-Origin Request Blocked
```
**Solution**: Configurez correctement `FRONTEND_URL` dans les variables d'environnement.

### Logs de Debug

#### Activer les Logs Socket.IO
```javascript
const io = new Server(server, {
  cors: { origin: '*' },
  // Activer les logs
  logger: console,
  engine: {
    pingTimeout: 20000,
    pingInterval: 25000
  }
});
```

#### Logs d'Application
```bash
DEBUG=socket.io:* npm run dev
```

## 📚 API Reference

### Endpoints REST

#### `GET /api/messages/conversations`
Récupère toutes les conversations de l'utilisateur connecté.

**Réponse:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "conversation_id",
      "participants": [...],
      "lastMessage": {...},
      "unreadCount": 3
    }
  ]
}
```

#### `POST /api/messages/conversations`
Démarre une nouvelle conversation.

**Corps:**
```json
{
  "participantId": "user_id"
}
```

#### `GET /api/messages/conversations/:id/messages`
Récupère tous les messages d'une conversation.

#### `DELETE /api/messages/conversations/:id`
Supprime une conversation (désactivation).

---

🎉 **Votre système de messagerie est maintenant opérationnel !**

Pour toute question ou problème, consultez les logs du serveur ou vérifiez la documentation OpenAPI sur `/docs`.
