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
    const isCambio = !!this.manualCambi[dateKey];

    if (this.overrides[dateKey]) {
      const p = this.overrides[dateKey];
      return { parent: p === 'none' ? null : p, isOverride: isCambio };
    }
    return { parent: this.getStandardParent(date), isOverride: isCambio };
  }

  toggleDay(dateKey) {
    const date = new Date(dateKey + 'T00:00:00');
    const currentStatus = this.getParentForDate(date);

    if (currentStatus.parent === 'papa') {
      this.overrides[dateKey] = 'mamma';
    } else if (currentStatus.parent === 'mamma') {
      this.overrides[dateKey] = 'none'; // Non assegnato
    } else {
      this.overrides[dateKey] = 'papa';
    }

    delete this.manualCambi[dateKey];
    return { overrides: this.overrides, manualCambi: this.manualCambi };
  }
}
