import PDFDocument from 'pdfkit';
import { KAFAALA_LOGO_PNG_BASE64 } from './brandAssets';

// Official Kafaala Qaad Foundation registration & verification record, issued under
// its "Hooyo Kaab" (Vulnerable Mothers & Orphans Support) program. Deliberately does
// NOT embed uploaded document images — those stay behind the signed-URL document
// route; embedding them here would re-expose PII files inside a second, more freely
// downloadable artifact. Content is the registration + verification summary only,
// per spec §17. Brand palette matches src/brand.js / src/theme.js exactly — do not
// introduce colors outside that set.

const LOGO_BUFFER = Buffer.from(KAFAALA_LOGO_PNG_BASE64, 'base64');

const BRAND = {
  navy: '#112A63',
  blue: '#204BA0',
  green: '#0F773C',
  gold: '#FAA528',
  text: '#0D1F3C',
  muted: '#5A6E8A',
  border: '#D6E1F5',
  bg: '#F4F7FC',
};

export interface MotherPdfData {
  regNumber: string;
  registeredAt: Date;
  registeredByName: string;
  fullName: string; age?: number | null; dateOfBirth?: Date | null; gender: string;
  phone: string; altPhone?: string | null; maritalStatus?: string | null; nationalId?: string | null;
  region: string; district: string; village?: string | null; address?: string | null;
  childrenCount?: number | null; childrenLivingWithHer?: number | null; orphansUnderCare?: number | null;
  otherDependents?: number | null; childrenAgeRange?: string | null; familySituation?: string | null; incomeSource?: string | null;
  vulnerabilityReasons: string[]; otherReasonText?: string | null; additionalInfo?: string | null;
  status: string;
  verifiedByName?: string | null; verifiedAt?: Date | null; verificationNotes?: string | null;
}

function fmtDate(d?: Date | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

const PAGE_LEFT = 50;
const PAGE_RIGHT = 545;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;
const PAGE_BOTTOM = 770; // leave room for the footer band

export function generateMotherPdf(m: MotherPdfData): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  let y = 50;

  const ensureSpace = (h: number) => {
    if (y + h > PAGE_BOTTOM) { doc.addPage(); y = 50; }
  };

  // ── Header: logo + org/program hierarchy ──────────────────────────────
  try { doc.image(LOGO_BUFFER, PAGE_LEFT, y - 4, { width: 52, height: 52 }); } catch { /* never let a logo hiccup break PDF generation */ }
  const textX = PAGE_LEFT + 66;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(BRAND.navy).text('KAFAALA QAAD FOUNDATION', textX, y, { width: CONTENT_WIDTH - 66 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.green).text('Hooyo Kaab', textX, y + 19);
  doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted).text('Vulnerable Mothers & Orphans Support Program', textX, y + 33);
  y += 50;

  // Two-tone divider — a restrained nod to the logo's sunrise (hands + sun), not a
  // literal gradient render.
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_LEFT + CONTENT_WIDTH * 0.62, y).strokeColor(BRAND.green).lineWidth(1.75).stroke();
  doc.moveTo(PAGE_LEFT + CONTENT_WIDTH * 0.62, y).lineTo(PAGE_RIGHT, y).strokeColor(BRAND.gold).lineWidth(1.75).stroke();
  y += 16;

  // ── Title + registration-number badge ──────────────────────────────────
  const titleTop = y;
  const titleWidth = 330; // clear of the registration-number card on the right
  doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.green).text('HOOYO KAAB', PAGE_LEFT, y, { characterSpacing: 0.8 });
  y += 14;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND.navy);
  const titleLine1 = 'VULNERABLE MOTHERS & ORPHANS';
  doc.text(titleLine1, PAGE_LEFT, y, { width: titleWidth });
  y += doc.heightOfString(titleLine1, { width: titleWidth }) + 4;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(BRAND.navy);
  const titleLine2 = 'REGISTRATION & VERIFICATION RECORD';
  doc.text(titleLine2, PAGE_LEFT, y, { width: titleWidth });
  const titleBottom = y + doc.heightOfString(titleLine2, { width: titleWidth }) + 16;

  // Registration-number card, right-aligned against the title block.
  const badgeW = 165, badgeH = 50, badgeX = PAGE_RIGHT - badgeW, badgeY = titleTop - 2;
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fillColor(BRAND.bg).fill();
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).strokeColor(BRAND.border).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.muted).text('REGISTRATION NO.', badgeX, badgeY + 10, { width: badgeW, align: 'center', characterSpacing: 0.5 });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(BRAND.blue).text(m.regNumber, badgeX, badgeY + 24, { width: badgeW, align: 'center' });

  y = Math.max(titleBottom, badgeY + badgeH + 14);

  // ── Status badge ─────────────────────────────────────────────────────
  // Plain ASCII/Latin-1 only — pdfkit's standard 14 fonts use WinAnsiEncoding, which
  // has no glyph for U+2713 (✓); it silently falls back to a garbage character.
  const isCompleted = m.status === 'completed';
  const statusLabel = isCompleted ? 'VERIFIED — COMPLETED' : m.status.replace(/_/g, ' ').toUpperCase();
  const statusColor = isCompleted ? BRAND.green : BRAND.muted;
  doc.font('Helvetica-Bold').fontSize(9);
  const statusW = doc.widthOfString(statusLabel) + 28;
  doc.roundedRect(PAGE_LEFT, y, statusW, 22, 11).fillColor(statusColor).fill();
  doc.fillColor('#FFFFFF').text(statusLabel, PAGE_LEFT, y + 6.5, { width: statusW, align: 'center' });
  y += 32;

  // ── Section helpers ──────────────────────────────────────────────────
  const sectionHeader = (title: string) => {
    ensureSpace(26);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.green).text(title.toUpperCase(), PAGE_LEFT, y, { characterSpacing: 0.6 });
    y += 13;
    doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor(BRAND.border).lineWidth(0.75).stroke();
    y += 9;
  };
  const kv = (label: string, value: string, x: number, width: number) => {
    doc.font('Helvetica').fontSize(7.2).fillColor(BRAND.muted).text(label.toUpperCase(), x, y, { width, characterSpacing: 0.3 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BRAND.text).text(value || '—', x, y + 10, { width });
  };
  const row2 = (l1: string, v1: string, l2: string, v2: string) => {
    ensureSpace(29);
    kv(l1, v1, PAGE_LEFT, 225);
    kv(l2, v2, PAGE_LEFT + 250, 245);
    y += 27;
  };
  const rowFull = (label: string, value: string) => {
    doc.font('Helvetica').fontSize(10);
    const h = doc.heightOfString(value, { width: CONTENT_WIDTH });
    ensureSpace(h + 24);
    doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.muted).text(label.toUpperCase(), PAGE_LEFT, y, { width: CONTENT_WIDTH, characterSpacing: 0.3 });
    y += 11;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.text).text(value || '—', PAGE_LEFT, y, { width: CONTENT_WIDTH });
    y += h + 14;
  };

  // ── Registration Information ────────────────────────────────────────
  sectionHeader('Registration Information');
  row2('Registration Number', m.regNumber, 'Registration Date', fmtDate(m.registeredAt));
  row2('Registered By', m.registeredByName, 'Status', isCompleted ? 'COMPLETED' : m.status.replace(/_/g, ' ').toUpperCase());

  // ── Mother Information ──────────────────────────────────────────────
  sectionHeader('Mother Information');
  row2('Full Name', m.fullName, 'Age', m.age != null ? String(m.age) : '—');
  row2('Date of Birth', fmtDate(m.dateOfBirth), 'Gender', m.gender);
  row2('Phone', m.phone, 'Alternative Phone', m.altPhone || '—');
  row2('Marital Status', m.maritalStatus || '—', 'National ID', m.nationalId || '—');
  row2('Region', m.region, 'District', m.district);
  row2('Village / Area', m.village || '—', 'Address', m.address || '—');

  // ── Family Information ──────────────────────────────────────────────
  sectionHeader('Family Information');
  row2('Number of Children', m.childrenCount != null ? String(m.childrenCount) : '—', 'Children Living With Her', m.childrenLivingWithHer != null ? String(m.childrenLivingWithHer) : '—');
  row2('Orphans Under Her Care', m.orphansUnderCare != null ? String(m.orphansUnderCare) : '—', 'Other Dependents', m.otherDependents != null ? String(m.otherDependents) : '—');
  row2('Children\'s Age Range', m.childrenAgeRange || '—', 'Main Source of Household Income', m.incomeSource || '—');

  // ── Family Situation ────────────────────────────────────────────────
  if (m.familySituation || m.vulnerabilityReasons.length || m.otherReasonText) {
    sectionHeader('Family Situation');
    if (m.familySituation) rowFull('Family Situation', m.familySituation);

    if (m.vulnerabilityReasons.length) {
      ensureSpace(16 + m.vulnerabilityReasons.length * 14);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND.navy).text('VULNERABILITY REASONS', PAGE_LEFT, y, { characterSpacing: 0.4 });
      y += 14;
      doc.font('Helvetica').fontSize(10).fillColor(BRAND.text);
      m.vulnerabilityReasons.forEach(r => { doc.text(`•  ${r}`, PAGE_LEFT, y, { width: CONTENT_WIDTH }); y += 14; });
      y += 4;
    }
    if (m.otherReasonText) rowFull('Other Reason', m.otherReasonText);
    if (m.additionalInfo) rowFull('Additional Information', m.additionalInfo);
  }

  // ── Verification ─────────────────────────────────────────────────────
  if (isCompleted) {
    sectionHeader('Verification');
    row2('Verification Status', 'VERIFIED — COMPLETED', 'Verified Date', fmtDate(m.verifiedAt));
    if (m.verificationNotes) row2('Verified By', m.verifiedByName || '—', 'Verification Notes', m.verificationNotes);
    else { ensureSpace(29); kv('Verified By', m.verifiedByName || '—', PAGE_LEFT, 225); y += 27; }
  }

  // ── Authorized signature + official stamp placeholder ───────────────
  const blockH = 88;
  ensureSpace(blockH + 14);
  y += 8;
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor(BRAND.border).lineWidth(0.75).stroke();
  y += 16;

  const sigTop = y;
  const sigLine = (label: string, ly: number) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted).text(label, PAGE_LEFT, ly, { width: 100 });
    doc.moveTo(PAGE_LEFT + 105, ly + 9).lineTo(PAGE_LEFT + 300, ly + 9).strokeColor(BRAND.border).lineWidth(0.75).stroke();
  };
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND.navy).text('AUTHORIZED BY', PAGE_LEFT, sigTop, { characterSpacing: 0.4 });
  sigLine('Name:', sigTop + 18);
  sigLine('Position:', sigTop + 38);
  sigLine('Date:', sigTop + 58);

  // Official stamp placeholder — an empty circle, never a fabricated seal.
  const stampCx = PAGE_RIGHT - 55, stampCy = sigTop + 36, stampR = 38;
  doc.circle(stampCx, stampCy, stampR).dash(3, { space: 3 }).strokeColor(BRAND.muted).lineWidth(1).stroke();
  doc.undash();
  doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.muted).text('OFFICIAL STAMP', stampCx - stampR, stampCy - 5, { width: stampR * 2, align: 'center', characterSpacing: 0.4 });

  y = sigTop + blockH;

  // ── Footer + page numbers on every page ──────────────────────────────
  // The footer band (y ~795-813) sits below the document's own bottom margin
  // (841.89 - 50 = 791.89) by design, so pdfkit's own overflow check would treat
  // every .text() call here as running off the page and silently insert a new
  // page to fit it — compounding on every iteration of this loop. Zeroing the
  // bottom margin for the footer draws disables that check without affecting
  // where body content itself is allowed to flow (ensureSpace already stops well
  // short of this band).
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.moveTo(PAGE_LEFT, 795).lineTo(PAGE_RIGHT, 795).strokeColor(BRAND.border).lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BRAND.navy)
      .text('KAFAALA QAAD FOUNDATION  ·  HOOYO KAAB', PAGE_LEFT, 801, { lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted)
      .text('Generated by the Registration & Verification System', PAGE_LEFT, 813, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.muted)
      .text(`Page ${i + 1} of ${pages.count}`, PAGE_LEFT, 801, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });
  }

  return doc;
}
