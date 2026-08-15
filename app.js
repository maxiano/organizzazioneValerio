import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenziali Firebase
const firebaseConfig = {
  apiKey: "IL_TUO_API_KEY",
  authDomain: "IL_TUO_PROJECT_ID.firebaseapp.com",
  projectId: "IL_TUO_PROJECT_ID",
  storageBucket: "IL_TUO_PROJECT_ID.appspot.com",
  messagingSenderId: "IL_TUO_SENDER_ID",
  appId: "IL_TUO_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "turni_valerio", "overrides");

let overrides = {};
let notes = {};
let activeDateKeyForNote = null;

let currentDate = new Date(2026, 8, 1); // Settembre 2026
const startDateA = new Date(2026, 8, 7); // Lunedì 7 Settembre 2026

// Sincronizzazione in tempo reale da Firestore
onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    overrides = data.data || {};
    notes = data.notes || {};
  } else {
    overrides = {};
    notes = {};
  }
  renderCalendar();
}, (error) => {
  console.error("Errore sincronizzazione Firestore:", error);
});

// Salva modifiche complessive su Firestore
async function saveDataToFirestore() {
  try {
    await setDoc(docRef, { 
      data: overrides,
      notes: notes 
    });
  } catch (error) {
    console.error("Errore salvataggio su Firestore:", error);
  }
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Rotazione standard
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

// TOGGLE CAMBIO TURNO
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
    overrides = {};
    notes = {};
    saveDataToFirestore();
  }
};

window.changeMonth = function(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
};

/* --- GESTIONE MODALE NOTE ED EVENTI --- */
window.openNoteModal = function(dateKey, event) {
  event.stopPropagation(); // Evita l'inversione del turno al click sull'icona
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
    input.value = '';
    categorySelect.value = 'allenamento';
    btnDelete.style.display = 'none';
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

  if (text) {
    notes[activeDateKeyForNote] = { text, category };
  } else {
    delete notes[activeDateKeyForNote];
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

/* --- ESPORTAZIONE EXCEL CON CONTEGGIO NOTE --- */
window.exportToExcel = function() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const data = [
    ["Data", "Giorno", "Genitore con Valerio", "Cambio Turno", "Evento / Nota"]
  ];

  const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    const dayName = daysOfWeek[date.getDay()];
    
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

    data.push([dateStr, dayName, genitore, cambio, notaText]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 35 }
  ];

  XLSX.writeFile(wb, `Turni_Valerio_${monthName}_${year}.xlsx`);
};

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('monthTitle');
  grid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  title.textContent = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentDate);

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
    
    // Intestazione Cella (Numero Giorno + Tasto Nota)
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

    // Contenuto Nota / Evento
    if (notes[dateKey]) {
      const eventBadge = document.createElement('div');
      eventBadge.className = `event-badge ${notes[dateKey].category}`;
      eventBadge.textContent = notes[dateKey].text;
      eventBadge.title = notes[dateKey].text;
      cell.appendChild(eventBadge);
    }

    // Badge Turno Genitore
    if (date >= startDateA) {
      const status = getParentForDate(date);
      const badge = document.createElement('div');
      badge.className = `badge ${status.parent}`;
      
      let labelText = status.parent === 'papa' ? 'Papà' : 'Mamma';
      badge.innerHTML = `<span>${labelText}</span>`;

      if (status.isOverride) {
        badge.innerHTML += `<span class="badge-changed">Cambio</span>`;
      }

      cell.appendChild(badge);
    }

    // Cliccando sulla cella si cambia il turno (escluso il pulsante nota)
    cell.onclick = () => window.toggleDayOverride(dateKey);

    grid.appendChild(cell);
  }
}

renderCalendar();
