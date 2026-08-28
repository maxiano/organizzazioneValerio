// =============================================================
// 1. IMPORT FIREBASE & MODULI
// =============================================================
import { db, docRef } from './firebase-config.js';
import { getDoc, setDoc, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { TurniManager } from './modules/TurniManager.js';
import { SpeseManager } from './modules/SpeseManager.js';
import { LogisticaManager } from './modules/LogisticaManager.js';
import { ScuolaManager } from './modules/ScuolaManager.js';
import { VacanzeManager } from './modules/VacanzeManager.js';
import { SaluteManager } from './modules/SaluteManager.js';
import { ExportManager } from './modules/ExportManager.js';

// =============================================================
// 2. INIZIALIZZAZIONE MANAGER & STATO LOCALE
// =============================================================
const turniMgr = new TurniManager();
const speseMgr = new SpeseManager();
const logisticaMgr = new LogisticaManager();
const scuolaMgr = new ScuolaManager();
const vacanzeMgr = new VacanzeManager();
const saluteMgr = new SaluteManager();

let currentDate = new Date();
let currentView = 'grid'; // 'grid' | 'list'
let notes = {};

// =============================================================
// 3. FIRESTORE SYNC & SALVATAGGIO
// =============================================================
async function saveDataToFirestore() {
  try {
    const dataToSave = {
      turni: turniMgr.getData(),
      spese: speseMgr.getData(),
      logistica: logisticaMgr.getData(),
      salute: saluteMgr.getData(),
      vacanze: vacanzeMgr.getData(),
      scuola: scuolaMgr.getData(),
      notes: notes
    };
    
    if (db) {
      const mainDocRef = doc(db, "familyData", "main");
      await setDoc(mainDocRef, dataToSave, { merge: true });
    }
  } catch (error) {
    console.error("Errore durante il salvataggio su Firestore:", error);
  }
}

function initFirestoreSync() {
  if (db) {
    const mainDocRef = doc(db, "familyData", "main");
    onSnapshot(mainDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.turni) turniMgr.loadData(data.turni);
        if (data.spese) speseMgr.loadData(data.spese);
        if (data.logistica) logisticaMgr.loadData(data.logistica);
        if (data.salute) saluteMgr.loadData(data.salute);
        if (data.vacanze) vacanzeMgr.loadData(data.vacanze);
        if (data.scuola) scuolaMgr.loadData(data.scuola);
        if (data.notes) notes = data.notes;
        render();
      }
    });
  }
}

// =============================================================
// 4. LOGICA INTERNA E UTILITY
// =============================================================
function getParentForDateWithVacanze(date) {
  const dateKey = turniMgr.formatDateKey(date);
  
  // Controlla prima le vacanze
  const vacanza = vacanzeMgr.getVacanzaForDate(dateKey);
  if (vacanza) {
    return { parent: vacanza.parent, isVacanza: true };
  }
  
  // Altrimenti recupera lo stato dai turni (inclusi gli override manuali)
  const status = turniMgr.getParentForDate(date);
  return status;
}

// Funzione globale per il toggle manuale dei giorni (Papà / Mamma)
window.toggleDayOverride = async function(dateKey) {
  turniMgr.toggleOverride(dateKey);
  await saveDataToFirestore();
  render();
};

// =============================================================
// 5. ESPORTAZIONE & STATISTICHE
// =============================================================
window.exportToExcel = function() {
  ExportManager.exportToExcel(currentDate, (d) => getParentForDateWithVacanze(d), notes);
};

window.exportToICal = function() {
  ExportManager.generateICalendar(currentDate, (d) => getParentForDateWithVacanze(d), notes);
};

window.calculateStats = function() {
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  if (!startInput || !endInput || !startInput.value || !endInput.value) return;

  const startDate = new Date(startInput.value + 'T00:00:00');
  const endDate = new Date(endInput.value + 'T00:00:00');
  if (startDate > endDate) return;

  let countPapa = 0, countMamma = 0, countUndefined = 0;
  let curr = new Date(startDate);

  while (curr <= endDate) {
    const status = getParentForDateWithVacanze(curr);
    if (status?.parent === 'papa') countPapa++;
    else if (status?.parent === 'mamma') countMamma++;
    else countUndefined++;
    curr.setDate(curr.getDate() + 1);
  }

  const elPapa = document.getElementById('countPapa');
  const elMamma = document.getElementById('countMamma');
  const elUndef = document.getElementById('countUndefined');

  if (elPapa) elPapa.textContent = `${countPapa} giorni`;
  if (elMamma) elMamma.textContent = `${countMamma} giorni`;
  if (elUndef) elUndef.textContent = `${countUndefined} giorni`;
};

function updateFilterDatesForCurrentMonth() {
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  if (!startInput || !endInput) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDayObj = new Date(year, month + 1, 0);
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;

  startInput.value = firstDay;
  endInput.value = lastDay;
}

function setupDateSelectors() {
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  if (!monthSelect || !yearSelect) return;

  monthSelect.innerHTML = '';
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  monthNames.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = m;
    if (idx === currentDate.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  yearSelect.innerHTML = '';
  const currentYear = currentDate.getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

// =============================================================
// 6. RENDERING UI PRINCIPALE
// =============================================================
function render() {
  setupDateSelectors();
  const startInput = document.getElementById('filterStartDate');
  if (startInput && !startInput.value) updateFilterDatesForCurrentMonth();

  if (currentView === 'grid') renderGrid();
  else renderList();

  // Rendering componenti ausiliari (se definiti nei manager)
  if (typeof renderSpeseSummary === 'function') renderSpeseSummary();
  if (typeof renderVacanze === 'function') renderVacanze();
  if (typeof renderSalute === 'function') renderSalute();
  if (typeof renderScuola === 'function') renderScuola();
  
  window.calculateStats();
}

function renderGrid() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const headers = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  headers.forEach(h => {
    const div = document.createElement('div');
    div.className = 'day-header';
    div.textContent = h;
    grid.appendChild(div);
  });

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
    
    const cellTop = document.createElement('div');
    cellTop.className = 'cell-top';

    const dayNumber = document.createElement('span');
    dayNumber.textContent = day;
    cellTop.appendChild(dayNumber);

    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '2px';

    const passaggioData = logisticaMgr.getPassaggio(dateKey);
    const hasLogistica = passaggioData && (passaggioData.luogo || passaggioData.ora);
    const logisticaBtn = document.createElement('button');
    logisticaBtn.className = `btn-note-trigger ${hasLogistica ? 'has-note' : ''}`;
    logisticaBtn.innerHTML = '🚗';
    logisticaBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.openLogisticaModal === 'function') window.openLogisticaModal(dateKey, e);
    };
    actionBtns.appendChild(logisticaBtn);

    const noteBtn = document.createElement('button');
    const hasNote = !!notes[dateKey];
    noteBtn.className = `btn-note-trigger ${hasNote ? 'has-note' : ''}`;
    noteBtn.innerHTML = hasNote ? '📝' : '➕';
    noteBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.openNoteModal === 'function') window.openNoteModal(dateKey, e);
    };
    actionBtns.appendChild(noteBtn);

    cellTop.appendChild(actionBtns);
    cell.appendChild(cellTop);

    if (notes[dateKey]) {
      const eventBadge = document.createElement('div');
      const categoryClass = notes[dateKey].category || 'generico';
      eventBadge.className = `event-badge ${categoryClass}`;
      eventBadge.textContent = notes[dateKey].text;
      cell.appendChild(eventBadge);
    }

    const status = getParentForDateWithVacanze(date);
    if (status && status.parent) {
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      let label = status.parent === 'papa' ? 'Papà' : 'Mamma';
      
      if (status.isVacanza) {
        badge.innerHTML = `<span>${label} 🏖️</span>`;
      } else if (status.isOverride) {
        badge.innerHTML = `<span>${label}</span><span class="badge-changed">Cambio</span>`;
      } else {
        badge.innerHTML = `<span>${label}</span>`;
      }
      
      cell.appendChild(badge);
    }

    cell.onclick = () => window.toggleDayOverride(dateKey);
    grid.appendChild(cell);
  }
}

function renderList() {
  const list = document.getElementById('calendarList');
  if (!list) return;
  list.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dateKey = turniMgr.formatDateKey(date);
    const item = document.createElement('div');
    item.className = 'list-item';

    const left = document.createElement('div');
    left.className = 'list-item-left';

    const dateTitle = document.createElement('div');
    dateTitle.className = 'list-item-date';
    dateTitle.textContent = `${daysOfWeek[date.getDay()]} ${day}`;
    left.appendChild(dateTitle);

    if (notes[dateKey]) {
      const eventBadge = document.createElement('div');
      const categoryClass = notes[dateKey].category || 'generico';
      eventBadge.className = `event-badge ${categoryClass}`;
      eventBadge.textContent = notes[dateKey].text;
      left.appendChild(eventBadge);
    }

    const right = document.createElement('div');
    right.className = 'list-item-right';

    const status = getParentForDateWithVacanze(date);
    if (status && status.parent) {
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      let label = status.parent === 'papa' ? 'Papà' : 'Mamma';
      if (status.isVacanza) {
        badge.innerHTML = `<span>${label} 🏖️</span>`;
      } else if (status.isOverride) {
        badge.innerHTML = `<span>${label}</span><span class="badge-changed">Cambio</span>`;
      } else {
        badge.innerHTML = `<span>${label}</span>`;
      }
      right.appendChild(badge);
    }

    const logisticaBtn = document.createElement('button');
    logisticaBtn.className = 'btn-note-trigger';
    logisticaBtn.innerHTML = '🚗';
    logisticaBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.openLogisticaModal === 'function') window.openLogisticaModal(dateKey, e);
    };
    right.appendChild(logisticaBtn);

    const noteBtn = document.createElement('button');
    const hasNote = !!notes[dateKey];
    noteBtn.className = `btn-note-trigger ${hasNote ? 'has-note' : ''}`;
    noteBtn.innerHTML = hasNote ? '📝' : '➕';
    noteBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.openNoteModal === 'function') window.openNoteModal(dateKey, e);
    };
    right.appendChild(noteBtn);

    item.appendChild(left);
    item.appendChild(right);
    item.onclick = () => window.toggleDayOverride(dateKey);

    list.appendChild(item);
  }
}

// =============================================================
// 7. INIZIALIZZAZIONE DOM & EVENT LISTENERS
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 DOM Pronto. Inizializzazione listener e sincronizzazione...");

  // Avvia la sincronizzazione in tempo reale con Firestore
  initFirestoreSync();

  // --- NAVIGAZIONE MESE ---
  const btnPrev = document.getElementById('btnPrevMonth');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });
  }

  const btnNext = document.getElementById('btnNextMonth');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });
  }

  // --- SELECT MESE / ANNO ---
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      currentDate.setMonth(parseInt(e.target.value, 10));
      render();
    });
  }

  const yearSelect = document.getElementById('yearSelect');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      currentDate.setFullYear(parseInt(e.target.value, 10));
      render();
    });
  }

  // --- CAMBIO VISTA (GRID / LIST) ---
  const btnGrid = document.getElementById('btnViewGrid');
  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      currentView = 'grid';
      render();
    });
  }

  const btnList = document.getElementById('btnViewList');
  if (btnList) {
    btnList.addEventListener('click', () => {
      currentView = 'list';
      render();
    });
  }

  // --- TEMA ---
  const btnTheme = document.getElementById('themeToggleBtn');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
    });
  }

  // --- ESPORTAZIONI ---
  const btnExcel = document.getElementById('btnExportExcel');
  if (btnExcel) {
    btnExcel.addEventListener('click', window.exportToExcel);
  }

  const btnICal = document.getElementById('btnExportICal');
  if (btnICal) {
    btnICal.addEventListener('click', window.exportToICal);
  }

  // --- STATISTICHE / FILTRI DATE ---
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  if (startInput) startInput.addEventListener('change', window.calculateStats);
  if (endInput) endInput.addEventListener('change', window.calculateStats);

  // --- MODALI ---
  const btnSpesa = document.getElementById('btnOpenSpesaModal');
  if (btnSpesa) {
    btnSpesa.addEventListener('click', () => {
      if (typeof window.openSpesaModal === 'function') window.openSpesaModal();
    });
  }

  // Primo rendering dell'applicazione
  render();
});
