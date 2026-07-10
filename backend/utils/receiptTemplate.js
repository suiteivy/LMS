const { formatCurrencyAmount } = require('./currency.js');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderRows = (rows = []) =>
  rows
    .map((row) => {
      const label = escapeHtml(row?.label || '');
      const value = escapeHtml(row?.value || 'N/A');
      return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
    })
    .join('');

const renderNotes = (notes = []) =>
  notes
    .filter((note) => note && note.label)
    .map((note) => {
      const label = escapeHtml(note.label);
      const value = escapeHtml(note.value || 'N/A');
      return `<div class="note"><strong>${label}:</strong> ${value}</div>`;
    })
    .join('');

const buildReceiptHtml = ({
  receiptTitle,
  rows = [],
  notes = [],
  currency,
  generatedAt,
}) => {
  const mappedRows = rows.map((row) => {
    if (row?.isAmount) {
      return {
        ...row,
        value: formatCurrencyAmount(row?.value || 0, currency),
      };
    }
    return row;
  });

  const generatedAtIso = generatedAt || new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(receiptTitle || 'Receipt')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
    .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 20px; max-width: 760px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
    .label { color: #6b7280; font-weight: 600; }
    .value { font-weight: 700; text-align: right; }
    .note { margin-top: 10px; color: #4b5563; }
    .meta { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">${escapeHtml(receiptTitle || 'Receipt')}</div>
    ${renderRows(mappedRows)}
    ${renderNotes(notes)}
    <div class="meta">Generated at: ${escapeHtml(generatedAtIso)}</div>
  </div>
</body>
</html>`;
};

module.exports = {
  buildReceiptHtml,
};
