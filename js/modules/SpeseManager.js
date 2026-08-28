export class SpeseManager {
  constructor() {
    this.spese = []; 
  }

  setSpese(speseData = []) {
    this.spese = speseData || [];
  }

  addSpesa(descrizione, importo, pagatoDa, categoria = 'scuola', ricevutaBase64 = null, data = new Date()) {
    const nuovaSpesa = {
      id: 'spesa_' + Date.now().toString(),
      data: typeof data === 'string' ? data : data.toISOString().split('T')[0],
      descrizione,
      importo: parseFloat(importo),
      pagatoDa, // 'papa' o 'mamma'
      categoria, // 'scuola', 'salute', 'sport', 'altro'
      ricevuta: ricevutaBase64, // Stringa base64 dell'immagine
      approvato: true
    };
    this.spese.push(nuovaSpesa);
    return this.spese;
  }

  deleteSpesa(id) {
    this.spese = this.spese.filter(s => s.id !== id);
    return this.spese;
  }

  calculateSaldo() {
    let totalePapa = 0;
    let totaleMamma = 0;

    this.spese.forEach(spesa => {
      if (spesa.pagatoDa === 'papa') totalePapa += spesa.importo;
      if (spesa.pagatoDa === 'mamma') totaleMamma += spesa.importo;
    });

    const totaleGenerale = totalePapa + totaleMamma;
    const quotaSpettante = totaleGenerale / 2;
    const differenza = totalePapa - quotaSpettante; // Positivo = Papà deve ricevere, Negativo = Papà deve dare

    if (differenza > 0) {
      return { debitore: 'mamma', creditore: 'papa', importo: differenza, totalePapa, totaleMamma };
    } else if (differenza < 0) {
      return { debitore: 'papa', creditore: 'mamma', importo: Math.abs(differenza), totalePapa, totaleMamma };
    }
    return { debitore: null, creditore: null, importo: 0, totalePapa, totaleMamma };
  }
}
