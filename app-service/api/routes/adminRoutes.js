import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  getComprobantesPendientes,
  aprobarComprobante,
  rechazarComprobante
} from '../controllers/adminController.js';

const router = Router();

// Todos los admin pasan por aquí
router.use(verifyToken, requireAdmin);

// 👇 SOLO admins con permiso de pagos
router.get(
  '/comprobantes',
  requirePermission('pagos:aprobar'),
  getComprobantesPendientes
);

router.post(
  '/comprobantes/aprobar/:id',
  requirePermission('pagos:aprobar'),
  aprobarComprobante
);

router.post(
  '/comprobantes/rechazar/:id',
  requirePermission('pagos:aprobar'),
  rechazarComprobante
);

export default router;
