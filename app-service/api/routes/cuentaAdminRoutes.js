// api/routes/cuentaAdminRoutes.js
import { Router } from 'express';
import { verifyToken } from '../middleware/jwtValidate.js';
import { listarCuentasPorSorteos, entregarCuenta } from '../controllers/cuentasController.js';

// ✅ Si quieres restringir SOLO a "cuentas", aquí cambias requireAdmin por requireCuentas
import { requireAdmin } from '../middleware/jwtValidate.js';

const router = Router();

// /api/admin/cuentas/...
router.use(verifyToken, requireAdmin);

// GET /api/admin/cuentas/sorteos
router.get('/sorteos', listarCuentasPorSorteos);

// PATCH /api/admin/cuentas/sorteos/:sorteoId/usuarios/:usuarioId/entregar
router.patch('/sorteos/:sorteoId/usuarios/:usuarioId/entregar', entregarCuenta);

export default router;
