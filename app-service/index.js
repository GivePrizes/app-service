// index.js (APP-SERVICE)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

import participanteRoutes from './api/routes/participanteRoutes.js';
import sorteoRoutes from './api/routes/sorteoRoutes.js';
import adminRoutes from './api/routes/adminRoutes.js';

dotenv.config();

const app = express();
const storage = multer.memoryStorage();

// ⭐ CORS bien configurado
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://siempre-ganas.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Rutas principales
app.use('/api/participante', participanteRoutes);
app.use('/api/sorteos', sorteoRoutes);
app.use('/api/admin', adminRoutes);

// Ruta raíz para probar que está vivo
app.get('/', (req, res) => {
  res.send('APP SERVICE OK 🚀');
});

export const upload = multer({ storage });




export default app;
