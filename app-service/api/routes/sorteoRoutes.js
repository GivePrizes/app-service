// api/routes/sorteoRoutes.js
import { Router } from 'express';
import {
  getSorteos,
  getSorteoById,
  crearSorteo,
  eliminarSorteo,
  actualizarSorteo,
  getRuletaData,
} from '../controllers/sorteoController.js';

import { realizarRuleta } from '../controllers/ruletaController.js';

import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { upload } from '../middleware/upload.js';

// Importamos las rutas de ruleta
import ruletaRoutes from './ruletaRoutes.js';

const router = Router();

// Rutas públicas (participante)
router.get('/', getSorteos);       // lista de sorteos visibles para usuario
router.get('/:id', getSorteoById); // detalle sorteo + números ocupados

//  Rutas admin
router.post(
  '/crear',
  verifyToken,
  requireAdmin,
  upload.single('imagen'),
  crearSorteo
);

router.get('/:id/ruleta', verifyToken, requireAdmin, getRuletaData);

// girar ruleta (admin)
router.post('/:id/realizar', verifyToken, requireAdmin, realizarRuleta);

// editar / eliminar (admin)
router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  upload.single('imagen'),
  actualizarSorteo
);

router.delete('/:id', verifyToken, requireAdmin, eliminarSorteo);

// ✅ Aquí cuelgan las rutas de ruleta reales
// /:id/ruleta-info
// /:id/programar-ruleta
// /:id/realizar-ruleta
// /:id/ruleta-participantes
router.use('/', ruletaRoutes);

export default router;
