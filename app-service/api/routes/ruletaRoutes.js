// api/routes/ruletaRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import {
  programarRuleta,
  getRuletaInfo,
  getRuletaParticipantes,
  realizarRuleta,
} from '../controllers/ruletaController.js';

const router = Router();

/**
 * Rutas de RULETA
 * Prefijo (cuando lo montemos): /api/sorteos
 *
 * Quedarán así:
 *  GET    /api/sorteos/:id/ruleta-info
 *  GET    /api/sorteos/:id/ruleta-participantes
 *  POST   /api/sorteos/:id/programar-ruleta
 *  POST   /api/sorteos/:id/realizar-ruleta
 */

// 👤 Participante / Admin: info pública de ruleta (contador, ganador, etc.)
router.get('/:id/ruleta-info', verifyToken, getRuletaInfo);

// 🛠 Admin: ver participantes de la ruleta
router.get(
  '/:id/ruleta-participantes',
  verifyToken,
  requireAdmin,
  getRuletaParticipantes
);

// 🛠 Admin: programar ruleta
router.post(
  '/:id/programar-ruleta',
  verifyToken,
  requireAdmin,
  programarRuleta
);

// 🛠 Admin: realizar ruleta (girar)
router.post(
  '/:id/realizar-ruleta',
  verifyToken,
  requireAdmin,
  realizarRuleta
);

export default router;
