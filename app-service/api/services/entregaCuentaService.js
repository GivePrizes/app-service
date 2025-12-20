// api/services/entregaCuentaService.js
import pool from '../utils/db.js';

export async function getCuentasPorSorteos() {
  // Trae: sorteos + participantes aprobados + estado entrega + numeros agregados
  const result = await pool.query(`
    SELECT
      s.id AS sorteo_id,
      s.descripcion AS sorteo_descripcion,
      s.estado AS sorteo_estado,
      s.cantidad_numeros,

      u.id AS usuario_id,
      u.nombre AS usuario_nombre,
      u.email AS usuario_email,
      u.telefono AS usuario_telefono,

      ec.estado AS entrega_estado,
      ec.entregada_at,

      ARRAY_AGG(np.numero ORDER BY np.numero) AS numeros

    FROM entrega_cuenta ec
    JOIN sorteo s ON s.id = ec.sorteo_id
    JOIN usuarios u ON u.id = ec.usuario_id
    JOIN numero_participacion np
      ON np.sorteo_id = ec.sorteo_id
     AND np.usuario_id = ec.usuario_id
     AND np.estado = 'aprobado'

    GROUP BY
      s.id, s.descripcion, s.estado, s.cantidad_numeros,
      u.id, u.nombre, u.email, u.telefono,
      ec.estado, ec.entregada_at

    ORDER BY s.id DESC, u.nombre ASC;
  `);

  // Transformar a estructura por sorteo (para acordeón)
  const map = new Map();

  for (const row of result.rows) {
    if (!map.has(row.sorteo_id)) {
      map.set(row.sorteo_id, {
        sorteoId: row.sorteo_id,
        descripcion: row.sorteo_descripcion,
        estado: row.sorteo_estado,
        cantidadNumeros: row.cantidad_numeros,
        resumen: { pendientes: 0, entregadas: 0 },
        participantes: []
      });
    }

    const sorteo = map.get(row.sorteo_id);

    const entregaEstado = row.entrega_estado || 'pendiente';
    if (entregaEstado === 'pendiente') sorteo.resumen.pendientes += 1;
    if (entregaEstado === 'entregada') sorteo.resumen.entregadas += 1;

    // prefijo 57 (lo refinaremos en frontend, pero aquí lo dejamos listo)
    const telRaw = (row.usuario_telefono || '').toString().replace(/\D/g, '');
    const telefonoE164 = telRaw
      ? (telRaw.startsWith('57') ? telRaw : `57${telRaw}`)
      : '';

    sorteo.participantes.push({
      usuarioId: row.usuario_id,
      nombre: row.usuario_nombre,
      email: row.usuario_email,
      telefono: row.usuario_telefono,
      telefonoE164,
      numeros: row.numeros || [],
      entregaEstado,
      entregadaAt: row.entregada_at
    });
  }

  return Array.from(map.values());
}

export async function marcarEntregada({ sorteoId, usuarioId, adminId }) {
  const r = await pool.query(
    `
    UPDATE entrega_cuenta
    SET estado = 'entregada',
        entregada_por = $3,
        entregada_at = NOW()
    WHERE sorteo_id = $1 AND usuario_id = $2
    RETURNING id, sorteo_id, usuario_id, estado, entregada_at
    `,
    [sorteoId, usuarioId, adminId]
  );

  return r.rows[0] || null;
}
