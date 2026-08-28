export class LogisticaManager {
  constructor() {
    this.passaggi = {}; // { 'YYYY-MM-DD': { luogo: 'Scuola', ora: '16:30', note: 'Zaino palestra' } }
  }

  setPassaggi(data = {}) {
    this.passaggi = data;
  }

  setPassaggioData(dateKey, luogo, ora, note = '') {
    this.passaggi[dateKey] = { luogo, ora, note };
    return this.passaggi;
  }

  getPassaggio(dateKey) {
    return this.passaggi[dateKey] || null;
  }
}
