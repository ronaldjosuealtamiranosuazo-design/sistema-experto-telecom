const offers = {
  Tigo: [
    { min: 0, max: 20, data: 500, days: 1, label: 'Básico' },
    { min: 21, max: 60, data: 3072, days: 3, label: 'Medio' },
    { min: 61, max: 500, data: 10240, days: 7, label: 'Regular' },
    { min: 501, max: 9999, data: 25600, days: 15, label: 'Premium' }
  ],
  Claro: [
    { min: 0, max: 20, data: 400, days: 1, label: 'Básico' },
    { min: 21, max: 60, data: 2500, days: 4, label: 'Medio' },
    { min: 61, max: 500, data: 12288, days: 8, label: 'Regular' },
    { min: 501, max: 9999, data: 30720, days: 20, label: 'Premium' }
  ]
};

const records = [
  {
    id: 1,
    operador: 'Tigo',
    monto_recarga: 50,
    latencia_ms: 45,
    datos_init_kb: 30,
    estado_canal: 'Excelente',
    bolsa_datos_restantes: '3.0 GB',
    vigencia: '3 Días',
    diagnostico: 'Canal estable y compatible con recarga sin riesgo operativo.',
    recomendacion: 'Autorizar carga y continuar con monitoreo estándar.'
  },
  {
    id: 2,
    operador: 'Claro',
    monto_recarga: 100,
    latencia_ms: 140,
    datos_init_kb: 25,
    estado_canal: 'Inestable',
    bolsa_datos_restantes: '12.0 GB',
    vigencia: '8 Días',
    diagnostico: 'Se detecta degradación del canal y riesgo de interrupción.',
    recomendacion: 'Conmutación por USSD y revisar estabilidad del enlace.'
  },
  {
    id: 3,
    operador: 'Tigo',
    monto_recarga: 10,
    latencia_ms: 60,
    datos_init_kb: 185.5,
    estado_canal: 'Crítico',
    bolsa_datos_restantes: '500 MB',
    vigencia: '1 Día',
    diagnostico: 'Condición crítica global del servicio.',
    recomendacion: 'Rechazar la carga y activar protocolo de contingencia.'
  }
];

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function findOffer(operator, amount) {
  const list = offers[operator] || [];
  return list.find(item => amount >= item.min && amount <= item.max) || null;
}

function evaluateChannel(operator, amount, latency, initialDataKb) {
  let estado = 'Crítico';
  let analisis = 'El canal presenta latencia extrema o payload excesivo, con riesgo alto de fallo y pérdida de sesión.';
  let diagnostico = 'Condición crítica global del servicio.';
  let recomendacion = 'Rechazar la carga y activar protocolo de contingencia.';

  if (latency <= 50 && initialDataKb <= 100) {
    estado = 'Excelente';
    analisis = 'El canal presenta latencia dentro del umbral óptimo y el payload inicial no genera congestión.';
    diagnostico = 'Canal estable y compatible con recarga sin riesgo operativo.';
    recomendacion = 'Autorizar carga y continuar con monitoreo estándar.';
  } else if (latency <= 100 && initialDataKb <= 150) {
    estado = 'Estable';
    analisis = 'Se observan condiciones normales de operación, aunque existe ligera sensibilidad en la red.';
    diagnostico = 'Canal funcional con margen de operación aceptable.';
    recomendacion = 'Autorizar recarga con observación durante los próximos ciclos.';
  } else if (latency <= 140) {
    estado = 'Inestable';
    analisis = 'La latencia excede el rango recomendado y puede afectar la continuidad del servicio.';
    diagnostico = 'Se detecta degradación del canal y riesgo de interrupción.';
    recomendacion = 'Conmutación por USSD y revisar estabilidad del enlace.';
  }

  const offer = findOffer(operator, amount); 
  const dataMb = offer ? offer.data : 0;
  const days = offer ? offer.days : 0;

  return {
    id: Date.now(),
    operador: operator,
    monto_recarga: Number(amount),
    latencia_ms: Number(latency),
    datos_init_kb: Number(initialDataKb),
    estado_canal: estado,
    bolsa_datos_restantes: dataMb >= 1024 ? `${(dataMb / 1024).toFixed(1)} GB` : `${dataMb} MB`,
    vigencia: `${days} Días`,
    diagnostico,
    recomendacion,
    analisis_tecnico: analisis,
    oferta: offer
  };
}

function renderRecords(list) {
  const container = document.getElementById('historyTable');
  container.innerHTML = list.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.operador}</td>
      <td>${formatMoney(item.monto_recarga)}</td>
      <td>${item.latencia_ms} ms</td>
      <td>${item.datos_init_kb} KB</td>
      <td><span class="badge ${item.estado_canal.toLowerCase()}">${item.estado_canal}</span></td>
      <td>${item.bolsa_datos_restantes}</td>
      <td>${item.vigencia}</td>
      <td>${item.diagnostico}</td>
      <td>${item.recomendacion}</td>
    </tr>
  `).join('');
}

function renderSummary(list) {
  const summary = { Excelente: 0, Estable: 0, Inestable: 0, Crítico: 0 };

  list.forEach(item => {
    if (summary[item.estado_canal] !== undefined) {
      summary[item.estado_canal] += 1;
    }
  });

  document.getElementById('countExcelente').textContent = summary.Excelente;
  document.getElementById('countEstable').textContent = summary.Estable;
  document.getElementById('countInestable').textContent = summary.Inestable;
  document.getElementById('countCritico').textContent = summary.Crítico;
}

function renderOfferList(operator) {
  const container = document.getElementById('offersList');
  const list = offers[operator] || [];

  container.innerHTML = list.map(item => `
    <div class="offer-row">
      <div>
        <strong>${item.label}</strong>
      </div>
      <div>${item.min} - ${item.max}</div>
      <div>${item.data} MB</div>
      <div>${item.days} días</div>
    </div>
  `).join('');
}

function updateResult(result) {
  const estadoEl = document.getElementById('resultEstado');
  const analisisEl = document.getElementById('resultAnalisis');
  const recomendacionEl = document.getElementById('resultRecomendacion');

  estadoEl.textContent = result.estado_canal;
  estadoEl.className = `result-value badge ${result.estado_canal.toLowerCase()}`;
  analisisEl.textContent = result.analisis_tecnico;
  recomendacionEl.textContent = result.recomendacion;
}

function handleSubmit(event) {
  event.preventDefault();

  const operator = document.getElementById('operador').value;
  const monto = Number(document.getElementById('monto').value);
  const latencia = Number(document.getElementById('latencia').value);
  const dataKb = Number(document.getElementById('datos').value);

  const result = evaluateChannel(operator, monto, latencia, dataKb);
  records.unshift(result);

  renderRecords(records.slice(0, 10));
  renderSummary(records);
  renderOfferList(operator);
  updateResult(result);
}

const operadorSelect = document.getElementById('operador');
operadorSelect.addEventListener('change', function () {
  renderOfferList(this.value);
});

document.getElementById('form-evaluation').addEventListener('submit', handleSubmit);

renderRecords(records);
renderSummary(records);
renderOfferList('Tigo');
updateResult(evaluateChannel('Tigo', 50, 45, 30));
