import { Router } from 'express';
import { upload } from '../../index.js'; // o desde utils/upload.js si lo extrajiste
import { guardarNumeros } from '../controllers/participanteController.js';
import { verifyToken } from '../middleware/jwtValidate.js';

const router = Router();

// proteger la ruta si corresponde
router.post('/guardar-numeros', verifyToken, upload.single('comprobante'), guardarNumeros);

router.get('/mis-participaciones', verifyToken, misParticipaciones);

export default router;