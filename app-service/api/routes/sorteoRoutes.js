// api/routes/sorteoRoutes.js
import { Router } from 'express';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  eliminarSorteo,
  actualizarSorteo,
  getRuletaData,
  realizarSorteo,
} from '../controllers/sorteoController.js';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { upload } from '../middleware/upload.js';

// 🔁 Importamos las rutas de ruleta
import ruletaRoutes from './ruletaRoutes.js';

const router = Router();

// 👤 Rutas públicas (participante)
router.get('/', getSorteos);       // lista de sorteos visibles para usuario
router.get('/:id', getSorteoById); // detalle sorteo + números ocupados

// 🛠️ Rutas admin
router.post(
  '/crear',
  verifyToken,
  requireAdmin,
  upload.single('imagen'),
  crearSorteo
);

router.get('/:id/ruleta', verifyToken, requireAdmin, getRuletaData);
router.post('/:id/realizar', verifyToken, requireAdmin, realizarSorteo);

// editar / eliminar (admin)
router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  upload.single('imagen'),
  actualizarSorteo
);
router.delete('/:id', verifyToken, requireAdmin, eliminarSorteo);

// ✅ Aquí cuelgan las rutas de ruleta (info, programar, realizar, participantes)
router.use('/', ruletaRoutes);

export default router;