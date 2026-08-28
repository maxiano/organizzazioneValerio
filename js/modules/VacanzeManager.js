// modules/VacanzeManager.js

export class VacanzeManager {
  constructor() {
    this.vacanze = [];
  }

  // -------------------------------------------------------------
  // CARICAMENTO & SALVATAGGIO (FIREBASE SERIE)
  // -------------------------------------------------------------
  loadData(data) {
    if (Array.isArray(data)) {
      this.vacanze = data;
    } else if (data && typeof data === 'object') {
      // Se Firestore ha salvato i dati come oggetto/mappa, convertili in Array
      this.vacanze = Object.values(data);
    } else {
      this.vacanze = [];
    }
  }

  getData() {
    return this.vacanze;
  }

  setVacanze(data) {
    this.loadData(data);
  }

  getVacanze() {
    return Array.isArray(this.vacanze) ? this.vacanze : [];
  }

  // -------------------------------------------------------------
  // METODI DI RICERCA E GESTIONE
  // -------------------------------------------------------------
  
  /**
    * Cerca se per una determinata data esiste un blocco vacanza attivo
    */
  getVacanzaForDate(date) {
    if (!Array.isArray(this.vacanze) || this.vacanze.length === 0) return null;

    // Formatta la data in formato YYYY-MM-DD gestendo il fuso orario locale
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return this.vacanze.find(v => {
      if (!v.dataInizio || !v.dataFine) return false;
      return dateStr >= v.dataInizio && dateStr <= v.dataFine;
    }) || null;
  }

  addVacanzeBlock(titolo, dataInizio, dataFine, assegnatoA) {
    const newBlock = {
      id: Date.now().toString(),
      titolo,
      dataInizio,
      dataFine,
      parent: assegnatoA,    // Impostato come 'parent' per allineamento a Firestore
      genitore: assegnatoA   // Compatibilità fallback
    };
    
    if (!Array.isArray(this.vacanze)) {
      this.vacanze = [];
    }
    
    this.vacanze.push(newBlock);
  }

  deleteVacanzeBlock(id) {
    if (Array.isArray(this.vacanze)) {
      this.vacanze = this.vacanze.filter(v => v.id !== id);
    }
  }

  // Alias per garantire compatibilità se app.js chiama deleteVacanza(id)
  deleteVacanza(id) {
    this.deleteVacanzeBlock(id);
  }
}
