// modules/TurniManager.js

export class TurniManager {
  constructor() {
    this.overrides = {}; // Registra i cambi manuali
    this.startDate = new Date('2024-01-01'); // Data di riferimento per l'alternanza
  }

  // Calcola il genitore in base alla data
  getParentForDate(date) {
    const dateKey = this.formatDateKey(date);
    
    // Controlla se c'è un cambio manuale (override)
    if (this.overrides[dateKey]) {
      return { parent: this.overrides[dateKey], isOverride: true };
    }

    // Calcolo del ciclo alternato (es. a settimane o giorni alterni)
    const diffTime = Math.abs(date - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const parent = (Math.floor(diffDays / 7) % 2 === 0) ? 'papa' : 'mamma';

    return { parent: parent, isOverride: false };
  }

  // Inverte il genitore per una specifica data
  toggleOverride(dateKey) {
    if (!this.overrides) this.overrides = {};
    
    // Se già esisteva un cambio, si rimuove, altrimenti si imposta l'opposto
    if (this.overrides[dateKey]) {
      delete this.overrides[dateKey];
    } else {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const current = this.getParentForDate(date);
      this.overrides[dateKey] = current.parent === 'papa' ? 'mamma' : 'papa';
    }
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getData() {
    return this.overrides;
  }

  loadData(data) {
    this.overrides = data || {};
  }
}
