export class LogisticaManager {
  constructor() {
    this.passaggi = {};
  }

  setPassaggi(data) {
    this.passaggi = data && typeof data === 'object' ? data : {};
  }

  getPassaggi() {
    return this.passaggi;
  }

  getPassaggio(dateKey) {
    const defaultChecklist = {
      vestiti: false,
      cartella: false,
      libretto: false,
      giochi: false
    };

    if (!this.passaggi[dateKey]) {
      return {
        luogo: '',
        ora: '',
        note: '',
        checklist: { ...defaultChecklist }
      };
    }

    const current = this.passaggi[dateKey];

    return {
      luogo: current.luogo || '',
      ora: current.ora || '',
      note: current.note || '',
      checklist: {
        ...defaultChecklist,
        ...(current.checklist || {})
      }
    };
  }

  savePassaggio(dateKey, luogo = '', ora = '', note = '', checklist = {}) {
    const cleanLuogo = luogo.trim();
    const cleanOra = ora.trim();
    const cleanNote = note.trim();

    const cleanChecklist = {
      vestiti: Boolean(checklist.vestiti),
      cartella: Boolean(checklist.cartella),
      libretto: Boolean(checklist.libretto),
      giochi: Boolean(checklist.giochi)
    };

    const hasChecklistActive = Object.values(cleanChecklist).some(val => val === true);
    const isEmpty = !cleanLuogo && !cleanOra && !cleanNote && !hasChecklistActive;

    if (isEmpty) {
      delete this.passaggi[dateKey];
    } else {
      this.passaggi[dateKey] = {
        luogo: cleanLuogo,
        ora: cleanOra,
        note: cleanNote,
        checklist: cleanChecklist
      };
    }
  }

  deletePassaggio(dateKey) {
    if (this.passaggi[dateKey]) {
      delete this.passaggi[dateKey];
    }
  }

  hasPassaggio(dateKey) {
    const p = this.passaggi[dateKey];
    if (!p) return false;

    const hasText = Boolean(p.luogo || p.ora || p.note);
    const hasCheck = p.checklist ? Object.values(p.checklist).some(Boolean) : false;

    return hasText || hasCheck;
  }
}
