// api/routes/sorteoRoutes.js
import { Router } from 'express';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  getRuletaData,
  realizarSorteo,
} from '../controllers/sorteoController.js';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', getSorteos);
router.get('/:id', getSorteoById);

router.post(
  '/crear',
  verifyToken,
  requireAdmin,
  upload.single('imagen'),  // aquí SÍ usamos multer
  crearSorteo
);

router.get('/:id/ruleta', verifyToken, requireAdmin, getRuletaData);
router.post('/:id/realizar', verifyToken, requireAdmin, realizarSorteo);

export default router;
