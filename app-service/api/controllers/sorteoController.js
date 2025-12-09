// api/controllers/sorteoController.js
import pool from '../utils/db.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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


/*
*y todo el flujo de subir a Supabase y hacer el INSERT).
*/

// api/controllers/sorteoController.js
export const crearSorteo = async (req, res) => {
  console.log("🟦 /api/sorteos/crear llamado");

  // Logs iniciales
  console.log("👉 BODY recibido:", req.body);
  console.log("👉 FILE recibido (req.file):", req.file);

  const { descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo } = req.body;
  const file = req.file;

  let imagen_url = null;

  try {
    // 1️⃣ Validación ligera del body
    if (!descripcion || !premio || !cantidad_numeros || !precio_numero || !fecha_sorteo) {
      console.error("❌ Error: faltan campos obligatorios.");
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    // 2️⃣ Si vino imagen, subir a Supabase
    if (file) {
      console.log("📤 Subiendo imagen a Supabase...");

      const ext = file.mimetype?.split("/")[1] || "jpg";
      const fileName = `sorteos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      console.log("📁 Nombre final del archivo:", fileName);

      const { data, error } = await supabase.storage
        .from("imagenes-sorteos") // bucket
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("❌ Error en supabase.storage.upload:", error);
        throw error;
      }

      console.log("✅ Imagen subida correctamente:", data);

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from("imagenes-sorteos")
        .getPublicUrl(fileName);

      imagen_url = publicData.publicUrl;
      console.log("🌐 URL pública generada:", imagen_url);
    } else {
      console.log("⚠️ No se envió imagen, imagen_url = null");
    }

    // 3️⃣ Insertar sorteo en BD
    console.log("📝 Insertando sorteo en la base de datos...");

    const result = await pool.query(
      `
      INSERT INTO sorteo
      (descripcion, premio, cantidad_numeros, precio_numero, fecha_sorteo, imagen_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        descripcion,
        premio,
        Number(cantidad_numeros),
        Number(precio_numero),
        fecha_sorteo,
        imagen_url,
      ]
    );

    console.log("✅ Sorteo insertado correctamente:", result.rows[0]);

    return res.json({
      success: true,
      sorteo: result.rows[0],
    });

  } catch (err) {
    console.error("🔥 ERROR en crearSorteo:", err);

    return res.status(500).json({
      error: err.message || "Error desconocido creando sorteo",
    });
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



export const eliminarSorteo = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sorteo WHERE id = $1', [id]);
    return res.json({ message: 'Sorteo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando sorteo:', err);
    return res.status(500).json({ error: 'Error al eliminar el sorteo' });
  }
};


// api/controllers/sorteoController.js
  //  Actualizar sorteo existente
  //  (sin manejo de imagen en esta función)
  //  (la imagen se maneja solo en crearSorteo con upload a Supabase)
  //  (aquí solo se actualizan los campos de texto/números/fecha)
export const actualizarSorteo = async (req, res) => {
  const { id } = req.params;
  const {
    descripcion,
    premio,
    precio_numero,
    cantidad_numeros,
    estado,
    imagen_url,
    fecha_sorteo,
  } = req.body;

  try {
    const { rowCount } = await pool.query(
      `
      UPDATE sorteo
      SET descripcion      = $1,
          premio           = $2,
          precio_numero    = $3,
          cantidad_numeros = $4,
          estado           = $5,
          imagen_url       = $6,
          fecha_sorteo     = $7
      WHERE id = $8
      `,
      [
        descripcion,
        premio,
        Number(precio_numero),
        Number(cantidad_numeros),
        estado,
        imagen_url,
        fecha_sorteo,
        id,
      ]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Sorteo no encontrado' });
    }

    return res.json({ message: 'Sorteo actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando sorteo:', err);
    return res
      .status(500)
      .json({ error: 'Error al actualizar el sorteo' });
  }
};
