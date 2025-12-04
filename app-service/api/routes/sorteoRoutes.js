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

// Solo admin
router.use(verifyToken, requireAdmin);

// 👇 AQUÍ: un solo POST, con upload.single('imagen')
router.post('/crear', upload.single('imagen'), crearSorteo);

router.get('/:id/ruleta', getRuletaData);
router.post('/:id/realizar', realizarSorteo);

export default router;

