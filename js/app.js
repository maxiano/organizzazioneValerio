import { db, docRef } from "./firebase-config.js";
import { onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { TurniManager } from "./modules/TurniManager.js";
import { SpeseManager } from "./modules/SpeseManager.js";
import { LogisticaManager } from "./modules/LogisticaManager.js";
import { ExportManager } from "./modules/ExportManager.js";

// Inizializzazione Istanze Moduli
const turniMgr = new TurniManager();
const speseMgr = new SpeseManager();
const logisticaMgr = new LogisticaManager();

let notes = {};
let activeDateKeyForNote = null;
let currentView = 'grid';
let currentDate = new Date();

// -------------------------------------------------------------
// SINCRONIZZAZIONE FIRESTORE
// -------------------------------------------------------------
onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    turniMgr.setData(data.data || {}, data.manualCambi || {});
    notes = data.notes || {};
    speseMgr.setSpese(data.spese || []);
    logisticaMgr.setPassaggi(data.passaggi || {});
  }
  render();
});

async function saveDataToFirestore() {
  try {
    await setDoc(docRef, { 
      data: turniMgr.overrides, 
      notes: notes, 
      manualCambi: turniMgr.manualCambi,
      spese: speseMgr.spese,
      passaggi: logisticaMgr.passaggi
    });
  } catch (error) {
    console.error("Errore salvataggio Firestore:", error);
  }
}

// -------------------------------------------------------------
// METODI GLOBALI AGGANCIATI ALLA WINDOW PER LA UI
// -------------------------------------------------------------
window.toggleDayOverride = function(dateKey) {
  turniMgr.toggleDay(dateKey);
  saveDataToFirestore();
  render();
};

window.exportToExcel = function() {
  ExportManager.exportToExcel(currentDate, (d) => turniMgr.getParentForDate(d), notes);
};

window.exportToICal = function() {
  ExportManager.generateICalendar(currentDate, (d) => turniMgr.getParentForDate(d), notes);
};

window.calculateStats = function() {
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  if (!startInput || !endInput || !startInput.value || !endInput.value) return;

  const startDate = new Date(startInput.value + 'T00:00:00');
  const endDate = new Date(endInput.value + 'T00:00:00');

  let countPapa = 0, countMamma = 0, countUndefined = 0;
  let curr = new Date(startDate);

  while (curr <= endDate) {
    const status = turniMgr.getParentForDate(curr);
    if (status?.parent === 'papa') countPapa++;
    else if (status?.parent === 'mamma') countMamma++;
    else countUndefined++;
    curr.setDate(curr.getDate() + 1);
  }

  if (document.getElementById('countPapa')) document.getElementById('countPapa').textContent = `${countPapa} giorni`;
  if (document.getElementById('countMamma')) document.getElementById('countMamma').textContent = `${countMamma} giorni`;
  if (document.getElementById('countUndefined')) document.getElementById('countUndefined').textContent = `${countUndefined} giorni`;
};

// -------------------------------------------------------------
// RENDERING UI
// -------------------------------------------------------------
function render() {
  if (currentView === 'grid') renderGrid();
  window.calculateStats();
}

function renderGrid() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startingDay = firstDay.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  for (let i = 0; i < startingDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell other-month';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateKey = turniMgr.formatDateKey(date);
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const status = turniMgr.getParentForDate(date);
    if (status && status.parent) {
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      badge.innerHTML = `<span>${status.parent === 'papa' ? 'Papà' : 'Mamma'}</span>`;
      cell.appendChild(badge);
    }

    cell.onclick = () => window.toggleDayOverride(dateKey);
    grid.appendChild(cell);
  }
}

// Avvio iniziale
render();
