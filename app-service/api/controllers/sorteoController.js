// api/controllers/sorteoController.js
import pool from '../utils/db.js';

export const getSorteos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
             COALESCE(COUNT(np.numero), 0) AS ocupados
      FROM sorteo s
      LEFT JOIN numero_participacion np
        ON s.id = np.sorteo_id AND np.estado = 'aprobado'
      WHERE s.estado IN ('activo', 'lleno')
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
    if (sorteo.rows.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const ocupados = await pool.query(
      `
      SELECT numero
      FROM numero_participacion
      WHERE sorteo_id = $1 AND estado = 'aprobado'
      `,
      [id]
    );

    res.json({
      ...sorteo.rows[0],
      numeros_ocupados: ocupados.rows.map(r => r.numero)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const crearSorteo = async (req, res) => {
  const { descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo } =
    req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO sorteo
      (descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo]
    );

    res.json({ success: true, sorteo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Datos para alimentar la ruleta (solo números aprobados)
export const getRuletaData = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Info del sorteo
    const sorteoRes = await pool.query(
      `
      SELECT id, descripcion, premio, cantidad_numeros, estado
      FROM sorteo
      WHERE id = $1
      `,
      [id]
    );

    if (sorteoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteoRes.rows[0];

    // 2. Participantes aprobados
    const participantesRes = await pool.query(
      `
      SELECT np.numero,
             u.nombre,
             u.telefono
      FROM numero_participacion np
      JOIN usuarios u ON np.usuario_id = u.id
      WHERE np.sorteo_id = $1
        AND np.estado = 'aprobado'
      ORDER BY np.numero ASC
      `,
      [id]
    );

    if (participantesRes.rows.length === 0) {
      return res
        .status(400)
        .json({ error: 'No hay participantes aprobados para este sorteo' });
    }

    const participantes = participantesRes.rows.map(row => {
      const nombre = row.nombre?.trim() || '';
      const partes = nombre.split(' ').filter(Boolean);
      const primero = partes[0] || '';
      const segundo = partes[1] || '';
      const nombre_corto =
        segundo.length > 0
          ? `${primero} ${segundo.charAt(0).toUpperCase()}.`
          : primero;

      return {
        numero: row.numero,
        nombre: row.nombre,
        nombre_corto,
        telefono: row.telefono
      };
    });

    res.json({
      sorteo,
      participantes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Realizar sorteo solo si está "lleno" (o con todos los aprobados)
export const realizarSorteo = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('BEGIN');

    // 1. Obtener sorteo y bloquearlo
    const sorteoRes = await pool.query(
      `
      SELECT id, cantidad_numeros, estado
      FROM sorteo
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (sorteoRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteoRes.rows[0];

    if (sorteo.estado === 'finalizado') {
      await pool.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'El sorteo ya fue finalizado anteriormente' });
    }

    // 2. Obtener números aprobados
    const nums = await pool.query(
      `
      SELECT numero
      FROM numero_participacion
      WHERE sorteo_id = $1 AND estado = 'aprobado'
      `,
      [id]
    );

    const aprobados = nums.rows.length;

    if (aprobados === 0) {
      await pool.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'No hay participantes aprobados' });
    }

    // 3. Verificar que el sorteo esté completo
    if (aprobados < sorteo.cantidad_numeros) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        error: 'El sorteo aún no está completo',
        faltan: sorteo.cantidad_numeros - aprobados
      });
    }

    // 4. Elegir ganador aleatorio
    const ganador =
      nums.rows[Math.floor(Math.random() * nums.rows.length)].numero;

    // 5. Actualizar sorteo: guardar número ganador y marcar finalizado
    await pool.query(
      `
      UPDATE sorteo
      SET numero_ganador = $1,
          estado = 'finalizado'
      WHERE id = $2
      `,
      [ganador, id]
    );

    await pool.query('COMMIT');
    res.json({ success: true, ganador });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
};
