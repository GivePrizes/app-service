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

// 👤 PÚBLICO: info de ruleta (contador, estado, ganador)
// (participantes y cualquier visitante deben poder verlo)
router.get('/:id/ruleta-info', getRuletaInfo);

// 🛠 Admin: ver participantes de la ruleta
router.get('/:id/ruleta-participantes', verifyToken, requireAdmin, getRuletaParticipantes);

// 🛠 Admin: programar ruleta
router.post('/:id/programar-ruleta', verifyToken, requireAdmin, programarRuleta);

// 🛠 Admin: realizar ruleta (girar)
router.post('/:id/realizar-ruleta', verifyToken, requireAdmin, realizarRuleta);

export default router;
