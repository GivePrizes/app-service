import pool from '../utils/db.js';

export const getComprobantesPendientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT np.id, np.numero, np.comprobante_url, np.fecha, 
             u.nombre as usuario, s.descripcion as sorteo
      FROM numero_participacion np
      JOIN usuarios u ON np.usuario_id = u.id
      JOIN sorteo s ON np.sorteo_id = s.id
      WHERE np.estado = 'pendiente'
      ORDER BY np.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const aprobarComprobante = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`
      UPDATE numero_participacion 
      SET estado = 'aprobado' 
      WHERE id = $1 AND estado = 'pendiente'
    `, [id]);
    res.json({ success: true, message: 'Comprobante aprobado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const rechazarComprobante = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`
      UPDATE numero_participacion 
      SET estado = 'rechazado' 
      WHERE id = $1 AND estado = 'pendiente'
    `, [id]);
    res.json({ success: true, message: 'Comprobante rechazado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};