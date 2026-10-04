const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_experto_telecom',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ====== RUTAS DE LA API ======

// GET: Obtener historial de auditoría
app.get('/api/historial', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM registro_metricas ORDER BY id DESC LIMIT ?',
      [parseInt(limit)]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /api/historial:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Obtener resumen de estados
app.get('/api/resumen', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT estado_canal, COUNT(*) as cantidad FROM registro_metricas GROUP BY estado_canal'
    );
    connection.release();
    
    const summary = {
      Excelente: 0,
      Estable: 0,
      Inestable: 0,
      Crítico: 0
    };
    
    rows.forEach(row => {
      if (summary[row.estado_canal] !== undefined) {
        summary[row.estado_canal] = row.cantidad;
      }
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Error en GET /api/resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Obtener ofertas por operador
app.get('/api/ofertas/:operador', async (req, res) => {
  try {
    const { operador } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM ofertas_recarga WHERE operador = ? ORDER BY monto_min ASC',
      [operador]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /api/ofertas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Procesar inferencia y registrar
app.post('/api/evaluar', async (req, res) => {
  try {
    const { operador, monto_recarga, latencia_ms, datos_init_kb } = req.body;
    
    // Validación
    if (!operador || monto_recarga === undefined || latencia_ms === undefined || datos_init_kb === undefined) {
      return res.status(400).json({ error: 'Parámetros incompletos' });
    }
    
    const connection = await pool.getConnection();
    
    // Obtener oferta comercial
    const [offers] = await connection.query(
      `SELECT datos_recibidos_mb, dias_vigencia FROM ofertas_recarga 
       WHERE operador = ? AND ? BETWEEN monto_min AND monto_max 
       ORDER BY monto_min ASC LIMIT 1`,
      [operador, parseFloat(monto_recarga)]
    );
    
    let datosRecibidos = 0;
    let diasVigencia = 0;
    if (offers.length > 0) {
      datosRecibidos = offers[0].datos_recibidos_mb;
      diasVigencia = offers[0].dias_vigencia;
    }
    
    // Inferencia técnica del estado del canal
    let estadoCanal = 'Crítico';
    let analisisTecnico = 'El canal presenta latencia extrema o payload excesivo, con riesgo alto de fallo y pérdida de sesión.';
    let diagnostico = 'Condición crítica global del servicio.';
    let recomendacion = 'Rechazar la carga y activar protocolo de contingencia.';
    
    if (latencia_ms <= 50 && datos_init_kb <= 100) {
      estadoCanal = 'Excelente';
      analisisTecnico = 'El canal presenta latencia dentro del umbral óptimo y el payload inicial no genera congestión.';
      diagnostico = 'Canal estable y compatible con recarga sin riesgo operativo.';
      recomendacion = 'Autorizar carga y continuar con monitoreo estándar.';
    } else if (latencia_ms <= 100 && datos_init_kb <= 150) {
      estadoCanal = 'Estable';
      analisisTecnico = 'Se observan condiciones normales de operación, aunque existe ligera sensibilidad en la red.';
      diagnostico = 'Canal funcional con margen de operación aceptable.';
      recomendacion = 'Autorizar recarga con observación durante los próximos ciclos.';
    } else if (latencia_ms <= 140) {
      estadoCanal = 'Inestable';
      analisisTecnico = 'La latencia excede el rango recomendado y puede afectar la continuidad del servicio.';
      diagnostico = 'Se detecta degradación del canal y riesgo de interrupción.';
      recomendacion = 'Conmutación por USSD y revisar estabilidad del enlace.';
    }
    
    // Registrar en la base de datos
    await connection.query(
      `INSERT INTO registro_metricas 
       (operador, monto_recarga, latencia_ms, datos_init_kb, estado_canal, datos_recibidos_mb, dias_vigencia, analisis_tecnico, diagnostico, recomendacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [operador, monto_recarga, latencia_ms, datos_init_kb, estadoCanal, datosRecibidos, diasVigencia, analisisTecnico, diagnostico, recomendacion]
    );
    
    connection.release();
    
    res.json({
      id: Date.now(),
      operador,
      monto_recarga: parseFloat(monto_recarga),
      latencia_ms: parseInt(latencia_ms),
      datos_init_kb: parseFloat(datos_init_kb),
      estado_canal: estadoCanal,
      datos_recibidos_mb: datosRecibidos,
      dias_vigencia: diasVigencia,
      analisis_tecnico: analisisTecnico,
      diagnostico,
      recomendacion
    });
  } catch (error) {
    console.error('Error en POST /api/evaluar:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema Experto Telecom está operativo' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
