// app-service/api/middleware/requirePermission.js
export const requirePermission = (perm) => (req, res, next) => {
  const permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];

  if (!permisos.includes(perm)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }

  return next();
};
