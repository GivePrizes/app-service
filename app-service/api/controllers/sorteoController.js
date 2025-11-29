// api/controllers/sorteoController.js
import pool from '../utils/db.js';

export const getSorteos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             COALESCE(COUNT(np.numero), 0) as ocupados
      FROM sorteo s
      LEFT JOIN numero_participacion np ON s.id = np.sorteo_id AND np.estado = 'aprobado'
      WHERE s.estado = 'activo'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSorteoById = async (req, res) => {
  const { id } = req.params;
  try {
    const sorteo = await pool.query('SELECT * FROM sorteo WHERE id = $1', [id]);
    if (sorteo.rows.length === 0) return res.status(404).json({ error: 'Sorteo no encontrado' });

    const ocupados = await pool.query(`
      SELECT numero FROM numero_participacion 
      WHERE sorteo_id = $1 AND estado = 'aprobado'
    `, [id]);

    res.json({
      ...sorteo.rows[0],
      numeros_ocupados: ocupados.rows.map(r => r.numero)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const crearSorteo = async (req, res) => {
  const { descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO sorteo 
      (descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo]);

    res.json({ success: true, sorteo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const realizarSorteo = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('BEGIN');

    // Obtener números aprobados
    const nums = await pool.query(`
      SELECT numero FROM numero_participacion 
      WHERE sorteo_id = $1 AND estado = 'aprobado'
    `, [id]);

    if (nums.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay participantes aprobados' });
    }

    // Elegir ganador aleatorio
    const ganador = nums.rows[Math.floor(Math.random() * nums.rows.length)].numero;

    // Actualizar sorteo
    await pool.query(`
      UPDATE sorteo 
      SET numero_ganador = $1, estado = 'finalizado'
      WHERE id = $2
    `, [ganador, id]);

    await pool.query('COMMIT');
    res.json({ success: true, ganador });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
};