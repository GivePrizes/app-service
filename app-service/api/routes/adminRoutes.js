import { Router } from 'express';
import { verifyToken } from '../middleware/jwtValidate.js';
import { 
  getComprobantesPendientes, 
  aprobarComprobante, 
  rechazarComprobante 
} from '../controllers/adminController.js';

const router = Router();

// Solo admins (puedes añadir un check de rol después)
router.use(verifyToken);

router.get('/comprobantes', getComprobantesPendientes);
router.post('/comprobantes/aprobar/:id', aprobarComprobante);
router.post('/comprobantes/rechazar/:id', rechazarComprobante);

export default router;