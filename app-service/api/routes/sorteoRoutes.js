// api/routes/sorteoRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  realizarSorteo
} from '../controllers/sorteoController.js';

const router = Router();

// Públicas (cualquiera puede ver sorteos)
router.get('/', getSorteos);
router.get('/:id', getSorteoById);

// A partir de aquí, sólo admins
router.use(verifyToken, requireAdmin);

router.post('/crear', crearSorteo);
router.post('/:id/realizar', realizarSorteo);

export default router;
