/**
 * EV ChargeAdmin - OCPP 1.6-J Cloud Console
 * Modular Firebase Web SDK v10+ Integration
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// -------------------------------------------------------------
// 1. Firebase Configuration (Preset: orel-ev-30759)
// -------------------------------------------------------------
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyBHctG83GjkrxsaAVsAOOQQI9BjuJS-0P8",
  authDomain: "orel-ev-30759.firebaseapp.com",
  projectId: "orel-ev-30759",
  storageBucket: "orel-ev-30759.firebasestorage.app",
  messagingSenderId: "343235419280",
  appId: "1:343235419280:web:414d1ddc89a47c71c08c15",
  measurementId: "G-YZ13FTYW2M"
};

const savedConfigStr = localStorage.getItem('ev_firebase_config');
export const firebaseConfig = savedConfigStr ? JSON.parse(savedConfigStr) : DEFAULT_CONFIG;

// Global State
let app = null;
let db = null;
let isSimulatedMode = false;
let chargersUnsub = null;
let usersUnsub = null;
let commandsUnsub = null;
let transactionsUnsub = null;
let recentSwipesUnsub = null;

let chargersData = [];
let usersData = [];
let commandsData = [];
let transactionsData = [];
let recentSwipesData = [];

// UI Renderer Delegation
export const ui = {
  renderChargers: () => {},
  renderUsers: () => {},
  renderCommands: () => {},
  renderTransactions: () => {},
  renderRecentSwipes: () => {},
  renderStats: () => {}
};

export function registerUIRenderers(renderers) {
  Object.assign(ui, renderers);
  if (typeof ui.renderChargers === 'function') ui.renderChargers();
  if (typeof ui.renderUsers === 'function') ui.renderUsers();
  if (typeof ui.renderCommands === 'function') ui.renderCommands();
  if (typeof ui.renderTransactions === 'function') ui.renderTransactions();
  if (typeof ui.renderRecentSwipes === 'function') ui.renderRecentSwipes();
  if (typeof ui.renderStats === 'function') ui.renderStats();
}

function renderChargers() { if (ui.renderChargers) ui.renderChargers(); }
function renderUsers() { if (ui.renderUsers) ui.renderUsers(); }
function renderCommands() { if (ui.renderCommands) ui.renderCommands(); }
function renderTransactions() { if (ui.renderTransactions) ui.renderTransactions(); }
function renderRecentSwipes() { if (ui.renderRecentSwipes) ui.renderRecentSwipes(); }
function renderStats() { if (ui.renderStats) ui.renderStats(); }

// Fallback Mock Data for immediate zero-friction preview & offline hardware testing
const MOCK_CHARGERS = [
  {
    id: "DefaultOrelCharger",
    vendor: "ABB E-Mobility",
    model: "Terra 54 CJG",
    serial_number: "ABB-TERRA-2024-001",
    firmware_version: "2.4.1",
    status: "Available",
    connected: true,
    last_heartbeat: new Date(Date.now() - 25000),
    last_updated: new Date(Date.now() - 25000),
    current_power_kw: 0.0,
    voltage_v: 400.0,
    current_a: 0.0,
    soc_percent: null,
    active_transaction_id: null
  },
  {
    id: "OREL-DC-FAST-02",
    vendor: "Tritium",
    model: "Veefil-RT 50kW",
    serial_number: "TRIT-VF-88219",
    firmware_version: "3.1.0",
    status: "Charging",
    connected: true,
    last_heartbeat: new Date(Date.now() - 8000),
    last_updated: new Date(Date.now() - 4000),
    current_power_kw: 48.6,
    voltage_v: 405.2,
    current_a: 120.0,
    soc_percent: 78,
    active_transaction_id: "TX-90412"
  },
  {
    id: "OREL-AC-HUB-03",
    vendor: "Schneider Electric",
    model: "EVlink Pro AC 22kW",
    serial_number: "SCHN-EV-99014",
    firmware_version: "1.9.4",
    status: "Preparing",
    connected: true,
    last_heartbeat: new Date(Date.now() - 15000),
    last_updated: new Date(Date.now() - 15000),
    current_power_kw: 0.0,
    voltage_v: 230.5,
    current_a: 0.0,
    soc_percent: 42,
    active_transaction_id: null
  },
  {
    id: "OREL-DEPOT-04",
    vendor: "Siemens",
    model: "VersiCharge SG",
    serial_number: "SIEM-VC-10022",
    firmware_version: "2.0.8",
    status: "Faulted",
    connected: false,
    last_heartbeat: new Date(Date.now() - 3600000),
    last_updated: new Date(Date.now() - 3600000),
    current_power_kw: 0.0,
    voltage_v: 0.0,
    current_a: 0.0,
    soc_percent: null,
    active_transaction_id: null
  }
];

const MOCK_USERS = [
  {
    id: "04A1B2C3D4",
    rfid_tag: "04A1B2C3D4",
    name: "Alex Sterling (Fleet Mgr)",
    email: "alex.sterling@logistics.ev",
    balance: 145.50,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 14)
  },
  {
    id: "E200001928",
    rfid_tag: "E200001928",
    name: "Devon Vance",
    email: "devon.v@technomad.io",
    balance: 28.00,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 5)
  },
  {
    id: "71F982B401",
    rfid_tag: "71F982B401",
    name: "Elena Rostova",
    email: "elena@griddynamics.org",
    balance: -4.20,
    is_active: false,
    created_at: new Date(Date.now() - 86400000 * 2)
  }
];

const MOCK_COMMANDS = [
  {
    id: "cmd-001",
    charger_id: "OREL-DC-FAST-02",
    command: "RemoteStartTransaction",
    id_tag: "04A1B2C3D4",
    status: "EXECUTED",
    created_at: new Date(Date.now() - 120000)
  },
  {
    id: "cmd-002",
    charger_id: "DefaultOrelCharger",
    command: "RemoteStopTransaction",
    id_tag: "E200001928",
    status: "EXECUTED",
    created_at: new Date(Date.now() - 450000)
  }
];

const MOCK_TRANSACTIONS = [
  {
    id: "TX-90412",
    charger_id: "OREL-DC-FAST-02",
    id_tag: "04A1B2C3D4",
    user_name: "Alex Sterling",
    stop_reason: "Charging",
    start_time: new Date(Date.now() - 1200000),
    stop_time: null,
    meter_start: 1420.5,
    meter_stop: 1436.7,
    total_kwh: 16.2
  },
  {
    id: "TX-90408",
    charger_id: "DefaultOrelCharger",
    id_tag: "E200001928",
    user_name: "Devon Vance",
    stop_reason: "EVDisconnected",
    start_time: new Date(Date.now() - 18000000),
    stop_time: new Date(Date.now() - 15200000),
    meter_start: 890.0,
    meter_stop: 924.5,
    total_kwh: 34.5
  }
];

const MOCK_RECENT_SWIPES = [
  {
    id: "swipe-1",
    rfid_tag: "93D4B81A",
    charger_id: "DefaultOrelCharger",
    timestamp: new Date(Date.now() - 45000)
  },
  {
    id: "swipe-2",
    rfid_tag: "04FA88C2",
    charger_id: "OREL-DC-FAST-02",
    timestamp: new Date(Date.now() - 180000)
  }
];

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
    info: 'bg-slate-900/90 border-cyan-500/50 text-cyan-200',
    warning: 'bg-amber-950/90 border-amber-500/50 text-amber-200'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 text-sm ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="font-bold text-base">${icons[type] || '•'}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// Initialize Firebase
// -------------------------------------------------------------
export function initFirebase() {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    updateConnectionStatus('connecting', 'Connecting to Firestore (' + firebaseConfig.projectId + ')...');
    attachFirestoreListeners();
  } catch (err) {
    console.warn("Firestore initialization error, falling back to Simulated Network Mode:", err);
    enableSimulatedMode("Firebase Init: " + err.message);
  }
}

function updateConnectionStatus(status, text) {
  const badge = document.getElementById('connection-status-badge');
  const textEl = document.getElementById('connection-status-text');
  const dot = document.getElementById('connection-status-dot');

  if (!badge || !textEl || !dot) return;

  if (status === 'connected') {
    badge.className = "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
    dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    textEl.textContent = text || `Cloud Firestore: ${firebaseConfig.projectId}`;
  } else if (status === 'simulated') {
    badge.className = "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30";
    dot.className = "w-2 h-2 rounded-full bg-cyan-400";
    textEl.textContent = text || `Simulator / Mock OCPP Sandbox`;
  } else if (status === 'error') {
    badge.className = "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30";
    dot.className = "w-2 h-2 rounded-full bg-rose-400";
    textEl.textContent = text || "Firestore Permission / Auth Notice";
  } else {
    badge.className = "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30";
    dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    textEl.textContent = text || "Connecting to Firestore...";
  }
}

function enableSimulatedMode(reason = '') {
  isSimulatedMode = true;
  chargersData = [...MOCK_CHARGERS];
  usersData = [...MOCK_USERS];
  commandsData = [...MOCK_COMMANDS];
  transactionsData = [...MOCK_TRANSACTIONS];
  recentSwipesData = [...MOCK_RECENT_SWIPES];

  updateConnectionStatus('simulated', 'Simulated OCPP Network (Click to configure live Firestore)');
  const alertBanner = document.getElementById('connection-alert-banner');
  if (alertBanner) {
    alertBanner.classList.remove('hidden');
    const alertMsg = document.getElementById('connection-alert-msg');
    if (alertMsg) {
      alertMsg.textContent = reason || `Using active OCPP 1.6-J test simulator. You can connect to live Firebase by clicking "Firebase Setup" above.`;
    }
  }

  renderChargers();
  renderUsers();
  renderCommands();
  renderTransactions();
  renderRecentSwipes();
  renderStats();
}

// -------------------------------------------------------------
// Real-time Firestore Listeners
// -------------------------------------------------------------
function attachFirestoreListeners() {
  if (chargersUnsub) chargersUnsub();
  if (usersUnsub) usersUnsub();
  if (commandsUnsub) commandsUnsub();
  if (transactionsUnsub) transactionsUnsub();

  let hasError = false;

  // 1. Chargers Listener
  try {
    const chargersCol = collection(db, 'Chargers');
    chargersUnsub = onSnapshot(chargersCol, (snapshot) => {
      chargersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateConnectionStatus('connected', `Live Firestore: ${firebaseConfig.projectId}`);
      renderChargers();
      renderStats();
    }, (err) => {
      console.warn("Chargers snapshot permission/network notice:", err.message);
      if (!hasError) {
        hasError = true;
        enableSimulatedMode("Firestore rules or network notice: " + err.message);
      }
    });
  } catch (err) {
    enableSimulatedMode("Firestore error: " + err.message);
  }

  // 2. Users Listener
  try {
    const usersCol = collection(db, 'Users');
    usersUnsub = onSnapshot(usersCol, (snapshot) => {
      usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderUsers();
      renderStats();
    }, (err) => {
      console.warn("Users snapshot notice:", err.message);
    });
  } catch (e) {}

  // 3. Commands Listener (last 10 commands)
  try {
    const commandsCol = collection(db, 'Commands');
    const commandsQuery = query(commandsCol, orderBy('created_at', 'desc'), limit(10));
    commandsUnsub = onSnapshot(commandsQuery, (snapshot) => {
      commandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCommands();
      renderStats();
    }, (err) => {
      // If composite index is missing or ordering fails, try fallback without orderBy
      onSnapshot(commandsCol, (snap) => {
        commandsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCommands();
      }, () => {});
    });
  } catch (e) {}

  // 4. Transactions Listener
  try {
    const transactionsCol = collection(db, 'Transactions');
    transactionsUnsub = onSnapshot(transactionsCol, (snapshot) => {
      transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderTransactions();
      renderStats();
    }, (err) => {
      console.warn("Transactions snapshot notice:", err.message);
    });
  } catch (e) {}

  // 5. RecentSwipes Listener (Live Unknown RFID Taps)
  try {
    const swipesCol = collection(db, 'RecentSwipes');
    const swipesQuery = query(swipesCol, orderBy('timestamp', 'desc'), limit(15));
    recentSwipesUnsub = onSnapshot(swipesQuery, (snapshot) => {
      recentSwipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderRecentSwipes();
    }, (err) => {
      onSnapshot(swipesCol, (snap) => {
        recentSwipesData = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
            const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
            return tB - tA;
          });
        renderRecentSwipes();
      }, () => {});
    });
  } catch (e) {}
}

// -------------------------------------------------------------
// Actions & Firestore Operations
// -------------------------------------------------------------

export async function sendRemoteStartCommand(chargerId, idTag) {
  if (!chargerId || !idTag) {
    showToast("Please provide both Charger ID and RFID Tag", "error");
    return false;
  }

  const newCommand = {
    charger_id: chargerId,
    command: "RemoteStartTransaction",
    id_tag: idTag,
    status: "PENDING",
    created_at: isSimulatedMode ? new Date() : serverTimestamp()
  };

  try {
    if (!isSimulatedMode && db) {
      await addDoc(collection(db, "Commands"), newCommand);
      showToast(`Dispatched RemoteStartTransaction to ${chargerId} (Tag: ${idTag})`, "success");
    } else {
      // Simulator mode: add to local array and simulate OCPP Server execution after 2s
      const simCmd = { ...newCommand, id: 'cmd-' + Date.now(), created_at: new Date() };
      commandsData.unshift(simCmd);
      renderCommands();
      showToast(`[Simulator] Dispatched RemoteStart to ${chargerId}. Awaiting OCPP response...`, "info");
      
      setTimeout(() => {
        simCmd.status = "EXECUTED";
        // Update charger status to Charging
        const charger = chargersData.find(c => c.id === chargerId);
        if (charger) {
          charger.status = "Charging";
          charger.current_power_kw = 45.2;
          charger.active_transaction_id = "TX-" + Math.floor(10000 + Math.random() * 90000);
          charger.last_updated = new Date();
          renderChargers();
          renderStats();
        }
        renderCommands();
        showToast(`[Simulator] OCPP 1.6-J: RemoteStart Accepted by ${chargerId}!`, "success");
      }, 2200);
    }
    return true;
  } catch (err) {
    console.error("Error sending start command:", err);
    showToast(`Failed to send command: ${err.message}`, "error");
    return false;
  }
}

export async function sendRemoteStopCommand(chargerId) {
  if (!chargerId) {
    showToast("Please specify a Charger ID", "error");
    return false;
  }

  const newCommand = {
    charger_id: chargerId,
    command: "RemoteStopTransaction",
    status: "PENDING",
    created_at: isSimulatedMode ? new Date() : serverTimestamp()
  };

  try {
    if (!isSimulatedMode && db) {
      await addDoc(collection(db, "Commands"), newCommand);
      showToast(`Dispatched RemoteStopTransaction to ${chargerId}`, "success");
    } else {
      const simCmd = { ...newCommand, id: 'cmd-' + Date.now(), created_at: new Date() };
      commandsData.unshift(simCmd);
      renderCommands();
      showToast(`[Simulator] Dispatched RemoteStop to ${chargerId}. Awaiting OCPP response...`, "info");

      setTimeout(() => {
        simCmd.status = "EXECUTED";
        const charger = chargersData.find(c => c.id === chargerId);
        if (charger) {
          charger.status = "Available";
          charger.current_power_kw = 0.0;
          charger.active_transaction_id = null;
          charger.last_updated = new Date();
          renderChargers();
          renderStats();
        }
        renderCommands();
        showToast(`[Simulator] OCPP 1.6-J: Transaction terminated on ${chargerId}!`, "success");
      }, 2000);
    }
    return true;
  } catch (err) {
    console.error("Error sending stop command:", err);
    showToast(`Failed to send stop command: ${err.message}`, "error");
    return false;
  }
}

export async function addNewUser({ rfid_tag, name, balance, is_active, email }) {
  if (!rfid_tag || !name) {
    showToast("Name and RFID Tag are required", "error");
    return false;
  }

  const cleanTag = rfid_tag.trim().toUpperCase();
  const userData = {
    name: name.trim(),
    rfid_tag: cleanTag,
    email: (email || "").trim(),
    balance: parseFloat(balance) || 0.00,
    is_active: Boolean(is_active),
    created_at: isSimulatedMode ? new Date() : serverTimestamp()
  };

  try {
    if (!isSimulatedMode && db) {
      await setDoc(doc(db, "Users", cleanTag), userData);
      showToast(`RFID User ${name} (${cleanTag}) registered successfully!`, "success");
    } else {
      const existingIdx = usersData.findIndex(u => u.id === cleanTag || u.rfid_tag === cleanTag);
      if (existingIdx >= 0) {
        usersData[existingIdx] = { id: cleanTag, ...userData, created_at: new Date() };
      } else {
        usersData.push({ id: cleanTag, ...userData, created_at: new Date() });
      }
      renderUsers();
      renderStats();
      showToast(`[Simulator] User registered: ${cleanTag}`, "success");
    }
    return true;
  } catch (err) {
    console.error("Error registering user:", err);
    showToast(`Error adding user: ${err.message}`, "error");
    return false;
  }
}

export async function toggleUserStatus(rfidTag, currentStatus) {
  const newStatus = !currentStatus;
  try {
    if (!isSimulatedMode && db) {
      await updateDoc(doc(db, "Users", rfidTag), { is_active: newStatus });
      showToast(`Card ${rfidTag} is now ${newStatus ? 'ACTIVE' : 'BLOCKED'}`, "success");
    } else {
      const user = usersData.find(u => (u.id === rfidTag || u.rfid_tag === rfidTag));
      if (user) {
        user.is_active = newStatus;
        renderUsers();
        showToast(`[Simulator] Card ${rfidTag} marked ${newStatus ? 'ACTIVE' : 'BLOCKED'}`, "info");
      }
    }
  } catch (err) {
    console.error("Error toggling user:", err);
    showToast(`Error updating status: ${err.message}`, "error");
  }
}

export async function deleteUser(rfidTag) {
  if (!confirm(`Are you sure you want to delete user card ${rfidTag}?`)) return;

  try {
    if (!isSimulatedMode && db) {
      await deleteDoc(doc(db, "Users", rfidTag));
      showToast(`User ${rfidTag} deleted from directory`, "info");
    } else {
      usersData = usersData.filter(u => u.id !== rfidTag && u.rfid_tag !== rfidTag);
      renderUsers();
      renderStats();
      showToast(`[Simulator] Deleted card ${rfidTag}`, "info");
    }
  } catch (err) {
    console.error("Error deleting user:", err);
    showToast(`Error deleting user: ${err.message}`, "error");
  }
}

export async function topUpUserBalance(rfidTag, amountToAdd) {
  const addVal = parseFloat(amountToAdd);
  if (isNaN(addVal) || addVal <= 0) {
    showToast("Invalid top-up amount", "error");
    return;
  }

  const targetUser = usersData.find(u => u.id === rfidTag || u.rfid_tag === rfidTag);
  const currentBal = targetUser ? (targetUser.balance || 0) : 0;
  const newBal = parseFloat((currentBal + addVal).toFixed(2));

  try {
    if (!isSimulatedMode && db) {
      await updateDoc(doc(db, "Users", rfidTag), { balance: newBal });
      showToast(`Topped up $${addVal.toFixed(2)} for ${rfidTag}. New balance: $${newBal.toFixed(2)}`, "success");
    } else {
      if (targetUser) {
        targetUser.balance = newBal;
        renderUsers();
        showToast(`[Simulator] Topped up $${addVal.toFixed(2)} for ${rfidTag}`, "success");
      }
    }
  } catch (err) {
    console.error("Error topping up:", err);
    showToast(`Top-up failed: ${err.message}`, "error");
  }
}

export async function registerNewCharger({ charger_id, vendor, model }) {
  if (!charger_id) {
    showToast("Charger ID is required", "error");
    return false;
  }

  const cleanId = charger_id.trim();
  const chargerDoc = {
    status: "Available",
    vendor: vendor || "Generic EVSE",
    model: model || "OCPP 1.6-J Compliant",
    connected: true,
    last_heartbeat: isSimulatedMode ? new Date() : serverTimestamp(),
    last_updated: isSimulatedMode ? new Date() : serverTimestamp(),
    current_power_kw: 0.0,
    active_transaction_id: null
  };

  try {
    if (!isSimulatedMode && db) {
      await setDoc(doc(db, "Chargers", cleanId), chargerDoc);
      showToast(`Charger ${cleanId} registered in Firestore!`, "success");
    } else {
      chargersData.push({ id: cleanId, ...chargerDoc, last_heartbeat: new Date(), last_updated: new Date() });
      renderChargers();
      renderStats();
      showToast(`[Simulator] Registered charger ${cleanId}`, "success");
    }
    return true;
  } catch (err) {
    console.error("Error adding charger:", err);
    showToast(`Failed to register charger: ${err.message}`, "error");
    return false;
  }
}

export async function seedInitialFirestoreData() {
  showToast("Seeding initial network records...", "info");
  try {
    if (!isSimulatedMode && db) {
      for (const c of MOCK_CHARGERS) {
        await setDoc(doc(db, "Chargers", c.id), {
          status: c.status,
          vendor: c.vendor,
          model: c.model,
          connected: c.connected,
          last_heartbeat: serverTimestamp(),
          last_updated: serverTimestamp(),
          current_power_kw: c.current_power_kw,
          active_transaction_id: c.active_transaction_id
        });
      }

      for (const u of MOCK_USERS) {
        await setDoc(doc(db, "Users", u.rfid_tag), {
          name: u.name,
          rfid_tag: u.rfid_tag,
          email: u.email,
          balance: u.balance,
          is_active: u.is_active,
          created_at: serverTimestamp()
        });
      }

      for (const cmd of MOCK_COMMANDS) {
        await addDoc(collection(db, "Commands"), {
          charger_id: cmd.charger_id,
          command: cmd.command,
          id_tag: cmd.id_tag || "SYSTEM",
          status: cmd.status,
          created_at: serverTimestamp()
        });
      }

      for (const tx of MOCK_TRANSACTIONS) {
        await addDoc(collection(db, "Transactions"), {
          charger_id: tx.charger_id,
          id_tag: tx.id_tag,
          start_time: serverTimestamp(),
          stop_time: tx.stop_time ? serverTimestamp() : null,
          meter_start: tx.meter_start,
          meter_stop: tx.meter_stop,
          total_kwh: tx.total_kwh
        });
      }
      showToast("Successfully seeded sample Chargers, Users, Commands & Transactions into Firestore!", "success");
    } else {
      chargersData = [...MOCK_CHARGERS];
      usersData = [...MOCK_USERS];
      commandsData = [...MOCK_COMMANDS];
      transactionsData = [...MOCK_TRANSACTIONS];
      renderChargers();
      renderUsers();
      renderCommands();
      renderTransactions();
      renderStats();
      showToast("Seeded simulator state!", "success");
    }
  } catch (err) {
    console.error("Seeding error:", err);
    showToast(`Seeding notice: ${err.message}`, "warning");
  }
}

export {
  app,
  db,
  isSimulatedMode,
  chargersData,
  usersData,
  commandsData,
  transactionsData,
  recentSwipesData,
  enableSimulatedMode,
  attachFirestoreListeners
};
