export class SaluteManager {
  constructor() {
    this.resetSchede();
  }

  resetSchede() {
    this.schede = {
      pediatra: { nome: '', telefono: '', orari: '' },
      contattiUtili: [],
      infoGenerali: { gruppoSanguigno: '', allergie: '', terapie: '' },
      farmaci: [],
      visite: []
    };
  }

  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  setSchede(data) {
    if (!data || typeof data !== 'object') {
      this.resetSchede();
      return;
    }

    this.schede = {
      pediatra: {
        nome: data.pediatra?.nome || '',
        telefono: data.pediatra?.telefono || '',
        orari: data.pediatra?.orari || ''
      },
      contattiUtili: Array.isArray(data.contattiUtili) ? data.contattiUtili : [],
      infoGenerali: {
        gruppoSanguigno: data.infoGenerali?.gruppoSanguigno || '',
        allergie: data.infoGenerali?.allergie || '',
        terapie: data.infoGenerali?.terapie || ''
      },
      farmaci: Array.isArray(data.farmaci) ? data.farmaci : [],
      visite: Array.isArray(data.visite) ? data.visite : []
    };
  }

  getSchede() {
    return this.schede;
  }

  updatePediatra(nome = '', telefono = '', orari = '') {
    this.schede.pediatra = {
      nome: nome.trim(),
      telefono: telefono.trim(),
      orari: orari.trim()
    };
  }

  updateInfoGenerali(allergie = '', gruppoSanguigno = '', terapie = '') {
    this.schede.infoGenerali = {
      allergie: allergie.trim(),
      gruppoSanguigno: gruppoSanguigno.trim(),
      terapie: terapie.trim()
    };
  }

  addFarmaco(nome = '', orario = '', note = '') {
    const cleanNome = nome.trim();
    if (!cleanNome) return null;

    const nuovoFarmaco = {
      id: this._generateId(),
      nome: cleanNome,
      orario: orario.trim(),
      note: note.trim(),
      somministrato: {}
    };

    this.schede.farmaci.push(nuovoFarmaco);
    return nuovoFarmaco;
  }

  toggleSomministrazione(farmacoId, dateKey) {
    const farmaco = this.schede.farmaci.find(f => f.id === farmacoId);
    if (farmaco) {
      if (!farmaco.somministrato || typeof farmaco.somministrato !== 'object') {
        farmaco.somministrato = {};
      }
      farmaco.somministrato[dateKey] = !farmaco.somministrato[dateKey];
    }
  }

  deleteFarmaco(id) {
    this.schede.farmaci = this.schede.farmaci.filter(f => f.id !== id);
  }

  addContatto(nome = '', ruolo = '', telefono = '') {
    const cleanNome = nome.trim();
    if (!cleanNome) return null;

    const nuovoContatto = {
      id: this._generateId(),
      nome: cleanNome,
      ruolo: ruolo.trim(),
      telefono: telefono.trim()
    };

    this.schede.contattiUtili.push(nuovoContatto);
    return nuovoContatto;
  }

  deleteContatto(id) {
    this.schede.contattiUtili = this.schede.contattiUtili.filter(c => c.id !== id);
  }

  addVisita(data = '', descrizione = '', note = '') {
    const cleanDesc = descrizione.trim();
    if (!cleanDesc || !data) return null;

    const nuovaVisita = {
      id: this._generateId(),
      data,
      descrizione: cleanDesc,
      note: note.trim()
    };

    this.schede.visite.push(nuovaVisita);
    this.schede.visite.sort((a, b) => new Date(a.data) - new Date(b.data));
    return nuovaVisita;
  }

  deleteVisita(id) {
    this.schede.visite = this.schede.visite.filter(v => v.id !== id);
  }

  getVisiteProssime(fromDateString) {
    const refDate = fromDateString ? new Date(fromDateString) : new Date();
    refDate.setHours(0, 0, 0, 0);

    return this.schede.visite.filter(v => {
      const vDate = new Date(v.data);
      vDate.setHours(0, 0, 0, 0);
      return vDate >= refDate;
    });
  }
}
