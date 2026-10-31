import { strToU8, zipSync } from 'fflate';
import type { Lead } from './types';
import { provinceOfCity } from './locations';

/**
 * Penulis .xlsx minimal (Office Open XML) tanpa dependensi berat.
 *
 * Dipakai di server (route export) dan di browser (mode demo / fallback),
 * sehingga hasil unduhan selalu berupa workbook asli — bukan CSV yang bisa
 * salah delimiter di Excel regional Indonesia.
 */

type Cell = string | number | null;

const HEADER_STYLE = 1;
const BODY_STYLE = 2;
const WRAP_STYLE = 3;

const COLUMNS: { header: string; width: number; wrap?: boolean }[] = [
  { header: 'Nama Bisnis', width: 34 },
  { header: 'Kategori', width: 26 },
  { header: 'Provinsi', width: 20 },
  { header: 'Kota/Kabupaten', width: 20 },
  { header: 'Rating', width: 9 },
  { header: 'Total Ulasan', width: 12 },
  { header: 'Nomor WhatsApp', width: 18 },
  { header: 'Website', width: 30 },
  { header: 'Status Pipeline', width: 15 },
  { header: 'Tanggal Diperbarui', width: 21 },
  { header: 'Potensi Kerja Sama', width: 60, wrap: true },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(index: number): string {
  let value = index + 1;
  let letters = '';
  while (value > 0) {
    const mod = (value - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function inlineCell(ref: string, value: string, style: number): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(ref: string, value: number, style: number): string {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

/** Tanggal lokal WIB dengan format yang langsung terbaca di Excel Indonesia. */
export function formatLeadDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function leadToXlsxRow(lead: Lead): Cell[] {
  return [
    lead.name,
    [lead.sector, lead.subCategory].filter(Boolean).join(' › '),
    provinceOfCity(lead.city ?? '') ?? '',
    lead.city ?? '',
    lead.rating ?? '',
    lead.reviews,
    lead.whatsapp ?? lead.phoneRaw ?? '',
    lead.website ?? '',
    lead.status,
    formatLeadDate(lead.statusUpdatedAt ?? null),
    lead.pitch,
  ];
}

function sheetXml(rows: Cell[][]): string {
  const cols = COLUMNS.map(
    (column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
  ).join('');

  const lastRef = `${columnLetter(COLUMNS.length - 1)}${rows.length || 1}`;

  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const height = rowIndex === 0 ? ' ht="24" customHeight="1"' : '';
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnLetter(colIndex)}${rowNumber}`;
          const style = rowIndex === 0 ? HEADER_STYLE : COLUMNS[colIndex]?.wrap ? WRAP_STYLE : BODY_STYLE;
          if (value === null || value === '') return `<c r="${ref}" s="${style}"/>`;
          if (typeof value === 'number') return numberCell(ref, value, style);
          return inlineCell(ref, String(value), style);
        })
        .join('');
      return `<row r="${rowNumber}"${height}>${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:${lastRef}"/>
<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${sheetRows}</sheetData>
<autoFilter ref="A1:${lastRef}"/>
<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF12203F"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8DEE9"/></left><right style="thin"><color rgb="FFD8DEE9"/></right><top style="thin"><color rgb="FFD8DEE9"/></top><bottom style="thin"><color rgb="FFD8DEE9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildLeadsXlsx(leads: Lead[]): Uint8Array {
  const rows: Cell[][] = [COLUMNS.map((column) => column.header), ...leads.map(leadToXlsxRow)];

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Prospek" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(STYLES_XML),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml(rows)),
  };

  return zipSync(files, { level: 6 });
}

export function xlsxFileName(sector?: string | null, city?: string | null): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  const parts = ['prospek'];
  if (sector) parts.push(slug(sector));
  if (city) parts.push(slug(city));
  parts.push(new Date().toISOString().slice(0, 10));
  return `${parts.filter(Boolean).join('-')}.xlsx`;
}

/** Konversi byte → base64 tanpa Buffer (aman di browser maupun server). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}
