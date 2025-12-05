//D:\carpetaRuleta2026\siempregana-app-service\app-service\api\middleware\upload.js
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({ storage });

export default upload;
