import { NUTRIENTS, fmt, type ScanItem, type Totals } from './nutrients';

export function summaryText(title: string, items: ScanItem[], t: Totals) {
  const g = (k: keyof Totals) => fmt(t[k].v, k === 'calories' ? 'kcal' : 'g');
  return `${title} (estimate)\n${g('calories')} kcal · ${g('protein')} g protein · ${g('carbs')} g carbs · ${g('fat')} g fat · ${g('fiber')} g fiber\n` +
    items.map((i) => `• ${i.name} ~${i.grams} g`).join('\n') + '\nAnalysed with NutriScan AI. Values are estimates.';
}

export async function shareSummary(text: string, title: string): Promise<'shared' | 'copied'> {
  if (navigator.share) { try { await navigator.share({ title, text }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; } }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

export async function downloadPdf(title: string, date: string, items: ScanItem[], t: Totals) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  doc.setFontSize(20); doc.setTextColor(22, 163, 106); doc.text('NutriScan AI', 14, 18);
  doc.setFontSize(13); doc.setTextColor(20, 37, 31); doc.text(title, 14, 28);
  doc.setFontSize(9); doc.setTextColor(100); doc.text(date, 14, 34);
  autoTable(doc, {
    startY: 40, head: [['Food', 'Weight', 'Weight source', 'Database match']],
    body: items.map((i) => [i.name, `${i.grams} g`, i.gramsSource === 'user' ? 'User-adjusted' : 'AI estimate', i.dbSource ? `${i.dbSource}: ${i.dbDescription}` : 'No match']),
    styles: { fontSize: 8 }, headStyles: { fillColor: [22, 163, 106] },
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8, head: [['Nutrient', 'Amount', '% DV']],
    body: NUTRIENTS.map((d) => {
      const x = t[d.key];
      const pct = x.v != null && d.dv ? `${Math.round((x.v / d.dv) * 100)}%` : '—';
      return [d.label, x.v == null ? 'Not available' : `${fmt(x.v, d.unit)} ${d.unit}${x.partial ? ' (partial)' : ''}`, pct];
    }),
    styles: { fontSize: 8 }, headStyles: { fillColor: [20, 37, 31] },
  });
  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(doc.splitTextToSize('Portion weights are estimated from a photo and may differ from the real meal. Nutrient values come from the named database for the matched food; "Not available" means the database has no value. % DV uses FDA reference values. For education only, not medical advice.', 180), 14, y);
  doc.save(`nutriscan-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
}
