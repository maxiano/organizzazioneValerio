export class VacanzeManager {
  constructor() {
    this.vacanze = [];
  }

  _generateId() {
    return `vacanza_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  setVacanze(data) {
    this.vacanze = Array.isArray(data) ? data : [];
    this._sortVacanze();
  }

  getVacanze() {
    return this.vacanze;
  }

  _sortVacanze() {
    this.vacanze.sort((a, b) => new Date(a.dataInizio) - new Date(b.dataInizio));
  }

  addVacanzeBlock(titolo = '', dataInizio = '', dataFine = '', assegnatoA = 'papa') {
    const cleanTitolo = titolo.trim();
    if (!cleanTitolo || !dataInizio || !dataFine) {
      console.warn("Dati vacanza incompleti:", { titolo, dataInizio, dataFine });
      return null;
    }

    const start = new Date(dataInizio);
    const end = new Date(dataFine);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      console.warn("Intervallo date vacanze non valido:", { dataInizio, dataFine });
      return null;
    }

    const newBlock = {
      id: this._generateId(),
      titolo: cleanTitolo,
      dataInizio,
      dataFine,
      assegnatoA: assegnatoA === 'mamma' ? 'mamma' : 'papa'
    };

    this.vacanze.push(newBlock);
    this._sortVacanze();
    return newBlock;
  }

  deleteVacanzeBlock(id) {
    this.vacanze = this.vacanze.filter(v => v.id !== id);
    return this.vacanze;
  }

  getVacanzaForDate(dateKey) {
    if (!dateKey) return null;
    
    return this.vacanze.find(v => {
      return dateKey >= v.dataInizio && dateKey <= v.dataFine;
    }) || null;
  }

  toJSON() {
    return this.vacanze;
  }
}
