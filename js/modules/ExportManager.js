export class ExportManager {
  /**
   * Esporta i turni del mese corrente in un file Excel (.xlsx)
   */
  static exportToExcel(currentDate, getParentForDateFn, notes) {
    if (typeof XLSX === 'undefined') {
      console.error("Libreria SheetJS (XLSX) non caricata.");
      alert("Impossibile esportare: libreria Excel non disponibile.");
      return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(currentDate);
    const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const data = [["Data", "Giorno", "Genitore con Valerio", "Cambio Turno", "Evento / Nota"]];
    const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0); 
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      
      let genitore = "Non definito";
      let cambio = "No";
      let notaText = "";

      const status = getParentForDateFn(date);
      if (status && status.parent) {
        genitore = status.parent === 'papa' ? 'Papà' : status.parent === 'mamma' ? 'Mamma' : 'Non assegnato';
        if (status.isOverride) cambio = "Sì (Cambio)";
      }

      if (notes && notes[dateKey]) {
        const item = Array.isArray(notes[dateKey]) ? notes[dateKey][0] : notes[dateKey];
        if (item) {
          const cat = item.category ? item.category.toUpperCase() : 'NOTA';
          const txt = item.text || '';
          notaText = `[${cat}] ${txt}`;
        }
      }

      data.push([dateStr, daysOfWeek[date.getDay()], genitore, cambio, notaText]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthCapitalized} ${year}`);
    XLSX.writeFile(wb, `Turni_Valerio_${monthCapitalized}_${year}.xlsx`);
  }

  /**
   * Genera ed esporta un file .ics compatibile con Google Calendar, Apple Calendar e Outlook
   */
  static generateICalendar(currentDate, getParentForDateFn, notes) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(currentDate);
    const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const formatDate = (y, m, d) => 
      `${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;

    // DTSTAMP conforme a ISO UTC
    const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const escapeICal = (str) => 
      str ? str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n") : "";

    let icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gestione Turni Valerio//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0);
      const nextDate = new Date(year, month, day + 1, 12, 0, 0);

      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dtStart = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
      const dtEnd = formatDate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());

      const status = getParentForDateFn(date);
      let parentLabel = "Non assegnato";
      if (status && status.parent) {
        parentLabel = status.parent === 'papa' ? 'Papà' : status.parent === 'mamma' ? 'Mamma' : 'Non assegnato';
      }

      let summary = `Valerio con ${parentLabel}`;
      let description = `Turno ordinario: ${parentLabel}`;

      if (notes && notes[dateKey]) {
        const item = Array.isArray(notes[dateKey]) ? notes[dateKey][0] : notes[dateKey];
        if (item) {
          const cat = item.category ? item.category.toUpperCase() : 'NOTA';
          const txt = item.text || '';
          // Usare \n normale: ci penserà escapeICal a convertirlo in \n per iCal
          description += `\n[${cat}] ${txt}`;
          summary += ` - ${txt}`;
        }
      }

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:valerio-${dtStart}-${Math.random().toString(36).substring(2, 7)}@turni`);
      icsLines.push(`DTSTAMP:${nowStamp}`);
      icsLines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      icsLines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      icsLines.push(`SUMMARY:${escapeICal(summary)}`);
      icsLines.push(`DESCRIPTION:${escapeICal(description)}`);
      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("END:VEVENT");
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Calendario_Valerio_${monthCapitalized}_${year}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }
}
