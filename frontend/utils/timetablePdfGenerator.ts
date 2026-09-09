import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TimetableEntry } from '@/services/TimetableService';

export interface TimetablePdfOptions {
  title: string;
  subtitle?: string;
  institutionName?: string | null;
  institutionLogo?: string | null;
  entries: TimetableEntry[];
  includeWeekends?: boolean;
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function generateTimetableHtml({
  title,
  subtitle,
  institutionName = 'Cloudora LMS',
  institutionLogo,
  entries = [],
  includeWeekends = false,
}: TimetablePdfOptions): string {
  // Determine if there are weekend entries
  const hasWeekendEntries = entries.some(
    (e) => e.day_of_week === 'Saturday' || e.day_of_week === 'Sunday'
  );
  const activeDays = includeWeekends || hasWeekendEntries ? ALL_DAYS : DEFAULT_DAYS;

  // Extract all distinct time slots and sort them
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

  // Group entries by day and time slot
  // Key: `${day}_${start_time}-${end_time}`
  const gridMap = new Map<string, TimetableEntry[]>();
  entries.forEach((e) => {
    const key = `${e.day_of_week}_${e.start_time}-${e.end_time}`;
    const list = gridMap.get(key) || [];
    list.push(e);
    gridMap.set(key, list);
  });

  const dateGenerated = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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

    /* Timetable Grid Table */
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
    }
    .sub-meta {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
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
      color: #cbd5e1;
      text-align: center;
      padding: 14px 0;
      font-size: 10px;
      font-style: italic;
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
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="branding">
      ${
        institutionLogo
          ? `<img class="logo" src="${institutionLogo}" alt="Logo" />`
          : `<div class="logo-placeholder">${(institutionName || 'LMS').charAt(0).toUpperCase()}</div>`
      }
      <div class="inst-info">
        <h1>${institutionName || 'Cloudora LMS'}</h1>
        <p>Official Academic Timetable & Scheduling</p>
      </div>
    </div>
    <div class="meta">
      <div class="schedule-title">${title}</div>
      ${subtitle ? `<div class="schedule-subtitle">${subtitle}</div>` : ''}
      <div class="gen-date">Generated on: ${dateGenerated}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="time-col">Period / Time</th>
        ${activeDays.map((d) => `<th>${d}</th>`).join('')}
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
          <td class="time-cell">${rowKey}</td>
          ${activeDays
            .map((day) => {
              const cellEntries = gridMap.get(`${day}_${slot.start}-${slot.end}`) || [];
              if (cellEntries.length === 0) {
                return `<td><div class="empty-slot">-</div></td>`;
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
                  <div class="subject-title">${subjectName}</div>
                  <div class="sub-meta">
                    ${className ? `<span class="badge">${className}</span>` : ''}
                    ${teacherName ? `<span>👨‍🏫 ${teacherName}</span>` : ''}
                    ${entry.room_number ? `<span class="badge room-badge">🚪 ${entry.room_number}</span>` : ''}
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
    <span>${institutionName || 'Cloudora LMS'} • Academic Management System</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Downloads or opens print preview for a timetable PDF across Web and Native.
 */
export async function downloadTimetablePdf(options: TimetablePdfOptions): Promise<void> {
  const html = generateTimetableHtml(options);

  if (Platform.OS === 'web') {
    // Web: Open a clean print window with auto-print
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Give layout a tick to settle, then open print dialog
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
        return;
      }
    }
  }

  // Native iOS / Android or Web fallback
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
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
