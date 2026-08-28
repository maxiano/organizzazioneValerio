export class SaluteManager {
  constructor() {
    this.schede = {}; // Contiene dati sanitari: { farmaci: [], visite: [] }
  }

  setSchede(data = {}) {
    this.schede = data;
  }

  addVisita(dateKey, tipo, medico, note = '') {
    if (!this.schede[dateKey]) this.schede[dateKey] = [];
    this.schede[dateKey].push({ tipo, medico, note });
    return this.schede;
  }
}
