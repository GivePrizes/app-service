import pool from '../utils/db.js';
import { createClient } from '@supabase/supabase-js';

// ⚠️ En backend usa SIEMPRE la service role, NO la anon key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const guardarNumeros = async (req, res) => {
  const { sorteo_id, numeros, comprobante } = req.body;
  const usuario_id = req.user.id;

  // Normalizar numeros -> siempre array
  const numerosArray =
    Array.isArray(numeros)
      ? numeros
      : typeof numeros === 'string'
        ? JSON.parse(numeros)
        : [];

  // Validación correcta sobre numerosArray
  if (!Array.isArray(numerosArray) || numerosArray.length < 1 || numerosArray.length > 5) {
    return res.status(400).json({ error: 'Debes elegir entre 1 y 5 números' });
  }

  try {
    // 1. Verificar sorteo activo
    const sorteoRes = await pool.query(
      'SELECT * FROM sorteo WHERE id = $1 AND estado = $2',
      [sorteo_id, 'activo']
    );
    if (sorteoRes.rows.length === 0) {
      return res.status(400).json({ error: 'Sorteo no disponible' });
    }

    const sorteo = sorteoRes.rows[0];

    // 2. Subir comprobante a Supabase Storage (si viene)
    let comprobante_url = null;
    if (comprobante) {
      const base64Data = comprobante.replace(/^data:.+;base64,/, '');
      const headerPart = comprobante.split(';')[0];    // "data:image/png"
      const contentType = headerPart.split(':')[1] || 'image/png'; // "image/png"
      const fileExt = headerPart.split('/')[1] || 'png';           // "png"

      const fileName = `comprobantes/${usuario_id}-${sorteo_id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, Buffer.from(base64Data, 'base64'), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Error subiendo comprobante a Supabase:', error);
        throw new Error('No se pudo guardar el comprobante, intenta de nuevo.');
      }

      const { data: publicData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName);

      comprobante_url = publicData.publicUrl;
    }

    // 3. Guardar números (transacción)
    await pool.query('BEGIN');

    // Verificar que cada número sea válido y no esté ocupado
    for (const num of numerosArray) {
      if (num < 1 || num > sorteo.cantidad_numeros) {
        throw new Error(`Número ${num} fuera de rango`);
      }

      const existe = await pool.query(
        `SELECT 1
         FROM numero_participacion
         WHERE sorteo_id = $1 AND numero = $2 AND estado = $3`,
        [sorteo_id, num, 'aprobado']
      );

      if (existe.rows.length > 0) {
        throw new Error(`El número ${num} ya está ocupado`);
      }
    }

    // Insertar todos como 'pendiente'
    for (const num of numerosArray) {
      await pool.query(
        `
        INSERT INTO numero_participacion
        (usuario_id, sorteo_id, numero, estado, comprobante_url)
        VALUES ($1, $2, $3, 'pendiente', $4)
        `,
        [usuario_id, sorteo_id, num, comprobante_url]
      );
    }

    await pool.query('COMMIT');
    return res.json({
      success: true,
      message: '¡Participación enviada! Esperando aprobación...',
    });
  } catch (err) {
    console.error('Error en guardarNumeros:', err);
    await pool.query('ROLLBACK').catch(() => {});

    // Si viene del motor de Postgres (por ejemplo RLS en otra tabla) lo devolvemos igual
    return res.status(400).json({ error: err.message || 'Error al guardar la participación' });
  }
};

export const misParticipaciones = async (req, res) => {
  const usuario_id = req.user.id;
  try {
    const result = await pool.query(
      `
      SELECT np.*, s.descripcion, s.premio
      FROM numero_participacion np
      JOIN sorteo s ON np.sorteo_id = s.id
      WHERE np.usuario_id = $1
      ORDER BY np.fecha DESC
      `,
      [usuario_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error en misParticipaciones:', err);
    res.status(500).json({ error: err.message });
  }
};
