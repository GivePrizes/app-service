// index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import participanteRoutes from './api/routes/participanteRoutes.js';
import adminRoutes from './api/routes/adminRoutes.js';
import sorteoRoutes from './api/routes/sorteoRoutes.js';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [] }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.use('/api/participante', participanteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sorteos', sorteoRoutes);

app.get('/', (req, res) => {
  res.send('🚀 APP SERVICE OK - SiempreGana API v1');
});

// ✅ Exportar como función serverless
export default function handler(req, res) {
  app(req, res);
}