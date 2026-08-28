export class TurniManager {
  constructor(startDateA = new Date()) {
    this.startDateA = startDateA;
    this.overrides = {};
    this.manualCambi = {};
  }

  setData(overrides = {}, manualCambi = {}) {
    this.overrides = overrides;
    this.manualCambi = manualCambi;
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getStandardParent(date) {
    const msPerDay = 86400000;
    const daysDiff = Math.floor((date - this.startDateA) / msPerDay);
    if (daysDiff < 0) return null;

    const cycleDay = (daysDiff % 14 + 14) % 14; 
    if (cycleDay === 0 || cycleDay === 3 || cycleDay === 5 || cycleDay === 6) return 'papa';
    if (cycleDay === 8 || cycleDay === 10) return 'papa';

    return 'mamma';
  }

getParentForDate(date) {
    const dateKey = this.formatDateKey(date);
    const standardParent = this.getStandardParent(date);

    // Se esiste una modifica manuale per questa data
    if (this.overrides[dateKey]) {
      const p = this.overrides[dateKey];
      const actualParent = p === 'none' ? null : p;

      // Il turno è un "Cambio" se il genitore impostato differisce da quello di rotazione standard
      // OPPURE se è stato segnato esplicitamente in manualCambi
      const isOverride = (actualParent !== standardParent) || !!this.manualCambi[dateKey];

      return { parent: actualParent, isOverride: isOverride };
    }

    // Rotazione standard senza modifiche
    return { parent: standardParent, isOverride: false };
  }

  toggleDay(dateKey) {
    const date = new Date(dateKey + 'T00:00:00');
    const currentStatus = this.getParentForDate(date);

    // Ciclo di selezione manuale: Papà -> Mamma -> Nessuno -> Papà
    if (currentStatus.parent === 'papa') {
      this.overrides[dateKey] = 'mamma';
    } else if (currentStatus.parent === 'mamma') {
      this.overrides[dateKey] = 'none'; // Non assegnato
    } else {
      this.overrides[dateKey] = 'papa';
    }

    // Segna la data come modifica manuale esplicita
    this.manualCambi[dateKey] = true;

    return { overrides: this.overrides, manualCambi: this.manualCambi };
  }
}
