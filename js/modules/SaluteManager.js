export class SaluteManager {
  constructor() {
    this.schede = {
      pediatra: { nome: '', telefono: '', orari: '' },
      infoGenerali: { gruppoSanguigno: '', allergie: '', terapie: '' },
      visite: []
    };
  }

  setSchede(data) {
    if (data) {
      this.schede = {
        pediatra: data.pediatra || { nome: '', telefono: '', orari: '' },
        infoGenerali: data.infoGenerali || { gruppoSanguigno: '', allergie: '', terapie: '' },
        visite: data.visite || []
      };
    }
  }

  updatePediatra(nome, telefono, orari) {
    this.schede.pediatra = { nome, telefono, orari };
  }

  updateInfoGenerali(gruppoSanguigno, allergie, terapie) {
    this.schede.infoGenerali = { gruppoSanguigno, allergie, terapie };
  }

  addVisita(data, descrizione, esito) {
    this.schede.visite.push({
      id: Date.now().toString(),
      data,
      descrizione,
      esito
    });
  }

  deleteVisita(id) {
    this.schede.visite = this.schede.visite.filter(v => v.id !== id);
  }
}
