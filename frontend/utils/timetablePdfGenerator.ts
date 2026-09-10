import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { TimetableEntry } from '@/services/TimetableService';

type CancelledDateLike = {
  event_date: string;
  title?: string | null;
  description?: string | null;
};

export interface TimetablePdfOptions {
  title: string;
  subtitle?: string;
  institutionName?: string | null;
  institutionLogo?: string | null;
  entries: TimetableEntry[];
  includeWeekends?: boolean;
  cancelledDates?: CancelledDateLike[];
  referenceDate?: Date;
  fileName?: string;
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePdfFileName(stem: string | undefined): string {
  const source = (stem || 'timetable').replace(/\.pdf$/i, '');
  const normalized = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const fallback = normalized || 'timetable';
  return `${fallback}.pdf`;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeImageSource(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('data:image/')) {
    return trimmed;
  }

  return null;
}

function getWeekDateForDay(day: string, referenceDate: Date): string {
  const base = new Date(referenceDate);
  const jsDay = base.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  base.setDate(base.getDate() + diffToMonday);

  let offset = 0;
  if (day === 'Tuesday') offset = 1;
  else if (day === 'Wednesday') offset = 2;
  else if (day === 'Thursday') offset = 3;
  else if (day === 'Friday') offset = 4;
  else if (day === 'Saturday') offset = 5;
  else if (day === 'Sunday') offset = 6;
  base.setDate(base.getDate() + offset);
  return formatLocalDateKey(base);
}

export function generateTimetableHtml({
  title,
  subtitle,
  institutionName = 'Cloudora LMS',
  institutionLogo,
  entries = [],
  includeWeekends = false,
  cancelledDates = [],
  referenceDate = new Date(),
}: TimetablePdfOptions): string {
  const hasWeekendEntries = entries.some(
    (e) => e.day_of_week === 'Saturday' || e.day_of_week === 'Sunday'
  );
  const activeDays = includeWeekends || hasWeekendEntries ? ALL_DAYS : DEFAULT_DAYS;

  const timeSlotMap = new Map<string, { start: string; end: string }>();
  entries.forEach((e) => {
    if (e.start_time && e.end_time) {
      const key = `${e.start_time}-${e.end_time}`;
      if (!timeSlotMap.has(key)) {
        timeSlotMap.set(key, { start: e.start_time, end: e.end_time });
      }
    }
  });

  const sortedTimeSlots = Array.from(timeSlotMap.values()).sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  const gridMap = new Map<string, TimetableEntry[]>();
  entries.forEach((e) => {
    const key = `${e.day_of_week}_${e.start_time}-${e.end_time}`;
    const list = gridMap.get(key) || [];
    list.push(e);
    gridMap.set(key, list);
  });

  const cancellationsByDay = new Map<string, CancelledDateLike[]>();
  activeDays.forEach((day) => {
    const dayDate = getWeekDateForDay(day, referenceDate);
    const matches = cancelledDates.filter((cancelled) => cancelled.event_date === dayDate);
    if (matches.length > 0) {
      cancellationsByDay.set(day, matches);
    }
  });

  const dateGenerated = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const safeInstitutionLogo = sanitizeImageSource(institutionLogo);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      padding: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #ea580c;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .branding {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
    }
    .logo-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
    }
    .inst-info h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .inst-info p {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .meta {
      text-align: right;
    }
    .schedule-title {
      font-size: 16px;
      font-weight: 700;
      color: #ea580c;
    }
    .schedule-subtitle {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
      font-weight: 600;
    }
    .gen-date {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: top;
    }
    th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .cancelled-day {
      color: #dc2626;
      font-weight: 800;
      margin-left: 3px;
    }
    th.time-col {
      width: 12%;
      background: #f1f5f9;
    }
    td.time-cell {
      background: #f8fafc;
      text-align: center;
      font-weight: 700;
      color: #475569;
      font-size: 10px;
      display: table-cell;
      vertical-align: middle;
    }
    .slot-card {
      background: #fff7ed;
      border-left: 3px solid #ea580c;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .slot-card:last-child {
      margin-bottom: 0;
    }
    .subject-title {
      font-weight: 800;
      font-size: 12px;
      color: #9a3412;
      line-height: 1.2;
      word-break: break-word;
    }
    .sub-meta {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      word-break: break-word;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      background: #fed7aa;
      color: #7c2d12;
      border-radius: 3px;
      font-weight: 600;
      font-size: 9px;
    }
    .room-badge {
      background: #e2e8f0;
      color: #334155;
    }
    .empty-slot {
      color: #94a3b8;
      text-align: center;
      padding: 14px 0;
      font-size: 10px;
      font-style: italic;
    }
    .cancelled-slot {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      padding: 6px 8px;
      color: #991b1b;
      min-height: 48px;
    }
    .cancelled-slot .label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .cancelled-slot .reason {
      font-size: 10px;
      margin-top: 2px;
      line-height: 1.3;
      word-break: break-word;
    }
    .footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
      <div class="branding">
      ${
        safeInstitutionLogo
          ? `<img class="logo" src="${escapeHtml(safeInstitutionLogo)}" alt="Logo" />`
          : `<div class="logo-placeholder">${escapeHtml((institutionName || 'LMS').charAt(0).toUpperCase())}</div>`
      }
      <div class="inst-info">
        <h1>${escapeHtml(institutionName || 'Cloudora LMS')}</h1>
        <p>Official Academic Timetable and Scheduling</p>
      </div>
    </div>
    <div class="meta">
      <div class="schedule-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="schedule-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      <div class="gen-date">Generated on: ${dateGenerated}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="time-col">Period / Time</th>
        ${activeDays
          .map((d) => {
            const cancelledTag = cancellationsByDay.has(d)
              ? '<span class="cancelled-day">(Cancelled)</span>'
              : '';
            return `<th>${escapeHtml(d)} ${cancelledTag}</th>`;
          })
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${
        sortedTimeSlots.length === 0
          ? `<tr><td colspan="${activeDays.length + 1}" class="empty-slot" style="padding: 24px; font-size: 12px;">No scheduled timetable periods found.</td></tr>`
          : sortedTimeSlots
              .map((slot) => {
                const rowKey = `${slot.start} - ${slot.end}`;
                return `
        <tr>
          <td class="time-cell">${escapeHtml(rowKey)}</td>
          ${activeDays
            .map((day) => {
              const cellEntries = gridMap.get(`${day}_${slot.start}-${slot.end}`) || [];
              const dayCancellations = cancellationsByDay.get(day) || [];

              if (dayCancellations.length > 0) {
                const reasonText = dayCancellations
                  .map((cancelled) => cancelled.title || cancelled.description || 'Academic sessions suspended')
                  .join(' • ');
                return `<td><div class="cancelled-slot"><div class="label">Cancelled Day</div><div class="reason">${escapeHtml(reasonText)}</div></div></td>`;
              }

              if (cellEntries.length === 0) {
                return `<td><div class="empty-slot">Free / Break</div></td>`;
              }

              return `
            <td>
              ${cellEntries
                .map((entry) => {
                  const subjectName = entry.subjects?.title || 'Subject';
                  const teacherName =
                    entry.subjects?.teachers?.users?.full_name ||
                    (entry.subjects?.teachers?.users?.first_name
                      ? `${entry.subjects.teachers.users.first_name} ${entry.subjects.teachers.users.last_name || ''}`.trim()
                      : null);
                  const className = entry.classes?.display_name || entry.classes?.name;

                  return `
                <div class="slot-card">
                  <div class="subject-title">${escapeHtml(subjectName)}</div>
                  <div class="sub-meta">
                    ${className ? `<span class="badge">${escapeHtml(className)}</span>` : ''}
                    ${teacherName ? `<span>Teacher: ${escapeHtml(teacherName)}</span>` : ''}
                    ${entry.room_number ? `<span class="badge room-badge">Room: ${escapeHtml(entry.room_number)}</span>` : ''}
                  </div>
                </div>
                `;
                })
                .join('')}
            </td>
          `;
            })
            .join('')}
        </tr>
        `;
              })
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    <span>${escapeHtml(institutionName || 'Cloudora LMS')} • Academic Management System</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>
  `.trim();
}

export async function downloadTimetablePdf(options: TimetablePdfOptions): Promise<void> {
  const html = generateTimetableHtml(options);
  const fileName = normalizePdfFileName(options.fileName || `${options.title}-${formatLocalDateKey(new Date())}`);

  try {
    const useBase64 = Platform.OS === 'web';
    const printResult = await Print.printToFileAsync({
      html,
      base64: useBase64,
    });

    const uri = (printResult as any)?.uri as string | undefined;
    const base64 = (printResult as any)?.base64 as string | undefined;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes.set([binary.charCodeAt(i)], i);
        }

        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
        return;
      }

      if (uri) {
        const anchor = document.createElement('a');
        anchor.href = uri;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      }
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      if (!uri) {
        throw new Error('PDF URI unavailable for sharing');
      }

      let shareUri = uri;
      try {
        const sourceFile = new File(uri);
        const targetFile = new File(Paths.cache, fileName);
        if (targetFile.exists) {
          targetFile.delete();
        }
        await sourceFile.copy(targetFile);
        shareUri = targetFile.uri;
      } catch (renameErr) {
        console.warn('Unable to rename PDF before share:', renameErr);
      }

      await Sharing.shareAsync(shareUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download ${options.title || 'Timetable'} PDF`,
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (err) {
    console.error('Failed to generate timetable PDF:', err);
    throw err;
  }
}
