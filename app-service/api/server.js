// api/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Rutas modulares
import participanteRoutes from './routes/participanteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import sorteoRoutes from './routes/sorteoRoutes.js';

dotenv.config();
const app = express();

// Middlewares globales
app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [] }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Monta las rutas con prefijo
app.use('/api/participante', participanteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sorteos', sorteoRoutes);

// Ruta de salud
app.get('/', (req, res) => {
  res.send('🚀 APP SERVICE OK - SiempreGana API v1');
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`APP SERVICE corriendo en puerto ${PORT} 🚀`);
});