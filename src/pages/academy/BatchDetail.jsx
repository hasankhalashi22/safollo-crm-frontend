import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, Save, X, Wand2, FileDown, FileSpreadsheet } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_LABEL = { scheduled: 'নির্ধারিত', done: 'সম্পন্ন', cancelled: 'বাতিল', rescheduled: 'পুনর্নির্ধারিত' };
const DAY_LABELS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const LOCATION_OPTIONS = ['রিমোট', 'ক্লাসরুম-১', 'ক্লাসরুম-২', 'অনলাইন', 'অন্যান্য'];

// Column colors [th-bg, td-bg]
const CC = [
  ['#bfdbfe','#eff6ff'], // ক্রম
  ['#fde68a','#fffbeb'], // তারিখ
  ['#fde68a','#fffbeb'], // বার
  ['#ddd6fe','#f5f3ff'], // সময়
  ['#a7f3d0','#ecfdf5'], // সাবজেক্ট
  ['#bbf7d0','#f0fdf4'], // শিরোনাম
  ['#d1fae5','#f0fdf4'], // বিস্তারিত
  ['#bae6fd','#f0f9ff'], // জুম
  ['#bfdbfe','#eff6ff'], // টিচার
  ['#fbcfe8','#fdf2f8'], // ধরণ
  ['#e9d5ff','#faf5ff'], // স্থান
  ['#e2e8f0','#f8fafc'], // স্ট্যাটাস
  ['#fff','#fff'],        // actions
];

const PDF_COLS = [
  { key: 'type_label',       label: 'ক্রম' },
  { key: 'scheduled_date',   label: 'তারিখ' },
  { key: 'day',              label: 'বার' },
  { key: 'scheduled_time',   label: 'সময়' },
  { key: 'subject_name',     label: 'সাবজেক্ট' },
  { key: 'topic',            label: 'শিরোনাম' },
  { key: 'notes',            label: 'বিস্তারিত' },
  { key: 'zoom_account_name',label: 'জুম একাউন্ট' },
  { key: 'teacher_name',     label: 'টিচার' },
  { key: 'class_mode_label', label: 'ধরণ' },
  { key: 'location',         label: 'স্থান' },
  { key: 'status_label',     label: 'স্ট্যাটাস' },
];

// ── Date Utilities (local time, avoids UTC offset bug) ─────────────────────────
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function advanceToClassDay(dateStr, selectedDays) {
  // Cast all selected days to numbers so string/number mismatch doesn't break includes()
  const days = selectedDays.map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
  return toDateStr(d);
}
// Like advanceToClassDay but starts from tomorrow (used to find NEXT class after today)
function nextClassDay(dateStr, selectedDays) {
  return advanceToClassDay(addDays(dateStr, 1), selectedDays);
}
function findPrevClassDays(beforeDateStr, selectedDays, count) {
  if (!count || count <= 0) return [];
  const days = selectedDays.map(Number);
  const result = [];
  const d = new Date(beforeDateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  while (result.length < count) {
    if (days.includes(d.getDay())) result.unshift(toDateStr(d));
    d.setDate(d.getDate() - 1);
  }
  return result;
}
function dayLabel(dateStr) {
  if (!dateStr) return '—';
  return DAY_LABELS[new Date(dateStr + 'T00:00:00').getDay()];
}
function localDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('bn-BD');
}

function routineStatus(row) {
  if (row.feedback_status === 'approved' || row.status === 'done')
    return { label: 'সম্পন্ন', cls: 'bg-green-100 text-green-700' };
  const d = (row.scheduled_date || '').split('T')[0];
  if (d === TODAY) return { label: 'আজ', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'হবে', cls: 'bg-gray-100 text-gray-500' };
}

function findBaseSubj(subjectName, subjects) {
  if (!subjectName) return null;
  return subjects.find(s => subjectName === s.subject_name || subjectName.startsWith(s.subject_name + '-'));
}

// ── Print PDF (Bengali-safe via browser print) ─────────────────────────────────
function printPDF({ rows, batchName, coordinator, selectedCols, teachers, zooms }) {
  const enrich = (r) => {
    const t = teachers.find(x => x.id === r.teacher_id);
    const z = zooms.find(x => x.id === r.zoom_account_id);
    const isExam = r.row_type === 'exam';
    const d = (r.scheduled_date || '').split('T')[0];
    return {
      ...r,
      type_label: isExam ? `এক্সাম-${r.exam_no || ''}` : (r.label || `ক্লাস-${r.class_no || ''}`),
      day: dayLabel(d),
      scheduled_date: localDate(d),
      teacher_name: t?.full_name || r.teacher_name || '',
      zoom_account_name: z?.account_name || r.zoom_account_name || '',
      class_mode_label: r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
      status_label: routineStatus(r).label,
    };
  };

  const cols = PDF_COLS.filter(c => selectedCols.includes(c.key));
  const enriched = rows.map(enrich);
  const tableBody = enriched.map((r, ri) =>
    `<tr class="${r.row_type === 'exam' ? 'exam' : ''} ${ri % 2 === 0 ? 'even' : ''}">
       ${cols.map(c => `<td>${r[c.key] ?? ''}</td>`).join('')}
     </tr>`
  ).join('');

  const logoSrc = `${window.location.origin}/logo.png`;
  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${batchName} — রুটিন</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Arial Unicode MS', sans-serif; font-size: 10px; padding: 16px; color: #1f2937; }
  .print-btn { display: inline-flex; align-items: center; gap: 6px; background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; margin-bottom: 16px; font-family: inherit; }
  .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
  .logo { height: 56px; object-fit: contain; }
  .org-name { font-size: 18px; font-weight: 700; color: #1e3a8a; }
  .batch-name { font-size: 12px; color: #374151; margin-top: 2px; }
  .date-line { font-size: 10px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1d4ed8; color: #fff; padding: 6px 7px; text-align: left; font-weight: 600; font-size: 10px; white-space: nowrap; }
  td { padding: 5px 7px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  tr.even td { background: #f8fafc; }
  tr.exam td { background: #f5f3ff; }
  .footer { margin-top: 28px; display: flex; justify-content: flex-end; }
  .coord-box { text-align: center; }
  .coord-name { font-size: 12px; font-weight: 700; padding-top: 4px; border-top: 1px solid #374151; margin-top: 36px; }
  .coord-title { font-size: 10px; color: #6b7280; }
  @media print { @page { size: A4 landscape; margin: 10mm; } .print-btn { display: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ প্রিন্ট / PDF সেভ করুন</button>
<div class="header">
  <img src="${logoSrc}" class="logo" onerror="this.style.display='none'">
  <div>
    <div class="org-name">Safollo Academy</div>
    <div class="batch-name">ক্লাস রুটিন — ${batchName}</div>
    <div class="date-line">তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
  </div>
</div>
<table>
  <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
  <tbody>${tableBody}</tbody>
</table>
${coordinator ? `
<div class="footer">
  <div class="coord-box">
    <div class="coord-name">${coordinator}</div>
    <div class="coord-title">Academic Coordinator</div>
  </div>
</div>` : ''}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1400,height=900');
  if (!win) { toast.error('পপআপ blocked। Browser এ allow করুন।'); return; }
  win.document.write(html);
  win.document.close();
}

// ── PDF Modal ──────────────────────────────────────────────────────────────────
function PdfModal({ rows, batchName, teachers, zooms, onClose }) {
  const [selectedCols, setSelectedCols] = useState(PDF_COLS.map(c => c.key));
  const [coordinator, setCoordinator] = useState('');
  const toggle = (k) => setSelectedCols(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">PDF সেটিংস</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">Academic Coordinator এর নাম</label>
          <input className="input-field" placeholder="নাম লিখুন" value={coordinator} onChange={e => setCoordinator(e.target.value)} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">কলাম নির্বাচন</p>
          <div className="grid grid-cols-2 gap-2">
            {PDF_COLS.map(c => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedCols.includes(c.key)} onChange={() => toggle(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { printPDF({ rows, batchName, coordinator, selectedCols, teachers, zooms }); onClose(); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <FileDown size={15} /> PDF খুলুন → প্রিন্ট/সেভ
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm hover:bg-gray-50">বাতিল</button>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Modal ─────────────────────────────────────────────────────────────
function FeedbackModal({ outlineRow, teachers, onClose, onDone }) {
  const [teacherId, setTeacherId] = useState('');
  const [note, setNote] = useState('');
  const submit = async () => {
    if (!teacherId) return toast.error('শিক্ষক বেছে নিন');
    try { await academyApi.submitFeedback(outlineRow.id, teacherId, note); toast.success('ফিডব্যাক জমা হয়েছে'); onDone(); }
    catch { toast.error('সমস্যা হয়েছে'); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">ক্লাস ফিডব্যাক</h3><button onClick={onClose}><X size={20} /></button></div>
        <p className="text-sm text-gray-500">{outlineRow.topic || `ক্লাস ${outlineRow.class_no}`}</p>
        <select className="input-field" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
          <option value="">শিক্ষক বেছে নিন</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>)}
        </select>
        <textarea className="input-field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="নোট..." />
        <div className="flex gap-3">
          <button onClick={submit} className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 rounded-xl text-sm">জমা দিন</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm">বাতিল</button>
        </div>
      </div>
    </div>
  );
}

// ── Saved Outline Row ──────────────────────────────────────────────────────────
function OutlineRow({ row, idx, teachers, zooms, onRefresh, onFeedback, onInsertAfter }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: (row.scheduled_date || '').split('T')[0],
    scheduled_time: row.scheduled_time || '',
    topic: row.topic || '',
    subject_name: row.subject_name || '',
    teacher_id: row.teacher_id || '',
    zoom_account_id: row.zoom_account_id || '',
    class_mode: row.class_mode || 'online',
    location: row.location || '',
    notes: row.notes || '',
    status: row.status || 'scheduled',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const save = async () => {
    try { await academyApi.updateOutlineRow(row.id, form); toast.success('আপডেট'); setEditing(false); onRefresh(); }
    catch { toast.error('সমস্যা হয়েছে'); }
  };
  const del = async () => {
    if (!confirm('মুছে ফেলবেন?')) return;
    await academyApi.deleteOutlineRow(row.id); onRefresh();
  };

  const isExam = row.row_type === 'exam';
  const st = routineStatus(row);
  const typeLabel = isExam ? `এক্সাম-${row.class_no || ''}` : `ক্লাস-${row.class_no || ''}`;
  const d = (row.scheduled_date || '').split('T')[0];

  const ic = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-400';

  return (
    <>
      <tr className={`border-t border-gray-100 hover:brightness-95 group ${isExam ? '' : ''}`}>
        {/* ক্রম */}
        <td style={{background: isExam ? '#f5f3ff' : '#eff6ff'}} className="px-2 py-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExam ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>{typeLabel}</span>
        </td>
        {editing ? (
          <>
            <td style={{background: CC[1][1]}} className="px-2 py-1"><input type="date" className={ic} value={form.scheduled_date} onChange={e => f('scheduled_date', e.target.value)} /></td>
            <td style={{background: CC[2][1]}} className="px-2 py-1 text-xs text-center">{dayLabel(form.scheduled_date)}</td>
            <td style={{background: CC[3][1]}} className="px-2 py-1"><input type="time" className={ic} value={form.scheduled_time} onChange={e => f('scheduled_time', e.target.value)} /></td>
            <td style={{background: CC[4][1]}} className="px-2 py-1"><input className={ic} value={form.subject_name} onChange={e => f('subject_name', e.target.value)} placeholder="সাবজেক্ট" /></td>
            <td style={{background: CC[5][1]}} className="px-2 py-1"><input className={ic} value={form.topic} onChange={e => f('topic', e.target.value)} placeholder="শিরোনাম" /></td>
            <td style={{background: CC[6][1]}} className="px-2 py-1"><input className={ic} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="বিস্তারিত" /></td>
            <td style={{background: CC[7][1]}} className="px-2 py-1">
              <select className={ic} value={form.zoom_account_id} onChange={e => f('zoom_account_id', e.target.value)}>
                <option value="">—</option>{zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
              </select>
            </td>
            <td style={{background: CC[8][1]}} className="px-2 py-1">
              <select className={ic} value={form.teacher_id} onChange={e => f('teacher_id', e.target.value)}>
                <option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </td>
            <td style={{background: CC[9][1]}} className="px-2 py-1">
              <select className={ic} value={form.class_mode} onChange={e => f('class_mode', e.target.value)}>
                <option value="online">অনলাইন</option><option value="offline">অফলাইন</option>
              </select>
            </td>
            <td style={{background: CC[10][1]}} className="px-2 py-1">
              <input list={`loc-s-${row.id}`} className={ic} value={form.location} onChange={e => f('location', e.target.value)} placeholder="স্থান" />
              <datalist id={`loc-s-${row.id}`}>{LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}</datalist>
            </td>
            <td style={{background: CC[11][1]}} className="px-2 py-1">
              <select className={ic} value={form.status} onChange={e => f('status', e.target.value)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
            <td className="px-2 py-1">
              <div className="flex gap-1">
                <button onClick={save} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Save size={13} /></button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td style={{background: CC[1][1]}} className="px-2 py-2 text-xs whitespace-nowrap">{localDate(d)}</td>
            <td style={{background: CC[2][1]}} className="px-2 py-2 text-xs text-center text-gray-600">{dayLabel(d)}</td>
            <td style={{background: CC[3][1]}} className="px-2 py-2 text-xs text-gray-500">{row.scheduled_time || '—'}</td>
            <td style={{background: CC[4][1]}} className="px-2 py-2 text-xs font-semibold text-emerald-700 max-w-[100px] truncate">{row.subject_name || '—'}</td>
            <td style={{background: CC[5][1]}} className="px-2 py-2 text-xs max-w-[130px] truncate" title={row.topic}>{row.topic || '—'}</td>
            <td style={{background: CC[6][1]}} className="px-2 py-2 text-xs text-gray-400 max-w-[110px] truncate" title={row.notes}>{row.notes || '—'}</td>
            <td style={{background: CC[7][1]}} className="px-2 py-2 text-xs text-gray-500">{zooms.find(z => z.id === row.zoom_account_id)?.account_name || row.zoom_account_name || '—'}</td>
            <td style={{background: CC[8][1]}} className="px-2 py-2 text-xs text-gray-500">{teachers.find(t => t.id === row.teacher_id)?.full_name || row.teacher_name || '—'}</td>
            <td style={{background: CC[9][1]}} className="px-2 py-2 text-xs">{row.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন'}</td>
            <td style={{background: CC[10][1]}} className="px-2 py-2 text-xs text-gray-500">{row.location || '—'}</td>
            <td style={{background: CC[11][1]}} className="px-2 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
            <td className="px-2 py-2">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {row.status === 'scheduled' && row.row_type === 'class' && (
                  <button onClick={() => onFeedback(row)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="ফিডব্যাক"><CheckCircle size={13} /></button>
                )}
                <button onClick={() => setEditing(true)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={13} /></button>
                <button onClick={del} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
              </div>
            </td>
          </>
        )}
      </tr>
      {/* Insert-after strip */}
      <tr>
        <td colSpan={13} className="p-0">
          <button onClick={() => onInsertAfter(idx)}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-primary-400 hover:bg-primary-50 opacity-0 hover:opacity-100 transition-opacity py-0.5">
            <Plus size={10} /> এখানে সারি যোগ করুন
          </button>
        </td>
      </tr>
    </>
  );
}

// ── Generated Preview Row (cascading dropdowns) ────────────────────────────────
function GenRow({ row, idx, subjects, teachers, zooms, onChange, onDelete, onInsertAfter }) {
  const set = (k, v) => onChange(idx, k, v);
  const isExam = row.row_type === 'exam';
  const st = routineStatus(row);
  const d = row.scheduled_date || '';
  const typeLabel = isExam
    ? (row.label ? `${row.label}-${row.exam_no || ''}` : `এক্সাম-${row.exam_no || ''}`)
    : (row.label || `ক্লাস-${row.class_no || ''}`);

  // Find base subject from plan for cascading dropdowns
  const baseSubj = subjects.find(s => s.id === row._subj_id) || findBaseSubj(row.subject_name, subjects);
  const lectures = baseSubj?.lectures || [];

  const handleSubjSelect = (subjId) => {
    const subj = subjects.find(s => s.id === subjId);
    onChange(idx, '_subj_id', subjId);
    if (subj) {
      // Keep existing sequence suffix
      const seq = (row.subject_name || '').match(/-(\d+)$/)?.[1] || '1';
      onChange(idx, 'subject_name', `${subj.subject_name}-${seq}`);
    }
    onChange(idx, 'topic', '');
    onChange(idx, 'notes', '');
  };

  const handleTitleSelect = (title) => {
    set('topic', title);
    const lec = lectures.find(l => l.title === title);
    if (lec) set('notes', lec.details || '');
  };

  const ic = 'w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-primary-400 bg-white';

  return (
    <tr className={`border-t border-gray-100 ${isExam ? 'opacity-90' : ''}`}>
      {/* ক্রম */}
      <td style={{background: isExam ? '#ede9fe' : CC[0][1]}} className="px-2 py-1 text-center">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
          row.label?.includes('গাইডলাইন') ? 'bg-amber-200 text-amber-800' :
          isExam ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'
        }`}>{typeLabel}</span>
      </td>
      {/* তারিখ */}
      <td style={{background: CC[1][1]}} className="px-1 py-1">
        <input type="date" className={ic} value={d} onChange={e => set('scheduled_date', e.target.value)} />
      </td>
      {/* বার (read-only computed) */}
      <td style={{background: CC[2][1]}} className="px-2 py-1 text-xs text-center font-medium text-amber-700">{dayLabel(d)}</td>
      {/* সময় */}
      <td style={{background: CC[3][1]}} className="px-1 py-1">
        <input type="time" className={ic} value={row.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
      </td>
      {/* সাবজেক্ট — select base + text for seq */}
      <td style={{background: CC[4][1]}} className="px-1 py-1">
        <div className="flex gap-1">
          <select className={`${ic} flex-1`} value={row._subj_id || ''} onChange={e => handleSubjSelect(e.target.value)}>
            <option value="">— বেছে নিন</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
          <input type="text" className={`${ic} w-8 text-center`} value={(row.subject_name || '').match(/-(\d+)$/)?.[1] || ''}
            onChange={e => {
              const base = baseSubj ? baseSubj.subject_name : (row.subject_name || '').replace(/-\d+$/, '');
              set('subject_name', e.target.value ? `${base}-${e.target.value}` : base);
            }}
            placeholder="#" title="ক্রম" />
        </div>
      </td>
      {/* শিরোনাম — dropdown of lectures */}
      <td style={{background: CC[5][1]}} className="px-1 py-1">
        {lectures.length > 0 ? (
          <select className={ic} value={row.topic} onChange={e => handleTitleSelect(e.target.value)}>
            <option value="">— বেছে নিন</option>
            {lectures.map((l, i) => <option key={i} value={l.title}>{l.title}</option>)}
          </select>
        ) : (
          <input className={ic} value={row.topic} onChange={e => set('topic', e.target.value)} placeholder="শিরোনাম" />
        )}
      </td>
      {/* বিস্তারিত — auto-fill, dropdown of details */}
      <td style={{background: CC[6][1]}} className="px-1 py-1">
        {lectures.length > 0 && lectures.some(l => l.details) ? (
          <select className={ic} value={row.notes} onChange={e => set('notes', e.target.value)}>
            <option value="">— বেছে নিন</option>
            {lectures.filter(l => l.details).map((l, i) => <option key={i} value={l.details}>{l.details?.slice(0, 40)}</option>)}
          </select>
        ) : (
          <input className={ic} value={row.notes} onChange={e => set('notes', e.target.value)} placeholder="বিস্তারিত" />
        )}
      </td>
      {/* জুম */}
      <td style={{background: CC[7][1]}} className="px-1 py-1">
        <select className={ic} value={row.zoom_account_id} onChange={e => set('zoom_account_id', e.target.value)} disabled={isExam}>
          <option value="">—</option>
          {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
        </select>
      </td>
      {/* টিচার */}
      <td style={{background: CC[8][1]}} className="px-1 py-1">
        <select className={ic} value={row.teacher_id} onChange={e => set('teacher_id', e.target.value)} disabled={isExam}>
          <option value="">—</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </td>
      {/* ধরণ */}
      <td style={{background: CC[9][1]}} className="px-1 py-1">
        <select className={ic} value={row.class_mode} onChange={e => set('class_mode', e.target.value)}>
          <option value="online">অনলাইন</option><option value="offline">অফলাইন</option>
        </select>
      </td>
      {/* স্থান — datalist */}
      <td style={{background: CC[10][1]}} className="px-1 py-1">
        <input list={`loc-${idx}`} className={ic} value={row.location} onChange={e => set('location', e.target.value)} placeholder="স্থান" />
        <datalist id={`loc-${idx}`}>{LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}</datalist>
      </td>
      {/* স্ট্যাটাস */}
      <td style={{background: CC[11][1]}} className="px-2 py-1 text-center">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
      </td>
      {/* Actions */}
      <td className="px-1 py-1">
        <div className="flex gap-1">
          <button onClick={() => onInsertAfter(idx)} className="p-1 text-primary-400 hover:bg-primary-50 rounded" title="পরে সারি"><Plus size={11} /></button>
          <button onClick={() => onDelete(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={11} /></button>
        </div>
      </td>
    </tr>
  );
}

// ── Auto Routine Generator ─────────────────────────────────────────────────────
function AutoRoutineGenerator({ batch, teachers, zooms, onSaved }) {
  const [cfg, setCfg] = useState({
    startDate: (batch?.start_date || '').split('T')[0],
    days: [6, 1, 3],
    classTime: '21:00',
    examTime: '12:00',
    classMode: 'online',
    location: 'রিমোট',
    zoomAccountId: '',
    guidelineClasses: 3,
    revisionExamDay: 5, // Friday
    subjectivePerSubject: 2,
    modelTests: 2,
  });
  const [subjects, setSubjects] = useState([]);
  const [generatedRows, setGeneratedRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Sync batch start_date when batch prop loads (it arrives async)
  useEffect(() => {
    if (batch?.start_date) {
      const d = batch.start_date.split('T')[0];
      setCfg(p => p.startDate ? p : { ...p, startDate: d });
    }
  }, [batch?.start_date]);

  useEffect(() => {
    if (batch?.plan_id) {
      academyApi.getPlanSubjects(batch.plan_id)
        .then(r => setSubjects((r.data || []).sort((a, b) => a.serial_no - b.serial_no)))
        .catch(() => {});
    }
  }, [batch?.plan_id]);

  const setC = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const toggleDay = (d) => setC('days', cfg.days.includes(d) ? cfg.days.filter(x => x !== d) : [...cfg.days, d].sort((a, b) => a - b));

  const findTeacher = (subjName) => {
    for (const t of teachers) {
      if ((t.teaching_interests || []).some(item => item.subjects?.includes(subjName))) return t;
    }
    return null;
  };

  const generate = () => {
    if (!cfg.startDate) return toast.error('শুরুর তারিখ দিন');
    if (cfg.days.length === 0) return toast.error('ক্লাসের বার বেছে নিন');
    if (subjects.length === 0) return toast.error('প্ল্যানে সাবজেক্ট নেই');

    const rows = [];
    let classNo = 1, examNo = 1;
    const baseProps = { class_mode: cfg.classMode, location: cfg.location, status: 'scheduled', zoom_account_id: cfg.zoomAccountId };

    // 1. Guideline classes before startDate
    const guideDates = findPrevClassDays(cfg.startDate, cfg.days, Number(cfg.guidelineClasses));
    guideDates.forEach((d, i) => rows.push({
      _id: `g-${i}`, row_type: 'class', label: `গাইডলাইন-${i + 1}`,
      class_no: null, exam_no: null,
      scheduled_date: d, scheduled_time: cfg.classTime,
      subject_name: 'গাইডলাইন', _subj_id: null,
      topic: `গাইডলাইন ক্লাস ${i + 1}`, notes: '',
      teacher_id: '', ...baseProps,
    }));

    // 2. Build rotation: one lecture per subject per round
    const maxRounds = Math.max(...subjects.map(s => s.lectures?.length || 1), 1);
    const lectureSchedule = [];
    const subjCount = {};
    subjects.forEach(s => { subjCount[s.id] = 0; });

    for (let round = 0; round < maxRounds; round++) {
      for (const subj of subjects) {
        const lecs = subj.lectures || [];
        if (lecs.length === 0 && round === 0) {
          subjCount[subj.id]++;
          lectureSchedule.push({ subj, lecture: null, count: subjCount[subj.id] });
        } else if (round < lecs.length) {
          subjCount[subj.id]++;
          lectureSchedule.push({ subj, lecture: lecs[round], count: subjCount[subj.id] });
        }
      }
    }

    // 3. Generate classes + daily exams, insert revision exam on gap days
    let cur = advanceToClassDay(cfg.startDate, cfg.days);
    // Track topics covered since the last revision exam (for revision exam topic field)
    let topicsSinceLastRevision = [];

    for (const { subj, lecture, count } of lectureSchedule) {
      const teacher = findTeacher(subj.subject_name);
      const classDate = cur;
      const subjLabel = `${subj.subject_name}-${count}`;

      rows.push({
        _id: `cls-${classNo}`, row_type: 'class', label: null,
        class_no: classNo++, exam_no: null,
        scheduled_date: classDate, scheduled_time: cfg.classTime,
        subject_name: subjLabel, _subj_id: subj.id,
        topic: lecture?.title || '',
        notes: lecture?.details || '',
        teacher_id: teacher?.id || '',
        ...baseProps,
      });

      // Track this topic for revision exam coverage
      if (lecture?.title) {
        topicsSinceLastRevision.push(`${subjLabel}: ${lecture.title}`);
      }

      // Daily exam — carries the class's subject, title, and details
      const examDate = addDays(classDate, 1);
      rows.push({
        _id: `ex-${examNo}`, row_type: 'exam', label: null,
        class_no: null, exam_no: examNo++,
        scheduled_date: examDate, scheduled_time: cfg.examTime,
        subject_name: subjLabel, _subj_id: subj.id,
        topic: lecture?.title || `পরীক্ষা — ${subjLabel}`,
        notes: lecture?.details || '',
        teacher_id: '', zoom_account_id: '',
        class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
      });

      const nextCur = nextClassDay(examDate, cfg.days);

      // Revision exam in gap
      let gd = new Date(addDays(examDate, 1) + 'T00:00:00');
      const gEnd = new Date(nextCur + 'T00:00:00');
      while (gd < gEnd) {
        if (gd.getDay() === Number(cfg.revisionExamDay)) {
          const revTopic = topicsSinceLastRevision.length > 0
            ? `রিভিশন: ${topicsSinceLastRevision.join(' | ')}`
            : 'রিভিশন পরীক্ষা';
          rows.push({
            _id: `rev-${examNo}`, row_type: 'exam', label: 'রিভিশন',
            class_no: null, exam_no: examNo++,
            scheduled_date: toDateStr(gd), scheduled_time: cfg.examTime,
            subject_name: 'রিভিশন', _subj_id: null,
            topic: revTopic,
            notes: '',
            teacher_id: '', zoom_account_id: '',
            class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
          });
          topicsSinceLastRevision = []; // reset after each revision exam
          break;
        }
        gd.setDate(gd.getDate() + 1);
      }

      cur = nextCur;
    }

    // 4. Subjective exams at end (N per subject on revisionExamDay)
    let tailDate = cur;
    subjects.forEach(subj => {
      for (let q = 1; q <= Number(cfg.subjectivePerSubject); q++) {
        // Find next revisionExamDay
        const rd = new Date(tailDate + 'T00:00:00');
        while (rd.getDay() !== Number(cfg.revisionExamDay)) rd.setDate(rd.getDate() + 1);
        tailDate = toDateStr(rd);
        rows.push({
          _id: `subj-${subj.id}-${q}`, row_type: 'exam', label: 'সাবজেক্টিভ',
          class_no: null, exam_no: examNo++,
          scheduled_date: tailDate, scheduled_time: cfg.examTime,
          subject_name: subj.subject_name, _subj_id: subj.id,
          topic: `সাবজেক্টিভ পরীক্ষা ${q} — ${subj.subject_name}`,
          notes: '', teacher_id: '', zoom_account_id: '',
          class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
        });
        tailDate = addDays(tailDate, 1);
      }
    });

    // 5. Model tests (on class days at end, strictly after previous)
    let modelDate = nextClassDay(tailDate, cfg.days);
    for (let m = 1; m <= Number(cfg.modelTests); m++) {
      rows.push({
        _id: `model-${m}`, row_type: 'exam', label: `মডেল-${m}`,
        class_no: null, exam_no: examNo++,
        scheduled_date: modelDate, scheduled_time: cfg.examTime,
        subject_name: 'মডেল টেস্ট', _subj_id: null,
        topic: `মডেল টেস্ট ${m}`,
        notes: '', teacher_id: '', zoom_account_id: '',
        class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
      });
      modelDate = nextClassDay(modelDate, cfg.days);
    }

    setGeneratedRows(rows);
    toast.success(`${rows.length} টি সারি জেনারেট হয়েছে`);
  };

  const updateRow = (idx, k, v) => setGeneratedRows(prev => prev.map((r, i) => i === idx ? { ...r, [k]: v } : r));
  const deleteRow = (idx) => setGeneratedRows(prev => prev.filter((_, i) => i !== idx));
  const insertAfter = (idx) => {
    const blank = {
      _id: `ins-${Date.now()}`, row_type: 'class', label: null,
      class_no: null, exam_no: null,
      scheduled_date: '', scheduled_time: cfg.classTime,
      subject_name: '', _subj_id: null, topic: '', notes: '',
      teacher_id: '', zoom_account_id: cfg.zoomAccountId,
      class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
    };
    setGeneratedRows(prev => [...prev.slice(0, idx + 1), blank, ...prev.slice(idx + 1)]);
  };

  const saveRoutine = async () => {
    if (!generatedRows.length) return;
    setSaving(true);
    try {
      await academyApi.bulkAddOutlineRows(batch.id, generatedRows);
      toast.success(`${generatedRows.length} টি সারি সেভ হয়েছে`);
      setGeneratedRows([]); onSaved();
    } catch { toast.error('সেভ করতে সমস্যা হয়েছে'); }
    setSaving(false);
  };

  const downloadExcel = () => {
    const data = generatedRows.map(r => {
      const t = teachers.find(x => x.id === r.teacher_id);
      const z = zooms.find(x => x.id === r.zoom_account_id);
      const isExam = r.row_type === 'exam';
      const d = r.scheduled_date || '';
      return {
        'ক্রম': isExam ? `এক্সাম-${r.exam_no || ''}` : (r.label || `ক্লাস-${r.class_no || ''}`),
        'তারিখ': localDate(d), 'বার': dayLabel(d), 'সময়': r.scheduled_time,
        'সাবজেক্ট': r.subject_name, 'শিরোনাম': r.topic, 'বিস্তারিত': r.notes,
        'জুম': z?.account_name || '', 'টিচার': t?.full_name || '',
        'ধরণ': r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
        'স্থান': r.location, 'স্ট্যাটাস': routineStatus(r).label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'রুটিন');
    XLSX.writeFile(wb, `${batch.batch_name}_routine.xlsx`);
    toast.success('Excel ডাউনলোড হয়েছে');
  };

  const totalLectures = subjects.reduce((s, x) => s + (x.lectures?.length || 1), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-primary-100 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Wand2 size={16} className="text-primary-500" />
        <p className="text-sm font-semibold text-gray-700">অটো রুটিন কনফিগারেশন</p>
        {subjects.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {subjects.length} সাবজেক্ট • {totalLectures} লেকচার
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">শুরুর তারিখ (মূল ক্লাস)</label>
          <input type="date" className="input-field text-sm" value={cfg.startDate} onChange={e => setC('startDate', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">গাইডলাইন ক্লাস</label>
          <input type="number" className="input-field text-sm" min="0" max="20" value={cfg.guidelineClasses} onChange={e => setC('guidelineClasses', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ক্লাসের সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.classTime} onChange={e => setC('classTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">পরীক্ষার সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.examTime} onChange={e => setC('examTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">রিভিশন পরীক্ষার বার</label>
          <select className="input-field text-sm" value={cfg.revisionExamDay} onChange={e => setC('revisionExamDay', Number(e.target.value))}>
            {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">সাবজেক্টিভ (প্রতি সাবজেক্টে)</label>
          <input type="number" className="input-field text-sm" min="0" max="10" value={cfg.subjectivePerSubject} onChange={e => setC('subjectivePerSubject', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">মডেল টেস্ট সংখ্যা</label>
          <input type="number" className="input-field text-sm" min="0" max="20" value={cfg.modelTests} onChange={e => setC('modelTests', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Zoom একাউন্ট</label>
          <select className="input-field text-sm" value={cfg.zoomAccountId} onChange={e => setC('zoomAccountId', e.target.value)}>
            <option value="">— বেছে নিন</option>
            {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ক্লাসের ধরণ</label>
          <select className="input-field text-sm" value={cfg.classMode} onChange={e => setC('classMode', e.target.value)}>
            <option value="online">অনলাইন</option><option value="offline">অফলাইন</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ডিফল্ট স্থান</label>
          <input list="loc-cfg" className="input-field text-sm" value={cfg.location} onChange={e => setC('location', e.target.value)} placeholder="রিমোট" />
          <datalist id="loc-cfg">{LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}</datalist>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ক্লাসের বার</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${cfg.days.includes(i) ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap pt-1">
        <button onClick={generate}
          className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2 rounded-xl text-sm flex items-center gap-2">
          <Wand2 size={14} /> রুটিন জেনারেট করুন
        </button>
        {generatedRows.length > 0 && (
          <>
            <button onClick={saveRoutine} disabled={saving}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm flex items-center gap-2">
              <Save size={14} /> {saving ? 'সেভ হচ্ছে...' : `সেভ করুন (${generatedRows.length} সারি)`}
            </button>
            <button onClick={() => setShowPdf(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={downloadExcel}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button onClick={() => setGeneratedRows([])}
              className="bg-white border-2 border-gray-200 text-gray-600 font-medium px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
              বাতিল
            </button>
          </>
        )}
      </div>

      {/* Preview Table */}
      {generatedRows.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-amber-700 font-medium">
              প্রিভিউ — যেকোনো ঘর সম্পাদনা করুন | <span className="text-primary-600">+ চাপলে নতুন সারি</span>
            </span>
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">{generatedRows.length} সারি</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{minWidth: 1180}}>
              <colgroup>
                <col style={{width:88}}/><col style={{width:104}}/><col style={{width:38}}/>
                <col style={{width:88}}/><col style={{width:140}}/><col style={{width:130}}/>
                <col style={{width:120}}/><col style={{width:106}}/><col style={{width:100}}/>
                <col style={{width:76}}/><col style={{width:90}}/><col style={{width:68}}/><col style={{width:46}}/>
              </colgroup>
              <thead>
                <tr>
                  {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট নাম','শিরোনাম','বিস্তারিত','জুম একাউন্ট','টিচার নাম','ক্লাসের ধরণ','স্থান','ক্লাস স্ট্যাটাস',''].map((h, i) => (
                    <th key={i} style={{background: CC[i]?.[0] || '#f1f5f9', color: '#374151', fontSize: 10, padding: '8px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generatedRows.map((row, idx) => (
                  <GenRow key={row._id} row={row} idx={idx}
                    subjects={subjects} teachers={teachers} zooms={zooms}
                    onChange={updateRow} onDelete={deleteRow} onInsertAfter={insertAfter} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPdf && (
        <PdfModal rows={generatedRows} batchName={batch.batch_name} teachers={teachers} zooms={zooms} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [outline, setOutline] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [zooms, setZooms] = useState([]);
  const [feedbackRow, setFeedbackRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [insertAfterRowNo, setInsertAfterRowNo] = useState(null);
  const [addForm, setAddForm] = useState({
    row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', subject_name: '',
    teacher_id: '', zoom_account_id: '', class_mode: 'online', location: '', notes: '',
  });

  const loadOutline = () => academyApi.getBatchOutline(id).then(r => setOutline(r.data || []));

  useEffect(() => {
    academyApi.getBatches().then(r => setBatch((r.data || []).find(x => x.id === id) || null));
    academyApi.getTeachers().then(r => setTeachers(r.data || []));
    academyApi.getZoomAccounts().then(r => setZooms(r.data || []));
    loadOutline();
  }, [id]);

  const af = (k, v) => setAddForm(p => ({ ...p, [k]: v }));

  const addRow = async () => {
    try {
      await academyApi.addOutlineRow(id, { ...addForm, after_row_no: insertAfterRowNo });
      toast.success('সারি যোগ হয়েছে');
      setShowAddForm(false); setInsertAfterRowNo(null);
      setAddForm({ row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', subject_name: '', teacher_id: '', zoom_account_id: '', class_mode: 'online', location: '', notes: '' });
      loadOutline();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const handleInsertAfter = (idx) => {
    setInsertAfterRowNo(outline[idx]?.row_no ?? null);
    setShowAddForm(true); setShowGenerator(false);
  };

  const downloadSavedExcel = () => {
    const data = outline.map(r => {
      const t = teachers.find(x => x.id === r.teacher_id);
      const z = zooms.find(x => x.id === r.zoom_account_id);
      const isExam = r.row_type === 'exam';
      const d = (r.scheduled_date || '').split('T')[0];
      return {
        '#': r.row_no,
        'ক্রম': isExam ? `এক্সাম-${r.class_no || ''}` : `ক্লাস-${r.class_no || ''}`,
        'তারিখ': localDate(d), 'বার': dayLabel(d), 'সময়': r.scheduled_time,
        'সাবজেক্ট': r.subject_name, 'শিরোনাম': r.topic, 'বিস্তারিত': r.notes,
        'জুম': z?.account_name || r.zoom_account_name || '',
        'টিচার': t?.full_name || r.teacher_name || '',
        'ধরণ': r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
        'স্থান': r.location, 'স্ট্যাটাস': routineStatus(r).label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'রুটিন');
    XLSX.writeFile(wb, `${batch?.batch_name}_routine.xlsx`);
    toast.success('Excel ডাউনলোড হয়েছে');
  };

  const classRows = outline.filter(r => r.row_type === 'class');
  const examRows = outline.filter(r => r.row_type === 'exam');
  const doneRows = outline.filter(r => r.status === 'done' || r.feedback_status === 'approved');

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/academy/batches')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{batch?.batch_name || 'ব্যাচ রুটিন'}</h1>
          <p className="text-sm text-gray-400">{batch?.course_name}</p>
        </div>
        <div className="ml-auto flex gap-4 text-sm text-gray-500">
          <span><b className="text-gray-700">{classRows.length}</b> ক্লাস</span>
          <span><b className="text-gray-700">{examRows.length}</b> পরীক্ষা</span>
          <span><b className="text-green-600">{doneRows.length}</b> সম্পন্ন</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setShowGenerator(s => !s); setShowAddForm(false); }}
          className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-colors ${showGenerator ? 'bg-primary-700 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white'}`}>
          <Wand2 size={14} /> অটো রুটিন তৈরি
        </button>
        <button onClick={() => { setShowAddForm(s => !s); setShowGenerator(false); setInsertAfterRowNo(null); }}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
          <Plus size={14} /> ম্যানুয়াল সারি
        </button>
        {outline.length > 0 && (
          <>
            <button onClick={() => setShowPdf(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border-2 border-red-200 bg-white hover:bg-red-50 text-red-600">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={downloadSavedExcel}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border-2 border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600">
              <FileSpreadsheet size={14} /> Excel
            </button>
          </>
        )}
      </div>

      {showGenerator && batch && (
        <AutoRoutineGenerator batch={batch} teachers={teachers} zooms={zooms}
          onSaved={() => { loadOutline(); setShowGenerator(false); }} />
      )}

      {showAddForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 space-y-4">
          <p className="text-sm font-semibold text-gray-700">
            {insertAfterRowNo !== null ? `সারি ${insertAfterRowNo} এর পরে যোগ করুন` : 'ম্যানুয়াল সারি'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">ধরন</label>
              <select className="input-field text-sm" value={addForm.row_type} onChange={e => af('row_type', e.target.value)}>
                <option value="class">ক্লাস</option><option value="exam">পরীক্ষা</option>
              </select>
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">সাবজেক্ট</label>
              <input className="input-field text-sm" value={addForm.subject_name} onChange={e => af('subject_name', e.target.value)} placeholder="বাংলা-১" />
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">শিরোনাম</label>
              <input className="input-field text-sm" value={addForm.topic} onChange={e => af('topic', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">তারিখ</label>
              <input type="date" className="input-field text-sm" value={addForm.scheduled_date} onChange={e => af('scheduled_date', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">সময়</label>
              <input type="time" className="input-field text-sm" value={addForm.scheduled_time} onChange={e => af('scheduled_time', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">শিক্ষক</label>
              <select className="input-field text-sm" value={addForm.teacher_id} onChange={e => af('teacher_id', e.target.value)}>
                <option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">Zoom</label>
              <select className="input-field text-sm" value={addForm.zoom_account_id} onChange={e => af('zoom_account_id', e.target.value)}>
                <option value="">—</option>{zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">স্থান</label>
              <input list="loc-add" className="input-field text-sm" value={addForm.location} onChange={e => af('location', e.target.value)} placeholder="স্থান" />
              <datalist id="loc-add">{LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}</datalist>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addRow} className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-8 py-2 rounded-xl text-sm">যোগ করুন</button>
            <button onClick={() => { setShowAddForm(false); setInsertAfterRowNo(null); }} className="bg-white border-2 border-gray-200 text-gray-600 font-medium px-6 py-2 rounded-xl text-sm hover:bg-gray-50">বাতিল</button>
          </div>
        </div>
      )}

      {/* Saved Outline Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {outline.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="mb-1">কোনো রুটিন নেই</p>
            <p className="text-sm">"অটো রুটিন তৈরি" বাটন চাপুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{minWidth: 1060}}>
              <colgroup>
                <col style={{width:80}}/><col style={{width:88}}/><col style={{width:36}}/><col style={{width:76}}/>
                <col style={{width:96}}/><col style={{width:126}}/><col style={{width:110}}/><col style={{width:90}}/>
                <col style={{width:90}}/><col style={{width:68}}/><col style={{width:80}}/><col style={{width:70}}/><col style={{width:88}}/>
              </colgroup>
              <thead>
                <tr>
                  {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট','শিরোনাম','বিস্তারিত','জুম','টিচার','ধরণ','স্থান','স্ট্যাটাস',''].map((h, i) => (
                    <th key={i} style={{background: CC[i]?.[0] || '#f1f5f9', color: '#374151', fontSize: 10, padding: '8px 8px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outline.map((row, idx) => (
                  <OutlineRow key={row.id} row={row} idx={idx}
                    teachers={teachers} zooms={zooms}
                    onRefresh={loadOutline} onFeedback={setFeedbackRow} onInsertAfter={handleInsertAfter} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {feedbackRow && (
        <FeedbackModal outlineRow={feedbackRow} teachers={teachers}
          onClose={() => setFeedbackRow(null)} onDone={() => { setFeedbackRow(null); loadOutline(); }} />
      )}

      {showPdf && outline.length > 0 && (
        <PdfModal rows={outline} batchName={batch?.batch_name || 'রুটিন'}
          teachers={teachers} zooms={zooms} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}
