const API_BASE_URL = 'http://localhost:3001/api';

let records = [];

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDataSize(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

async function loadHistorial() {
  try {
    const response = await fetch(`${API_BASE_URL}/historial?limit=10`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    records = data;
    renderRecords(data);
  } catch (error) {
    console.error('Error cargando historial:', error);
    document.getElementById('historyTable').innerHTML = 
      '<tr><td colspan="11" style="text-align: center; color: #ef4444;">Error al cargar historial</td></tr>';
  }
}

async function loadResumen() {
  try {
    const response = await fetch(`${API_BASE_URL}/resumen`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const summary = await response.json();
    document.getElementById('countExcelente').textContent = summary.Excelente || 0;
    document.getElementById('countEstable').textContent = summary.Estable || 0;
    document.getElementById('countInestable').textContent = summary.Inestable || 0;
    document.getElementById('countCritico').textContent = summary.Crítico || 0;
  } catch (error) {
    console.error('Error cargando resumen:', error);
  }
}

async function loadOfertas(operador) {
  try {
    const response = await fetch(`${API_BASE_URL}/ofertas/${operador}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const ofertas = await response.json();
    renderOfertasList(ofertas);
  } catch (error) {
    console.error('Error cargando ofertas:', error);
  }
}

function renderRecords(data) {
  const tbody = document.getElementById('historyTable');
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #94a3b8;">Sin registros</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(item => {
    const fecha = new Date(item.fecha_registro).toLocaleString('es-ES');
    return `
      <tr>
        <td>${item.id}</td>
        <td>${item.operador}</td>
        <td>${formatMoney(item.monto_recarga)}</td>
        <td>${item.latencia_ms} ms</td>
        <td>${item.datos_init_kb} KB</td>
        <td><span class="badge ${item.estado_canal.toLowerCase()}">${item.estado_canal}</span></td>
        <td>${formatDataSize(item.datos_recibidos_mb)}</td>
        <td>${item.dias_vigencia} d</td>
        <td>${item.diagnostico}</td>
        <td>${item.recomendacion}</td>
        <td>${fecha}</td>
      </tr>
    `;
  }).join('');
}

function renderOfertasList(ofertas) {
  const container = document.getElementById('offersList');
  if (!ofertas || ofertas.length === 0) {
    container.innerHTML = '<p style="color: #94a3b8;">No hay ofertas disponibles</p>';
    return;
  }
  
  container.innerHTML = ofertas.map(item => `
    <div class="offer-row">
      <div><strong>$${item.monto_min}-$${item.monto_max}</strong></div>
      <div>${formatDataSize(item.datos_recibidos_mb)}</div>
      <div>${item.dias_vigencia} días</div>
      <div>${item.descripcion}</div>
    </div>
  `).join('');
}

async function handleSubmit(event) {
  event.preventDefault();
  
  const operador = document.getElementById('operador').value;
  const monto = document.getElementById('monto').value;
  const latencia = document.getElementById('latencia').value;
  const datos = document.getElementById('datos').value;
  
  try {
    const response = await fetch(`${API_BASE_URL}/evaluar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operador,
        monto_recarga: parseFloat(monto),
        latencia_ms: parseInt(latencia),
        datos_init_kb: parseFloat(datos)
      })
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    
    // Actualizar resultado
    document.getElementById('resultEstado').textContent = result.estado_canal;
    document.getElementById('resultEstado').className = `result-value badge ${result.estado_canal.toLowerCase()}`;
    document.getElementById('resultAnalisis').textContent = result.analisis_tecnico;
    document.getElementById('resultRecomendacion').textContent = result.recomendacion;
    
    // Recargar datos
    loadHistorial();
    loadResumen();
  } catch (error) {
    console.error('Error en evaluación:', error);
    alert('Error al procesar la evaluación');
  }
}

// Event listeners
document.getElementById('form-evaluation').addEventListener('submit', handleSubmit);
document.getElementById('operador').addEventListener('change', (e) => {
  loadOfertas(e.target.value);
});

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
  loadHistorial();
  loadResumen();
  loadOfertas('Tigo');
});
