// api/controllers/adminController.js
import pool from '../utils/db.js';

export const getComprobantesPendientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT np.id,
             np.numero,
             np.comprobante_url,
             np.fecha,
             u.nombre   AS usuario,
             u.telefono AS telefono,
             s.descripcion AS sorteo,
             s.id       AS sorteo_id       -- 👈 coma antes de esta línea
      FROM numero_participacion np
      JOIN usuarios u ON np.usuario_id = u.id
      JOIN sorteo   s ON np.sorteo_id = s.id
      WHERE np.estado = 'pendiente'
      ORDER BY np.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en getComprobantesPendientes:', err); // 👈 ayuda para futuros errores
    res.status(500).json({ error: err.message });
  }
};



// Aprobar comprobante, y si se llena el sorteo -> marcar sorteo.estado = 'lleno'
export const aprobarComprobante = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('BEGIN');

    // 1) Obtener sorteo_id y usuario_id del número pendiente (y bloquearlo)
    const pendienteRes = await pool.query(
      `
      SELECT sorteo_id, usuario_id
      FROM numero_participacion
      WHERE id = $1 AND estado = 'pendiente'
      FOR UPDATE
      `,
      [id]
    );

    if (pendienteRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'Comprobante no encontrado o ya procesado' });
    }

    const sorteoId = pendienteRes.rows[0].sorteo_id;
    const usuarioId = pendienteRes.rows[0].usuario_id;

    // 2) Aprobar el comprobante (validando rowCount)
    const aprobarRes = await pool.query(
      `
      UPDATE numero_participacion
      SET estado = 'aprobado'
      WHERE id = $1 AND estado = 'pendiente'
      RETURNING id
      `,
      [id]
    );

    if (aprobarRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'El comprobante ya fue procesado' });
    }

    // 2.1) Crear/asegurar registro de entrega de cuenta (queda "pendiente")
    // (si ya existe por UNIQUE, ignoramos)
    await pool.query(
      `
      INSERT INTO entrega_cuenta (sorteo_id, usuario_id, estado)
      VALUES ($1, $2, 'pendiente')
      ON CONFLICT (sorteo_id, usuario_id) DO NOTHING
      `,
      [sorteoId, usuarioId]
    );

    // 3) Contar cuántos números aprobados tiene este sorteo
    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS aprobados
      FROM numero_participacion
      WHERE sorteo_id = $1 AND estado = 'aprobado'
      `,
      [sorteoId]
    );

    const aprobados = countRes.rows[0].aprobados;

    // 4) Obtener cantidad_numeros del sorteo + estado actual
    const sorteoRes = await pool.query(
      `
      SELECT cantidad_numeros, estado
      FROM sorteo
      WHERE id = $1
      `,
      [sorteoId]
    );

    if (sorteoRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const { cantidad_numeros, estado } = sorteoRes.rows[0];
    const debeLlenarse = estado === 'activo' && aprobados >= cantidad_numeros;

    // 5) Si ya se alcanzó el máximo y el sorteo está activo -> marcar como "lleno"
    if (debeLlenarse) {
      await pool.query(
        `
        UPDATE sorteo
        SET estado = 'lleno'
        WHERE id = $1
        `,
        [sorteoId]
      );
    }

    await pool.query('COMMIT');

    return res.json({
      success: true,
      message: 'Comprobante aprobado',
      sorteo_id: sorteoId,
      aprobados,
      lleno: debeLlenarse
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
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
