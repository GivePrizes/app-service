// api/controllers/ruletaController.js
import pool from '../utils/db.js';

/**
 *  PROGRAMAR RULETA
 * POST /api/sorteos/:id/programar-ruleta
 * Body:
 *  - tiempoMinutos (number)  -> opcional
 *  - fechaPersonalizada (ISO) -> opcional
 *
 * Regla:
 *  - Solo se puede programar si el sorteo está "lleno"
 */
export const programarRuleta = async (req, res) => {
  const sorteoId = parseInt(req.params.id, 10);
  const { tiempoMinutos, fechaPersonalizada } = req.body;

  if (Number.isNaN(sorteoId)) {
    return res.status(400).json({ error: 'ID de sorteo inválido' });
  }

  try {
    // 1) Verificar sorteo
    const sorteoRes = await pool.query(
      `SELECT
         id,
         estado,
         ruleta_estado,
         ruleta_realizada_at,
         numero_ganador
       FROM sorteo
       WHERE id = $1`,
      [sorteoId]
    );

    if (sorteoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteoRes.rows[0];

    // ✅ Regla: solo se programa si está LLENO
    if (sorteo.estado !== 'lleno') {
      return res.status(400).json({
        error: `Solo puedes programar la ruleta cuando el sorteo esté LLENO. Estado actual: "${sorteo.estado}".`,
      });
    }

    // ✅ Bloqueos anti-reprogramación
    if (
      sorteo.ruleta_realizada_at ||
      sorteo.numero_ganador ||
      sorteo.ruleta_estado === 'finalizada'
    ) {
      return res.status(409).json({
        error: 'La ruleta ya fue realizada. No se puede reprogramar.',
      });
    }

    if (sorteo.ruleta_estado !== 'no_programada') {
      return res.status(409).json({
        error: `La ruleta ya está en estado "${sorteo.ruleta_estado}".`,
      });
    }

    // 2) Calcular hora programada
    let ruletaHora;

    if (fechaPersonalizada) {
      const d = new Date(fechaPersonalizada);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: 'fechaPersonalizada inválida' });
      }
      ruletaHora = d;
    } else {
      const min = parseInt(tiempoMinutos ?? '10', 10);
      if (Number.isNaN(min) || min <= 0) {
        return res.status(400).json({ error: 'tiempoMinutos inválido' });
      }
      ruletaHora = new Date();
      ruletaHora.setMinutes(ruletaHora.getMinutes() + min);
    }

    // ✅ Guardar siempre en UTC (ISO)
    const ruletaHoraUTC = ruletaHora.toISOString();

    // 3) Guardar ruleta (sin tocar estado del sorteo: se mantiene "lleno")
    const updateQuery = `
      UPDATE sorteo
      SET
        ruleta_estado = 'programada',
        ruleta_hora_programada = $1
      WHERE id = $2
        AND ruleta_estado = 'no_programada'
        AND ruleta_realizada_at IS NULL
        AND numero_ganador IS NULL
      RETURNING id, estado, ruleta_estado, ruleta_hora_programada;
    `;

    const { rows } = await pool.query(updateQuery, [ruletaHoraUTC, sorteoId]);

    if (rows.length === 0) {
      return res.status(409).json({
        error: 'No se pudo programar: ya estaba programada o ya fue realizada.',
      });
    }

    return res.json({
      success: true,
      message: 'Ruleta programada correctamente',
      sorteo: rows[0],
    });
  } catch (err) {
    console.error('Error en programarRuleta:', err);
    return res.status(500).json({
      error: 'Error interno al programar la ruleta',
      detail: err?.message,
    });
  }
};

/**
 *  INFO PÚBLICA DE RULETA
 * GET /api/sorteos/:id/ruleta-info
 *
 * Lo usan admin y participantes para:
 *  - ver estado de ruleta
 *  - ver contador (ruleta_hora_programada)
 *  - ver ganador cuando exista
 */
export const getRuletaInfo = async (req, res) => {
  const sorteoId = parseInt(req.params.id, 10);

  if (Number.isNaN(sorteoId)) {
    return res.status(400).json({ error: 'ID de sorteo inválido' });
  }

  try {
    const query = `
      SELECT
        s.id,
        s.descripcion,
        s.premio,
        s.cantidad_numeros,
        s.estado,
        s.ruleta_estado,
        s.ruleta_hora_programada,
        s.ruleta_realizada_at,
        s.modo_sorteo,
        s.numero_ganador,
        s.top_buyer_user_id,
        u_top.nombre       AS top_buyer_nombre,
        u_top.telefono     AS top_buyer_telefono,
        u_ganador.nombre   AS ganador_nombre,
        u_ganador.telefono AS ganador_telefono
      FROM sorteo s
      -- Ganador: buscamos la fila de numero_participacion con ese número ganador
      LEFT JOIN numero_participacion np
        ON np.sorteo_id = s.id
       AND np.numero    = s.numero_ganador
       AND np.estado    = 'aprobado'
      LEFT JOIN usuarios u_ganador
        ON u_ganador.id = np.usuario_id
      -- Top buyer
      LEFT JOIN usuarios u_top
        ON u_top.id = s.top_buyer_user_id
      WHERE s.id = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [sorteoId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const data = rows[0];

    return res.json({
      sorteo_id: data.id,
      descripcion: data.descripcion,
      premio: data.premio,
      cantidad_numeros: data.cantidad_numeros,
      estado_sorteo: data.estado,
      ruleta_estado: data.ruleta_estado,
      ruleta_hora_programada: data.ruleta_hora_programada,
      ruleta_realizada_at: data.ruleta_realizada_at,
      modo_sorteo: data.modo_sorteo,
      numero_ganador: data.numero_ganador,
      ganador: data.numero_ganador
        ? {
            nombre: data.ganador_nombre,
            telefono: data.ganador_telefono,
          }
        : null,
      topBuyer: data.top_buyer_user_id
        ? {
            user_id: data.top_buyer_user_id,
            nombre: data.top_buyer_nombre,
            telefono: data.top_buyer_telefono,
          }
        : null,
    });
  } catch (err) {
    console.error('Error en getRuletaInfo:', err);
    return res.status(500).json({ error: 'Error interno al obtener info de ruleta' });
  }
};

/**
 *  LISTA DE PARTICIPANTES PARA LA RULETA
 * GET /api/sorteos/:id/ruleta-participantes
 *
 * Admin: ve nombres completos.
 * Más adelante podemos hacer una versión "anonimizada" para participantes.
 */
export const getRuletaParticipantes = async (req, res) => {
  const sorteoId = parseInt(req.params.id, 10);

  if (Number.isNaN(sorteoId)) {
    return res.status(400).json({ error: 'ID de sorteo inválido' });
  }

  try {
    const query = `
      SELECT
        np.id,
        np.numero,
        np.usuario_id,
        u.nombre,
        u.telefono
      FROM numero_participacion np
      JOIN usuarios u
        ON u.id = np.usuario_id
      WHERE np.sorteo_id = $1
        AND np.estado = 'aprobado'
      ORDER BY np.numero ASC;
    `;

    const { rows } = await pool.query(query, [sorteoId]);

    return res.json({
      sorteo_id: sorteoId,
      total: rows.length,
      participantes: rows.map((r) => ({
        participacion_id: r.id,
        numero: r.numero,
        usuario_id: r.usuario_id,
        nombre: r.nombre,
        telefono: r.telefono,
      })),
    });
  } catch (err) {
    console.error('Error en getRuletaParticipantes:', err);
    return res.status(500).json({
      error: 'Error interno al obtener participantes de la ruleta',
    });
  }
};

/**
 *  REALIZAR RULETA (GIRAR)
 * POST /api/sorteos/:id/realizar-ruleta
 *
 * - Valida hora programada
 * - Respeta modo_sorteo
 * - Guarda ganador y top buyer
 * - Inserta registro en ruleta_log
 */
export const realizarRuleta = async (req, res) => {
  const sorteoId = parseInt(req.params.id, 10);
  const adminId = req.user?.id || null;

  if (Number.isNaN(sorteoId)) {
    return res.status(400).json({ error: 'ID de sorteo inválido' });
  }

  try {
    await pool.query('BEGIN');

    // 1) Obtener sorteo con bloqueo
    const sorteoRes = await pool.query(
      `
      SELECT
        id,
        estado,
        ruleta_estado,
        ruleta_hora_programada,
        modo_sorteo
      FROM sorteo
      WHERE id = $1
      FOR UPDATE
      `,
      [sorteoId]
    );

    if (sorteoRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    const sorteo = sorteoRes.rows[0];

    if (sorteo.ruleta_estado !== 'programada') {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        error: 'La ruleta no está en estado "programada".',
      });
    }

    const ahora = new Date();
    const programada = sorteo.ruleta_hora_programada
      ? new Date(sorteo.ruleta_hora_programada)
      : null;

    if (!programada || ahora < programada) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        error: 'Todavía no es la hora programada de la ruleta.',
      });
    }

    // 2) Traer participaciones aprobadas
    const participacionesRes = await pool.query(
      `
      SELECT
        np.id,
        np.numero,
        np.usuario_id,
        u.nombre,
        u.telefono
      FROM numero_participacion np
      JOIN usuarios u
        ON u.id = np.usuario_id
      WHERE np.sorteo_id = $1
        AND np.estado = 'aprobado'
      ORDER BY np.numero ASC
      `,
      [sorteoId]
    );

    const participaciones = participacionesRes.rows;

    if (participaciones.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        error: 'No hay participaciones aprobadas para este sorteo.',
      });
    }

    // Helper: random index
    const randomIndex = (max) => Math.floor(Math.random() * max);

    // 3) Calcular top buyer (usuario con más números)
    const conteoPorUsuario = new Map();
    for (const p of participaciones) {
      conteoPorUsuario.set(
        p.usuario_id,
        (conteoPorUsuario.get(p.usuario_id) || 0) + 1
      );
    }

    let topBuyerUserId = null;
    if (conteoPorUsuario.size > 0) {
      let maxCompras = -1;
      let candidatos = [];
      conteoPorUsuario.forEach((count, userId) => {
        if (count > maxCompras) {
          maxCompras = count;
          candidatos = [userId];
        } else if (count === maxCompras) {
          candidatos.push(userId);
        }
      });
      topBuyerUserId = candidatos[randomIndex(candidatos.length)];
    }

    // 4) Seleccionar ganador según modo_sorteo
    const modo = sorteo.modo_sorteo; // 'ALEATORIO' | 'PONDERADO_POR_NUMEROS' | 'PREMIO_TOP_COMPRADOR' | 'TOP_BUYER'
    let ganador;

    if (modo === 'ALEATORIO') {
      // Igual probabilidad por usuario (no por número)
      const porUsuario = new Map();
      for (const p of participaciones) {
        if (!porUsuario.has(p.usuario_id)) {
          porUsuario.set(p.usuario_id, []);
        }
        porUsuario.get(p.usuario_id).push(p);
      }

      const usuarios = Array.from(porUsuario.keys());
      const userIdGanador = usuarios[randomIndex(usuarios.length)];
      const participacionesDeUsuario = porUsuario.get(userIdGanador);
      ganador = participacionesDeUsuario[randomIndex(participacionesDeUsuario.length)];
    } else if (modo === 'TOP_BUYER') {
      // El usuario con más participaciones gana directamente
      const maxUserId = Array.from(conteoPorUsuario.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      ganador = participaciones.find(p => p.usuario_id === maxUserId);
    } else {
      // PONDERADO_POR_NUMEROS y PREMIO_TOP_COMPRADOR:
      // cada número cuenta como una entrada en el "bombo".
      ganador = participaciones[randomIndex(participaciones.length)];
    }

    if (!ganador) {
      await pool.query('ROLLBACK');
      return res.status(500).json({ error: 'No se pudo determinar un ganador.' });
    }

    // 5) Actualizar sorteo con resultado
    const updateSorteoQuery = `
      UPDATE sorteo
      SET
        numero_ganador      = $1,
        ruleta_estado       = 'finalizada',
        ruleta_realizada_at = NOW(),
        top_buyer_user_id   = $2
      WHERE id = $3
        AND ruleta_realizada_at IS NULL
        AND numero_ganador IS NULL
        AND ruleta_estado = 'programada'
      RETURNING *;
    `;

    const updatedSorteoRes = await pool.query(updateSorteoQuery, [
      ganador.numero,
      topBuyerUserId,
      sorteoId,
    ]);

    if (updatedSorteoRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ error: 'La ruleta ya fue realizada anteriormente.' });
    }
    const updatedSorteo = updatedSorteoRes.rows[0];

    // 6) Insertar en ruleta_log (histórico)
    const participantesSnapshot = participaciones.map((p) => ({
      participacion_id: p.id,
      numero: p.numero,
      usuario_id: p.usuario_id,
      nombre: p.nombre,
      telefono: p.telefono,
    }));

    await pool.query(
      `
      INSERT INTO ruleta_log (
        sorteo_id,
        modo_sorteo,
        ganador_numero,
        ganador_usuario_id,
        top_buyer_user_id,
        participantes,
        ejecutado_por_admin_id
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      `,
      [
        sorteoId,
        modo,
        ganador.numero,
        ganador.usuario_id,
        topBuyerUserId,
        JSON.stringify(participantesSnapshot),
        adminId,
      ]
    );

    await pool.query('COMMIT');

    return res.json({
      success: true,
      message: 'Ruleta realizada correctamente',
      sorteo: updatedSorteo,
      ganador: {
        usuario_id: ganador.usuario_id,
        nombre: ganador.nombre,
        telefono: ganador.telefono,
        numero: ganador.numero,
      },
      topBuyer: topBuyerUserId
        ? {
            usuario_id: topBuyerUserId,
            totalNumeros: conteoPorUsuario.get(topBuyerUserId) || 0,
          }
        : null,
    });
  } catch (err) {
    console.error('Error en realizarRuleta:', err);
    try {
      await pool.query('ROLLBACK');
    } catch (_) {
      // nada
    }
    return res.status(500).json({ error: 'Error interno al realizar la ruleta' });
  }
};


// ✅ NÚMEROS APROBADOS (SIN DATOS PERSONALES)
// GET /api/sorteos/:id/ruleta-numeros
export const getRuletaNumeros = async (req, res) => {
  const sorteoId = parseInt(req.params.id, 10);

  if (Number.isNaN(sorteoId)) {
    return res.status(400).json({ error: 'ID de sorteo inválido' });
  }

  try {
    const q = `
      SELECT numero
      FROM numero_participacion
      WHERE sorteo_id = $1
        AND estado = 'aprobado'
      ORDER BY numero ASC;
    `;

    const { rows } = await pool.query(q, [sorteoId]);

    return res.json({
      sorteo_id: sorteoId,
      total: rows.length,
      numeros: rows.map(r => r.numero),
    });
  } catch (err) {
    console.error('Error en getRuletaNumeros:', err);
    return res.status(500).json({ error: 'Error interno al obtener números de ruleta' });
  }
};

