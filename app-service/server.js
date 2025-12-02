// server.js
import app from './index.js';

const PORT = process.env.PORT || 4000; // usa 4000 para no chocar con auth-service

app.listen(PORT, () => {
  console.log(`APP SERVICE corriendo en http://localhost:${PORT}`);
});
