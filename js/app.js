// =============================================================
// APP.JS - MODULO PRINCIPALE APP GESTIONE TURNI E FAMIGLIA
// =============================================================
console.log("=== APP.JS È STATO CARICATO CORRETTAMENTE ===");
// 1. IMPORT FIREBASE (Sempre in cima al file)
import { db, docRef } from './firebase-config.js';
// 2. IMPORT DELLE FUNZIONI FIRESTORE DALLA CDN (se devi leggere o scrivere dati)
import { getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// 3. Test di controllo (apri la Console del Browser con F12 per vederlo)
console.log("🔥 Firebase caricato correttamente in app.js!", db);
import { TurniManager } from './modules/TurniManager.js';
import { SpeseManager } from './modules/SpeseManager.js';
import { LogisticaManager } from './modules/LogisticaManager.js';
import { ScuolaManager } from './modules/ScuolaManager.js';
import { VacanzeManager } from './modules/VacanzeManager.js';
import { SaluteManager } from './modules/SaluteManager.js';
import { ExportManager } from './modules/ExportManager.js';


// Inizializzazione dei Manager
const turniMgr = new TurniManager();
const speseMgr = new SpeseManager();
const logisticaMgr = new LogisticaManager();
const saluteMgr = new SaluteManager();
const vacanzeMgr = new VacanzeManager();
const scuolaMgr = new ScuolaManager();

// Stato locale dell'applicazione
let currentDate = new Date();
let currentView = 'grid'; // 'grid' | 'list'
let notes = {}; 
let deferredPrompt = null;

// -------------------------------------------------------------
// LOGICA TURNI E VACANZE
// -------------------------------------------------------------
function getParentForDateWithVacanze(date) {
  const vacanza = vacanzeMgr.getVacanzaForDate(date);
  if (vacanza) {
    return { parent: vacanza.genitore, isVacanza: true, nota: vacanza.titolo };
  }
  return turniMgr.getParentForDate(date);
}

// -------------------------------------------------------------
// GESTIONE PWA INSTALLAZIONE
// -------------------------------------------------------------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btnInstall');
  if (btnInstall) btnInstall.style.display = 'block';
});

window.installApp = async function() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    const btnInstall = document.getElementById('btnInstall');
    if (btnInstall) btnInstall.style.display = 'none';
  }
  deferredPrompt = null;
};

// -------------------------------------------------------------
// FIRESTORE SYNC & SALVATAGGIO
// -------------------------------------------------------------
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
    
    if (window.db && window.doc && window.setDoc) {
      const docRef = window.doc(window.db, "familyData", "main");
      await window.setDoc(docRef, dataToSave, { merge: true });
    }
  } catch (error) {
    console.error("Errore durante il salvataggio su Firestore:", error);
  }
}

function initFirestoreSync() {
  if (window.db && window.doc && window.onSnapshot) {
    const docRef = window.doc(window.db, "familyData", "main");
    window.onSnapshot(docRef, (docSnap) => {
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

// -------------------------------------------------------------
// NOTE E OVERRIDE TURNI
// -------------------------------------------------------------
window.toggleDayOverride = async function(dateKey) {
  turniMgr.toggleOverride(dateKey);
  await saveDataToFirestore();
  render();
};

window.openNoteModal = function(dateKey, event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('noteModal');
  if (!modal) return;
  
  document.getElementById('noteDateKey').value = dateKey;
  document.getElementById('noteTextInput').value = notes[dateKey]?.text || '';
  document.getElementById('noteCategorySelect').value = notes[dateKey]?.category || 'generico';
  modal.classList.add('active');
};

window.closeNoteModal = function() {
  const modal = document.getElementById('noteModal');
  if (modal) modal.classList.remove('active');
};

window.saveCurrentNote = async function() {
  const dateKey = document.getElementById('noteDateKey').value;
  const text = document.getElementById('noteTextInput').value.trim();
  const category = document.getElementById('noteCategorySelect').value;

  if (text === '') {
    delete notes[dateKey];
  } else {
    notes[dateKey] = { text, category };
  }

  await saveDataToFirestore();
  window.closeNoteModal();
  render();
};

// -------------------------------------------------------------
// LOGISTICA MODAL
// -------------------------------------------------------------
window.openLogisticaModal = function(dateKey, event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('logisticaModal');
  if (!modal) return;

  const data = logisticaMgr.getPassaggio(dateKey);
  document.getElementById('logisticaDateKey').value = dateKey;
  document.getElementById('logisticaOraInput').value = data.ora || '';
  document.getElementById('logisticaLuogoInput').value = data.luogo || '';
  document.getElementById('logisticaNoteInput').value = data.note || '';

  modal.classList.add('active');
};

window.closeLogisticaModal = function() {
  const modal = document.getElementById('logisticaModal');
  if (modal) modal.classList.remove('active');
};

window.saveLogistica = async function() {
  const dateKey = document.getElementById('logisticaDateKey').value;
  const ora = document.getElementById('logisticaOraInput').value;
  const luogo = document.getElementById('logisticaLuogoInput').value.trim();
  const noteText = document.getElementById('logisticaNoteInput').value.trim();

  logisticaMgr.setPassaggio(dateKey, { ora, luogo, note: noteText });
  await saveDataToFirestore();
  window.closeLogisticaModal();
  render();
};

// -------------------------------------------------------------
// SPESE (Con Ridimensionamento Immagini Sicuro)
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

function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error("File non valido o non è un'immagine"));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error("Errore nel caricamento dell'immagine"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Errore nella lettura del file"));
    reader.readAsDataURL(file);
  });
}

window.saveSpesa = async function() {
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

  let ricevutaBase64 = null;
  const file = fileInput.files[0];
  if (file) {
    try {
      ricevutaBase64 = await compressImage(file);
    } catch (err) {
      console.error("Errore durante la compressione dell'immagine:", err);
      alert("Si è verificato un errore nel caricamento dell'immagine della ricevuta.");
    }
  }

  speseMgr.addSpesa(desc, importo, pagatoDa, categoria, ricevutaBase64, data);
  await saveDataToFirestore();
  window.closeSpesaModal();
  render();
};

window.deleteSpesa = async function(id) {
  if (confirm("Sei sicuro di voler eliminare questa spesa?")) {
    speseMgr.deleteSpesa(id);
    await saveDataToFirestore();
    render();
  }
};

window.viewRicevuta = function(id) {
  const spesa = speseMgr.spese.find(s => s.id === id);
  if (spesa && spesa.ricevuta) {
    const w = window.open("");
    if (w) {
      w.document.write(`
        <html>
          <head><title>Ricevuta ${spesa.descrizione}</title></head>
          <body style="margin:0; background:#111; display:flex; justify-content:center; align-items:center; min-height:100vh;">
            <img src="${spesa.ricevuta}" style="max-width:95%; max-height:95vh; object-fit:contain; border-radius:8px;" />
          </body>
        </html>
      `);
    }
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
      <td style="padding: 8px; font-weight:800;">€ ${parseFloat(spesa.importo).toFixed(2)}</td>
      <td style="padding: 8px;">${ricevutaBtn}</td>
      <td style="padding: 8px; text-align: center;">
        <button style="background:none; border:none; cursor:pointer;" onclick="deleteSpesa('${spesa.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// GESTIONE VACANZE & SALUTE (RENDERERS)
// -------------------------------------------------------------
function renderVacanze() {
  const vacanzeList = document.getElementById('vacanzeList');
  if (!vacanzeList) return;
  vacanzeList.innerHTML = '';

  const vacanze = vacanzeMgr.getVacanze() || [];
  if (vacanze.length === 0) {
    vacanzeList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessun periodo di vacanza registrato.</p>`;
    return;
  }

  vacanze.forEach(v => {
    const div = document.createElement('div');
    div.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;`;
    const dInizio = v.dataInizio.split('-').reverse().join('/');
    const dFine = v.dataFine.split('-').reverse().join('/');
    const genitoreStr = v.genitore === 'papa' ? 'Papà' : 'Mamma';

    div.innerHTML = `
      <div>
        <strong>🏖️ ${v.titolo}</strong> (${genitoreStr})
        <br/><small style="color:var(--text-muted);">${dInizio} - ${dFine}</small>
      </div>
      <button style="background:none; border:none; cursor:pointer;" onclick="deleteVacanza('${v.id}')">🗑️</button>
    `;
    vacanzeList.appendChild(div);
  });
}

window.deleteVacanza = async function(id) {
  vacanzeMgr.deleteVacanza(id);
  await saveDataToFirestore();
  render();
};

function renderSalute() {
  const saluteList = document.getElementById('saluteList');
  if (!saluteList) return;
  saluteList.innerHTML = '';

  const salute = saluteMgr.getFarmaci() || [];
  if (salute.length === 0) {
    saluteList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessun farmaco o appuntamento registrato.</p>`;
    return;
  }

  salute.forEach(f => {
    const div = document.createElement('div');
    div.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;`;
    div.innerHTML = `
      <div>
        <strong>💊 ${f.nome}</strong> ${f.dosaggio ? `- ${f.dosaggio}` : ''}
        ${f.note ? `<br/><small style="color:var(--text-muted);">${f.note}</small>` : ''}
      </div>
      <button style="background:none; border:none; cursor:pointer;" onclick="deleteFarmaco('${f.id}')">🗑️</button>
    `;
    saluteList.appendChild(div);
  });
}

window.deleteFarmaco = async function(id) {
  saluteMgr.deleteFarmaco(id);
  await saveDataToFirestore();
  render();
};

// -------------------------------------------------------------
// GESTIONE MODULO SCUOLA
// -------------------------------------------------------------
window.addScuolaLezione = async function() {
  const giorno = document.getElementById('scuolaGiornoSelect')?.value;
  const materia = document.getElementById('scuolaMateriaInput')?.value.trim();
  const oraInizio = document.getElementById('scuolaOraInizioInput')?.value;
  const oraFine = document.getElementById('scuolaOraFineInput')?.value;

  if (!materia) {
    alert("Inserisci la materia!");
    return;
  }

  scuolaMgr.addLezione(giorno, materia, oraInizio, oraFine);
  await saveDataToFirestore();
  if (document.getElementById('scuolaMateriaInput')) document.getElementById('scuolaMateriaInput').value = '';
  render();
};

window.deleteScuolaLezione = async function(giorno, id) {
  scuolaMgr.deleteLezione(giorno, id);
  await saveDataToFirestore();
  render();
};

window.addScuolaCompito = async function() {
  const materia = document.getElementById('compitoMateriaInput')?.value.trim();
  const desc = document.getElementById('compitoDescInput')?.value.trim();
  const scadenza = document.getElementById('compitoScadenzaInput')?.value;

  if (!materia || !desc || !scadenza) {
    alert("Inserisci materia, descrizione e data di scadenza!");
    return;
  }

  scuolaMgr.addCompito(materia, desc, scadenza);
  await saveDataToFirestore();

  if (document.getElementById('compitoMateriaInput')) document.getElementById('compitoMateriaInput').value = '';
  if (document.getElementById('compitoDescInput')) document.getElementById('compitoDescInput').value = '';
  render();
};

window.toggleScuolaCompito = async function(id) {
  scuolaMgr.toggleCompito(id);
  await saveDataToFirestore();
  render();
};

window.deleteScuolaCompito = async function(id) {
  scuolaMgr.deleteCompito(id);
  await saveDataToFirestore();
  render();
};

window.addScuolaComunicazione = async function() {
  const titolo = document.getElementById('comunicazioneTitoloInput')?.value.trim();
  const desc = document.getElementById('comunicazioneDescInput')?.value.trim();
  const data = document.getElementById('comunicazioneDataInput')?.value;

  if (!titolo) {
    alert("Inserisci almeno il titolo della comunicazione!");
    return;
  }

  scuolaMgr.addComunicazione(titolo, desc, data);
  await saveDataToFirestore();

  if (document.getElementById('comunicazioneTitoloInput')) document.getElementById('comunicazioneTitoloInput').value = '';
  if (document.getElementById('comunicazioneDescInput')) document.getElementById('comunicazioneDescInput').value = '';
  render();
};

window.deleteScuolaComunicazione = async function(id) {
  scuolaMgr.deleteComunicazione(id);
  await saveDataToFirestore();
  render();
};

window.addScuolaMateriale = async function() {
  const nome = document.getElementById('materialeNomeInput')?.value.trim();
  const note = document.getElementById('materialeNoteInput')?.value.trim();

  if (!nome) {
    alert("Inserisci l'oggetto o il materiale occorrente!");
    return;
  }

  scuolaMgr.addMateriale(nome, note);
  await saveDataToFirestore();

  if (document.getElementById('materialeNomeInput')) document.getElementById('materialeNomeInput').value = '';
  if (document.getElementById('materialeNoteInput')) document.getElementById('materialeNoteInput').value = '';
  render();
};

window.toggleScuolaMateriale = async function(id) {
  scuolaMgr.toggleMateriale(id);
  await saveDataToFirestore();
  render();
};

window.deleteScuolaMateriale = async function(id) {
  scuolaMgr.deleteMateriale(id);
  await saveDataToFirestore();
  render();
};

window.addScuolaEvento = async function() {
  const titolo = document.getElementById('eventoScuolaTitoloInput')?.value.trim();
  const data = document.getElementById('eventoScuolaDataInput')?.value;
  const ora = document.getElementById('eventoScuolaOraInput')?.value;
  const tipo = document.getElementById('eventoScuolaTipoSelect')?.value || 'altro';
  const note = document.getElementById('eventoScuolaNoteInput')?.value.trim();

  if (!titolo || !data) {
    alert("Inserisci titolo e data dell'evento scolastico!");
    return;
  }

  scuolaMgr.addEvento(titolo, data, ora, tipo, note);
  await saveDataToFirestore();

  if (document.getElementById('eventoScuolaTitoloInput')) document.getElementById('eventoScuolaTitoloInput').value = '';
  if (document.getElementById('eventoScuolaNoteInput')) document.getElementById('eventoScuolaNoteInput').value = '';
  render();
};

window.deleteScuolaEvento = async function(id) {
  scuolaMgr.deleteEvento(id);
  await saveDataToFirestore();
  render();
};

function renderScuola() {
  const days = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'];
  days.forEach(giorno => {
    const list = document.getElementById(`scuolaOrarioList_${giorno}`);
    if (list) {
      list.innerHTML = '';
      const lezioni = scuolaMgr.scuola?.orario?.[giorno] || [];
      if (lezioni.length === 0) {
        list.innerHTML = `<li style="color: var(--text-muted); font-size: 0.8rem;">Nessuna lezione</li>`;
      } else {
        lezioni.forEach(l => {
          const li = document.createElement('li');
          li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;";
          const timeStr = l.oraInizio ? `${l.oraInizio}${l.oraFine ? ' - ' + l.oraFine : ''}` : '';
          li.innerHTML = `
            <span><strong>${l.materia}</strong> ${timeStr ? `<small style="color:var(--text-muted);">(${timeStr})</small>` : ''}</span>
            <button style="background:none; border:none; cursor:pointer;" onclick="deleteScuolaLezione('${giorno}', '${l.id}')">🗑️</button>
          `;
          list.appendChild(li);
        });
      }
    }
  });

  const compitiList = document.getElementById('scuolaCompitiList');
  if (compitiList) {
    compitiList.innerHTML = '';
    const compiti = scuolaMgr.scuola?.compiti || [];
    if (compiti.length === 0) {
      compitiList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessun compito registrato.</p>`;
    } else {
      compiti.forEach(c => {
        const div = document.createElement('div');
        div.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem; ${c.completato ? 'opacity: 0.6;' : ''}`;
        const dFormattata = c.scadenza ? c.scadenza.split('-').reverse().join('/') : '';
        div.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${c.completato ? 'checked' : ''} onchange="toggleScuolaCompito('${c.id}')" style="cursor: pointer;">
            <span style="${c.completato ? 'text-decoration: line-through;' : ''}">
              <strong>[${c.materia}]</strong> ${c.descrizione} ${dFormattata ? `<small style="color:var(--text-muted);">(Entro ${dFormattata})</small>` : ''}
            </span>
          </div>
          <button style="background:none; border:none; cursor:pointer;" onclick="deleteScuolaCompito('${c.id}')">🗑️</button>
        `;
        compitiList.appendChild(div);
      });
    }
  }

  const comunicazioniList = document.getElementById('scuolaComunicazioniList');
  if (comunicazioniList) {
    comunicazioniList.innerHTML = '';
    const comunicazioni = scuolaMgr.scuola?.comunicazioni || [];
    if (comunicazioni.length === 0) {
      comunicazioniList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessuna comunicazione inserita.</p>`;
    } else {
      comunicazioni.forEach(c => {
        const div = document.createElement('div');
        div.style.cssText = `display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;`;
        const dFormattata = c.data ? c.data.split('-').reverse().join('/') : '';
        div.innerHTML = `
          <div>
            <strong>📌 ${c.titolo}</strong> ${dFormattata ? `<small style="color:var(--text-muted);">(${dFormattata})</small>` : ''}
            ${c.descrizione ? `<p style="margin: 2px 0 0 0; color: var(--text-muted); font-size:0.8rem;">${c.descrizione}</p>` : ''}
          </div>
          <button style="background:none; border:none; cursor:pointer;" onclick="deleteScuolaComunicazione('${c.id}')">🗑️</button>
        `;
        comunicazioniList.appendChild(div);
      });
    }
  }

  const materialeList = document.getElementById('scuolaMaterialeList');
  if (materialeList) {
    materialeList.innerHTML = '';
    const materiale = scuolaMgr.scuola?.materiale || [];
    if (materiale.length === 0) {
      materialeList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessun materiale in elenco.</p>`;
    } else {
      materiale.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem; ${m.preso ? 'opacity: 0.6;' : ''}`;
        div.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${m.preso ? 'checked' : ''} onchange="toggleScuolaMateriale('${m.id}')" style="cursor: pointer;">
            <span style="${m.preso ? 'text-decoration: line-through;' : ''}">
              <strong>${m.nome}</strong> ${m.note ? `<small style="color:var(--text-muted);">(${m.note})</small>` : ''}
            </span>
          </div>
          <button style="background:none; border:none; cursor:pointer;" onclick="deleteScuolaMateriale('${m.id}')">🗑️</button>
        `;
        materialeList.appendChild(div);
      });
    }
  }

  const eventiList = document.getElementById('scuolaEventiList');
  if (eventiList) {
    eventiList.innerHTML = '';
    const eventi = scuolaMgr.scuola?.eventi || [];
    if (eventi.length === 0) {
      eventiList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Nessun evento programmato.</p>`;
    } else {
      eventi.forEach(e => {
        const div = document.createElement('div');
        div.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--surface-border); font-size: 0.85rem;`;
        const dFormattata = e.data ? e.data.split('-').reverse().join('/') : '';
        const badgeMap = { gita: '🎒 Gita', colloquio: '🗣️ Colloquio', recita: '🎭 Recita', altro: '📅 Altro' };
        
        div.innerHTML = `
          <div>
            <span class="event-badge generico">${badgeMap[e.tipo] || '📅 Altro'}</span>
            <strong>${e.titolo}</strong> - <span>${dFormattata} ${e.ora ? `ore ${e.ora}` : ''}</span>
            ${e.note ? `<br/><small style="color:var(--text-muted);">${e.note}</small>` : ''}
          </div>
          <button style="background:none; border:none; cursor:pointer;" onclick="deleteScuolaEvento('${e.id}')">🗑️</button>
        `;
        eventiList.appendChild(div);
      });
    }
  }
}

// -------------------------------------------------------------
// ESPORTAZIONE & STATISTICHE
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// RENDERING UI PRINCIPALE
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
  renderScuola();
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

// Avvio Inizializzazione
initFirestoreSync();
render();
