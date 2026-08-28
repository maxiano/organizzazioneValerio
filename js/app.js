import { db, docRef } from "./firebase-config.js";
import { onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { TurniManager } from "./modules/TurniManager.js";
import { SpeseManager } from "./modules/SpeseManager.js";
import { LogisticaManager } from "./modules/LogisticaManager.js";
import { SaluteManager } from "./modules/SaluteManager.js";
import { ExportManager } from "./modules/ExportManager.js";

// Inizializzazione Istanze Moduli
const turniMgr = new TurniManager();
const speseMgr = new SpeseManager();
const logisticaMgr = new LogisticaManager();
const saluteMgr = new SaluteManager();

let notes = {};
let activeDateKeyForNote = null;
let currentView = 'grid'; 
let currentDate = new Date();
let deferredPrompt = null;

// -------------------------------------------------------------
// LOGICA INSTALLAZIONE PWA
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('btnInstall');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone 
                    || document.referrer.includes('android-app://');

  if (isStandalone && installBtn) {
    installBtn.style.display = 'none';
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btnInstall');
  if (installBtn) installBtn.style.display = 'inline-flex';
});

window.installPWA = async function() {
  if (!deferredPrompt) {
    alert("⚠️ L'installazione PWA non è al momento disponibile o l'app è già installata.");
    return;
  }
  try {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  } catch (err) {
    console.error('Errore durante l\'installazione PWA:', err);
  } finally {
    deferredPrompt = null;
    const installBtn = document.getElementById('btnInstall');
    if (installBtn) installBtn.style.display = 'none';
  }
};

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBtn = document.getElementById('btnInstall');
  if (installBtn) installBtn.style.display = 'none';
});

// -------------------------------------------------------------
// CONTROLLI TEMA & VISTA
// -------------------------------------------------------------
window.toggleDarkMode = function() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const themeBtn = document.getElementById('themeToggleBtn');
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    if (themeBtn) themeBtn.textContent = '🌙 Scuro';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    if (themeBtn) themeBtn.textContent = '☀️ Chiaro';
  }
};

window.switchView = function(view) {
  currentView = view;
  const btnGrid = document.getElementById('btnViewGrid');
  const btnList = document.getElementById('btnViewList');
  if (btnGrid) btnGrid.classList.toggle('active', view === 'grid');
  if (btnList) btnList.classList.toggle('active', view === 'list');
  
  const gridEl = document.getElementById('calendarGrid');
  const listEl = document.getElementById('calendarList');
  if (gridEl) gridEl.style.display = view === 'grid' ? 'grid' : 'none';
  if (listEl) listEl.style.display = view === 'list' ? 'flex' : 'none';
  render();
};

window.onDateSelectChange = function() {
  const m = parseInt(document.getElementById('monthSelect').value);
  const y = parseInt(document.getElementById('yearSelect').value);
  currentDate = new Date(y, m, 1);
  updateFilterDatesForCurrentMonth();
  render();
};

window.changeMonth = function(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  updateFilterDatesForCurrentMonth();
  render();
};

window.resetOverrides = async function() {
  if (confirm("Vuoi cancellare tutti i cambi manuali, le note e le spese salvate?")) {
    turniMgr.setData({}, {});
    notes = {};
    speseMgr.setSpese([]);
    logisticaMgr.setPassaggi({});
    saluteMgr.setSchede({});
    await saveDataToFirestore();
    render();
    alert("Tutti i dati sono stati ripristinati!");
  }
};

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
    saluteMgr.setSchede(data.salute || {});
  } else {
    turniMgr.setData({}, {});
    notes = {};
    speseMgr.setSpese([]);
    logisticaMgr.setPassaggi({});
    saluteMgr.setSchede({});
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
      passaggi: logisticaMgr.passaggi,
      salute: saluteMgr.schede
    });
  } catch (error) {
    console.error("Errore salvataggio Firestore:", error);
  }
}

// -------------------------------------------------------------
// GESTIONE NOTE & MODALI
// -------------------------------------------------------------
window.toggleDayOverride = function(dateKey) {
  turniMgr.toggleDay(dateKey);
  saveDataToFirestore();
  render();
};

window.openNoteModal = function(dateKey, event) {
  if (event) event.stopPropagation();
  activeDateKeyForNote = dateKey;
  
  const modal = document.getElementById('noteModal');
  const modalTitle = document.getElementById('modalDateTitle');
  const input = document.getElementById('noteTextInput');
  const categorySelect = document.getElementById('noteCategory');
  const btnDelete = document.getElementById('btnDeleteNote');
  const checkIsCambio = document.getElementById('checkIsCambio');

  const [y, m, d] = dateKey.split('-');
  if (modalTitle) modalTitle.textContent = `Nota / Evento del ${d}/${m}/${y}`;
  if (checkIsCambio) checkIsCambio.checked = !!turniMgr.manualCambi[dateKey];

  if (notes[dateKey]) {
    if (input) input.value = notes[dateKey].text || '';
    if (categorySelect) categorySelect.value = notes[dateKey].category || 'generico';
    if (btnDelete) btnDelete.style.display = 'inline-flex';
  } else {
    if (input) input.value = ''; 
    if (categorySelect) categorySelect.value = 'generico'; 
    if (btnDelete) btnDelete.style.display = 'none';
  }

  if (modal) modal.classList.add('active');
};

window.saveCurrentNote = function() {
  if (!activeDateKeyForNote) return;
  const input = document.getElementById('noteTextInput');
  const categorySelect = document.getElementById('noteCategory');
  const checkIsCambio = document.getElementById('checkIsCambio');

  const text = input ? input.value.trim() : '';
  const category = categorySelect ? categorySelect.value : 'generico';

  if (text) {
    notes[activeDateKeyForNote] = { text, category };
  } else {
    delete notes[activeDateKeyForNote];
  }

  if (checkIsCambio) {
    if (checkIsCambio.checked) {
      turniMgr.manualCambi[activeDateKeyForNote] = true;
    } else {
      delete turniMgr.manualCambi[activeDateKeyForNote];
    }
  }

  saveDataToFirestore();
  closeNoteModal();
};

window.deleteCurrentNote = function() {
  if (activeDateKeyForNote && notes[activeDateKeyForNote]) {
    delete notes[activeDateKeyForNote];
    saveDataToFirestore();
  }
  closeNoteModal();
};

window.closeNoteModal = function() {
  const modal = document.getElementById('noteModal');
  if (modal) modal.classList.remove('active');
  activeDateKeyForNote = null;
};

// -------------------------------------------------------------
// ESPORTAZIONE & STATISTICHE
// -------------------------------------------------------------
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
  if (startDate > endDate) return;

  let countPapa = 0, countMamma = 0, countUndefined = 0;
  let curr = new Date(startDate);

  while (curr <= endDate) {
    const status = turniMgr.getParentForDate(curr);
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

// -------------------------------------------------------------
// RENDERING UI (GRIGLIA E LISTA)
// -------------------------------------------------------------
function render() {
  setupDateSelectors();
  const startInput = document.getElementById('filterStartDate');
  if (startInput && !startInput.value) updateFilterDatesForCurrentMonth();

  if (currentView === 'grid') renderGrid();
  else renderList();

  renderSpeseSummary();
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

    const noteBtn = document.createElement('button');
    const hasNote = !!notes[dateKey];
    noteBtn.className = `btn-note-trigger ${hasNote ? 'has-note' : ''}`;
    noteBtn.innerHTML = hasNote ? '📝' : '➕';
    noteBtn.onclick = (e) => window.openNoteModal(dateKey, e);
    cellTop.appendChild(noteBtn);

    cell.appendChild(cellTop);

    if (notes[dateKey]) {
      const eventBadge = document.createElement('div');
      const categoryClass = notes[dateKey].category || 'generico';
      eventBadge.className = `event-badge ${categoryClass}`;
      eventBadge.textContent = notes[dateKey].text;
      cell.appendChild(eventBadge);
    }

    const status = turniMgr.getParentForDate(date);
    if (status && status.parent) {
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      badge.innerHTML = `<span>${status.parent === 'papa' ? 'Papà' : 'Mamma'}</span>`;
      if (status.isOverride) badge.innerHTML += `<span class="badge-changed">Cambio</span>`;
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

    const status = turniMgr.getParentForDate(date);
    if (status && status.parent) {
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      badge.innerHTML = `<span>${status.parent === 'papa' ? 'Papà' : 'Mamma'}</span>`;
      if (status.isOverride) badge.innerHTML += `<span class="badge-changed">Cambio</span>`;
      right.appendChild(badge);
    }

    const noteBtn = document.createElement('button');
    const hasNote = !!notes[dateKey];
    noteBtn.className = `btn-note-trigger ${hasNote ? 'has-note' : ''}`;
    noteBtn.innerHTML = hasNote ? '📝' : '➕';
    noteBtn.onclick = (e) => window.openNoteModal(dateKey, e);
    right.appendChild(noteBtn);

    item.appendChild(left);
    item.appendChild(right);
    item.onclick = () => window.toggleDayOverride(dateKey);

    list.appendChild(item);
  }
}

function renderSpeseSummary() {
  const saldoBox = document.getElementById('speseSaldoInfo');
  if (!saldoBox) return;

  const saldo = speseMgr.calculateSaldo();
  if (!saldo.debitore) {
    saldoBox.textContent = "Conti in pari (nessun conguaglio pendente)";
  } else {
    const debitoreStr = saldo.debitore === 'mamma' ? 'Mamma' : 'Papà';
    const creditoreStr = saldo.creditore === 'papa' ? 'Papà' : 'Mamma';
    saldoBox.innerHTML = `<strong>${debitoreStr}</strong> deve a <strong>${creditoreStr}</strong>: € ${saldo.importo.toFixed(2)}`;
  }
}

// Avvio applicazione
render();
