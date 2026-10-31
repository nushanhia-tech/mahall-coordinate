import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveFile } from './download';

const GREEN = [4, 120, 87];

// Builds a branded A4 PDF. `blocks` is a list of:
//   { heading }  { text }  { kv: [[label, value], ...] }  { table: { head: [...], body: [[...]], foot?: [[...]] } }
//   { image: dataUrl, w, h }
export function buildPdf({ org, title, subtitle, blocks = [] }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(org?.name || 'Mahall Coordinating System', M, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(org?.address || '', M, 46);
  doc.text(`${org?.phone || ''}   ${org?.email || ''}`, M, 58);

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, M, 100);
  let y = 100;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    y += 16;
    doc.text(subtitle, M, y);
  }
  y += 20;

  const ensure = (h) => { if (y + h > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 50; } };

  for (const b of blocks) {
    if (b.heading) {
      ensure(30);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GREEN);
      doc.text(b.heading, M, y + 6); y += 18;
    } else if (b.text) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(b.text, W - 2 * M);
      ensure(lines.length * 13);
      doc.text(lines, M, y + 6); y += lines.length * 13 + 6;
    } else if (b.kv) {
      autoTable(doc, { startY: y, body: b.kv, theme: 'plain', margin: { left: M, right: M }, styles: { fontSize: 10, cellPadding: 3 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150, textColor: [80, 80, 80] } } });
      y = doc.lastAutoTable.finalY + 10;
    } else if (b.table) {
      autoTable(doc, { startY: y, head: [b.table.head], body: b.table.body, foot: b.table.foot, margin: { left: M, right: M }, styles: { fontSize: 9 }, headStyles: { fillColor: GREEN }, footStyles: { fillColor: [230, 245, 238], textColor: 20, fontStyle: 'bold' }, showFoot: 'lastPage' });
      y = doc.lastAutoTable.finalY + 14;
    } else if (b.image) {
      const w = b.w || 160, h = b.h || 120;
      ensure(h + 10);
      try { doc.addImage(b.image, M, y, w, h); } catch { /* skip unsupported images */ }
      y += h + 10;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140, 140, 140);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}  ·  Mahall Coordinating System`, M, h - 20);
    doc.text(`Page ${i} of ${pages}`, W - M - 50, h - 20);
  }
  return doc;
}

export const downloadPdf = (opts, filename) => {
  const doc = buildPdf(opts);
  saveFile(filename || `${opts.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`, doc.output('blob'));
  return doc;
};
