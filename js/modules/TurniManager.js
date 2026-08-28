export class TurniManager {
  constructor(startDateA = null) {
    let baseDate;
    if (startDateA) {
      baseDate = new Date(startDateA);
    }
    
    if (!baseDate || isNaN(baseDate.getTime())) {
      baseDate = new Date('2024-01-01T00:00:00');
    }

    baseDate.setHours(0, 0, 0, 0);
    this.startDateA = baseDate;

    this.overrides = {};
    this.manualCambi = {};
  }

  setData(overrides = {}, manualCambi = {}) {
    this.overrides = overrides && typeof overrides === 'object' ? overrides : {};
    this.manualCambi = manualCambi && typeof manualCambi === 'object' ? manualCambi : {};
  }

  formatDateKey(date) {
    const d = date instanceof Date && !isNaN(date) ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  parseDateKey(dateKey) {
    const parts = String(dateKey).split('-');
    if (parts.length !== 3) return new Date();
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  getStandardParent(date) {
    const d = date instanceof Date ? new Date(date.getTime()) : this.parseDateKey(date);
    d.setHours(0, 0, 0, 0);

    const msPerDay = 86400000;
    const daysDiff = Math.round((d - this.startDateA) / msPerDay);
    const cycleDay = ((daysDiff % 14) + 14) % 14; 

    const giorniPapa = [0, 3, 5, 6, 8, 10];
    if (giorniPapa.includes(cycleDay)) {
      return 'papa';
    }

    return 'mamma';
  }

  getParentForDate(date) {
    const dateKey = typeof date === 'string' ? date : this.formatDateKey(date);
    const standardParent = this.getStandardParent(date);

    if (Object.prototype.hasOwnProperty.call(this.overrides, dateKey)) {
      const p = this.overrides[dateKey];
      const actualParent = p === 'none' ? null : p;
      const isOverride = Boolean(this.manualCambi && this.manualCambi[dateKey] === true);

      return { parent: actualParent, isOverride: isOverride };
    }

    return { parent: standardParent, isOverride: false };
  }

  toggleDay(dateKey) {
    const currentStatus = this.getParentForDate(dateKey);
    const standardParent = this.getStandardParent(dateKey);

    let nextParent;

    if (currentStatus.parent === 'papa') {
      nextParent = 'mamma';
    } else if (currentStatus.parent === 'mamma') {
      nextParent = 'none';
    } else {
      nextParent = 'papa';
    }

    if (nextParent === standardParent) {
      delete this.overrides[dateKey];
      delete this.manualCambi[dateKey];
    } else {
      this.overrides[dateKey] = nextParent;
      this.manualCambi[dateKey] = true;
    }

    return this.toJSON();
  }

  resetDayToStandard(dateKey) {
    if (this.overrides[dateKey]) delete this.overrides[dateKey];
    if (this.manualCambi[dateKey]) delete this.manualCambi[dateKey];
    return this.toJSON();
  }

  toJSON() {
    return {
      overrides: this.overrides,
      manualCambi: this.manualCambi
    };
  }
}
