// api/routes/ruletaRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import {
  programarRuleta,
  getRuletaInfo,
  getRuletaParticipantes,
  realizarRuleta,
  getRuletaNumeros,
} from '../controllers/ruletaController.js';

const router = Router();

// Privado: info de ruleta (contador, estado, ganador)
// solo usuario con token
router.get('/:id/ruleta-info', verifyToken, getRuletaInfo);

//  Admin: ver participantes de la ruleta
router.get('/:id/ruleta-participantes', verifyToken, requireAdmin, getRuletaParticipantes);

//  Admin: programar ruleta
router.post('/:id/programar-ruleta', verifyToken, requireAdmin, programarRuleta);

//  Admin: realizar ruleta (girar)
router.post('/:id/realizar-ruleta', verifyToken, requireAdmin, realizarRuleta);

// participante logueado puede ver SOLO números aprobados (sin nombres)
router.get('/:id/ruleta-numeros', verifyToken, getRuletaNumeros);

export default router;
