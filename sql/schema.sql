CREATE DATABASE IF NOT EXISTS sistema_experto_telecom;
USE sistema_experto_telecom;

-- --------------------------------------------------------------------
-- TABLA 1: REGISTRO DE MÉTRICAS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registro_metricas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operador VARCHAR(20) NOT NULL,
    monto_recarga DECIMAL(10,2) NOT NULL,
    latencia_ms INT NOT NULL,
    datos_init_kb DECIMAL(10,2) NOT NULL,
    estado_canal VARCHAR(50) NOT NULL,
    datos_recibidos_mb INT NOT NULL,
    dias_vigencia INT NOT NULL,
    analisis_tecnico TEXT NOT NULL,
    diagnostico TEXT NOT NULL,
    recomendacion TEXT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operador_estado (operador, estado_canal),
    INDEX idx_fecha_registro (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- TABLA 2: OFERTAS DE RECARGA
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ofertas_recarga (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operador VARCHAR(20) NOT NULL,
    monto_min DECIMAL(10,2) NOT NULL,
    monto_max DECIMAL(10,2) NOT NULL,
    datos_recibidos_mb INT NOT NULL,
    dias_vigencia INT NOT NULL,
    descripcion VARCHAR(100) NOT NULL DEFAULT '',
    CONSTRAINT chk_montos CHECK (monto_max >= monto_min),
    CONSTRAINT chk_datos CHECK (datos_recibidos_mb > 0),
    INDEX idx_operador_rango (operador, monto_min, monto_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- INSERCIÓN DE DATOS INICIALES
-- --------------------------------------------------------------------
TRUNCATE TABLE ofertas_recarga;
INSERT INTO ofertas_recarga (operador, monto_min, monto_max, datos_recibidos_mb, dias_vigencia, descripcion) VALUES 
('Tigo', 0.00, 20.00, 500, 1, 'Paquete básico de prueba'),
('Tigo', 21.00, 60.00, 3072, 3, 'Recarga media para navegación y chat'),
('Tigo', 61.00, 500.00, 10240, 7, 'Paquete de uso regular'),
('Tigo', 501.00, 9999.00, 25600, 15, 'Paquete amplio para usuarios intensivos'),
('Claro', 0.00, 20.00, 400, 1, 'Paquete esencial'),
('Claro', 21.00, 60.00, 2500, 4, 'Recarga equilibrada'),
('Claro', 61.00, 500.00, 12288, 8, 'Recarga de uso frecuente'),
('Claro', 501.00, 9999.00, 30720, 20, 'Paquete premium');

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_ObtenerHistorialAuditoria$$
CREATE PROCEDURE sp_ObtenerHistorialAuditoria(
    IN p_limite INT
)
BEGIN
    SELECT 
        id,
        operador,
        CONCAT('$', FORMAT(monto_recarga, 2)) AS monto,
        CONCAT(latencia_ms, ' ms') AS latencia,
        CONCAT(datos_init_kb, ' KB') AS datos_iniciales,
        estado_canal,
        CASE 
            WHEN datos_recibidos_mb >= 1024 THEN CONCAT(TRUNCATE(datos_recibidos_mb/1024, 1), ' GB')
            ELSE CONCAT(datos_recibidos_mb, ' MB')
        END AS bolsa_datos_restantes,
        CONCAT(dias_vigencia, ' Días') AS vigencia,
        DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') AS fecha_registro
    FROM registro_metricas
    ORDER BY id DESC
    LIMIT LEAST(GREATEST(p_limite, 1), 1000);
END$$

DROP PROCEDURE IF EXISTS sp_ProcesarInferenciaYRegistrar$$
CREATE PROCEDURE sp_ProcesarInferenciaYRegistrar(
    IN p_operador VARCHAR(20),
    IN p_monto_recarga DECIMAL(10,2),
    IN p_latencia_ms INT,
    IN p_datos_init_kb DECIMAL(10,2)
)
BEGIN
    DECLARE v_datos_recibidos_mb INT;
    DECLARE v_dias_vigencia INT;
    DECLARE v_estado_canal VARCHAR(50);
    DECLARE v_analisis_tecnico TEXT;
    DECLARE v_diagnostico TEXT;
    DECLARE v_recomendacion TEXT;

    -- Selección dinámica de oferta comercial basada en rango de monto
    SELECT datos_recibidos_mb, dias_vigencia
    INTO v_datos_recibidos_mb, v_dias_vigencia
    FROM ofertas_recarga
    WHERE operador = p_operador
      AND p_monto_recarga BETWEEN monto_min AND monto_max
    ORDER BY monto_min ASC
    LIMIT 1;

    -- Valores por defecto en caso de no coincidir con ninguna oferta
    IF v_datos_recibidos_mb IS NULL THEN
        SET v_datos_recibidos_mb = 0;
        SET v_dias_vigencia = 0;
    END IF;

    -- Inferencia técnica del estado del canal
    IF p_latencia_ms <= 50 AND p_datos_init_kb <= 100 THEN
        SET v_estado_canal = 'Excelente';
        SET v_analisis_tecnico = 'El canal presenta latencia dentro del umbral óptimo y el payload inicial no genera congestión.';
        SET v_diagnostico = 'Canal estable y compatible con recarga sin riesgo operativo.';
        SET v_recomendacion = 'Autorizar carga y continuar con monitoreo estándar.';
    ELSEIF p_latencia_ms <= 100 AND p_datos_init_kb <= 150 THEN
        SET v_estado_canal = 'Estable';
        SET v_analisis_tecnico = 'Se observan condiciones normales de operación, aunque existe ligera sensibilidad en la red.';
        SET v_diagnostico = 'Canal funcional con margen de operación aceptable.';
        SET v_recomendacion = 'Autorizar recarga con observación durante los próximos ciclos.';
    ELSEIF p_latencia_ms <= 140 THEN
        SET v_estado_canal = 'Inestable';
        SET v_analisis_tecnico = 'La latencia excede el rango recomendado y puede afectar la continuidad del servicio.';
        SET v_diagnostico = 'Se detecta degradación del canal y riesgo de interrupción.';
        SET v_recomendacion = 'Conmutación por USSD y revisar estabilidad del enlace.';
    ELSE
        SET v_estado_canal = 'Crítico';
        SET v_analisis_tecnico = 'El canal presenta latencia extrema o payload excesivo, con riesgo alto de fallo y pérdida de sesión.';
        SET v_diagnostico = 'Condición crítica global del servicio.';
        SET v_recomendacion = 'Rechazar la carga y activar protocolo de contingencia.';
    END IF;

    -- Ajuste de recomendación si la oferta comercial es insuficiente
    IF v_datos_recibidos_mb = 0 THEN
        SET v_recomendacion = CONCAT(v_recomendacion, ' Oferta no catalogada para este operador y monto.');
    END IF;

    INSERT INTO registro_metricas (
        operador,
        monto_recarga,
        latencia_ms,
        datos_init_kb,
        estado_canal,
        datos_recibidos_mb,
        dias_vigencia,
        analisis_tecnico,
        diagnostico,
        recomendacion
    ) VALUES (
        p_operador,
        p_monto_recarga,
        p_latencia_ms,
        p_datos_init_kb,
        v_estado_canal,
        v_datos_recibidos_mb,
        v_dias_vigencia,
        v_analisis_tecnico,
        v_diagnostico,
        v_recomendacion
    );
END$$

DELIMITER ;

-- Caso de Prueba 1: Canal óptimo para Tigo
CALL sp_ProcesarInferenciaYRegistrar('Tigo', 50.00, 45, 30);

-- Caso de Prueba 2: Canal Inestable para Claro por latencia
CALL sp_ProcesarInferenciaYRegistrar('Claro', 100.00, 140, 25);

-- Caso de Prueba 3: Estado Crítico global por Payload Excesivo
CALL sp_ProcesarInferenciaYRegistrar('Tigo', 10.00, 60, 185.50);

-- Consulta general de control
CALL sp_ObtenerHistorialAuditoria(10);

-- Consulta de validación por operador
SELECT * FROM registro_metricas ORDER BY id DESC LIMIT 10;
