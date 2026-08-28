export class SpeseManager {
  constructor() {
    this.spese = []; // Array di oggetti: { id, data, descrizione, importo, pagatoDa, approvato }
  }

  setSpese(speseData = []) {
    this.spese = speseData;
  }

  addSpesa(descrizione, importo, pagatoDa, data = new Date()) {
    const nuovaSpesa = {
      id: Date.now().toString(),
      data: data.toISOString().split('T')[0],
      descrizione,
      importo: parseFloat(importo),
      pagatoDa, // 'papa' o 'mamma'
      approvato: false
    };
    this.spese.push(nuovaSpesa);
    return this.spese;
  }

  calculateSaldo() {
    let totalePapa = 0;
    let totaleMamma = 0;

    this.spese.forEach(spesa => {
      if (spesa.pagatoDa === 'papa') totalePapa += spesa.importo;
      if (spesa.pagatoDa === 'mamma') totaleMamma += spesa.importo;
    });

    const differenza = (totalePapa - totaleMamma) / 2;
    if (differenza > 0) {
      return { debitore: 'mamma', creditore: 'papa', importo: differenza };
    } else if (differenza < 0) {
      return { debitore: 'papa', creditore: 'mamma', importo: Math.abs(differenza) };
    }
    return { debitore: null, creditore: null, importo: 0 };
  }
}
