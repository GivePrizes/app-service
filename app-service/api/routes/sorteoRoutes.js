// api/routes/sorteoRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  realizarSorteo,
  getRuletaData
} from '../controllers/sorteoController.js';
import { upload } from '../../index.js';

const router = Router();

// Públicas
router.get('/', getSorteos);
router.get('/:id', getSorteoById);

// Solo admin (protegidas)
router.use(verifyToken, requireAdmin);

router.post('/crear', crearSorteo);
router.get('/:id/ruleta', getRuletaData);
router.post('/:id/realizar', realizarSorteo);
router.post('/crear', verifyToken, upload.single('imagen'), crearSorteo);

export default router;
