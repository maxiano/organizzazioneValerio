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
let activeDateKeyForNote = null;
let currentView = 'grid'; // 'grid' oppure 'list'

let currentDate = new Date(2026, 8, 1); // Settembre 2026
const startDateA = new Date(2026, 8, 7); // Lunedì 7 Settembre 2026

// Inizializzazione Tema Scuro
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) themeBtn.textContent = '☀️ Chiaro';
}

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

// Sincronizzazione Firestore
onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    overrides = data.data || {};
    notes = data.notes || {};
  } else {
    overrides = {};
    notes = {};
  }
  render();
});

async function saveDataToFirestore() {
  try {
    await setDoc(docRef, { data: overrides, notes: notes });
  } catch (error) {
    console.error("Errore Firestore:", error);
  }
}

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
  if (overrides[dateKey]) {
    return { parent: overrides[dateKey], isOverride: true };
  }
  return { parent: getStandardParent(date), isOverride: false };
}

window.toggleDayOverride = function(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  if (date < startDateA) return;

  const currentStatus = getParentForDate(date);
  if (!currentStatus.isOverride) {
    overrides[dateKey] = currentStatus.parent === 'papa' ? 'mamma' : 'papa';
  } else {
    delete overrides[dateKey];
  }
  saveDataToFirestore();
};

window.resetOverrides = function() {
  if (confirm("Vuoi cancellare tutti i cambi manuali e le note salvate?")) {
    overrides = {}; notes = {};
    saveDataToFirestore();
  }
};

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

window.onDateSelectChange = function() {
  const m = parseInt(document.getElementById('monthSelect').value);
  const y = parseInt(document.getElementById('yearSelect').value);
  currentDate = new Date(y, m, 1);
  render();
};

window.changeMonth = function(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
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

window.openNoteModal = function(dateKey, event) {
  event.stopPropagation();
  activeDateKeyForNote = dateKey;
  
  const modal = document.getElementById('noteModal');
  const modalTitle = document.getElementById('modalDateTitle');
  const input = document.getElementById('noteTextInput');
  const categorySelect = document.getElementById('noteCategory');
  const btnDelete = document.getElementById('btnDeleteNote');

  const [y, m, d] = dateKey.split('-');
  modalTitle.textContent = `Nota / Evento del ${d}/${m}/${y}`;

  if (notes[dateKey]) {
    input.value = notes[dateKey].text || '';
    categorySelect.value = notes[dateKey].category || 'generico';
    btnDelete.style.display = 'inline-flex';
  } else {
    input.value = ''; categorySelect.value = 'allenamento'; btnDelete.style.display = 'none';
  }

  modal.classList.add('active');
};

window.closeNoteModal = function() {
  document.getElementById('noteModal').classList.remove('active');
  activeDateKeyForNote = null;
};

window.saveCurrentNote = function() {
  if (!activeDateKeyForNote) return;
  const text = document.getElementById('noteTextInput').value.trim();
  const category = document.getElementById('noteCategory').value;

  if (text) notes[activeDateKeyForNote] = { text, category };
  else delete notes[activeDateKeyForNote];

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

function render() {
  setupDateSelectors();
  if (currentView === 'grid') renderGrid();
  else renderList();
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

    if (date >= startDateA) {
      const status = getParentForDate(date);
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

    if (date >= startDateA) {
      const status = getParentForDate(date);
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

    if (date >= startDateA) {
      const status = getParentForDate(date);
      genitore = status.parent === 'papa' ? 'Papà' : 'Mamma';
      if (status.isOverride) cambio = "Sì (Modificato)";
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
