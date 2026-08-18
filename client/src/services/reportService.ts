import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { ARKA_LOGO_URL, loadLogoBitmap } from '../lib/brand';

export interface ReportColumn {
  header: string;
  key: string;
}

export const reportService = {
  /**
   * Export any dataset to Excel CSV/XLSX
   */
  exportToExcel(data: Record<string, any>[], filename = 'relatorio.xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, filename);
  },

  /**
   * Export dataset to formatted PDF document.
   *
   * Assíncrono porque a logo precisa ser carregada e convertida para PNG antes
   * de entrar no documento. Se a logo não vier, o cabeçalho volta ao formato
   * anterior (texto começando na margem) em vez de falhar.
   */
  async exportToPDF(
    title: string,
    columns: ReportColumn[],
    data: Record<string, any>[],
    filename = 'relatorio.pdf',
    logoUrl?: string
  ) {
    const doc = new jsPDF();

    const marginX = 14;
    let textX = marginX;

    // Sem logo própria da empresa entra a marca da Arka, que é branca e precisa
    // ser repintada de preto para aparecer no papel.
    const isArkaLogo = !logoUrl?.trim();
    const logo = await loadLogoBitmap(logoUrl || ARKA_LOGO_URL, isArkaLogo);

    if (logo) {
      // Altura fixa e largura proporcional, para a marca não distorcer.
      const logoHeight = 13;
      const logoWidth = Math.min(46, (logo.width / logo.height) * logoHeight);

      doc.addImage(logo.dataUrl, 'PNG', marginX, 9, logoWidth, logoHeight);
      textX = marginX + logoWidth + 5;
    }

    // A logo já identifica a empresa: o cabeçalho de texto traz o relatório.
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`Relatório: ${title}`, textX, 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, textX, 23);

    const headers = columns.map((col) => col.header);
    const body = data.map((row) => columns.map((col) => String(row[col.key] ?? '')));

    autoTable(doc, {
      startY: 34,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Primary dark background
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    doc.save(filename);
  }
};
