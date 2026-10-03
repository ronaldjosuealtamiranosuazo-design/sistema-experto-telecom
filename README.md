# Sistema Experto Telecom

Este proyecto mejora y visualiza un sistema experto para auditoría de recargas de datos y análisis de canal de telecomunicaciones.

## Qué incluye

- Base de datos MySQL optimizada con índices y validaciones
- Procedimientos almacenados para inferencia y consulta del historial
- Lógica comercial y técnica para evaluar el estado del canal
- Dashboard web para renderizar resultados y pruebas de casos

## Estructura

- `sql/schema.sql` — esquema y procedimientos
- `index.html` — interfaz visual
- `styles.css` — estilos del dashboard
- `app.js` — lógica de inferencia y renderización
- `README.md` — documentación

## Ejecución rápida

### 1) Base de datos MySQL

Importa el archivo:

```bash
mysql -u tu_usuario -p < sql/schema.sql
```

### 2) Render web

Puedes abrir `index.html` directamente en el navegador o servirlo localmente:

```bash
python -m http.server 8000
```

Luego visita:

```text
http://localhost:8000
```

## Casos de prueba incluidos

- Tigo: monto 50, latencia 45, datos iniciales 30 KB
- Claro: monto 100, latencia 140, datos iniciales 25 KB
- Tigo: monto 10, latencia 60, datos iniciales 185.50 KB

## Objetivo funcional

El sistema evalúa:

- estado del canal
- latencia del enlace
- carga útil del payload
- oferta comercial más adecuada
- recomendación operativa

## Mejoras aplicadas

- Normalización de tipos y rangos
- Validación de ofertas por operador y monto
- Optimización de consultas con índices
- Procedimientos centralizados para auditoría
- Interfaz visual para presentaciones y validación técnica
