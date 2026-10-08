/**
 * EV ChargeAdmin UI Rendering & Modal Controllers
 */
import {
  chargersData,
  usersData,
  commandsData,
  transactionsData,
  recentSwipesData,
  sendRemoteStartCommand,
  sendRemoteStopCommand,
  addNewUser,
  toggleUserStatus,
  deleteUser,
  topUpUserBalance,
  registerNewCharger,
  seedInitialFirestoreData,
  firebaseConfig,
  isSimulatedMode,
  showToast,
  registerUIRenderers
} from './dashboard.js';

// Status color themes per EVSE standards
const STATUS_CONFIG = {
  Available: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
  },
  Preparing: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400 animate-pulse',
    badge: 'bg-blue-950 text-blue-300 border-blue-500/40'
  },
  Charging: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400 animate-ping',
    badge: 'bg-amber-950 text-amber-300 border-amber-500/40'
  },
  Finishing: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
    badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
  },
  Faulted: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    badge: 'bg-rose-950 text-rose-300 border-rose-500/40'
  },
  Disconnected: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-700/50',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
    badge: 'bg-slate-900 text-slate-400 border-slate-700'
  }
};

function formatTimestamp(ts) {
  if (!ts) return 'Never';
  if (ts.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (ts instanceof Date) {
    return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return 'Just now';
}

function timeAgo(ts) {
  if (!ts) return 'N/A';
  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

// -------------------------------------------------------------
// Render Chargers Grid
// -------------------------------------------------------------
export function renderChargers() {
  const container = document.getElementById('chargers-grid');
  const countBadge = document.getElementById('chargers-count-badge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${chargersData.length} Hardware Units`;

  if (chargersData.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-6 rounded-2xl border border-slate-800 bg-slate-900/40 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400 mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h4 class="text-base font-semibold text-slate-200">No EV Chargers Registered</h4>
        <p class="text-sm text-slate-400 mt-1 max-w-md mx-auto">There are currently no EVSE units reported in the Firestore <code>Chargers</code> collection.</p>
        <div class="mt-4 flex items-center justify-center gap-3">
          <button onclick="window.openAddChargerModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-950">Add First Charger</button>
          <button onclick="window.seedData()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition">Seed Demo Chargers</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = chargersData.map(charger => {
    const statusKey = charger.connected ? (charger.status || 'Available') : 'Disconnected';
    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Available;
    const isCharging = charger.status === 'Charging';
    const powerKw = (typeof charger.current_power_kw === 'number' ? charger.current_power_kw : parseFloat(charger.current_power_kw || 0)).toFixed(1);
    const voltageV = charger.voltage_v != null ? `${Math.round(charger.voltage_v)} V` : '—';
    const currentA = charger.current_a != null ? `${Number(charger.current_a).toFixed(1)} A` : '—';

    const vendorModel = `${charger.vendor || 'Unknown Vendor'} • ${charger.model || 'OCPP 1.6'}`;
    const hwMeta = [
      charger.serial_number ? `SN: ${charger.serial_number}` : null,
      charger.firmware_version ? `FW: v${charger.firmware_version}` : null
    ].filter(Boolean).join(' • ');

    const hasSoc = charger.soc_percent != null && !isNaN(charger.soc_percent);
    const socVal = hasSoc ? Math.min(100, Math.max(0, Math.round(charger.soc_percent))) : null;

    return `
      <div class="group relative bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-sm flex flex-col justify-between">
        <!-- Card Header -->
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full ${cfg.dot}"></span>
                <h3 class="font-bold text-white text-base tracking-wide">${charger.id}</h3>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${vendorModel}</p>
              ${hwMeta ? `<p class="text-[11px] font-mono text-slate-500 mt-0.5 tracking-tight truncate">${hwMeta}</p>` : ''}
            </div>
            
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.badge}">
              ${statusKey}
            </span>
          </div>

          <!-- Real-Time Electrical Telemetry Row -->
          <div class="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
            <div>
              <span class="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Power</span>
              <span class="text-sm font-bold ${isCharging || parseFloat(powerKw) > 0 ? 'text-amber-400 font-mono' : 'text-slate-300 font-mono'}">
                ${powerKw} kW
              </span>
            </div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Voltage</span>
              <span class="text-sm font-bold text-slate-200 font-mono">${voltageV}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Current</span>
              <span class="text-sm font-bold ${(isCharging || (currentA !== '—' && parseFloat(currentA) > 0)) ? 'text-cyan-400 font-mono' : 'text-slate-300 font-mono'}">
                ${currentA}
              </span>
            </div>
          </div>

          <!-- Vehicle State of Charge (SoC) Progress Bar -->
          ${hasSoc ? `
            <div class="mt-3 py-2 px-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-400 font-medium flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Vehicle State of Charge
                </span>
                <span class="font-bold font-mono text-emerald-400">SoC: ${socVal}%</span>
              </div>
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500" style="width: ${socVal}%"></div>
              </div>
            </div>
          ` : ''}

          <!-- Active Session Info -->
          ${charger.active_transaction_id ? `
            <div class="mt-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-2.5 flex items-center justify-between">
              <span class="font-medium">⚡ Active Tx: <strong class="font-mono text-white">${charger.active_transaction_id}</strong></span>
              <span class="text-[11px] text-amber-200/80 font-mono">${timeAgo(charger.last_updated)}</span>
            </div>
          ` : `
            <div class="mt-3 text-xs text-slate-400 flex items-center justify-between px-1">
              <span>Hardware Link:</span>
              <span class="inline-flex items-center gap-1.5 font-medium ${charger.connected ? 'text-emerald-400' : 'text-slate-400'}">
                <span class="w-1.5 h-1.5 rounded-full ${charger.connected ? 'bg-emerald-400' : 'bg-slate-400'}"></span>
                ${charger.connected ? 'OCPP-J Online' : 'Offline'}
              </span>
            </div>
          `}
        </div>

        <!-- Action Controls (Direct Turn ON / Turn OFF without RFID, plus Card Start) -->
        <div class="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button 
            onclick="window.handleTurnOn('${charger.id}')" 
            ${!charger.connected ? 'disabled title="Charger offline"' : ''}
            class="flex-1 py-2 px-2.5 ${isCharging ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30' : (charger.connected ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed')} rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
            title="Turn ON charger directly without RFID card">
            <span>${isCharging ? 'Running (ON)' : 'Turn ON'}</span>
          </button>

          <button 
            onclick="window.handleTurnOff('${charger.id}')" 
            class="flex-1 py-2 px-2.5 ${isCharging ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 shadow-md font-bold' : 'bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-300 border border-slate-700'} rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
            title="Turn OFF charger directly">
            <span>Turn OFF</span>
          </button>

          <button 
            onclick="window.openForceStartModal('${charger.id}')" 
            ${!charger.connected ? 'disabled' : ''}
            class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition" 
            title="Advanced: Start with specific RFID User Card">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Users Directory Table
// -------------------------------------------------------------
export function renderUsers() {
  const tbody = document.getElementById('users-table-body');
  const countBadge = document.getElementById('users-count-badge');
  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${usersData.length} Registered Cards`;

  if (usersData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 text-center text-sm text-slate-400">
          No RFID users registered yet. Add a user with card UID above.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = usersData.map(user => {
    const tag = user.rfid_tag || user.id;
    const isActive = Boolean(user.is_active);
    const balance = typeof user.balance === 'number' ? user.balance : parseFloat(user.balance || 0);
    const balColor = balance < 0 ? 'text-rose-400' : (balance < 5 ? 'text-amber-400' : 'text-emerald-400');

    return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">
        <!-- RFID Tag -->
        <td class="py-3 px-4 font-mono font-medium text-slate-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="inline-flex p-1.5 rounded-md bg-slate-800 text-cyan-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </span>
            <span>${tag}</span>
          </div>
        </td>

        <!-- Name & Email -->
        <td class="py-3 px-4">
          <div class="font-medium text-slate-200 text-sm">${user.name || 'Unnamed User'}</div>
          ${user.email ? `<div class="text-[11px] text-slate-400">${user.email}</div>` : ''}
        </td>

        <!-- Balance -->
        <td class="py-3 px-4 font-mono text-sm font-semibold ${balColor}">
          $${balance.toFixed(2)}
        </td>

        <!-- Status -->
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }">
            <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
            ${isActive ? 'Active' : 'Blocked'}
          </span>
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <!-- Toggle Active/Blocked -->
            <button 
              onclick="window.handleToggleUser('${tag}', ${isActive})"
              title="${isActive ? 'Block Card' : 'Activate Card'}"
              class="p-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition bg-slate-800/80">
              ${isActive ? `
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ` : `
                <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
              `}
            </button>

            <!-- Top up balance -->
            <button 
              onclick="window.openTopUpModal('${tag}', '${user.name || tag}')"
              title="Add Balance"
              class="p-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition bg-slate-800/80">
              <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </button>

            <!-- Delete -->
            <button 
              onclick="window.handleDeleteUser('${tag}')"
              title="Delete User"
              class="p-1.5 rounded-lg border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-400 transition bg-slate-800/80">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Commands Log
// -------------------------------------------------------------
export function renderCommands() {
  const tbody = document.getElementById('commands-table-body');
  if (!tbody) return;

  if (commandsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-xs text-slate-400">
          No remote OCPP commands recorded yet. Use Force Start or Remote Stop to dispatch actions.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = commandsData.slice(0, 10).map(cmd => {
    const status = (cmd.status || 'PENDING').toUpperCase();
    let statusBadge = '';

    if (status === 'EXECUTED') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        EXECUTED
      </span>`;
    } else if (status === 'PENDING') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
        PENDING
      </span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        ✕ FAILED
      </span>`;
    }

    return `
      <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60 font-mono text-xs">
        <td class="py-2.5 px-3 text-slate-300 font-semibold">${cmd.charger_id || 'Any'}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
            ${cmd.command}
          </span>
        </td>
        <td class="py-2.5 px-3 text-cyan-300">${cmd.id_tag || '—'}</td>
        <td class="py-2.5 px-3">${statusBadge}</td>
        <td class="py-2.5 px-3 text-slate-400 text-right">${timeAgo(cmd.created_at)}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Transactions
// -------------------------------------------------------------
export function renderTransactions() {
  const tbody = document.getElementById('transactions-table-body');
  if (!tbody) return;

  if (transactionsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-xs text-slate-400">
          No transactions reported yet from OCPP 1.6 StopTransaction events.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactionsData.slice(0, 10).map(tx => {
    const isOngoing = !tx.stop_time;
    const userName = tx.user_name || '—';
    const stopReason = tx.stop_reason || (isOngoing ? 'Charging' : 'Normal');

    return `
      <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60 font-mono text-xs">
        <td class="py-2.5 px-3 text-slate-200 font-semibold">${tx.id || 'TX-Auto'}</td>
        <td class="py-2.5 px-3 text-slate-300">${tx.charger_id}</td>
        <td class="py-2.5 px-3 font-sans text-slate-200 font-medium">${userName}</td>
        <td class="py-2.5 px-3 text-cyan-300">${tx.id_tag || '—'}</td>
        <td class="py-2.5 px-3 text-slate-300 font-bold">${(tx.total_kwh || 0).toFixed(2)} kWh</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${isOngoing ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
            ${stopReason}
          </span>
        </td>
        <td class="py-2.5 px-3 text-slate-400 text-right">${timeAgo(tx.start_time)}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Recent Unknown Swipes
// -------------------------------------------------------------
export function renderRecentSwipes() {
  const container = document.getElementById('recent-swipes-list');
  const countBadge = document.getElementById('swipes-count-badge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${recentSwipesData.length} Tapped`;

  if (recentSwipesData.length === 0) {
    container.innerHTML = `
      <div class="py-5 px-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
        <div class="text-xs text-slate-400 font-medium">Awaiting Card Swipes</div>
        <p class="text-[11px] text-slate-500 mt-0.5">Swipe an unknown RFID tag at any EVSE to capture its UID here in real-time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recentSwipesData.slice(0, 8).map(swipe => {
    const tag = swipe.rfid_tag || 'UNKNOWN';
    const charger = swipe.charger_id || 'EVSE';
    const timeStr = timeAgo(swipe.timestamp);

    return `
      <div class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold text-xs text-cyan-300 tracking-wide select-all">${tag}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono truncate max-w-[110px]" title="${charger}">
              ${charger}
            </span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 font-mono">${timeStr}</div>
        </div>

        <button 
          onclick="window.autofillRfidTag('${tag}')" 
          title="Auto-fill into form"
          class="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold tracking-wide transition shadow shadow-emerald-950 flex items-center gap-1">
          1-Click Register
        </button>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Top Statistics
// -------------------------------------------------------------
export function renderStats() {
  const activeChargersCount = chargersData.filter(c => c.status === 'Charging').length;
  const onlineChargersCount = chargersData.filter(c => c.connected).length;
  const activeUsersCount = usersData.filter(u => u.is_active).length;
  
  // Aggregate live current_power_kw across chargers in "Charging" state
  const totalPowerNow = chargersData.reduce((acc, c) => {
    const isCharging = c.status === 'Charging';
    const pwr = typeof c.current_power_kw === 'number' ? c.current_power_kw : (parseFloat(c.current_power_kw) || 0);
    return acc + (isCharging ? pwr : 0);
  }, 0);
  const totalEnergyKwh = transactionsData.reduce((acc, t) => acc + (t.total_kwh || 0), 0);

  const elActive = document.getElementById('stat-active-chargers');
  const elOnline = document.getElementById('stat-online-chargers');
  const elPower = document.getElementById('stat-total-power');
  const elUsers = document.getElementById('stat-active-users');
  const elEnergy = document.getElementById('stat-total-energy');

  if (elActive) elActive.textContent = activeChargersCount;
  if (elOnline) elOnline.textContent = `${onlineChargersCount} / ${chargersData.length}`;
  if (elPower) elPower.textContent = totalPowerNow.toFixed(1) + ' kW';
  if (elUsers) elUsers.textContent = activeUsersCount;
  if (elEnergy) elEnergy.textContent = totalEnergyKwh.toFixed(1) + ' kWh';
}

// -------------------------------------------------------------
// Global Window Event Handlers & Modal Control
// -------------------------------------------------------------
let selectedChargerForStart = null;

window.openForceStartModal = function(chargerId) {
  selectedChargerForStart = chargerId;
  const modal = document.getElementById('force-start-modal');
  const chargerLabel = document.getElementById('modal-target-charger');
  const selectEl = document.getElementById('modal-rfid-select');
  const manualInput = document.getElementById('modal-rfid-manual');

  if (!modal || !chargerLabel || !selectEl) return;

  chargerLabel.textContent = chargerId;
  manualInput.value = '';

  // Populate active users
  const activeUsers = usersData.filter(u => u.is_active);
  selectEl.innerHTML = `
    <option value="">-- Choose registered authorized user card --</option>
    ${activeUsers.map(u => `
      <option value="${u.rfid_tag || u.id}">
        ${u.name} (Tag: ${u.rfid_tag || u.id} | Bal: $${(u.balance || 0).toFixed(2)})
      </option>
    `).join('')}
  `;

  modal.classList.remove('hidden');
};

window.closeForceStartModal = function() {
  const modal = document.getElementById('force-start-modal');
  if (modal) modal.classList.add('hidden');
  selectedChargerForStart = null;
};

window.submitForceStart = async function() {
  if (!selectedChargerForStart) return;

  const selectEl = document.getElementById('modal-rfid-select');
  const manualInput = document.getElementById('modal-rfid-manual');

  const idTag = (manualInput.value || selectEl.value || '').trim();
  if (!idTag) {
    showToast("Please choose or enter an RFID Tag", "error");
    return;
  }

  const success = await sendRemoteStartCommand(selectedChargerForStart, idTag);
  if (success) {
    window.closeForceStartModal();
  }
};

window.handleRemoteStop = async function(chargerId) {
  if (!confirm(`Confirm Remote Stop for charger ${chargerId}?`)) return;
  await sendRemoteStopCommand(chargerId);
};

window.handleToggleUser = async function(rfidTag, currentStatus) {
  await toggleUserStatus(rfidTag, currentStatus);
};

window.handleDeleteUser = async function(rfidTag) {
  await deleteUser(rfidTag);
};

window.openTopUpModal = function(rfidTag, userName) {
  const amount = prompt(`Enter balance top-up amount for ${userName} (${rfidTag}):`, "25.00");
  if (amount !== null) {
    topUpUserBalance(rfidTag, amount);
  }
};

window.openAddChargerModal = function() {
  const modal = document.getElementById('add-charger-modal');
  if (modal) modal.classList.remove('hidden');
};

window.closeAddChargerModal = function() {
  const modal = document.getElementById('add-charger-modal');
  if (modal) modal.classList.add('hidden');
};

window.submitAddCharger = async function(e) {
  e.preventDefault();
  const form = document.getElementById('add-charger-form');
  const idInput = document.getElementById('new-charger-id');
  const vendorInput = document.getElementById('new-charger-vendor');
  const modelInput = document.getElementById('new-charger-model');

  const success = await registerNewCharger({
    charger_id: idInput.value,
    vendor: vendorInput.value,
    model: modelInput.value
  });

  if (success) {
    form.reset();
    window.closeAddChargerModal();
  }
};

window.openConfigModal = function() {
  const modal = document.getElementById('firebase-config-modal');
  const textarea = document.getElementById('config-json-input');
  if (!modal || !textarea) return;

  textarea.value = JSON.stringify(firebaseConfig, null, 2);
  modal.classList.remove('hidden');
};

window.closeConfigModal = function() {
  const modal = document.getElementById('firebase-config-modal');
  if (modal) modal.classList.add('hidden');
};

window.saveFirebaseConfig = function() {
  const textarea = document.getElementById('config-json-input');
  try {
    const parsed = JSON.parse(textarea.value);
    localStorage.setItem('ev_firebase_config', JSON.stringify(parsed));
    showToast("Firebase Config saved! Reloading application...", "success");
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    showToast("Invalid JSON format: " + err.message, "error");
  }
};

window.openPythonHelperModal = function() {
  const modal = document.getElementById('python-helper-modal');
  if (modal) modal.classList.remove('hidden');
};

window.closePythonHelperModal = function() {
  const modal = document.getElementById('python-helper-modal');
  if (modal) modal.classList.add('hidden');
};

window.handleTurnOn = async function(chargerId) {
  await sendRemoteStartCommand(chargerId, "NO_RFID");
};

window.handleTurnOff = async function(chargerId) {
  await sendRemoteStopCommand(chargerId);
};

window.autofillRfidTag = function(tag) {
  const rfidInput = document.getElementById('user-rfid');
  const nameInput = document.getElementById('user-name');
  const formPanel = document.getElementById('issue-card-panel');
  if (!rfidInput) return;

  rfidInput.value = tag;
  showToast(`Auto-filled RFID Tag ${tag}! Enter cardholder name.`, 'info');

  rfidInput.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-950/40');
  setTimeout(() => {
    rfidInput.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-950/40');
  }, 1200);

  if (nameInput) {
    nameInput.focus();
  }

  if (formPanel) {
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.seedData = async function() {
  await seedInitialFirestoreData();
};

// Register UI renderers with dashboard state manager
registerUIRenderers({
  renderChargers,
  renderUsers,
  renderCommands,
  renderTransactions,
  renderRecentSwipes,
  renderStats
});
