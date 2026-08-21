import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGEPZjO0DnXAR9wJpOqfui5hYgJAYcE-k",
  authDomain: "gestione-valerio.firebaseapp.com",
  projectId: "gestione-valerio",
  storageBucket: "gestione-valerio.firebasestorage.app",
  messagingSenderId: "596812330710",
  appId: "1:596812330710:web:03ad86e55032728cd07b77",
  measurementId: "G-36RKDPZZ3T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "turni_valerio", "overrides");

let overrides = {};
let notes = {};
let manualCambi = {}; // Registra specificamente la presenza della parola "cambio"
let activeDateKeyForNote = null;
let currentView = 'grid'; 

// SOSTITUISCILA CON QUESTA:
let currentDate = new Date();
const startDateA = new Date();

// -------------------------------------------------------------
// LOGICA INSTALLAZIONE PWA (Sistemata)
// -------------------------------------------------------------
let deferredPrompt = null;

// Gestione visibilità pulsante al caricamento iniziale
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('btnInstall');
  
  // Controlla se l'app è già in modalità Standalone (già installata)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone 
                    || document.referrer.includes('android-app://');

  if (isStandalone && installBtn) {
    installBtn.style.display = 'none';
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene il banner di default del browser
  e.preventDefault();
  deferredPrompt = e;
  console.log('✅ Evento prima dell\'installazione intercettato con successo!');

  // Mostra il pulsante di installazione
  const installBtn = document.getElementById('btnInstall');
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
  }
});

window.installPWA = async function() {
  if (!deferredPrompt) {
    alert("⚠️ L'installazione PWA non è disponibile al momento.\n\nMotivi possibili:\n1. L'app è già stata installata.\n2. Il browser sta ancora verificando il Service Worker (attendi qualche secondo e ricarica).\n3. Stai usando un browser che non supporta l'installazione automatica (es. Safari su iOS).");
    return;
  }

  try {
    // Mostra il prompt nativo del browser
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Esito installazione utente: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('L\'utente ha accettato l\'installazione.');
    } else {
      console.log('L\'utente ha rifiutato l\'installazione.');
    }
  } catch (err) {
    console.error('Errore durante l\'installazione PWA:', err);
  } finally {
    deferredPrompt = null;
    const installBtn = document.getElementById('btnInstall');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }
};

window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA installata con successo!');
  deferredPrompt = null;
  const installBtn = document.getElementById('btnInstall');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});

// -------------------------------------------------------------
// FUNZIONI GLOBALI
// -------------------------------------------------------------

window.resetOverrides = async function() {
  if (confirm("Vuoi cancellare tutti i cambi manuali e le note salvate?")) {
    overrides = {};
    notes = {};
    manualCambi = {};
    await saveDataToFirestore();
    render();
    alert("Tutti i dati e i cambi sono stati azzerati!");
  }
};

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

window.switchView = function(view) {
  currentView = view;
  document.getElementById('btnViewGrid').classList.toggle('active', view === 'grid');
  document.getElementById('btnViewList').classList.toggle('active', view === 'list');
  
  document.getElementById('calendarGrid').style.display = view === 'grid' ? 'grid' : 'none';
  document.getElementById('calendarList').style.display = view === 'list' ? 'flex' : 'none';
  render();
};

window.toggleDayOverride = function(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  const currentStatus = getParentForDate(date);

  // Alterna il genitore: da Papà a Mamma e viceversa
  let newParent = 'papa';
  if (currentStatus.parent === 'papa') {
    newParent = 'mamma';
  } else if (currentStatus.parent === 'mamma') {
    newParent = 'papa';
  }

  // 1. Salva l'override con il nuovo genitore scelto
  overrides[dateKey] = newParent;

  // 2. Rimuove/Azzera qualsiasi flag "Cambio" per questa data
  delete manualCambi[dateKey];

  // 3. Salva su Firebase e aggiorna l'interfaccia
  saveDataToFirestore();
};

window.openNoteModal = function(dateKey, event) {
  event.stopPropagation();
  activeDateKeyForNote = dateKey;
  
  const modal = document.getElementById('noteModal');
  const modalTitle = document.getElementById('modalDateTitle');
  const input = document.getElementById('noteTextInput');
  const categorySelect = document.getElementById('noteCategory');
  const btnDelete = document.getElementById('btnDeleteNote');
  const checkIsCambio = document.getElementById('checkIsCambio');

  const [y, m, d] = dateKey.split('-');
  modalTitle.textContent = `Nota / Evento del ${d}/${m}/${y}`;

  // Imposta la spunta se il giorno era stato marcato come cambio
  if (checkIsCambio) {
    checkIsCambio.checked = !!manualCambi[dateKey];
  }

  if (notes[dateKey]) {
    input.value = notes[dateKey].text || '';
    categorySelect.value = notes[dateKey].category || 'generico';
    btnDelete.style.display = 'inline-flex';
  } else {
    input.value = ''; 
    categorySelect.value = 'allenamento'; 
    btnDelete.style.display = 'none';
  }

  modal.classList.add('active');
};

window.saveCurrentNote = function() {
  if (!activeDateKeyForNote) return;
  const text = document.getElementById('noteTextInput').value.trim();
  const category = document.getElementById('noteCategory').value;
  const checkIsCambio = document.getElementById('checkIsCambio');

  // Gestione nota
  if (text) notes[activeDateKeyForNote] = { text, category };
  else delete notes[activeDateKeyForNote];

  // Gestione manuale della dicitura "Cambio"
  if (checkIsCambio && checkIsCambio.checked) {
    manualCambi[activeDateKeyForNote] = true;
  } else {
    delete manualCambi[activeDateKeyForNote];
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

// -------------------------------------------------------------
// LOGICA FILTRO DA / A E CONTEGGIO
// -------------------------------------------------------------

window.calculateStats = function() {
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');

  if (!startInput || !endInput || !startInput.value || !endInput.value) return;

  const startDate = new Date(startInput.value + 'T00:00:00');
  const endDate = new Date(endInput.value + 'T00:00:00');

  if (startDate > endDate) {
    return;
  }

  let countPapa = 0;
  let countMamma = 0;
  let countUndefined = 0;

  let curr = new Date(startDate);
  while (curr <= endDate) {
    const status = getParentForDate(curr);

    if (status && status.parent === 'papa') {
      countPapa++;
    } else if (status && status.parent === 'mamma') {
      countMamma++;
    } else {
      countUndefined++;
    }

    curr.setDate(curr.getDate() + 1);
  }

  const elPapa = document.getElementById('countPapa');
  const elMamma = document.getElementById('countMamma');
  const elUndef = document.getElementById('countUndefined');

  if (elPapa) elPapa.textContent = `${countPapa} giorni`;
  if (elMamma) elMamma.textContent = `${countMamma} giorni`;
  if (elUndef) elUndef.textContent = `${countUndefined} giorni`;
};

function initFilterDates() {
  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');

  if (startInput && endInput && (!startInput.value || !endInput.value)) {
    updateFilterDatesForCurrentMonth();
  }
}

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

// -------------------------------------------------------------
// SINCRONIZZAZIONE FIRESTORE
// -------------------------------------------------------------

onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    overrides = data.data || {};
    notes = data.notes || {};
    manualCambi = data.manualCambi || {};
  } else {
    overrides = {};
    notes = {};
    manualCambi = {};
  }
  render();
});

async function saveDataToFirestore() {
  try {
    await setDoc(docRef, { data: overrides, notes: notes, manualCambi: manualCambi });
  } catch (error) {
    console.error("Errore Firestore:", error);
  }
}

// -------------------------------------------------------------
// LOGICA CALENDARIO
// -------------------------------------------------------------

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStandardParent(date) {
  const msPerDay = 86400000;
  const daysDiff = Math.floor((date - startDateA) / msPerDay);
  if (daysDiff < 0) return null;

  const cycleDay = (daysDiff % 14 + 14) % 14; 
  if (cycleDay === 0 || cycleDay === 3 || cycleDay === 5 || cycleDay === 6) return 'papa';
  if (cycleDay === 8 || cycleDay === 10) return 'papa';

  return 'mamma';
}

function getParentForDate(date) {
  const dateKey = formatDateKey(date);
  
  // Mostra il badge 'Cambio' SOLO se presente nei cambi manuali o importati
  const isCambio = !!manualCambi[dateKey];

  if (overrides[dateKey]) {
    return { parent: overrides[dateKey], isOverride: isCambio };
  }
  return { parent: getStandardParent(date), isOverride: false };
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

function render() {
  setupDateSelectors();
  initFilterDates();
  
  if (currentView === 'grid') renderGrid();
  else renderList();

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
    const dateKey = formatDateKey(date);
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
      eventBadge.className = `event-badge ${notes[dateKey].category}`;
      eventBadge.textContent = notes[dateKey].text;
      cell.appendChild(eventBadge);
    }

    const status = getParentForDate(date);
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
    const dateKey = formatDateKey(date);
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
      eventBadge.className = `event-badge ${notes[dateKey].category}`;
      eventBadge.textContent = notes[dateKey].text;
      left.appendChild(eventBadge);
    }

    const right = document.createElement('div');
    right.className = 'list-item-right';

    const status = getParentForDate(date);
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

// -------------------------------------------------------------
// IMPORTAZIONE CSV
// -------------------------------------------------------------

window.importFromCSV = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).map(line => line.split(';'));

    let importedTurni = 0;
    let importedNote = 0;
    let importedCambi = 0;

    let targetYear = 2026;
    let targetMonth = 0; // Default Gennaio

    const monthNames = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    
    for (let r = 0; r < Math.min(10, lines.length); r++) {
      const lineStr = lines[r].join(' ').toLowerCase();
      monthNames.forEach((m, idx) => {
        if (lineStr.includes(m)) targetMonth = idx;
      });
      const yearMatch = lineStr.match(/20\d{2}/);
      if (yearMatch) targetYear = parseInt(yearMatch[0]);
    }

    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];

      for (let c = 0; c < row.length; c++) {
        const val = row[c] ? row[c].trim() : '';
        const dayNum = parseInt(val);

        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && val === String(dayNum)) {

          if (r > 35) continue;

          const mStr = String(targetMonth + 1).padStart(2, '0');
          const dStr = String(dayNum).padStart(2, '0');
          const dateKey = `${targetYear}-${mStr}-${dStr}`;

          let noteList = [];
          let detectedParent = null;
          let isCambioFound = false;

          for (let offset = 1; offset <= 6; offset++) {
            if (r + offset >= lines.length) break;

            [c, c + 1, c - 1].forEach(colIdx => {
              if (colIdx < 0 || colIdx >= lines[r + offset].length) return;

              const cellText = lines[r + offset][colIdx] ? lines[r + offset][colIdx].trim().replace(/\s+/g, ' ') : '';
              const lowerText = cellText.toLowerCase();

              if (!cellText) return;

              if (lowerText.includes('cambio')) {
                isCambioFound = true;
              }

              if (lowerText.includes('con me') || lowerText.includes('con papa') || lowerText === 'me' || lowerText === 'resto con me') {
                detectedParent = 'papa';
              } else if (lowerText.includes('con mamma') || lowerText === 'mamma') {
                detectedParent = 'mamma';
              } else if (
                !['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica', 'note'].includes(lowerText) &&
                !lowerText.includes('passaggio') && !lowerText.includes('vertex42') && !lowerText.includes('layout') &&
                isNaN(Number(cellText))
              ) {
                if (!noteList.includes(cellText)) noteList.push(cellText);
              }
            });
          }

          if (detectedParent) {
            overrides[dateKey] = detectedParent;
            importedTurni++;
          }

          if (isCambioFound) {
            manualCambi[dateKey] = true;
            importedCambi++;
          } else {
            delete manualCambi[dateKey];
          }

          if (noteList.length > 0) {
            notes[dateKey] = {
              text: noteList.join(' - '),
              category: 'generico'
            };
            importedNote++;
          }
        }
      }
    }

    currentDate = new Date(targetYear, targetMonth, 1);
    updateFilterDatesForCurrentMonth();
    saveDataToFirestore();
    render();

    const monthLabel = monthNames[targetMonth].toUpperCase();
    alert(`Importazione completata per ${monthLabel} ${targetYear}!\n- Turni registrati: ${importedTurni}\n- Cambi rilevati: ${importedCambi}\n- Note salvate: ${importedNote}`);
  };

  reader.readAsText(file, 'ISO-8859-1');
};

window.exportToExcel = function() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const data = [["Data", "Giorno", "Genitore con Valerio", "Cambio Turno", "Evento / Nota"]];
  const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    
    let genitore = "Non definito";
    let cambio = "No";
    let notaText = "";

    const status = getParentForDate(date);
    if (status && status.parent) {
      genitore = status.parent === 'papa' ? 'Papà' : 'Mamma';
      if (status.isOverride) cambio = "Sì (Cambio)";
    }

    if (notes[dateKey]) {
      notaText = `[${notes[dateKey].category.toUpperCase()}] ${notes[dateKey].text}`;
    }

    data.push([dateStr, daysOfWeek[date.getDay()], genitore, cambio, notaText]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 35 }];

  XLSX.writeFile(wb, `Turni_Valerio_${monthName}_${year}.xlsx`);
};

render();
