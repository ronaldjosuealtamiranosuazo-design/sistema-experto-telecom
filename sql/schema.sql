CREATE DATABASE IF NOT EXISTS sistema_experto_telecom;
USE sistema_experto_telecom;

-- Tabla de registro de métricas
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

-- Tabla de ofertas de recarga
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

-- Inserción de datos iniciales
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
