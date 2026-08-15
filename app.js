import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenziali Firebase
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
let currentDate = new Date(2026, 8, 1); // Settembre 2026
const startDateA = new Date(2026, 8, 7); // Lunedì 7 Settembre 2026 (Inizio Settimana A)

// Sincronizzazione in tempo reale da Firestore
onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    overrides = docSnap.data().data || {};
  } else {
    overrides = {};
  }
  renderCalendar();
}, (error) => {
  console.error("Errore di sincronizzazione con Firestore:", error);
});

// Salva modifiche su Firestore
async function saveOverridesToFirestore(updatedOverrides) {
  try {
    await setDoc(docRef, { data: updatedOverrides });
  } catch (error) {
    console.error("Errore durante il salvataggio su Firestore:", error);
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
  // Settimana A (0-6): Lun(0), Giu(3), Sab(5), Dom(6) -> Papà
  if (cycleDay === 0 || cycleDay === 3 || cycleDay === 5 || cycleDay === 6) return 'papa';
  // Settimana B (7-13): Mar(8), Giu(10) -> Papà
  if (cycleDay === 8 || cycleDay === 10) return 'papa';

  return 'mamma';
}

function getParentForDate(date) {
  const dateKey = formatDateKey(date);
  
  if (overrides[dateKey]) {
    return { parent: overrides[dateKey], isOverride: true };
  }
  
  const standard = getStandardParent(date);
  return { parent: standard, isOverride: false };
}

// Esposte a livello window per gli Handler HTML (onclick)
window.toggleDayOverride = function(dateKey, standardParent) {
  const date = new Date(dateKey + 'T00:00:00');
  if (date < startDateA) return;

  const currentStatus = getParentForDate(date);
  const newOverrides = { ...overrides };

  if (!currentStatus.isOverride) {
    newOverrides[dateKey] = currentStatus.parent === 'papa' ? 'mamma' : 'papa';
  } else {
    delete newOverrides[dateKey];
  }

  saveOverridesToFirestore(newOverrides);
};

window.resetOverrides = function() {
  if (confirm("Vuoi cancellare tutti i cambi manuali e ripristinare il calendario standard?")) {
    saveOverridesToFirestore({});
  }
};

window.changeMonth = function(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
};

window.exportToExcel = function() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const data = [
    ["Data", "Giorno", "Genitore con Valerio", "Note"]
  ];

  const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    const dayName = daysOfWeek[date.getDay()];
    
    let genitore = "Non definito";
    let nota = "";

    if (date >= startDateA) {
      const status = getParentForDate(date);
      genitore = status.parent === 'papa' ? 'Papà' : 'Mamma';
      if (status.isOverride) {
        nota = "Cambio/Scambio concordato";
      }
    }

    data.push([dateStr, dayName, genitore, nota]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 25 }
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
    
    const dayNumber = document.createElement('span');
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

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
      cell.onclick = () => window.toggleDayOverride(dateKey, getStandardParent(date));
    }

    grid.appendChild(cell);
  }
}

renderCalendar();
