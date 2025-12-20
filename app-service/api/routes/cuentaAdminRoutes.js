// api/routes/cuentasAdminRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { listarCuentasPorSorteos, entregarCuenta } from '../controllers/cuentaController.js';
import { requirePermission } from '../middleware/requirePermission.js';


const router = Router();

// Por ahora solo admin. En el Paso 3 añadimos requirePermission('cuentas:gestionar')
router.use(verifyToken, requireAdmin);

// Añadimos middleware de permisos
router.use(requirePermission('cuentas:gestionar'));

// GET acordeón
router.get('/sorteos', listarCuentasPorSorteos);

// PATCH marcar entregada
router.patch('/sorteos/:sorteoId/usuarios/:usuarioId/entregar', entregarCuenta);

export default router;
