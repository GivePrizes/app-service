// api/controllers/cuentasController.js
import { getCuentasPorSorteos, marcarEntregada } from '../services/entregaCuentaService.js';

export const listarCuentasPorSorteos = async (req, res) => {
  try {
    const data = await getCuentasPorSorteos();
    return res.json(data);
  } catch (err) {
    console.error('Error listarCuentasPorSorteos:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const entregarCuenta = async (req, res) => {
  try {
    const sorteoId = parseInt(req.params.sorteoId, 10);
    const usuarioId = parseInt(req.params.usuarioId, 10);

    if (Number.isNaN(sorteoId) || Number.isNaN(usuarioId)) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const adminId = req.user?.id || null;

    const updated = await marcarEntregada({ sorteoId, usuarioId, adminId });

    if (!updated) {
      return res.status(404).json({ error: 'Registro no encontrado en entrega_cuenta' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error entregarCuenta:', err);
    return res.status(500).json({ error: err.message });
  }
};
