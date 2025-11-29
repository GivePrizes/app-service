import { Router } from 'express';
import { guardarNumeros, misParticipaciones } from '../controllers/participanteController.js';
import { verifyToken } from '../middleware/jwtValidate.js';

const router = Router();

router.post('/guardar-numeros', verifyToken, guardarNumeros);
router.get('/mis-participaciones', verifyToken, misParticipaciones);

export default router;