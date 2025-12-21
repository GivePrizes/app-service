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

/**
 * ✅ CORS a prueba de preflight (Vercel-friendly)
 * - Soporta dominio prod + localhost
 * - (Opcional) soporta previews *.vercel.app
 * - Responde OPTIONS SIEMPRE con 204 para evitar bloqueos
 */
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://siempre-ganas.vercel.app',
]);

// Si también usas previews del frontend en Vercel, déjalo activo:
const allowVercelPreview = true;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;

  // ✅ permite previews tipo https://xxxx-xxxx.vercel.app
  if (allowVercelPreview) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
    } catch (_) {
      return false;
    }
  }

  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // ✅ headers/methods para preflight + requests normales
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  // cachea preflight para mejorar rendimiento
  res.setHeader('Access-Control-Max-Age', '86400');

  // ✅ Responder preflight siempre
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
