// api/routes/participanteRoutes.js
import { Router } from 'express';
import {
  guardarNumeros,
  misParticipaciones,
} from '../controllers/participanteController.js';
import { verifyToken } from '../middleware/jwtValidate.js';

const router = Router();

// Aquí NO usamos upload porque el comprobante viene en base64 en el body
router.post('/guardar-numeros', verifyToken, guardarNumeros);

router.get('/mis-participaciones', verifyToken, misParticipaciones);

export default router;
