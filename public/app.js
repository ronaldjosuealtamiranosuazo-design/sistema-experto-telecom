const API_BASE_URL = (() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal ? 'http://localhost:3001/api' : '/api';
})();

const state = {
  records: [],
};

const escapeHtml = (value) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
};

const safeNumber = (value, fallback = 0) => {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
};

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

const safeDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-ES');
};

function formatMoney(value) {
  return `$${safeNumber(value, 0).toFixed(2)}`;
}

function formatDataSize(mb) {
  const value = safeNumber(mb, 0);
  return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function loadHistorial() {
  const table = document.getElementById('historyTable');
  if (!table) return;

  try {
    const data = await fetchJson(`${API_BASE_URL}/historial?limit=10`);
    state.records = Array.isArray(data) ? data : [];
    renderRecords(state.records);
  } catch (error) {
    console.error('Error cargando historial:', error);
    table.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #ef4444;">Error al cargar historial</td></tr>';
  }
}

async function loadResumen() {
  try {
    const summary = await fetchJson(`${API_BASE_URL}/resumen`);

    const map = {
      Excelente: 'countExcelente',
      Estable: 'countEstable',
      Inestable: 'countInestable',
      Crítico: 'countCritico',
    };

    Object.entries(map).forEach(([key, id]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = safeNumber(summary?.[key], 0);
      }
    });
  } catch (error) {
    console.error('Error cargando resumen:', error);
  }
}

async function loadOfertas(operador) {
  const container = document.getElementById('offersList');
  if (!container) return;

  const operadorActual = safeText(operador, '').trim();
  if (!operadorActual) {
    container.innerHTML = '<p style="color: #94a3b8;">Selecciona un operador</p>';
    return;
  }

  try {
    const ofertas = await fetchJson(`${API_BASE_URL}/ofertas/${encodeURIComponent(operadorActual)}`);
    renderOfertasList(Array.isArray(ofertas) ? ofertas : []);
  } catch (error) {
    console.error('Error cargando ofertas:', error);
    container.innerHTML = '<p style="color: #ef4444;">No se pudieron cargar las ofertas</p>';
  }
}

function renderRecords(data) {
  const tbody = document.getElementById('historyTable');
  if (!tbody) return;

  const list = Array.isArray(data) ? data : [];

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #94a3b8;">Sin registros</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((item) => {
      const operador = escapeHtml(safeText(item.operador, ''));
      const estado = escapeHtml(safeText(item.estado_canal, ''));
      const diagnostico = escapeHtml(safeText(item.diagnostico, ''));
      const recomendacion = escapeHtml(safeText(item.recomendacion, ''));
      const fecha = safeDate(item.fecha_registro);
      const monto = formatMoney(item.monto_recarga);
      const latencia = safeNumber(item.latencia_ms, 0);
      const datosInit = safeNumber(item.datos_init_kb, 0);
      const datosRecibidos = formatDataSize(item.datos_recibidos_mb);
      const dias = safeNumber(item.dias_vigencia, 0);

      return `
        <tr>
          <td>${escapeHtml(safeText(item.id, ''))}</td>
          <td>${operador}</td>
          <td>${monto}</td>
          <td>${latencia} ms</td>
          <td>${datosInit} KB</td>
          <td><span class="badge ${estado.toLowerCase()}">${estado}</span></td>
          <td>${datosRecibidos}</td>
          <td>${dias} d</td>
          <td>${diagnostico}</td>
          <td>${recomendacion}</td>
          <td>${fecha}</td>
        </tr>
      `;
    })
    .join('');
}

function renderOfertasList(ofertas) {
  const container = document.getElementById('offersList');
  if (!container) return;

  const list = Array.isArray(ofertas) ? ofertas : [];

  if (list.length === 0) {
    container.innerHTML = '<p style="color: #94a3b8;">No hay ofertas disponibles</p>';
    return;
  }

  container.innerHTML = list
    .map((item) => {
      const descripcion = escapeHtml(safeText(item.descripcion, ''));
      const montoMin = formatMoney(item.monto_min);
      const montoMax = formatMoney(item.monto_max);
      const datos = formatDataSize(item.datos_recibidos_mb);
      const dias = safeNumber(item.dias_vigencia, 0);

      return `
        <div class="offer-row">
          <div><strong>${montoMin}-${montoMax}</strong></div>
          <div>${datos}</div>
          <div>${dias} días</div>
          <div>${descripcion}</div>
        </div>
      `;
    })
    .join('');
}

async function handleSubmit(event) {
  event.preventDefault();

  const operador = document.getElementById('operador')?.value?.trim();
  const monto = document.getElementById('monto')?.value;
  const latencia = document.getElementById('latencia')?.value;
  const datos = document.getElementById('datos')?.value;

  if (!operador || !monto || !latencia || !datos) {
    alert('Completa todos los campos');
    return;
  }

  const montoNum = Number.parseFloat(monto);
  const latenciaNum = Number.parseInt(latencia, 10);
  const datosNum = Number.parseFloat(datos);

  if ([montoNum, latenciaNum, datosNum].some((value) => !Number.isFinite(value))) {
    alert('Los valores ingresados no son válidos');
    return;
  }

  try {
    const result = await fetchJson(`${API_BASE_URL}/evaluar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operador,
        monto_recarga: montoNum,
        latencia_ms: latenciaNum,
        datos_init_kb: datosNum,
      }),
    });

    const estadoEl = document.getElementById('resultEstado');
    const analisisEl = document.getElementById('resultAnalisis');
    const recomendacionEl = document.getElementById('resultRecomendacion');

    if (estadoEl) {
      const estado = safeText(result.estado_canal, '');
      estadoEl.textContent = estado;
      estadoEl.className = `result-value badge ${estado.toLowerCase()}`;
    }

    if (analisisEl) {
      analisisEl.textContent = safeText(result.analisis_tecnico, '');
    }

    if (recomendacionEl) {
      recomendacionEl.textContent = safeText(result.recomendacion, '');
    }

    await Promise.all([loadHistorial(), loadResumen()]);
  } catch (error) {
    console.error('Error en evaluación:', error);
    alert('Error al procesar la evaluación');
  }
}

function bindEvents() {
  const form = document.getElementById('form-evaluation');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  const operadorSelect = document.getElementById('operador');
  if (operadorSelect) {
    operadorSelect.addEventListener('change', (event) => {
      loadOfertas(event.target.value);
    });
  }
}

async function initApp() {
  bindEvents();
  await Promise.all([loadHistorial(), loadResumen(), loadOfertas('Tigo')]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
