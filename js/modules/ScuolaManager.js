export class ScuolaManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.orario = {
      Lunedi: [],
      Martedi: [],
      Mercoledi: [],
      Giovedi: [],
      Venerdi: []
    };
    this.compiti = [];
    this.voti = [];
  }

  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  setOrarioGiorno(giorno, materieArray = []) {
    if (Object.prototype.hasOwnProperty.call(this.orario, giorno)) {
      this.orario[giorno] = Array.isArray(materieArray) 
        ? materieArray.map(m => m.trim()).filter(Boolean)
        : [];
    }
  }

  getOrarioGiorno(giorno) {
    return this.orario[giorno] || [];
  }

  addCompito(materia = '', descrizione = '', dataConsegna = '') {
    const cleanMateria = materia.trim();
    const cleanDesc = descrizione.trim();

    if (!cleanMateria || !cleanDesc) return null;

    const compito = {
      id: this._generateId(),
      materia: cleanMateria,
      descrizione: cleanDesc,
      dataConsegna,
      completato: false
    };

    this.compiti.push(compito);
    this.compiti.sort((a, b) => new Date(a.dataConsegna || '2099-12-31') - new Date(b.dataConsegna || '2099-12-31'));
    return compito;
  }

  toggleCompito(id) {
    const compito = this.compiti.find(c => c.id === id);
    if (compito) {
      compito.completato = !compito.completato;
    }
  }

  deleteCompito(id) {
    this.compiti = this.compiti.filter(c => c.id !== id);
  }

  getCompitiAperti() {
    return this.compiti.filter(c => !c.completato);
  }

  getCompitiPerData(dateKey) {
    return this.compiti.filter(c => c.dataConsegna === dateKey);
  }

  addVoto(materia = '', voto = 0, data = '', note = '') {
    const cleanMateria = materia.trim();
    const numVoto = typeof voto === 'string' 
      ? parseFloat(voto.replace(',', '.')) 
      : parseFloat(voto);

    if (!cleanMateria || isNaN(numVoto) || numVoto < 0 || numVoto > 10) {
      console.warn("Dati voto non validi:", { materia, voto });
      return null;
    }

    const votoObj = {
      id: this._generateId(),
      materia: cleanMateria,
      voto: Number(numVoto.toFixed(2)),
      data: data || new Date().toISOString().split('T')[0],
      note: note.trim()
    };

    this.voti.push(votoObj);
    this.voti.sort((a, b) => new Date(b.data) - new Date(a.data));
    return votoObj;
  }

  deleteVoto(id) {
    this.voti = this.voti.filter(v => v.id !== id);
  }

  getMediaMateria(materia) {
    if (!materia) return 0;
    const votiMateria = this.voti.filter(v => v.materia.toLowerCase() === materia.toLowerCase());
    if (votiMateria.length === 0) return 0;

    const somma = votiMateria.reduce((acc, v) => acc + Number(v.voto), 0);
    return Number((somma / votiMateria.length).toFixed(2));
  }

  getMediaGenerale() {
    if (this.voti.length === 0) return 0;
    const somma = this.voti.reduce((acc, v) => acc + Number(v.voto), 0);
    return Number((somma / this.voti.length).toFixed(2));
  }

  getElencoMaterie() {
    const setMaterie = new Set();
    Object.values(this.orario).flat().forEach(m => setMaterie.add(m));
    this.compiti.forEach(c => setMaterie.add(c.materia));
    this.voti.forEach(v => setMaterie.add(v.materia));
    return Array.from(setMaterie).sort();
  }

  toJSON() {
    return {
      orario: this.orario,
      compiti: this.compiti,
      voti: this.voti
    };
  }

  fromJSON(data) {
    if (!data || typeof data !== 'object') {
      this.reset();
      return;
    }

    this.orario = {
      Lunedi: Array.isArray(data.orario?.Lunedi) ? data.orario.Lunedi : [],
      Martedi: Array.isArray(data.orario?.Martedi) ? data.orario.Martedi : [],
      Mercoledi: Array.isArray(data.orario?.Mercoledi) ? data.orario.Mercoledi : [],
      Giovedi: Array.isArray(data.orario?.Giovedi) ? data.orario.Giovedi : [],
      Venerdi: Array.isArray(data.orario?.Venerdi) ? data.orario.Venerdi : []
    };

    this.compiti = Array.isArray(data.compiti) ? data.compiti : [];
    this.voti = Array.isArray(data.voti) 
      ? data.voti.map(v => ({ ...v, voto: Number(v.voto) })) 
      : [];
  }
}
