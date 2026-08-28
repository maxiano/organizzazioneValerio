import { db, docRef } from "./firebase-config.js";
import { onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { TurniManager } from "./modules/TurniManager.js";
import { SpeseManager } from "./modules/SpeseManager.js";
import { LogisticaManager } from "./modules/LogisticaManager.js";
import { SaluteManager } from "./modules/SaluteManager.js";
import { VacanzeManager } from "./modules/VacanzeManager.js";
import { ExportManager } from "./modules/ExportManager.js";

// Inizializzazione Istanze Moduli
const turniMgr = new TurniManager();
const speseMgr = new SpeseManager();
const logisticaMgr = new LogisticaManager();
const saluteMgr = new SaluteManager();
const vacanzeMgr = new VacanzeManager();

let notes = {};
let activeDateKeyForNote = null;
let activeDateKeyForLogistica = null;
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
  if (confirm("Vuoi cancellare tutti i dati salvati (cambi, spese, vacanze, note)?")) {
    turniMgr.setData({}, {});
    notes = {};
    speseMgr.setSpese([]);
    logisticaMgr.setPassaggi({});
    saluteMgr.setSchede({});
    vacanzeMgr.setVacanze([]);
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
    vacanzeMgr.setVacanze(data.vacanze || []);
  } else {
    turniMgr.setData({}, {});
    notes = {};
    speseMgr.setSpese([]);
    logisticaMgr.setPassaggi({});
    saluteMgr.setSchede({});
    vacanzeMgr.setVacanze([]);
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
      salute: saluteMgr.schede,
      vacanze: vacanzeMgr.vacanze
    });
  } catch (error) {
    console.error("Errore salvataggio Firestore:", error);
  }
}

// -------------------------------------------------------------
// GESTIONE LOGISTICA & PASSAGGI
// -------------------------------------------------------------
window.openLogisticaModal = function(dateKey, event) {
  if (event) event.stopPropagation();
  activeDateKeyForLogistica = dateKey;

  const data = logisticaMgr.getPassaggio(dateKey);
  document.getElementById('logisticaModalTitle').textContent = `🚗 Passaggio del ${dateKey.split('-').reverse().join('/')}`;
  document.getElementById('logisticaLuogo').value = data.luogo;
  document.getElementById('logisticaOra').value = data.ora;
  document.getElementById('logisticaNote').value = data.note;

  document.getElementById('checkVestiti').checked = !!data.checklist.vestiti;
  document.getElementById('checkCartella').checked = !!data.checklist.cartella;
  document.getElementById('checkLibretto').checked = !!data.checklist.libretto;
  document.getElementById('checkGiochi').checked = !!data.checklist.giochi;

  document.getElementById('logisticaModal').classList.add('active');
};

window.closeLogisticaModal = function() {
  document.getElementById('logisticaModal').classList.remove('active');
  activeDateKeyForLogistica = null;
};

window.saveLogistica = function() {
  if (!activeDateKeyForLogistica) return;

  const luogo = document.getElementById('logisticaLuogo').value;
  const ora = document.getElementById('logisticaOra').value;
  const note = document.getElementById('logisticaNote').value;

  const checklist = {
    vestiti: document.getElementById('checkVestiti').checked,
    cartella: document.getElementById('checkCartella').checked,
    libretto: document.getElementById('checkLibretto').checked,
    giochi: document.getElementById('checkGiochi').checked
  };

  logisticaMgr.savePassaggio(activeDateKeyForLogistica, luogo, ora, note, checklist);
  saveDataToFirestore();
  window.closeLogisticaModal();
};

// -------------------------------------------------------------
// GESTIONE VACANZE
// -------------------------------------------------------------
window.openVacanzeModal = function() {
  document.getElementById('vacanzaTitolo').value = '';
  document.getElementById('vacanzaInizio').value = '';
  document.getElementById('vacanzaFine').value = '';
  document.getElementById('vacanzeModal').classList.add('active');
};

window.closeVacanzeModal = function() {
  document.getElementById('vacanzeModal').classList.remove('active');
};

window.saveVacanzaBlock = function() {
  const titolo = document.getElementById('vacanzaTitolo').value.trim();
  const inizio = document.getElementById('vacanzaInizio').value;
  const fine = document.getElementById('vacanzaFine').value;
  const assegnato = document.getElementById('vacanzaAssegnato').value;

  if (!titolo || !inizio || !fine) {
    alert("Compila tutti i campi obbligatori per la vacanza!");
    return;
  }

  vacanzeMgr.addVacanzeBlock(titolo, inizio, fine, assegnato);
  saveDataToFirestore();
  window.closeVacanzeModal();
};

window.deleteVacanzaBlock = function(id) {
  if (confirm("Eliminare questo blocco vacanza?")) {
    vacanzeMgr.deleteVacanzeBlock(id);
    saveDataToFirestore();
  }
};

function renderVacanze() {
  const container = document.getElementById('vacanzeListContainer');
  if (!container) return;
  container.innerHTML = '';

  if (vacanzeMgr.vacanze.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">Nessuna vacanza o festività programmata.</p>`;
    return;
  }

  vacanzeMgr.vacanze.forEach(v => {
    const card = document.createElement('div');
    const color = v.assegnatoA === 'papa' ? 'var(--papa-color, #2563eb)' : 'var(--mamma-color, #ec4899)';
    card.style.cssText = `background: var(--surface-bg, #f8fafc); border-left: 4px solid ${color}; padding: 10px; border-radius: 6px; border: 1px solid var(--surface-border); display: flex; justify-content: space-between; align-items: center;`;

    const dInizio = v.dataInizio.split('-').reverse().join('/');
    const dFine = v.dataFine.split('-').reverse().join('/');

    card.innerHTML = `
      <div>
        <strong style="display:block; font-size:0.95rem;">${v.titolo}</strong>
        <span style="font-size:0.8rem; color:var(--text-muted);">${dInizio} - ${dFine}</span>
        <span style="font-size:0.75rem; font-weight:700; color:${color}; display:block; margin-top:2px;">Con ${v.assegnatoA === 'papa' ? 'Papà' : 'Mamma'}</span>
      </div>
      <button style="background:none; border:none; cursor:pointer;" onclick="deleteVacanzaBlock('${v.id}')">🗑️</button>
    `;
    container.appendChild(card);
  });
}

// -------------------------------------------------------------
// GESTIONE SALUTE & VISITE
// -------------------------------------------------------------
window.saveSaluteInfo = function() {
  const nome = document.getElementById('salutePediatraNome').value;
  const tel = document.getElementById('salutePediatraTel').value;
  const orari = document.getElementById('salutePediatraOrari').value;

  const allergie = document.getElementById('saluteAllergie').value;
  const terapie = document.getElementById('saluteTerapie').value;

  saluteMgr.updatePediatra(nome, tel, orari);
  saluteMgr.updateInfoGenerali('', allergie, terapie);

  saveDataToFirestore();
  alert("Scheda medica aggiornata!");
};

window.addVisitaMedica = function() {
  const data = document.getElementById('visitaData').value;
  const desc = document.getElementById('visitaDesc').value.trim();

  if (!data || !desc) {
    alert("Inserisci data e descrizione della visita!");
    return;
  }

  saluteMgr.addVisita(data, desc, '');
  saveDataToFirestore();
  document.getElementById('visitaDesc').value = '';
};

window.deleteVisitaMedica = function(id) {
  saluteMgr.deleteVisita(id);
  saveDataToFirestore();
};

function renderSalute() {
  const p = saluteMgr.schede.pediatra || {};
  const g = saluteMgr.schede.infoGenerali || {};

  const pNome = document.getElementById('salutePediatraNome');
  const pTel = document.getElementById('salutePediatraTel');
  const pOrari = document.getElementById('salutePediatraOrari');
  const gAllergie = document.getElementById('saluteAllergie');
  const gTerapie = document.getElementById('saluteTerapie');

  if (pNome) pNome.value = p.nome || '';
  if (pTel) pTel.value = p.telefono || '';
  if (pOrari) pOrari.value = p.orari || '';
  if (gAllergie) gAllergie.value = g.allergie || '';
  if (gTerapie) gTerapie.value = g.terapie || '';

  const list = document.getElementById('saluteVisiteList');
  if (!list) return;
  list.innerHTML = '';

  (saluteMgr.schede.visite || []).forEach(v => {
    const li = document.createElement('li');
    li.style.cssText = "display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;";
    li.innerHTML = `
      <span><strong>${v.data.split('-').reverse().join('/')}:</strong> ${v.descrizione}</span>
      <button style="background:none; border:none; cursor:pointer;" onclick="deleteVisitaMedica('${v.id}')">🗑️</button>
    `;
    list.appendChild(li);
  });
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
// SPESE
// -------------------------------------------------------------
window.openSpesaModal = function() {
  const modal = document.getElementById('spesaModal');
  if (!modal) return;

  document.getElementById('spesaDesc').value = '';
  document.getElementById('spesaImporto').value = '';
  document.getElementById('spesaData').value = new Date().toISOString().split('T')[0];
  document.getElementById('spesaRicevutaInput').value = '';
  modal.classList.add('active');
};

window.closeSpesaModal = function() {
  const modal = document.getElementById('spesaModal');
  if (modal) modal.classList.remove('active');
};

window.saveSpesa = function() {
  const desc = document.getElementById('spesaDesc').value.trim();
  const importo = document.getElementById('spesaImporto').value;
  const pagatoDa = document.getElementById('spesaPagatoDa').value;
  const categoria = document.getElementById('spesaCategoria').value;
  const data = document.getElementById('spesaData').value;
  const fileInput = document.getElementById('spesaRicevutaInput');

  if (!desc || !importo || isNaN(importo)) {
    alert("Inserisci una descrizione e un importo valido!");
    return;
  }

  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      speseMgr.addSpesa(desc, importo, pagatoDa, categoria, e.target.result, data);
      saveDataToFirestore();
      window.closeSpesaModal();
    };
    reader.readAsDataURL(file);
  } else {
    speseMgr.addSpesa(desc, importo, pagatoDa, categoria, null, data);
    saveDataToFirestore();
    window.closeSpesaModal();
  }
};

window.deleteSpesa = function(id) {
  if (confirm("Sei sicuro di voler eliminare questa spesa?")) {
    speseMgr.deleteSpesa(id);
    saveDataToFirestore();
  }
};

window.viewRicevuta = function(id) {
  const spesa = speseMgr.spese.find(s => s.id === id);
  if (spesa && spesa.ricevuta) {
    const w = window.open("");
    w.document.write(`<img src="${spesa.ricevuta}" style="max-width:100%; height:auto;" />`);
  }
};

function renderSpeseSummary() {
  const saldoBox = document.getElementById('speseSaldoInfo');
  const tbody = document.getElementById('speseTableBody');
  if (!saldoBox || !tbody) return;

  const saldo = speseMgr.calculateSaldo();
  if (!saldo.debitore) {
    saldoBox.innerHTML = "<strong>Conti in pari</strong> (nessun conguaglio pendente)";
  } else {
    const debitoreStr = saldo.debitore === 'mamma' ? 'Mamma' : 'Papà';
    const creditoreStr = saldo.creditore === 'papa' ? 'Papà' : 'Mamma';
    saldoBox.innerHTML = `<strong>${debitoreStr}</strong> deve a <strong>${creditoreStr}</strong>: <span style="color:var(--spesa-color, #ef4444); font-weight:800;">€ ${saldo.importo.toFixed(2)}</span>`;
  }

  tbody.innerHTML = '';
  if (speseMgr.spese.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 12px; color: var(--text-muted);">Nessuna spesa registrata.</td></tr>`;
    return;
  }

  const speseOrdinate = [...speseMgr.spese].sort((a, b) => new Date(b.data) - new Date(a.data));

  speseOrdinate.forEach(spesa => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--surface-border)';

    const formattedDate = spesa.data.split('-').reverse().join('/');
    const pagatoStr = spesa.pagatoDa === 'papa' ? 'Papà' : 'Mamma';
    const badgeColor = spesa.pagatoDa === 'papa' ? 'var(--papa-color, #2563eb)' : 'var(--mamma-color, #ec4899)';
    const ricevutaBtn = spesa.ricevuta 
      ? `<button class="btn" style="padding: 2px 8px; font-size: 0.75rem;" onclick="viewRicevuta('${spesa.id}')">📎 Vedi</button>` 
      : `<span style="color:var(--text-muted); font-size: 0.75rem;">-</span>`;

    tr.innerHTML = `
      <td style="padding: 8px;">${formattedDate}</td>
      <td style="padding: 8px; font-weight:600;">${spesa.descrizione}</td>
      <td style="padding: 8px;"><span class="event-badge ${spesa.categoria}">${spesa.categoria.toUpperCase()}</span></td>
      <td style="padding: 8px; font-weight:700; color: ${badgeColor};">${pagatoStr}</td>
      <td style="padding: 8px; font-weight:800;">€ ${spesa.importo.toFixed(2)}</td>
      <td style="padding: 8px;">${ricevutaBtn}</td>
      <td style="padding: 8px; text-align: center;">
        <button style="background:none; border:none; cursor:pointer;" onclick="deleteSpesa('${spesa.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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
// RENDERING UI
// -------------------------------------------------------------
function render() {
  setupDateSelectors();
  const startInput = document.getElementById('filterStartDate');
  if (startInput && !startInput.value) updateFilterDatesForCurrentMonth();

  if (currentView === 'grid') renderGrid();
  else renderList();

  renderSpeseSummary();
  renderVacanze();
  renderSalute();
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
    const hasLogistica = passaggioData.luogo || passaggioData.ora;
    const logisticaBtn = document.createElement('button');
    logisticaBtn.className = `btn-note-trigger ${hasLogistica ? 'has-note' : ''}`;
    logisticaBtn.innerHTML = '🚗';
    logisticaBtn.onclick = (e) => window.openLogisticaModal(dateKey, e);
    actionBtns.appendChild(logisticaBtn);

    const noteBtn = document.createElement('button');
    const hasNote = !!notes[dateKey];
    noteBtn.className = `btn-note-trigger ${hasNote ? 'has-note' : ''}`;
    noteBtn.innerHTML = hasNote ? '📝' : '➕';
    noteBtn.onclick = (e) => window.openNoteModal(dateKey, e);
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

    const logisticaBtn = document.createElement('button');
    logisticaBtn.className = 'btn-note-trigger';
    logisticaBtn.innerHTML = '🚗';
    logisticaBtn.onclick = (e) => window.openLogisticaModal(dateKey, e);
    right.appendChild(logisticaBtn);

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

// Avvio applicazione
render();
