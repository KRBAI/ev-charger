/**
 * OREL EV Admin Network Console - Main Application Controller
 * Free OpenStreetMap API, True Dynamic Telemetry, Environmental ESG Impact,
 * Live Revenue Analytics in LKR, and Per-Charger Diagnostics & Location Management.
 */
import {
  chargersData,
  transactionsData,
  getTrueRevenueMetrics,
  initFirestoreData,
  registerDataListener,
  directTurnOnCharger,
  directTurnOffCharger,
  directResetCharger,
  directUnlockConnector,
  registerNewChargerDoc,
  updateChargerLocationDoc
} from './dashboard-state.js';
import { getLogoSvg } from './logo.js';

// Status Configuration Palette
const STATUS_CONFIG = {
  Available: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    markerColor: '#10b981'
  },
  Preparing: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
    markerColor: '#3b82f6'
  },
  Charging: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-ping',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    markerColor: '#f59e0b'
  },
  Faulted: {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    markerColor: '#f43f5e'
  },
  Offline: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    border: 'border-slate-200 dark:border-slate-700/50',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400 dark:bg-slate-500',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    markerColor: '#64748b'
  }
};

// Sri Lankan transit location presets with sub-meter 7-decimal precision
const SRI_LANKA_PRESETS = {
  'colombo-03': {
    name: 'Orel Corporation HQ - Colombo 03',
    address: '34 Galle Road, Colombo 03, Western Province',
    lat: 6.9034251,
    lng: 79.8507314
  },
  'colombo-port': {
    name: 'Colombo Port City Marina Terminal',
    address: 'Port City Boulevard, Colombo 01',
    lat: 6.9344192,
    lng: 79.8428405
  },
  'colombo-07': {
    name: 'Independence Square EV Hub - Colombo 07',
    address: 'Independence Avenue, Colombo 07',
    lat: 6.9042816,
    lng: 79.8688402
  },
  'battaramulla': {
    name: 'Administrative Complex Hub - Battaramulla',
    address: 'Denzil Kobbekaduwa Mawatha, Battaramulla',
    lat: 6.8988421,
    lng: 79.9192736
  },
  'kandy': {
    name: 'Kandy City Center Supercharger',
    address: '5 Dalada Veediya, Kandy, Central Province',
    lat: 7.2906148,
    lng: 80.6337295
  },
  'galle': {
    name: 'Southern Expressway Pinnaduwa Interchange',
    address: 'Pinnaduwa Interchange, Southern Expressway, Galle',
    lat: 6.0535129,
    lng: 80.2210874
  },
  'negombo': {
    name: 'BIA Airport Transit EV Terminal',
    address: 'Airport Access Rd, Katunayake',
    lat: 7.1808293,
    lng: 79.8841527
  },
  'kurunegala': {
    name: 'North Western Logistics Depot',
    address: 'Colombo Road, Kurunegala, North Western Province',
    lat: 7.4863412,
    lng: 80.3623891
  },
  'nuwara-eliya': {
    name: 'Grand Hills Hill Station Charging',
    address: 'Badulla Road, Nuwara Eliya, Central Highlands',
    lat: 6.9497354,
    lng: 80.7891248
  },
  'jaffna': {
    name: 'Northern Hub - Jaffna Central',
    address: 'Hospital Road, Jaffna, Northern Province',
    lat: 9.6615482,
    lng: 80.0255391
  },
  'matara': {
    name: 'Southern Coastal Hub - Matara',
    address: 'Beach Road, Matara, Southern Province',
    lat: 5.9496328,
    lng: 80.5469415
  },
  'anuradhapura': {
    name: 'Cultural Triangle Hub - Anuradhapura',
    address: 'Maithripala Senanayake Mawatha, Anuradhapura',
    lat: 8.3114290,
    lng: 80.4037184
  },
  'hambantota': {
    name: 'Southern Sea Gateway - Hambantota',
    address: 'Mirijjawila Interchange, Hambantota',
    lat: 6.1246194,
    lng: 81.1185302
  }
};

/**
 * Format coordinates to show exact location with full decimal precision (at least 6-7 decimals)
 */
export function formatGpsExact(coord, defaultDecimals = 7) {
  if (coord === null || coord === undefined || isNaN(coord)) return '0.0000000';
  const num = Number(coord);
  const str = String(coord);
  const parts = str.split('.');
  if (parts.length > 1 && parts[1].length >= defaultDecimals) {
    return num.toFixed(parts[1].length);
  }
  return num.toFixed(defaultDecimals);
}

// Application state
let isDarkMode = false;
let overviewMapInstance = null;
let modalPickerMapInstance = null;
let modalPickerMarker = null;
let editModalPickerMapInstance = null;
let editModalPickerMarker = null;

let isMapClickPickerActive = false;
let overviewMarkers = [];
let markerMapById = {};
let selectedChargerIdForAnalysis = null;
let stationLoadChartInstance = null;
let revenueChartInstance = null;
let currentSearchTerm = '';
let currentStatusFilter = 'ALL';
let currentMapFilter = 'ALL';
let currentRevenuePeriod = 'monthly';

// Toast Notification
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const themes = {
    success: 'bg-emerald-900 text-white border-emerald-500',
    error: 'bg-rose-900 text-white border-rose-500',
    info: 'bg-slate-900 text-white border-brand-500'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 text-xs font-semibold ${themes[type] || themes.info}`;
  toast.innerHTML = `
    <span class="font-bold text-sm">${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
    <span class="flex-1">${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Relative time formatter
function formatTimeAgo(ts) {
  if (!ts) return 'Just now';
  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

// Theme handling
window.toggleDarkMode = function () {
  isDarkMode = !isDarkMode;
  const html = document.documentElement;
  const icon = document.getElementById('theme-toggle-icon');

  if (isDarkMode) {
    html.classList.add('dark');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  } else {
    html.classList.remove('dark');
    if (icon) icon.setAttribute('data-lucide', 'moon');
  }

  if (overviewMapInstance) {
    overviewMapInstance.eachLayer(layer => {
      if (layer._url) {
        layer.getContainer().classList.toggle('free-osm-tile-layer', isDarkMode);
      }
    });
  }

  renderRevenueTrendChart();
  if (selectedChargerIdForAnalysis) {
    renderStationLoadChart(selectedChargerIdForAnalysis);
  }

  if (window.lucide) window.lucide.createIcons();
};

function renderBrandLogo() {
  const container = document.getElementById('brand-logo-container');
  if (container) {
    container.innerHTML = getLogoSvg(34);
  }
}

// 100% Free OpenStreetMap Tile Layer (No API Key Required, No Watermark)
function createTileLayer() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    className: isDarkMode ? 'free-osm-tile-layer' : '',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    maxZoom: 19
  });
}

function initLeafletMaps() {
  if (typeof L === 'undefined') {
    console.warn("Leaflet library not ready");
    return;
  }

  const overviewEl = document.getElementById('overview-map');
  if (overviewEl && !overviewMapInstance) {
    overviewMapInstance = L.map('overview-map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([7.45, 80.60], 7.5);

    createTileLayer().addTo(overviewMapInstance);

    overviewMapInstance.on('click', (e) => {
      if (isMapClickPickerActive) {
        handleMapCoordinateClick(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  updateMapMarkers();
}

function createCustomMarkerIcon(status) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Available;
  const isCharging = status === 'Charging';

  return L.divIcon({
    className: 'custom-ev-marker',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${isCharging ? `
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background-color: ${cfg.markerColor};
            opacity: 0.35;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        ` : ''}
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${cfg.markerColor};
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function updateMapMarkers() {
  if (!overviewMapInstance) return;

  overviewMarkers.forEach(m => m.remove());
  overviewMarkers = [];
  markerMapById = {};

  const bounds = [];

  const displayList = currentMapFilter === 'ALL'
    ? chargersData
    : chargersData.filter(c => c.status === currentMapFilter);

  displayList.forEach(charger => {
    const lat = Number(charger.lat) || 6.9271;
    const lng = Number(charger.lng) || 79.8612;
    bounds.push([lat, lng]);

    const status = charger.connected ? (charger.status || 'Available') : 'Offline';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Available;
    const powerKw = (charger.current_power_kw || 0).toFixed(1);
    const tariff = (charger.tariff_lkr_per_kwh || 95.0).toFixed(2);

    const popupHtml = `
      <div class="space-y-2 p-1 font-sans min-w-[240px]">
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${cfg.dot}"></span>
            <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">${charger.id}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badge}">${status}</span>
        </div>
        
        <div>
          <div class="text-xs text-slate-800 dark:text-slate-100 font-bold">${charger.location_name || 'Station Hub'}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px] mt-0.5">${charger.address || ''}</div>
          <div class="text-[10px] font-mono text-emerald-600 dark:text-brand-400 mt-1 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span class="text-slate-400">GPS (Exact):</span>
            <span class="font-bold select-all">${formatGpsExact(charger.lat)}, ${formatGpsExact(charger.lng)}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
          <div>Power: <strong class="text-amber-600 dark:text-amber-400 font-mono">${powerKw} kW</strong></div>
          <div>Tariff: <strong class="text-brand-600 dark:text-brand-400 font-mono">LKR ${tariff}/kWh</strong></div>
        </div>

        <div class="pt-2 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
          <button onclick="window.openChargerAnalytics('${charger.id}')" class="flex-1 py-1 px-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-400 rounded-lg text-[10px] font-bold border border-brand-200 dark:border-brand-500/30 transition text-center">Analyze</button>
          <button onclick="window.openEditLocationModal('${charger.id}')" class="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition text-center">📍 Pos</button>
        </div>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: createCustomMarkerIcon(status) })
      .bindPopup(popupHtml)
      .addTo(overviewMapInstance);
    overviewMarkers.push(marker);
    markerMapById[charger.id] = marker;
  });

  if (bounds.length > 0 && overviewMapInstance) {
    try {
      overviewMapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
    } catch (e) {}
  }
}

window.filterMapMarkers = function (status) {
  currentMapFilter = status;
  updateMapMarkers();
};

window.fitAllMapMarkers = function () {
  if (!overviewMapInstance || chargersData.length === 0) return;
  const bounds = chargersData.map(c => [c.lat || 6.9271, c.lng || 79.8612]);
  overviewMapInstance.fitBounds(bounds, { padding: [35, 35] });
};

window.flyToStation = function (chargerId) {
  const target = chargersData.find(c => c.id === chargerId);
  if (!target || !overviewMapInstance) return;

  overviewMapInstance.flyTo([target.lat, target.lng], 14, {
    duration: 1.2
  });

  const marker = markerMapById[chargerId];
  if (marker) {
    setTimeout(() => {
      marker.openPopup();
    }, 1300);
  }
};

// -------------------------------------------------------------
// Interactive Manual Location Adding: Click-Map Mode
// -------------------------------------------------------------
window.toggleMapClickPickerMode = function (forceState) {
  isMapClickPickerActive = forceState !== undefined ? forceState : !isMapClickPickerActive;
  const banner = document.getElementById('map-click-mode-banner');
  const btnText = document.getElementById('map-picker-btn-text');
  const mapEl = document.getElementById('overview-map');

  if (isMapClickPickerActive) {
    if (banner) banner.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Clicking Active';
    if (mapEl) mapEl.classList.add('map-picking-mode');
    showToast('Click anywhere on the map to set charger GPS coordinates.', 'info');
  } else {
    if (banner) banner.classList.add('hidden');
    if (btnText) btnText.textContent = 'Click Map to Add';
    if (mapEl) mapEl.classList.remove('map-picking-mode');
  }
};

function handleMapCoordinateClick(lat, lng) {
  window.toggleMapClickPickerMode(false);
  const exactLat = formatGpsExact(lat, 7);
  const exactLng = formatGpsExact(lng, 7);
  window.openAddChargerModal({ lat: exactLat, lng: exactLng });
  showToast(`Captured exact GPS: ${exactLat}, ${exactLng}`, 'success');
}

// -------------------------------------------------------------
// Sri Lanka Location Presets Handler
// -------------------------------------------------------------
window.handlePresetLocationSelect = function (key) {
  if (!key || !SRI_LANKA_PRESETS[key]) return;
  const preset = SRI_LANKA_PRESETS[key];

  const locInput = document.getElementById('new-charger-location');
  const addrInput = document.getElementById('new-charger-address');
  const latInput = document.getElementById('new-charger-lat');
  const lngInput = document.getElementById('new-charger-lng');
  const idInput = document.getElementById('new-charger-id');

  if (locInput) locInput.value = preset.name;
  if (addrInput) addrInput.value = preset.address;
  if (latInput) latInput.value = preset.lat;
  if (lngInput) lngInput.value = preset.lng;

  if (idInput && (!idInput.value || idInput.value.startsWith('OREL-'))) {
    const slug = key.toUpperCase().replace('-', '_');
    idInput.value = `OREL-${slug}-0${chargersData.length + 1}`;
  }

  window.syncPickerMiniMap();
};

// -------------------------------------------------------------
// Executive KPI Stats & Bottom Cards (Environment & Revenue)
// -------------------------------------------------------------
function renderExecutiveKPIs() {
  const activeCount = chargersData.filter(c => c.status === 'Charging').length;
  const onlineCount = chargersData.filter(c => c.connected && c.status === 'Available').length;
  const offlineCount = chargersData.filter(c => !c.connected || c.status === 'Faulted').length;

  const totalLivePower = chargersData.reduce((sum, c) => {
    return sum + (c.status === 'Charging' ? (c.current_power_kw || 0) : 0);
  }, 0);

  const totalEnergyLifetime = chargersData.reduce((sum, c) => {
    return sum + (Number(c.total_energy_dispensed_kwh) || 0);
  }, 0);

  const avgUptime = (chargersData.reduce((sum, c) => sum + (c.uptime_percent || 99.0), 0) / (chargersData.length || 1)).toFixed(1);

  // Top KPIs
  const elTotal = document.getElementById('stat-total-chargers');
  const elOnline = document.getElementById('stat-online-chargers');
  const elActive = document.getElementById('stat-active-chargers');
  const elOffline = document.getElementById('stat-offline-chargers');
  const elPower = document.getElementById('stat-total-power');
  const elEnergy = document.getElementById('stat-total-energy');
  const elUptime = document.getElementById('stat-avg-uptime');

  if (elTotal) elTotal.textContent = chargersData.length;
  if (elOnline) elOnline.textContent = onlineCount;
  if (elActive) elActive.textContent = activeCount;
  if (elOffline) elOffline.textContent = offlineCount;
  if (elPower) elPower.textContent = `${totalLivePower.toFixed(1)} kW`;
  if (elEnergy) elEnergy.textContent = `${(totalEnergyLifetime / 1000).toFixed(2)} MWh`;
  if (elUptime) elUptime.textContent = `${avgUptime}%`;

  // Environmental Card Metrics (Calculated dynamically)
  const totalCo2Kg = Math.round(totalEnergyLifetime * 0.52); // ~0.52 kg CO2 avoided per kWh
  const totalTrees = Math.round(totalCo2Kg / 21); // 21 kg CO2 absorbed per mature tree/yr
  const petrolSavedLiters = Math.round(totalEnergyLifetime * 0.25); // ~0.25 L petrol equiv

  const elEnvCo2 = document.getElementById('env-co2-avoided');
  const elEnvTrees = document.getElementById('env-trees-planted');
  const elEnvFuel = document.getElementById('env-fuel-saved');

  if (elEnvCo2) elEnvCo2.textContent = totalCo2Kg.toLocaleString('en-LK');
  if (elEnvTrees) elEnvTrees.textContent = totalTrees.toLocaleString('en-LK');
  if (elEnvFuel) elEnvFuel.textContent = `${petrolSavedLiters.toLocaleString('en-LK')} L`;

  // Total Revenue Card in LKR (Computed dynamically)
  updateRevenueCard(currentRevenuePeriod);
}

// -------------------------------------------------------------
// Total Revenue Card Controller in LKR (Dropdown & Chart)
// -------------------------------------------------------------
window.handleRevenuePeriodChange = function (period) {
  currentRevenuePeriod = period;
  updateRevenueCard(period);
};

function updateRevenueCard(period) {
  const dataset = getTrueRevenueMetrics(period);

  const elAmount = document.getElementById('rev-total-amount');
  const elGrowth = document.getElementById('rev-growth-badge');
  const elSessions = document.getElementById('rev-session-count');
  const elAvgTicket = document.getElementById('rev-avg-ticket');
  const elKwh = document.getElementById('rev-kwh-dispensed');

  if (elAmount) elAmount.textContent = dataset.amountFormatted;
  if (elGrowth) {
    elGrowth.innerHTML = `
      <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
      <span>${dataset.growth}</span>
    `;
  }
  if (elSessions) elSessions.textContent = dataset.sessions.toLocaleString('en-LK');
  if (elAvgTicket) elAvgTicket.textContent = dataset.avgTicketFormatted;
  if (elKwh) elKwh.textContent = dataset.kwhFormatted;

  renderRevenueTrendChart();
  if (window.lucide) window.lucide.createIcons();
}

function renderRevenueTrendChart() {
  const canvas = document.getElementById('revenue-trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const dataset = getTrueRevenueMetrics(currentRevenuePeriod);

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  const isDark = isDarkMode;
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  revenueChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dataset.chartLabels,
      datasets: [{
        label: 'Revenue (LKR)',
        data: dataset.chartValues,
        backgroundColor: '#10b981',
        hoverBackgroundColor: '#059669',
        borderRadius: 5,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `LKR ${Number(ctx.parsed.y).toLocaleString('en-LK')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 9 },
            callback: (v) => `LKR ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}`
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// Live Charger Cards Grid (Clean, Responsive, No Overlap)
// -------------------------------------------------------------
function renderChargersGrid() {
  const container = document.getElementById('chargers-grid');
  const countBadge = document.getElementById('chargers-count-badge');
  if (!container) return;

  let filtered = chargersData;

  if (currentStatusFilter !== 'ALL') {
    filtered = filtered.filter(c => c.status === currentStatusFilter);
  }

  if (currentSearchTerm) {
    const q = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(c => 
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.location_name && c.location_name.toLowerCase().includes(q)) ||
      (c.vendor && c.vendor.toLowerCase().includes(q)) ||
      (c.model && c.model.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Stations`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <p class="text-xs font-semibold text-slate-500">No charging stations match your filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(charger => {
    const status = charger.connected ? (charger.status || 'Available') : 'Offline';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Available;
    const isCharging = charger.status === 'Charging';
    const tariff = (charger.tariff_lkr_per_kwh || 95.0).toFixed(2);
    const lat = Number(charger.lat) || 6.9271;
    const lng = Number(charger.lng) || 79.8612;

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        
        <div>
          <!-- Header: ID, Status Badge & Location info -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0"></span>
                <span class="font-mono font-extrabold text-sm text-slate-900 dark:text-white truncate">${charger.id}</span>
              </div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">${charger.location_name || 'Station Hub'}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">${charger.address || 'Sri Lanka Network'}</div>
              <div class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 bg-slate-50 dark:bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-1">
                <span class="text-slate-400 font-sans text-[9px] uppercase tracking-wider">Exact GPS</span>
                <span class="font-bold select-all">${formatGpsExact(charger.lat)}, ${formatGpsExact(charger.lng)}</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${cfg.badge}">
              ${status}
            </span>
          </div>

          <!-- Hardware & Tariff Metadata -->
          <div class="mt-3 py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1">
            <span class="font-medium text-slate-700 dark:text-slate-300 truncate">${charger.vendor || 'Vendor'} · ${charger.model || 'Model'}</span>
            <span class="font-mono font-bold text-brand-600 dark:text-brand-400 shrink-0">LKR ${tariff}/kWh</span>
          </div>

          <!-- Real-Time Electrical Telemetry (Voltage V, Current A, Power kW) -->
          <div class="grid grid-cols-3 gap-2 mt-3">
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Voltage</span>
              <span class="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">${charger.voltage_v != null ? Math.round(charger.voltage_v) + ' V' : '—'}</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Current</span>
              <span class="text-xs font-extrabold font-mono ${isCharging ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}">${charger.current_a != null ? Number(charger.current_a).toFixed(1) + ' A' : '0.0 A'}</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Output</span>
              <span class="text-xs font-extrabold font-mono ${isCharging ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}">${(charger.current_power_kw || 0).toFixed(1)} kW</span>
            </div>
          </div>

          <!-- Vehicle State of Charge (SoC %) progress bar if present -->
          ${charger.soc_percent != null ? `
            <div class="mt-3 p-2 rounded-xl bg-emerald-50/70 dark:bg-brand-950/40 border border-emerald-100 dark:border-brand-500/20">
              <div class="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-brand-300 mb-1">
                <span class="flex items-center gap-1">
                  <i data-lucide="battery-charging" class="w-3.5 h-3.5 text-emerald-600 dark:text-brand-400"></i>
                  Vehicle SoC
                </span>
                <span class="font-mono">${charger.soc_percent}%</span>
              </div>
              <div class="w-full bg-emerald-200/60 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-500 to-brand-400 h-1.5 rounded-full transition-all duration-500" style="width: ${charger.soc_percent}%"></div>
              </div>
            </div>
          ` : ''}

          <!-- Connector Specs & Heartbeat -->
          <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Plug: <strong class="text-slate-700 dark:text-slate-300 font-medium">${charger.connector_type || 'CCS 2'}</strong></span>
            <span class="font-mono text-[10px]">Active: ${formatTimeAgo(charger.last_heartbeat)}</span>
          </div>
        </div>

        <!-- Action Controls: Turn ON / OFF, Separate Analyzer, and Edit Location -->
        <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1.5">
          <button onclick="window.directTurnOn('${charger.id}')" class="py-1.5 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs flex items-center justify-center gap-1">
            <i data-lucide="power" class="w-3 h-3"></i>
            <span>ON</span>
          </button>
          <button onclick="window.directTurnOff('${charger.id}')" class="py-1.5 px-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition shadow-xs flex items-center justify-center gap-1">
            <i data-lucide="power-off" class="w-3 h-3"></i>
            <span>OFF</span>
          </button>
          <button onclick="window.openChargerAnalytics('${charger.id}')" title="Separately Analyze Station" class="py-1.5 px-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-brand-200 dark:border-brand-500/30">
            <i data-lucide="cpu" class="w-3 h-3 text-brand-600"></i>
            <span>Analyze</span>
          </button>
          <button onclick="window.openEditLocationModal('${charger.id}')" title="Manually edit GPS Location & Address" class="py-1.5 px-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700">
            <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
            <span>Pos</span>
          </button>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// -------------------------------------------------------------
// Separate Charger Deep Analyzer & Hardware Diagnostics View
// -------------------------------------------------------------
function populateAnalyticsSelector() {
  const select = document.getElementById('analytics-charger-select');
  if (!select) return;

  const currentVal = selectedChargerIdForAnalysis || (chargersData[0] ? chargersData[0].id : '');
  select.innerHTML = chargersData.map(c => `
    <option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>
      ${c.id} - ${c.location_name || c.vendor} (${c.status})
    </option>
  `).join('');

  if (currentVal && !selectedChargerIdForAnalysis) {
    selectedChargerIdForAnalysis = currentVal;
  }
}

export function renderChargerAnalytics(chargerId) {
  const panel = document.getElementById('analytics-details-panel');
  if (!panel) return;

  const charger = chargersData.find(c => c.id === chargerId) || chargersData[0];
  if (!charger) {
    panel.innerHTML = `<div class="p-8 text-center text-slate-400">Please select a charger to inspect.</div>`;
    return;
  }

  selectedChargerIdForAnalysis = charger.id;
  const status = charger.connected ? (charger.status || 'Available') : 'Offline';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Available;
  const isCharging = charger.status === 'Charging';
  const tariff = charger.tariff_lkr_per_kwh || 95.0;

  // Charger specific transactions
  const relatedTx = transactionsData.filter(t => t.charger_id === charger.id);
  const totalChargerEnergy = (Number(charger.total_energy_dispensed_kwh) || 0) + relatedTx.reduce((s, t) => s + (t.total_kwh || 0), 0);
  const stationRevenueLkr = (totalChargerEnergy * tariff).toFixed(2);

  panel.innerHTML = `
    <!-- Station Header & Diagnostics Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full ${cfg.dot}"></span>
            <h2 class="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">${charger.id}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}">${status}</span>
          </div>
          <p class="text-sm text-brand-600 dark:text-brand-400 font-bold mt-1 flex items-center gap-1.5">
            <i data-lucide="map-pin" class="w-4 h-4"></i>
            ${charger.location_name || 'Station Hub'} • ${charger.address || 'Sri Lanka Network'}
          </p>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">GPS: <strong class="select-all">${formatGpsExact(charger.lat)}, ${formatGpsExact(charger.lng)}</strong></span>
            <span>Hardware: <strong>${charger.vendor} ${charger.model}</strong></span>
            <span>SN: <strong>${charger.serial_number || 'N/A'}</strong></span>
            <button onclick="window.openEditLocationModal('${charger.id}')" class="text-xs font-bold text-brand-600 dark:text-brand-400 underline hover:text-brand-700">Change Position</button>
          </div>
        </div>

        <!-- Direct Admin Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.directTurnOn('${charger.id}')" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
            <i data-lucide="power" class="w-4 h-4"></i>
            Turn ON
          </button>
          <button onclick="window.directTurnOff('${charger.id}')" class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
            <i data-lucide="power-off" class="w-4 h-4"></i>
            Turn OFF
          </button>
          <button onclick="window.rebootStation('${charger.id}')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            Reboot
          </button>
          <button onclick="window.unlockConnector('${charger.id}')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
            <i data-lucide="unlock" class="w-4 h-4"></i>
            Unlock
          </button>
          <button onclick="window.openEditLocationModal('${charger.id}')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
            <i data-lucide="map-pin" class="w-4 h-4 text-brand-600"></i>
            Edit Location
          </button>
        </div>
      </div>

      <!-- Specific Station Telemetry Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Instant Output</span>
          <span class="text-lg font-extrabold font-mono ${isCharging ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}">${(charger.current_power_kw || 0).toFixed(1)} kW</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">Real-time load</span>
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Line Voltage</span>
          <span class="text-lg font-extrabold font-mono text-slate-800 dark:text-slate-200">${charger.voltage_v != null ? Math.round(charger.voltage_v) + ' V' : '—'}</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">Grid Phase</span>
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Current Draw</span>
          <span class="text-lg font-extrabold font-mono ${isCharging ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}">${charger.current_a != null ? Number(charger.current_a).toFixed(1) + ' A' : '—'}</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">Line Amperage</span>
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Dispensed</span>
          <span class="text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400">${(totalChargerEnergy).toFixed(1)} kWh</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">Lifetime</span>
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Revenue (LKR)</span>
          <span class="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">LKR ${Number(stationRevenueLkr).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">LKR ${tariff}/kWh</span>
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">SLA Uptime</span>
          <span class="text-lg font-extrabold font-mono text-brand-600 dark:text-brand-400">${charger.uptime_percent || 99.2}%</span>
          <span class="text-[10px] text-slate-500 block mt-0.5">Availability</span>
        </div>
      </div>
    </div>

    <!-- Station Hourly Load Profile & Hardware Specs -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- 24-Hour Load Curve Chart -->
      <div class="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="trending-up" class="w-4 h-4 text-brand-600 dark:text-brand-400"></i>
              24-Hour Power Demand Curve (kW)
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kilowatt load profile recorded from OCPP meter values.</p>
          </div>
          <span class="text-xs font-mono font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800">Max: ${charger.max_power_kw || 50} kW</span>
        </div>

        <div class="h-60 mt-4 relative">
          <canvas id="station-load-chart"></canvas>
        </div>
      </div>

      <!-- Hardware & Sensor Diagnostics -->
      <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <i data-lucide="shield-alert" class="w-4 h-4 text-blue-500"></i>
          Hardware Diagnostics
        </h4>

        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Internal Temp:</span>
            <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${charger.temperature_c || 29.5}°C</span>
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Connector Interface:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">${charger.connector_type || 'CCS 2'}</span>
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Firmware Version:</span>
            <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${charger.firmware_version || '2.4.1'}</span>
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Serial Number:</span>
            <span class="font-mono text-slate-800 dark:text-slate-200">${charger.serial_number || 'ABB-TR-881'}</span>
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-500/20 text-xs text-brand-800 dark:text-brand-300">
          <p class="font-bold">Station Status: Normal</p>
          <p class="text-[11px] text-brand-700 dark:text-brand-400 mt-0.5">Isolation relays and contactors verified nominal in Sri Lanka network.</p>
        </div>
      </div>

    </div>

    <!-- Station Charging History Table -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="history" class="w-4 h-4 text-purple-500"></i>
            Sessions for ${charger.id}
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Energy dispensed and billing in Sri Lankan Rupees (LKR).</p>
        </div>
        <span class="text-xs font-mono font-bold text-slate-500">${relatedTx.length} Recorded Sessions</span>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs min-w-[500px]">
          <thead>
            <tr class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th class="pb-2 px-3">Session ID</th>
              <th class="pb-2 px-3">Driver Name</th>
              <th class="pb-2 px-3 font-mono">Energy (kWh)</th>
              <th class="pb-2 px-3 font-mono">Cost (LKR)</th>
              <th class="pb-2 px-3">Stop Reason</th>
              <th class="pb-2 px-3 text-right">Age</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            ${relatedTx.length > 0 ? relatedTx.map(tx => {
              const cost = tx.cost_lkr || (tx.total_kwh || 0) * tariff;
              return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td class="py-2.5 px-3 font-mono font-bold text-brand-600 dark:text-brand-400">${tx.id}</td>
                  <td class="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">${tx.driver_name || 'Driver'}</td>
                  <td class="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">${(tx.total_kwh || 0).toFixed(1)} kWh</td>
                  <td class="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">LKR ${Number(cost).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${tx.stop_reason || 'Completed'}</span>
                  </td>
                  <td class="py-2.5 px-3 text-right text-slate-500 font-mono">${formatTimeAgo(tx.start_time)}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="6" class="py-6 text-center text-slate-400 font-medium">No previous transactions logged for this EVSE station.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  renderStationLoadChart(charger.id);
}

function renderStationLoadChart(chargerId) {
  const canvas = document.getElementById('station-load-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const charger = chargersData.find(c => c.id === chargerId) || chargersData[0];
  const maxKw = charger.max_power_kw || 50;

  if (stationLoadChartInstance) {
    stationLoadChartInstance.destroy();
  }

  const labels = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "Now"];
  const isCharging = charger.status === 'Charging';
  const currentVal = isCharging ? (charger.current_power_kw || maxKw * 0.85) : 0;
  const values = [0, 0, maxKw * 0.3, maxKw * 0.75, maxKw * 0.9, maxKw * 0.6, maxKw * 0.85, maxKw * 0.5, currentVal];

  const isDark = isDarkMode;
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  stationLoadChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Power (kW)',
        data: values,
        borderColor: '#10b981',
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toFixed(1)} kW`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          min: 0,
          max: maxKw + 10,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => `${v} kW`
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// Driver Sessions Table
// -------------------------------------------------------------
function renderTransactionsTable() {
  const tbody = document.getElementById('transactions-table-body');
  if (!tbody) return;

  if (transactionsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400">No transactions recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactionsData.slice(0, 10).map(tx => {
    const cost = tx.cost_lkr || (tx.total_kwh || 0) * 95.0;
    const isCharging = tx.status === 'Charging';

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td class="py-2.5 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">${tx.id}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-800 dark:text-slate-200">${tx.charger_id}</div>
          <div class="text-[11px] text-slate-500 truncate max-w-[160px]">${tx.location_name || ''}</div>
        </td>
        <td class="py-2.5 px-3">
          <div class="font-medium text-slate-800 dark:text-slate-200">${tx.driver_name || 'Driver'}</div>
          <div class="text-[11px] text-slate-400">${tx.vehicle_model || 'Electric Vehicle'}</div>
        </td>
        <td class="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">${(tx.total_kwh || 0).toFixed(1)} kWh</td>
        <td class="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">LKR ${Number(cost).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCharging ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
            ${tx.stop_reason || tx.status}
          </span>
        </td>
        <td class="py-2.5 px-3 text-right text-slate-500 font-mono">${formatTimeAgo(tx.start_time)}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Interactive Tab Switching
// -------------------------------------------------------------
window.switchTab = function (tabName) {
  const tabOverview = document.getElementById('view-tab-overview');
  const tabAnalytics = document.getElementById('view-tab-analytics');

  const btnOverview = document.getElementById('nav-btn-overview');
  const btnAnalytics = document.getElementById('nav-btn-analytics');

  if (tabName === 'overview') {
    if (tabOverview) tabOverview.classList.remove('hidden');
    if (tabAnalytics) tabAnalytics.classList.add('hidden');
    if (btnOverview) {
      btnOverview.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 shadow-xs transition flex items-center gap-1.5';
    }
    if (btnAnalytics) {
      btnAnalytics.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition flex items-center gap-1.5';
    }
    setTimeout(() => {
      if (overviewMapInstance) overviewMapInstance.invalidateSize();
    }, 100);
  } else if (tabName === 'analytics') {
    if (tabOverview) tabOverview.classList.add('hidden');
    if (tabAnalytics) tabAnalytics.classList.remove('hidden');
    if (btnOverview) {
      btnOverview.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition flex items-center gap-1.5';
    }
    if (btnAnalytics) {
      btnAnalytics.className = 'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 shadow-xs transition flex items-center gap-1.5';
    }
    populateAnalyticsSelector();
    renderChargerAnalytics(selectedChargerIdForAnalysis || (chargersData[0] ? chargersData[0].id : null));
  }

  if (window.lucide) window.lucide.createIcons();
};

window.resetViews = function () {
  window.switchTab('overview');
};

window.openChargerAnalytics = function (chargerId) {
  selectedChargerIdForAnalysis = chargerId;
  window.switchTab('analytics');
  const select = document.getElementById('analytics-charger-select');
  if (select) select.value = chargerId;
  renderChargerAnalytics(chargerId);
};

window.selectChargerForAnalysis = function (chargerId) {
  renderChargerAnalytics(chargerId);
};

window.handleSearchFilter = function (val) {
  currentSearchTerm = val;
  renderChargersGrid();
};

window.handleStatusFilter = function (val) {
  currentStatusFilter = val;
  renderChargersGrid();
};

// -------------------------------------------------------------
// Direct Admin Actions
// -------------------------------------------------------------
window.directTurnOn = async function (chargerId) {
  showToast(`Turning ON power for ${chargerId}...`, 'info');
  const res = await directTurnOnCharger(chargerId);
  if (res.success) {
    showToast(`Power turned ON for ${chargerId}`, 'success');
  } else {
    showToast(`Failed: ${res.error}`, 'error');
  }
};

window.directTurnOff = async function (chargerId) {
  showToast(`Turning OFF power for ${chargerId}...`, 'info');
  const res = await directTurnOffCharger(chargerId);
  if (res.success) {
    showToast(`Power turned OFF for ${chargerId}`, 'success');
  } else {
    showToast(`Failed: ${res.error}`, 'error');
  }
};

window.rebootStation = async function (chargerId) {
  showToast(`Soft Reboot initiated for ${chargerId}...`, 'info');
  const res = await directResetCharger(chargerId);
  if (res.success) {
    showToast(`Reboot complete for ${chargerId}`, 'success');
  } else {
    showToast(`Failed: ${res.error}`, 'error');
  }
};

window.unlockConnector = async function (chargerId) {
  showToast(`Unlocking connector on ${chargerId}...`, 'info');
  const res = await directUnlockConnector(chargerId);
  if (res.success) {
    showToast(`Connector unlocked on ${chargerId}`, 'success');
  } else {
    showToast(`Failed: ${res.error}`, 'error');
  }
};

// -------------------------------------------------------------
// Add Charger Modal & Interactive Map Pin Picker
// -------------------------------------------------------------
window.openAddChargerModal = function (coords = null) {
  const modal = document.getElementById('add-charger-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  if (coords) {
    if (coords.lat) document.getElementById('new-charger-lat').value = coords.lat;
    if (coords.lng) document.getElementById('new-charger-lng').value = coords.lng;
  }

  setTimeout(() => {
    initOrUpdatePickerMiniMap();
  }, 100);
};

window.closeAddChargerModal = function () {
  const modal = document.getElementById('add-charger-modal');
  if (modal) modal.classList.add('hidden');
};

function initOrUpdatePickerMiniMap() {
  const mapEl = document.getElementById('modal-picker-map');
  if (!mapEl || typeof L === 'undefined') return;

  const latInput = document.getElementById('new-charger-lat');
  const lngInput = document.getElementById('new-charger-lng');
  const lat = parseFloat(latInput ? latInput.value : 6.9271) || 6.9271;
  const lng = parseFloat(lngInput ? lngInput.value : 79.8612) || 79.8612;

  if (!modalPickerMapInstance) {
    modalPickerMapInstance = L.map('modal-picker-map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([lat, lng], 13);

    createTileLayer().addTo(modalPickerMapInstance);

    modalPickerMarker = L.marker([lat, lng], {
      draggable: true
    }).addTo(modalPickerMapInstance);

    modalPickerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      if (latInput) latInput.value = formatGpsExact(pos.lat, 7);
      if (lngInput) lngInput.value = formatGpsExact(pos.lng, 7);
    });

    modalPickerMapInstance.on('click', (e) => {
      const pos = e.latlng;
      modalPickerMarker.setLatLng(pos);
      if (latInput) latInput.value = formatGpsExact(pos.lat, 7);
      if (lngInput) lngInput.value = formatGpsExact(pos.lng, 7);
    });
  } else {
    modalPickerMapInstance.invalidateSize();
    modalPickerMapInstance.setView([lat, lng], 13);
    if (modalPickerMarker) {
      modalPickerMarker.setLatLng([lat, lng]);
    }
  }
}

window.syncPickerMiniMap = function () {
  const latInput = document.getElementById('new-charger-lat');
  const lngInput = document.getElementById('new-charger-lng');
  const lat = parseFloat(latInput ? latInput.value : 6.9271);
  const lng = parseFloat(lngInput ? lngInput.value : 79.8612);

  if (isNaN(lat) || isNaN(lng)) return;

  if (modalPickerMapInstance && modalPickerMarker) {
    modalPickerMarker.setLatLng([lat, lng]);
    modalPickerMapInstance.setView([lat, lng], modalPickerMapInstance.getZoom());
  }
};

function initAddChargerForm() {
  const form = document.getElementById('add-charger-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('new-charger-id').value;
    const vendor = document.getElementById('new-charger-vendor').value;
    const model = document.getElementById('new-charger-model').value;
    const location = document.getElementById('new-charger-location').value;
    const address = document.getElementById('new-charger-address').value;
    const lat = document.getElementById('new-charger-lat').value;
    const lng = document.getElementById('new-charger-lng').value;
    const maxPower = document.getElementById('new-charger-max-power').value;
    const connector = document.getElementById('new-charger-connector').value;
    const tariff = document.getElementById('new-charger-tariff').value;

    showToast(`Registering new EVSE ${id}...`, 'info');
    const res = await registerNewChargerDoc({
      id,
      vendor,
      model,
      location_name: location,
      address,
      lat,
      lng,
      max_power_kw: maxPower,
      connector_type: connector,
      tariff_lkr_per_kwh: tariff
    });

    if (res.success) {
      showToast(`Station ${id} deployed to fleet and map!`, 'success');
      window.closeAddChargerModal();
      form.reset();
      window.flyToStation(id);
    } else {
      showToast(`Registration failed: ${res.error}`, 'error');
    }
  });
}

// -------------------------------------------------------------
// Edit Existing Charger Location Modal
// -------------------------------------------------------------
window.openEditLocationModal = function (chargerId) {
  const charger = chargersData.find(c => c.id === chargerId);
  if (!charger) return;

  const modal = document.getElementById('edit-location-modal');
  if (!modal) return;

  document.getElementById('edit-charger-id').value = charger.id;
  document.getElementById('edit-charger-id-display').textContent = charger.id;
  document.getElementById('edit-charger-location').value = charger.location_name || '';
  document.getElementById('edit-charger-address').value = charger.address || '';
  document.getElementById('edit-charger-lat').value = charger.lat || 6.9271;
  document.getElementById('edit-charger-lng').value = charger.lng || 79.8612;

  modal.classList.remove('hidden');

  setTimeout(() => {
    initOrUpdateEditMiniMap(charger.lat || 6.9271, charger.lng || 79.8612);
  }, 100);
};

window.closeEditLocationModal = function () {
  const modal = document.getElementById('edit-location-modal');
  if (modal) modal.classList.add('hidden');
};

function initOrUpdateEditMiniMap(lat, lng) {
  const mapEl = document.getElementById('edit-modal-picker-map');
  if (!mapEl || typeof L === 'undefined') return;

  const latInput = document.getElementById('edit-charger-lat');
  const lngInput = document.getElementById('edit-charger-lng');

  if (!editModalPickerMapInstance) {
    editModalPickerMapInstance = L.map('edit-modal-picker-map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([lat, lng], 13);

    createTileLayer().addTo(editModalPickerMapInstance);

    editModalPickerMarker = L.marker([lat, lng], {
      draggable: true
    }).addTo(editModalPickerMapInstance);

    editModalPickerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      if (latInput) latInput.value = formatGpsExact(pos.lat, 7);
      if (lngInput) lngInput.value = formatGpsExact(pos.lng, 7);
    });

    editModalPickerMapInstance.on('click', (e) => {
      const pos = e.latlng;
      editModalPickerMarker.setLatLng(pos);
      if (latInput) latInput.value = formatGpsExact(pos.lat, 7);
      if (lngInput) lngInput.value = formatGpsExact(pos.lng, 7);
    });
  } else {
    editModalPickerMapInstance.invalidateSize();
    editModalPickerMapInstance.setView([lat, lng], 13);
    if (editModalPickerMarker) {
      editModalPickerMarker.setLatLng([lat, lng]);
    }
  }
}

window.syncEditMiniMap = function () {
  const latInput = document.getElementById('edit-charger-lat');
  const lngInput = document.getElementById('edit-charger-lng');
  const lat = parseFloat(latInput ? latInput.value : 6.9271);
  const lng = parseFloat(lngInput ? lngInput.value : 79.8612);

  if (isNaN(lat) || isNaN(lng)) return;

  if (editModalPickerMapInstance && editModalPickerMarker) {
    editModalPickerMarker.setLatLng([lat, lng]);
    editModalPickerMapInstance.setView([lat, lng], editModalPickerMapInstance.getZoom());
  }
};

function initEditLocationForm() {
  const form = document.getElementById('edit-location-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chargerId = document.getElementById('edit-charger-id').value;
    const location = document.getElementById('edit-charger-location').value;
    const address = document.getElementById('edit-charger-address').value;
    const lat = document.getElementById('edit-charger-lat').value;
    const lng = document.getElementById('edit-charger-lng').value;

    showToast(`Updating location for ${chargerId}...`, 'info');
    const res = await updateChargerLocationDoc(chargerId, {
      lat,
      lng,
      location_name: location,
      address
    });

    if (res.success) {
      showToast(`Location updated for ${chargerId}!`, 'success');
      window.closeEditLocationModal();
      window.flyToStation(chargerId);
    } else {
      showToast(`Update failed: ${res.error}`, 'error');
    }
  });
}

// -------------------------------------------------------------
// Master UI Refresh & Application Initialization
// -------------------------------------------------------------
function refreshAllUI() {
  renderExecutiveKPIs();
  updateMapMarkers();
  renderChargersGrid();
  renderTransactionsTable();
  populateAnalyticsSelector();
  
  if (selectedChargerIdForAnalysis) {
    renderChargerAnalytics(selectedChargerIdForAnalysis);
  }

  if (window.lucide) window.lucide.createIcons();
}

function updateConnectionBadge(state, message) {
  const dot = document.getElementById('connection-status-dot');
  const text = document.getElementById('connection-status-text');
  if (!dot || !text) return;

  text.textContent = state === 'connected' ? 'Online' : (state === 'connecting' ? 'Syncing...' : 'Connected');
  if (state === 'connected') {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
  } else if (state === 'connecting') {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-blue-500';
  }
}

// Bootstrapping on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  renderBrandLogo();
  initAddChargerForm();
  initEditLocationForm();
  initLeafletMaps();

  // Register real-time data callback
  registerDataListener(() => {
    refreshAllUI();
  });

  // Connect to Firestore
  initFirestoreData((status, message) => {
    updateConnectionBadge(status, message);
  });

  // Initial render
  refreshAllUI();
});
