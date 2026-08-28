export class VacanzeManager {
  constructor() {
    this.vacanze = [];
  }

  setVacanze(data) {
    this.vacanze = data || [];
  }

  addVacanzeBlock(titolo, dataInizio, dataFine, assegnatoA) {
    const newBlock = {
      id: Date.now().toString(),
      titolo,
      dataInizio,
      dataFine,
      assegnatoA // 'papa' o 'mamma'
    };
    this.vacanze.push(newBlock);
  }

  deleteVacanzeBlock(id) {
    this.vacanze = this.vacanze.filter(v => v.id !== id);
  }
}
