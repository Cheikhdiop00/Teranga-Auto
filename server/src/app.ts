import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import router from './routes/index.js';
import messageRoutes from './routes/messages.js';
import { notFound, errorHandler } from './middlewares/error.js';
import { initSocket } from './socket.js';

export function createApp() {
  const app = express();
  app.use(cors({
    origin: function (origin, callback) {
      // Permettre les requêtes sans origin (comme les apps mobiles, Postman, etc.)
      if (!origin) return callback(null, true);

      // En développement, permettre localhost sur tous les ports
      if (process.env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        // Permettre aussi les URLs configurées
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }
      }

      // En production, seulement l'URL configurée
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }

      // Bloquer les autres origines
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
  }));
  app.use(express.json({ limit: '10mb' })); // Augmenté pour les fichiers
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api', router);
  app.use('/api/messages', messageRoutes);

  app.use(notFound);
  app.use(errorHandler);

  // Initialiser Socket.IO
  const { server, io } = initSocket(app);

  return { app, server, io };
}
