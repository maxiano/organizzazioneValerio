export class SpeseManager {
  constructor() {
    this.spese = [];
  }

  // --- METODI PER FIRESTORE/APP.JS ---
  getData() {
    return this.spese;
  }

  loadData(speseData = []) {
    this.setSpese(speseData);
  }

  // --- ALIAS PER COMPATIBILITÀ RETROATTIVA ---
  getSpese() {
    return this.getData();
  }

  setSpese(speseData = []) {
    this.spese = Array.isArray(speseData) ? speseData : [];
  }

  // --- METODI UTILITY INTERNI ---
  _generateId() {
    return `spesa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  _formatDateLocal(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // --- GESTIONE SPESE ---
  addSpesa(
    descrizione = '',
    importo = 0,
    pagatoDa = 'papa',
    categoria = 'scuola',
    ricevutaBase64 = null,
    data = null
  ) {
    const cleanDesc = descrizione.trim();
    const numImporto = typeof importo === 'string'
      ? parseFloat(importo.replace(',', '.'))
      : parseFloat(importo);

    if (!cleanDesc || isNaN(numImporto) || numImporto <= 0) {
      console.warn("Dati spesa non validi:", { descrizione, importo });
      return null;
    }

    let dataStr = '';
    if (typeof data === 'string' && data.trim()) {
      dataStr = data.trim();
    } else if (data instanceof Date) {
      dataStr = this._formatDateLocal(data);
    } else {
      dataStr = this._formatDateLocal(new Date());
    }

    const nuovaSpesa = {
      id: this._generateId(),
      data: dataStr,
      descrizione: cleanDesc,
      importo: Number(numImporto.toFixed(2)),
      pagatoDa: pagatoDa === 'mamma' ? 'mamma' : 'papa',
      categoria: categoria || 'altro',
      ricevuta: ricevutaBase64 || null,
      approvato: true
    };

    this.spese.push(nuovaSpesa);
    this.spese.sort((a, b) => new Date(b.data) - new Date(a.data));
    return nuovaSpesa;
  }

  deleteSpesa(id) {
    this.spese = this.spese.filter(s => s.id !== id);
    return this.spese;
  }

  // --- CALCOLO SALDO E FILTRI ---
  calculateSaldo() {
    let totalePapa = 0;
    let totaleMamma = 0;

    this.spese.forEach(spesa => {
      const imp = Number(spesa.importo) || 0;
      if (spesa.pagatoDa === 'papa') totalePapa += imp;
      if (spesa.pagatoDa === 'mamma') totaleMamma += imp;
    });

    totalePapa = Number(totalePapa.toFixed(2));
    totaleMamma = Number(totaleMamma.toFixed(2));

    const totaleGenerale = Number((totalePapa + totaleMamma).toFixed(2));
    const quotaSpettante = Number((totaleGenerale / 2).toFixed(2));
    const differenza = Number((totalePapa - quotaSpettante).toFixed(2));

    if (differenza > 0) {
      return {
        debitore: 'mamma',
        creditore: 'papa',
        importo: differenza,
        totalePapa,
        totaleMamma,
        totaleGenerale
      };
    } else if (differenza < 0) {
      return {
        debitore: 'papa',
        creditore: 'mamma',
        importo: Math.abs(differenza),
        totalePapa,
        totaleMamma,
        totaleGenerale
      };
    }

    return {
      debitore: null,
      creditore: null,
      importo: 0,
      totalePapa,
      totaleMamma,
      totaleGenerale
    };
  }

  getSpeseFiltrate({ categoria = 'tutte', daData = null, aData = null } = {}) {
    return this.spese.filter(s => {
      const matchCat = categoria === 'tutte' || s.categoria === categoria;
      const matchDa = !daData || s.data >= daData;
      const matchA = !aData || s.data <= aData;
      return matchCat && matchDa && matchA;
    });
  }
}
