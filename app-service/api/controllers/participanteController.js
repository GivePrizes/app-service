// api/controllers/participanteController.js
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

      const { error } = await supabase.storage
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

    for (const num of numerosArray) {
      // Rango válido
      if (num < 1 || num > sorteo.cantidad_numeros) {
        throw new Error(`El número ${num} está fuera del rango permitido.`);
      }

      // Bloqueamos la fila (si existe) para evitar condiciones de carrera
      const existingRes = await pool.query(
        `
        SELECT id, estado, usuario_id
        FROM numero_participacion
        WHERE sorteo_id = $1 AND numero = $2
        FOR UPDATE
        `,
        [sorteo_id, num]
      );

      if (existingRes.rows.length === 0) {
        // No existe ninguna fila -> insertar nueva
        await pool.query(
          `
          INSERT INTO numero_participacion
          (usuario_id, sorteo_id, numero, estado, comprobante_url)
          VALUES ($1, $2, $3, 'pendiente', $4)
          `,
          [usuario_id, sorteo_id, num, comprobante_url]
        );
      } else {
        const row = existingRes.rows[0];

        // Si está aprobado o pendiente, está apartando alguien (tú o otro)
        if (row.estado === 'aprobado' || row.estado === 'pendiente') {
          // Si quieres diferenciar entre él mismo u otro se podría revisar row.usuario_id
          throw new Error(
            `El número ${num} ya fue apartado por otro participante. Elige otro número.`
          );
        }

        // Si está rechazado, "liberamos" reutilizando la misma fila
        if (row.estado === 'rechazado') {
          await pool.query(
            `
            UPDATE numero_participacion
            SET usuario_id = $1,
                estado = 'pendiente',
                comprobante_url = $2,
                fecha = NOW()
            WHERE id = $3
            `,
            [usuario_id, comprobante_url, row.id]
          );
        } else {
          // Por si en el futuro aparecen otros estados raros
          throw new Error(`El número ${num} ya está ocupado.`);
        }
      }
    }

    await pool.query('COMMIT');
    return res.json({
      success: true,
      message: '¡Participación enviada! Tus números quedaron en pendiente de aprobación.',
    });
  } catch (err) {
    console.error('Error en guardarNumeros:', err);
    await pool.query('ROLLBACK').catch(() => {});
    return res.status(400).json({
      error: err.message || 'Error al guardar la participación',
    });
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
