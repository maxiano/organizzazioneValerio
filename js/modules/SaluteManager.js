export class SaluteManager {
  constructor() {
    this.schede = {
      pediatra: { nome: '', telefono: '', orari: '' },
      contattiUtili: [], // [{ id, nome, ruolo, telefono }]
      infoGenerali: { gruppoSanguigno: '', allergie: '', terapie: '' },
      farmaci: [],        // [{ id, nome, orario, note, somministrato: { 'YYYY-MM-DD': true/false } }]
      visite: []         // [{ id, data, descrizione, note }]
    };
  }

  setSchede(data) {
    this.schede = {
      pediatra: data.pediatra || { nome: '', telefono: '', orari: '' },
      contattiUtili: data.contattiUtili || [],
      infoGenerali: data.infoGenerali || { gruppoSanguigno: '', allergie: '', terapie: '' },
      farmaci: data.farmaci || [],
      visite: data.visite || []
    };
  }

  // GESTIONE PEDIATRA E INFO
  updatePediatra(nome, telefono, orari) {
    this.schede.pediatra = { nome, telefono, orari };
  }

  updateInfoGenerali(gruppoSanguigno, allergie, terapie) {
    this.schede.infoGenerali = { gruppoSanguigno, allergie, terapie };
  }

  // GESTIONE FARMACI / TERAPIE
  addFarmaco(nome, orario, note) {
    const nuovo = {
      id: Date.now().toString(),
      nome,
      orario,
      note,
      somministrato: {} // Mappa dateKey -> boolean (es. { "2026-08-28": true })
    };
    this.schede.farmaci.push(nuovo);
  }

  toggleSomministrazione(farmacoId, dateKey) {
    const farmaco = this.schede.farmaci.find(f => f.id === farmacoId);
    if (farmaco) {
      if (!farmaco.somministrato) farmaco.somministrato = {};
      farmaco.somministrato[dateKey] = !farmaco.somministrato[dateKey];
    }
  }

  deleteFarmaco(id) {
    this.schede.farmaci = this.schede.farmaci.filter(f => f.id !== id);
  }

  // GESTIONE CONTATTI UTILI
  addContatto(nome, ruolo, telefono) {
    this.schede.contattiUtili.push({
      id: Date.now().toString(),
      nome,
      ruolo,
      telefono
    });
  }

  deleteContatto(id) {
    this.schede.contattiUtili = this.schede.contattiUtili.filter(c => c.id !== id);
  }

  // GESTIONE VISITE
  addVisita(data, descrizione, note = '') {
    this.schede.visite.push({
      id: Date.now().toString(),
      data,
      descrizione,
      note
    });
  }

  deleteVisita(id) {
    this.schede.visite = this.schede.visite.filter(v => v.id !== id);
  }
}
