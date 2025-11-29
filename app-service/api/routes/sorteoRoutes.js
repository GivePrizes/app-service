// api/routes/sorteoRoutes.js
import { Router } from 'express';
import { verifyToken } from '../middleware/jwtValidate.js';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  realizarSorteo
} from '../controllers/sorteoController.js';

const router = Router();

// Públicas
router.get('/', getSorteos);
router.get('/:id', getSorteoById);

// Solo admin (protegidas)
router.use(verifyToken);

// Aquí puedes añadir un middleware extra para verificar rol 'admin' después
router.post('/crear', crearSorteo);
router.post('/:id/realizar', realizarSorteo);

export default router;