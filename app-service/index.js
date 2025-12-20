// index.js (APP-SERVICE)
import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';

import cuentaAdminRoutes from './api/routes/cuentaAdminRoutes.js';
import participanteRoutes from './api/routes/participanteRoutes.js';
import sorteoRoutes from './api/routes/sorteoRoutes.js';
import adminRoutes from './api/routes/adminRoutes.js';

dotenv.config();

const app = express();
const storage = multer.memoryStorage();

// ✅ CORS a prueba de preflight (Vercel-friendly)
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://siempre-ganas.vercel.app',
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Body limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rutas
app.use('/api/participante', participanteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sorteos', sorteoRoutes);

// Rutas de administración de cuentas por sorteo
app.use('/api/admin/cuentas', cuentaAdminRoutes);

// Root healthcheck
app.get('/', (req, res) => {
  res.send('APP SERVICE OK 🚀');
});

export const upload = multer({ storage });
export default app;
