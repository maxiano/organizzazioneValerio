export class SpeseManager {
  constructor() {
    this.spese = []; 
  }

  setSpese(speseData = []) {
    this.spese = speseData || [];
  }

  addSpesa(descrizione, importo, pagatoDa, categoria = 'scuola', ricevutaBase64 = null, data = new Date(), modalita = 'intero') {
    const nuovaSpesa = {
      id: 'spesa_' + Date.now().toString(),
      data: typeof data === 'string' ? data : data.toISOString().split('T')[0],
      descrizione,
      importo: parseFloat(importo),
      pagatoDa, // 'papa' o 'mamma'
      categoria, // 'scuola', 'salute', 'sport', 'altro'
      modalita, // 'intero' (anticipato 100%, genera conguaglio) o 'quota_propria' (saldata solo la propria metà 50%)
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
    let creditoPapa = 0;
    let creditoMamma = 0;

    this.spese.forEach(spesa => {
      const modalita = spesa.modalita || 'intero'; // Default per le spese già esistenti
      const importo = parseFloat(spesa.importo) || 0;

      if (spesa.pagatoDa === 'papa') {
        totalePapa += importo;
        if (modalita === 'intero') {
          creditoPapa += importo / 2; // Papà ha anticipato tutto, vanta un credito del 50%
        }
      } else if (spesa.pagatoDa === 'mamma') {
        totaleMamma += importo;
        if (modalita === 'intero') {
          creditoMamma += importo / 2; // Mamma ha anticipato tutto, vanta un credito del 50%
        }
      }
    });

    // Saldo netto tra i crediti reciproci
    const differenza = creditoPapa - creditoMamma;

    if (differenza > 0) {
      return { debitore: 'mamma', creditore: 'papa', importo: differenza, totalePapa, totaleMamma };
    } else if (differenza < 0) {
      return { debitore: 'papa', creditore: 'mamma', importo: Math.abs(differenza), totalePapa, totaleMamma };
    }
    return { debitore: null, creditore: null, importo: 0, totalePapa, totaleMamma };
  }
}
