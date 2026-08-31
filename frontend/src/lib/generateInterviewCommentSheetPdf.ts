import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import type { Candidate, Evaluation } from '../types';
import { formatDate, formatTime } from './dateTime';
import { interviewTitle } from './interviewTitle';

const BLACK = rgb(0.07, 0.09, 0.13);
const GREY = rgb(0.35, 0.4, 0.47);
const TEAL = rgb(0.06, 0.47, 0.43);
const PALE_TEAL = rgb(0.9, 0.96, 0.95);
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function clean(value: unknown): string {
  return String(value || '').trim();
}

function fitText(value: unknown, font: PDFFont, size: number, width: number): string {
  const text = clean(value);
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let shortened = text;
  while (shortened && font.widthOfTextAtSize(`${shortened}...`, size) > width) {
    shortened = shortened.slice(0, -1);
  }
  return shortened ? `${shortened}...` : '';
}

function text(page: PDFPage, value: unknown, x: number, y: number, font: PDFFont, size: number, color = BLACK, maxWidth?: number) {
  const content = maxWidth ? fitText(value, font, size, maxWidth) : clean(value);
  if (!content) return;
  page.drawText(content, { x, y, size, font, color });
}

function rule(page: PDFPage, x1: number, y: number, x2: number, thickness = 0.8, color = BLACK) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

function sectionTitle(page: PDFPage, label: string, x: number, y: number, font: PDFFont) {
  text(page, label, x, y, font, 9, TEAL);
}

function field(page: PDFPage, label: string, value: unknown, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  text(page, label.toUpperCase(), x, y, bold, 6.5, GREY, width);
  text(page, value, x, y - 15, regular, 9, BLACK, width);
  rule(page, x, y - 20, x + width, 0.75);
}

function checkbox(page: PDFPage, x: number, y: number) {
  page.drawRectangle({ x, y, width: 10, height: 10, borderColor: BLACK, borderWidth: 0.8 });
}

function ratingRow(page: PDFPage, label: string, max: number, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  const rowHeight = 29;
  page.drawRectangle({ x, y: y - rowHeight, width, height: rowHeight, borderColor: BLACK, borderWidth: 0.8 });
  page.drawLine({ start: { x: x + width * 0.44, y }, end: { x: x + width * 0.44, y: y - rowHeight }, thickness: 0.8, color: BLACK });
  page.drawLine({ start: { x: x + width * 0.88, y }, end: { x: x + width * 0.88, y: y - rowHeight }, thickness: 0.8, color: BLACK });
  text(page, label, x + 10, y - 18, bold, 8, BLACK);
  const start = x + width * 0.44 + 12;
  for (let index = 0; index < max; index += 1) {
    page.drawRectangle({ x: start + index * 25, y: y - 20, width: 10, height: 10, borderColor: BLACK, borderWidth: 0.8 });
  }
  text(page, 'Circle one', x + width - 54, y - 18, regular, 6.5, GREY);
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const response = await fetch('/nippon-toyota-logo.png');
    if (!response.ok) return null;
    return await pdf.embedPng(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function downloadInterviewCommentSheetPdf(candidate: Candidate, evaluation: Evaluation): Promise<void> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf);
  const left = 48;
  const right = A4_WIDTH - 48;
  const contentWidth = right - left;

  if (logo) {
    const logoScale = Math.min(108 / logo.width, 48 / logo.height);
    page.drawImage(logo, {
      x: right - logo.width * logoScale,
      y: A4_HEIGHT - 76,
      width: logo.width * logoScale,
      height: logo.height * logoScale,
    });
  }

  text(page, 'NIPPON TOYOTA', left, A4_HEIGHT - 50, bold, 10, TEAL);
  text(page, 'Interview Comment Sheet', left, A4_HEIGHT - 75, regular, 22, BLACK);
  text(page, 'Confidential interviewer record', left, A4_HEIGHT - 90, regular, 8, GREY);
  rule(page, left, A4_HEIGHT - 108, right, 1.6);

  const columnGap = 18;
  const columnWidth = (contentWidth - columnGap * 2) / 3;
  const col = (index: number) => left + index * (columnWidth + columnGap);
  sectionTitle(page, 'INTERVIEW DETAILS', left, A4_HEIGHT - 135, bold);
  field(page, 'Candidate name', candidate.full_name, col(0), A4_HEIGHT - 157, columnWidth, regular, bold);
  field(page, 'Candidate ID', candidate.candidate_id, col(1), A4_HEIGHT - 157, columnWidth, regular, bold);
  field(page, 'Position', candidate.position_applied_for || candidate.department, col(2), A4_HEIGHT - 157, columnWidth, regular, bold);
  field(page, 'Interview stage', interviewTitle(evaluation), col(0), A4_HEIGHT - 194, columnWidth, regular, bold);
  field(page, 'Interview date', formatDate(evaluation.scheduled_time), col(1), A4_HEIGHT - 194, columnWidth, regular, bold);
  field(page, 'Interview time', formatTime(evaluation.scheduled_time), col(2), A4_HEIGHT - 194, columnWidth, regular, bold);
  field(page, 'Interviewer', evaluation.scores?.interviewer_name, col(0), A4_HEIGHT - 231, columnWidth, regular, bold);
  field(page, 'Interview mode', evaluation.interview_mode === 'PHYSICAL' ? 'In person' : evaluation.interview_mode === 'ONLINE' ? 'Online' : '', col(1), A4_HEIGHT - 231, columnWidth, regular, bold);
  field(page, 'Location / meeting link', evaluation.location_or_link, col(2), A4_HEIGHT - 231, columnWidth, regular, bold);

  sectionTitle(page, 'ASSESSMENT', left, A4_HEIGHT - 286, bold);
  const tableTop = A4_HEIGHT - 306;
  const headerHeight = 23;
  page.drawRectangle({ x: left, y: tableTop - headerHeight, width: contentWidth, height: headerHeight, color: PALE_TEAL, borderColor: BLACK, borderWidth: 0.8 });
  page.drawLine({ start: { x: left + contentWidth * 0.44, y: tableTop }, end: { x: left + contentWidth * 0.44, y: tableTop - headerHeight }, thickness: 0.8, color: BLACK });
  page.drawLine({ start: { x: left + contentWidth * 0.88, y: tableTop }, end: { x: left + contentWidth * 0.88, y: tableTop - headerHeight }, thickness: 0.8, color: BLACK });
  text(page, 'CRITERIA', left + 10, tableTop - 15, bold, 7, TEAL);
  text(page, 'RATING', left + contentWidth * 0.44 + 10, tableTop - 15, bold, 7, TEAL);
  const isTechnical = evaluation.type === 'TECHNICAL_TEST';
  const criteria = isTechnical
    ? [['Technical knowledge', 4], ['Problem solving', 3], ['Role suitability', 3]] as const
    : [['Attitude', 4], ['Communication', 3], ['Knowledge', 3]] as const;
  criteria.forEach(([label, max], index) => {
    ratingRow(page, label, max, left, tableTop - headerHeight - index * 29, contentWidth, regular, bold);
  });
  text(page, 'Rating guide: 1 = needs improvement, highest number = excellent', left, tableTop - headerHeight - criteria.length * 29 - 15, regular, 7, GREY);

  sectionTitle(page, 'REMARKS', left, 410, bold);
  field(page, 'Remarks', '', left, 389, contentWidth, regular, bold);
  page.drawRectangle({ x: left, y: 145, width: contentWidth, height: 210, borderColor: BLACK, borderWidth: 0.8 });

  sectionTitle(page, 'RECOMMENDATION', left, 92, bold);
  const options = [['Selected', left], ['Hold', left + 78], ['Rejected', left + 138]] as const;
  options.forEach(([label, x]) => {
    checkbox(page, x, 65);
    text(page, label, x + 17, 67, regular, 9, BLACK);
  });
  field(page, 'Interviewer signature', '', right - 180, 92, 100, regular, bold);
  field(page, 'Date', '', right - 65, 92, 65, regular, bold);
  text(page, 'Complete all applicable sections and return this sheet to HR after the interview.', A4_WIDTH / 2 - 130, 34, regular, 7, GREY);

  const bytes = await pdf.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Interview_Comment_Sheet_${candidate.candidate_id || 'Candidate'}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
