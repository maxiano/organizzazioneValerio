export class TurniManager {
  constructor(startDateA = new Date()) {
    // Normalizziamo la data di partenza a mezzanotte
    const d = new Date(startDateA);
    d.setHours(0, 0, 0, 0);
    this.startDateA = d;

    this.overrides = {};
    this.manualCambi = {};
  }

  setData(overrides = {}, manualCambi = {}) {
    this.overrides = overrides || {};
    this.manualCambi = manualCambi || {};
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getStandardParent(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const msPerDay = 86400000;
    const daysDiff = Math.floor((d - this.startDateA) / msPerDay);
    if (daysDiff < 0) return null;

    const cycleDay = ((daysDiff % 14) + 14) % 14; 
    if (cycleDay === 0 || cycleDay === 3 || cycleDay === 5 || cycleDay === 6) return 'papa';
    if (cycleDay === 8 || cycleDay === 10) return 'papa';

    return 'mamma';
  }

  getParentForDate(date) {
    const dateKey = this.formatDateKey(date);
    const standardParent = this.getStandardParent(date);

    // Se esiste un override per questa data
    if (Object.prototype.hasOwnProperty.call(this.overrides, dateKey)) {
      const p = this.overrides[dateKey];
      const actualParent = p === 'none' ? null : p;

      // È un cambio se il genitore impostato differisce da quello di rotazione standard
      const isOverride = actualParent !== standardParent;

      return { parent: actualParent, isOverride: isOverride };
    }

    // Rotazione standard
    return { parent: standardParent, isOverride: false };
  }

  toggleDay(dateKey) {
    const date = new Date(dateKey + 'T00:00:00');
    const currentStatus = this.getParentForDate(date);

    // Ciclo: Papà -> Mamma -> Nessuno -> Papà
    if (currentStatus.parent === 'papa') {
      this.overrides[dateKey] = 'mamma';
    } else if (currentStatus.parent === 'mamma') {
      this.overrides[dateKey] = 'none';
    } else {
      this.overrides[dateKey] = 'papa';
    }

    this.manualCambi[dateKey] = true;

    return { overrides: this.overrides, manualCambi: this.manualCambi };
  }
}
