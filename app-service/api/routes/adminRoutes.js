// api/routes/adminRoutes.js
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/jwtValidate.js';
import { 
  getComprobantesPendientes, 
  aprobarComprobante, 
  rechazarComprobante 
} from '../controllers/adminController.js';

const router = Router();

// Todas las rutas de /api/admin requieren:
// 1) estar autenticado
// 2) ser admin
router.use(verifyToken, requireAdmin);

router.get('/comprobantes', getComprobantesPendientes);
router.post('/comprobantes/aprobar/:id', aprobarComprobante);
router.post('/comprobantes/rechazar/:id', rechazarComprobante);

export default router;
