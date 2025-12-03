import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import {
  getComprobantesPendientes,
  aprobarComprobante,
  rechazarComprobante
} from '../controllers/adminController.js';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/comprobantes', getComprobantesPendientes);
router.post('/comprobantes/aprobar/:id', aprobarComprobante);
router.post('/comprobantes/rechazar/:id', rechazarComprobante);

export default router;
