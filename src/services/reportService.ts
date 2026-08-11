import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
   * Export dataset to formatted PDF document
   */
  exportToPDF(
    title: string,
    columns: ReportColumn[],
    data: Record<string, any>[],
    filename = 'relatorio.pdf'
  ) {
    const doc = new jsPDF();
    const companyHeader = 'SISTEMAS ARKA - GESTÃO EMPRESARIAL';

    // Title styling
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(companyHeader, 14, 15);

    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(`Relatório: ${title}`, 14, 23);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 29);

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
