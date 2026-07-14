import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, Save, X, Wand2, FileDown, FileSpreadsheet, GitMerge, Lock, RotateCcw, Search } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_LABEL = { scheduled: 'নির্ধারিত', done: 'সম্পন্ন', cancelled: 'বাতিল', rescheduled: 'পুনর্নির্ধারিত' };
const DAY_LABELS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const LOCATION_OPTIONS = ['ক্লাসরুম-১', 'ক্লাসরুম-২', 'রিমোট'];

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
  { key: 'location',         label: 'ক্লাসরুম' },
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
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function localDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} '${yy}`;
}

function routineStatus(row) {
  if (row.feedback_status === 'approved' || row.status === 'done')
    return { label: 'সম্পন্ন', cls: 'bg-green-100 text-green-700' };
  const d = (row.scheduled_date || '').split('T')[0];
  if (d) {
    const t = row.scheduled_time || '00:00';
    const scheduledAt = new Date(`${d}T${t}`);
    if (scheduledAt < new Date())
      return { label: 'পেন্ডিং', cls: 'bg-yellow-100 text-yellow-700' };
  }
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
function OutlineRow({ row, idx, teachers, zooms, allRows, subjects, onRefresh, onFeedback, onInsertAfter }) {
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
    try {
      await academyApi.updateOutlineRow(row.id, form);
      toast.success('আপডেট');
      setEditing(false);
      onRefresh();
    } catch (err) {
      console.error('updateOutlineRow error:', err?.response?.data || err);
      toast.error(err?.response?.data?.message || 'সমস্যা হয়েছে');
    }
  };

  // Cascading subject → topic
  const baseSubj = subjects?.find(s => form.subject_name === s.subject_name || form.subject_name?.startsWith(s.subject_name + '-'));
  const availableLectures = baseSubj?.lectures || [];
  const del = async () => {
    if (!confirm('মুছে ফেলবেন?')) return;
    await academyApi.deleteOutlineRow(row.id); onRefresh();
  };

  const toggleActive = async () => {
    try {
      await academyApi.updateOutlineRow(row.id, { is_active: !row.is_active });
      onRefresh();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  // Swap: select topic from an inactive row — exchange content, both become active
  const swapWith = async (inactiveRowId) => {
    const inactiveRow = allRows.find(r => r.id === inactiveRowId);
    if (!inactiveRow) return;
    try {
      await Promise.all([
        academyApi.updateOutlineRow(row.id, { topic: inactiveRow.topic, notes: inactiveRow.notes, subject_name: inactiveRow.subject_name, is_active: true }),
        academyApi.updateOutlineRow(inactiveRow.id, { topic: row.topic, notes: row.notes, subject_name: row.subject_name, is_active: true }),
      ]);
      toast.success('কনটেন্ট এক্সচেঞ্জ হয়েছে');
      onRefresh();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  // Inactive rows of same subject (excluding self) available for swap
  const swappable = (allRows || []).filter(r =>
    r.id !== row.id && r.is_active === false &&
    (r.subject_name || '') === (row.subject_name || '') && r.topic
  );

  const isExam = row.row_type === 'exam';
  const st = routineStatus(row);
  const typeLabel = isExam ? `এক্সাম-${row.class_no || ''}` : `ক্লাস-${row.class_no || ''}`;
  const d = (row.scheduled_date || '').split('T')[0];
  const isActive = row.is_active !== false;
  const isSynced = !!row.source_outline_id;

  const ic = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-400';
  const sc = 'w-full text-xs border border-gray-200 rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:border-primary-400';

  return (
    <>
      <tr className={`border-t border-gray-100 hover:brightness-95 group ${!isActive ? 'opacity-40 line-through' : ''}`}>
        {/* ক্রম */}
        <td style={{background: isExam ? '#f5f3ff' : '#eff6ff'}} className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={toggleActive} title={isActive ? 'ইনএকটিভ করুন' : 'একটিভ করুন'}
              className={`p-0.5 rounded text-[10px] ${isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}>
              {isActive ? '●' : '○'}
            </button>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExam ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>{typeLabel}</span>
          </div>
        </td>
        {editing ? (
          <>
            <td style={{background: CC[1][1]}} className="px-2 py-1"><input type="date" className={ic} value={form.scheduled_date} onChange={e => f('scheduled_date', e.target.value)} /></td>
            <td style={{background: CC[2][1]}} className="px-2 py-1 text-xs text-center">{dayLabel(form.scheduled_date)}</td>
            <td style={{background: CC[3][1]}} className="px-2 py-1"><input type="time" className={ic} value={form.scheduled_time} onChange={e => f('scheduled_time', e.target.value)} /></td>
            <td style={{background: CC[4][1]}} className="px-2 py-1">
              {subjects?.length > 0 ? (
                <select className={sc} value={form.subject_name}
                  onChange={e => { f('subject_name', e.target.value); f('topic', ''); }}>
                  <option value="">— বেছে নিন</option>
                  {subjects.map(s => (
                    <optgroup key={s.id} label={s.subject_name}>
                      <option value={s.subject_name}>{s.subject_name}</option>
                      {(s.lectures || []).map((_, li) => (
                        <option key={li} value={`${s.subject_name}-${li + 1}`}>{s.subject_name}-{li + 1}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <input className={ic} value={form.subject_name} onChange={e => f('subject_name', e.target.value)} placeholder="সাবজেক্ট" />
              )}
            </td>
            <td style={{background: CC[5][1]}} className="px-2 py-1">
              {availableLectures.length > 0 ? (
                <select className={sc} value={form.topic} onChange={e => f('topic', e.target.value)}>
                  <option value="">— বেছে নিন</option>
                  {availableLectures.map((l, i) => <option key={i} value={l.title}>{l.title}</option>)}
                </select>
              ) : (
                <input className={ic} value={form.topic} onChange={e => f('topic', e.target.value)} placeholder="শিরোনাম" />
              )}
            </td>
            <td style={{background: CC[6][1]}} className="px-2 py-1"><input className={ic} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="বিস্তারিত" /></td>
            <td style={{background: CC[7][1]}} className="px-2 py-1">
              <select className={sc} value={form.zoom_account_id} onChange={e => f('zoom_account_id', e.target.value)}>
                <option value="">—</option>{zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
              </select>
            </td>
            <td style={{background: CC[8][1]}} className="px-2 py-1">
              <select className={sc} value={form.teacher_id} onChange={e => f('teacher_id', e.target.value)}>
                <option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </td>
            <td style={{background: CC[9][1]}} className="px-2 py-1">
              <select className={sc} value={form.class_mode} onChange={e => f('class_mode', e.target.value)}>
                <option value="online">অনলাইন</option><option value="offline">অফলাইন</option>
              </select>
            </td>
            <td style={{background: CC[10][1]}} className="px-2 py-1">
              <select className={sc} value={form.location} onChange={e => f('location', e.target.value)}>
                <option value="">—</option>
                {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </td>
            <td style={{background: CC[11][1]}} className="px-2 py-1">
              <select className={sc} value={form.status} onChange={e => f('status', e.target.value)}>
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
            <td style={{background: CC[5][1]}} className="px-2 py-2 text-xs max-w-[130px]">
              {swappable.length > 0 && isActive ? (
                <select className="w-full text-xs border border-amber-300 rounded px-1 py-0.5 bg-amber-50"
                  value={row.topic || ''}
                  onChange={e => { const sr = swappable.find(r => r.topic === e.target.value); if (sr) swapWith(sr.id); }}>
                  <option value={row.topic || ''}>{row.topic || '—'}</option>
                  <optgroup label="— এক্সচেঞ্জ করুন —">
                    {swappable.map(sr => <option key={sr.id} value={sr.topic}>⇄ {sr.topic}</option>)}
                  </optgroup>
                </select>
              ) : (
                <span className="truncate block" title={row.topic}>{row.topic || '—'}</span>
              )}
            </td>
            <td style={{background: CC[6][1]}} className="px-2 py-2 text-xs text-gray-400 max-w-[110px] truncate" title={row.notes}>{row.notes || '—'}</td>
            <td style={{background: CC[7][1]}} className="px-2 py-2 text-xs text-gray-500">{zooms.find(z => z.id === row.zoom_account_id)?.account_name || row.zoom_account_name || '—'}</td>
            <td style={{background: CC[8][1]}} className="px-2 py-2 text-xs text-gray-500">{teachers.find(t => t.id === row.teacher_id)?.full_name || row.teacher_name || '—'}</td>
            <td style={{background: CC[9][1]}} className="px-2 py-2 text-xs">{row.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন'}</td>
            <td style={{background: CC[10][1]}} className="px-2 py-2 text-xs text-gray-500">{row.location || '—'}</td>
            <td style={{background: CC[11][1]}} className="px-2 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
            <td className="px-2 py-2">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onInsertAfter(idx)} className="p-1.5 text-primary-400 hover:bg-primary-50 rounded" title="পরে সারি যোগ"><Plus size={13} /></button>
                {isSynced ? (
                  <span title="সোর্স রুটিন থেকে সিঙ্ক হয় — সেখানে এডিট করুন" className="p-1.5 text-amber-400 cursor-default"><Lock size={13} /></span>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={13} /></button>
                    <button onClick={del} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            </td>
          </>
        )}
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
  const sc = 'w-full text-xs border border-gray-200 rounded-lg pl-1.5 pr-6 py-1 focus:outline-none focus:border-primary-400 bg-white';

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
          <select className={sc} style={{flex:'1 1 0', minWidth:0}} value={row._subj_id || ''} onChange={e => handleSubjSelect(e.target.value)}>
            <option value="">— বেছে নিন</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
          <input type="text" className={`${ic} text-center`} style={{width:'2rem', flexShrink:0}} value={(row.subject_name || '').match(/-(\d+)$/)?.[1] || ''}
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
          <select className={sc} value={row.topic} onChange={e => handleTitleSelect(e.target.value)}>
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
          <select className={sc} value={row.notes} onChange={e => set('notes', e.target.value)}>
            <option value="">— বেছে নিন</option>
            {lectures.filter(l => l.details).map((l, i) => <option key={i} value={l.details}>{l.details?.slice(0, 40)}</option>)}
          </select>
        ) : (
          <input className={ic} value={row.notes} onChange={e => set('notes', e.target.value)} placeholder="বিস্তারিত" />
        )}
      </td>
      {/* জুম */}
      <td style={{background: CC[7][1]}} className="px-1 py-1">
        <select className={sc} value={row.zoom_account_id} onChange={e => set('zoom_account_id', e.target.value)} disabled={isExam}>
          <option value="">—</option>
          {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
        </select>
      </td>
      {/* টিচার */}
      <td style={{background: CC[8][1]}} className="px-1 py-1">
        <select className={sc} value={row.teacher_id} onChange={e => set('teacher_id', e.target.value)} disabled={isExam}>
          <option value="">—</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </td>
      {/* ধরণ */}
      <td style={{background: CC[9][1]}} className="px-1 py-1">
        <select className={sc} value={row.class_mode} onChange={e => set('class_mode', e.target.value)}>
          <option value="online">অনলাইন</option><option value="offline">অফলাইন</option>
        </select>
      </td>
      {/* স্থান — datalist */}
      <td style={{background: CC[10][1]}} className="px-1 py-1">
        <input list={`loc-${idx}`} className={ic} value={row.location} onChange={e => set('location', e.target.value)} placeholder="ক্লাসরুম" />
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
    location: 'ক্লাসরুম-১',
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
  const EMPTY_GEN_FILTER = { keyword: '', rowType: '', subject: '' };
  const [genFilter, setGenFilter] = useState(EMPTY_GEN_FILTER);
  const gf = (k, v) => setGenFilter(p => ({ ...p, [k]: v }));

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

  useEffect(() => {
    if (zooms.length > 0 && !cfg.zoomAccountId) {
      const def = zooms.find(z => (z.account_name || '').toLowerCase().includes('zoom-1') || (z.account_name || '').toLowerCase() === 'zoom 1');
      if (def) setCfg(p => ({ ...p, zoomAccountId: def.id }));
      else setCfg(p => ({ ...p, zoomAccountId: zooms[0].id }));
    }
  }, [zooms]);

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
    let revNo = 1;

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
            subject_name: `রিভিশন-${revNo}`, _subj_id: null,
            topic: revTopic,
            notes: '',
            teacher_id: '', zoom_account_id: '',
            class_mode: cfg.classMode, location: cfg.location, status: 'scheduled',
          });
          topicsSinceLastRevision = [];
          revNo++;
          break;
        }
        gd.setDate(gd.getDate() + 1);
      }

      cur = nextCur;
    }

    // 4. Subjective exams — round-robin: all subjects cycle before repeating
    let tailDate = cur;
    const subjectiveRounds = Number(cfg.subjectivePerSubject);
    for (let q = 1; q <= subjectiveRounds; q++) {
      for (const subj of subjects) {
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
    }

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
          <select className="input-field text-sm" value={cfg.location} onChange={e => setC('location', e.target.value)}>
            {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
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
      {generatedRows.length > 0 && (() => {
        const isGenFiltered = genFilter.keyword || genFilter.rowType || genFilter.subject;
        const uniqueGenSubjects = [...new Set(generatedRows.map(r => {
          const base = (r.subject_name || '').replace(/-\d+$/, '');
          return base;
        }).filter(Boolean))];
        const filteredGen = generatedRows.filter((r, idx) => {
          if (genFilter.rowType && r.row_type !== genFilter.rowType) return false;
          if (genFilter.subject) {
            const sn = r.subject_name || '';
            const base = sn.replace(/-\d+$/, '');
            if (base !== genFilter.subject && sn !== genFilter.subject) return false;
          }
          if (genFilter.keyword) {
            const kw = genFilter.keyword.toLowerCase();
            if (!(r.topic || '').toLowerCase().includes(kw) && !(r.notes || '').toLowerCase().includes(kw) && !(r.subject_name || '').toLowerCase().includes(kw)) return false;
          }
          return true;
        });
        // Map filtered rows back to original indices for onChange/onDelete/onInsertAfter
        const filteredWithIdx = filteredGen.map(r => ({ r, idx: generatedRows.indexOf(r) }));

        return (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Filter bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1.5 border-2 border-violet-300 rounded-lg px-2.5 bg-violet-50 flex-1 min-w-[140px]" style={{height:28}}>
                <Search size={12} className="text-violet-400 flex-shrink-0" />
                <input className="text-xs outline-none w-full bg-transparent placeholder-violet-400"
                  placeholder="শিরোনাম / সাবজেক্ট..."
                  value={genFilter.keyword} onChange={e => gf('keyword', e.target.value)} />
              </div>
              <select style={{height:28}}
                className="text-xs border-2 border-orange-300 bg-orange-50 text-orange-900 rounded-lg px-2 min-w-[90px]"
                value={genFilter.rowType} onChange={e => gf('rowType', e.target.value)}>
                <option value="">— ধরণ —</option>
                <option value="class">ক্লাস</option>
                <option value="exam">পরীক্ষা</option>
              </select>
              <select style={{height:28}}
                className="text-xs border-2 border-teal-300 bg-teal-50 text-teal-900 rounded-lg px-2 min-w-[100px] flex-1"
                value={genFilter.subject} onChange={e => gf('subject', e.target.value)}>
                <option value="">— সাবজেক্ট —</option>
                {uniqueGenSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => setGenFilter(EMPTY_GEN_FILTER)} style={{height:28}}
                className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 border flex-shrink-0 transition-colors ${isGenFiltered ? 'text-red-600 border-red-300 bg-white hover:bg-red-50' : 'text-gray-300 border-gray-200 cursor-default'}`}
                disabled={!isGenFiltered}>
                <RotateCcw size={11} /> রিসেট
              </button>
              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border flex-shrink-0">
                {isGenFiltered ? `${filteredGen.length} / ` : ''}{generatedRows.length} সারি
              </span>
            </div>
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-xs text-amber-700 font-medium">
              প্রিভিউ — যেকোনো ঘর সম্পাদনা করুন | <span className="text-primary-600">+ চাপলে নতুন সারি</span>
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
                    {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট নাম','শিরোনাম','বিস্তারিত','জুম একাউন্ট','টিচার নাম','ক্লাসের ধরণ','ক্লাসরুম','ক্লাস স্ট্যাটাস',''].map((h, i) => (
                      <th key={i} style={{background: CC[i]?.[0] || '#f1f5f9', color: '#374151', fontSize: 10, padding: '8px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredWithIdx.map(({ r, idx }) => (
                    <GenRow key={r._id} row={r} idx={idx}
                      subjects={subjects} teachers={teachers} zooms={zooms}
                      onChange={updateRow} onDelete={deleteRow} onInsertAfter={insertAfter} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {showPdf && (
        <PdfModal rows={generatedRows} batchName={batch.batch_name} teachers={teachers} zooms={zooms} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}

// ── Manual Routine Builder ─────────────────────────────────────────────────────
const SPECIAL_SUBJECTS = ['গাইডলাইন', 'রিভিশন টেস্ট', 'সাবজেক্টিভ টেস্ট', 'মডেল টেস্ট'];

function buildRowConflicts(rows) {
  const conflicts = new Set();
  const warnings = new Set();
  const byDate = {};
  rows.forEach((r, i) => {
    if (!r.scheduled_date || r.is_active === false) return;
    (byDate[r.scheduled_date] = byDate[r.scheduled_date] || []).push({ i, r });
  });
  Object.values(byDate).forEach(group => {
    ['class', 'exam'].forEach(type => {
      const same = group.filter(x => x.r.row_type === type);
      for (let a = 0; a < same.length; a++) {
        for (let b = a + 1; b < same.length; b++) {
          const ta = same[a].r.scheduled_time, tb = same[b].r.scheduled_time;
          if (ta && tb && ta === tb) {
            conflicts.add(same[a].i); conflicts.add(same[b].i);
          } else {
            warnings.add(same[a].i); warnings.add(same[b].i);
          }
        }
      }
    });
  });
  return { conflicts, warnings };
}

function getRevisionTopics(rows, rowIdx) {
  const result = [];
  for (let i = rowIdx - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r.is_active) continue;
    if (r.row_type === 'exam' && (r.label === 'রিভিশন' || r.subject_name === 'রিভিশন টেস্ট')) break;
    if (r.row_type === 'class' && r.topic && !r.label?.includes('গাইডলাইন')) {
      result.unshift(`${r.subject_name || ''}: ${r.topic}`);
    }
  }
  return result;
}

function ManualRoutineBuilder({ batch, subjects, teachers, zooms, onSaved, onCancel, initialRows }) {
  const [step, setStep] = useState(initialRows?.length > 0 ? 'table' : 'config');
  const [cfg, setCfg] = useState({
    guidelineClasses: 3, subjectivePerSubject: 2, modelTests: 2,
    classTime: '21:00', examTime: '12:00',
    classMode: 'offline', location: 'ক্লাসরুম-১', zoomAccountId: '',
  });
  const [rows, setRows] = useState(() => {
    if (!initialRows?.length) return [];
    return initialRows.map(r => ({
      _id: r.id,
      row_type: r.row_type,
      label: r.label ?? null,
      class_no: r.class_no ?? null,
      exam_no: r.exam_no ?? null,
      scheduled_date: (r.scheduled_date || '').split('T')[0],
      scheduled_time: r.scheduled_time || '',
      subject_name: r.subject_name || '',
      _subj_id: subjects?.find(s => r.subject_name === s.subject_name || r.subject_name?.startsWith(s.subject_name + '-'))?.id || null,
      topic: r.topic || '',
      notes: r.notes || '',
      teacher_id: r.teacher_id || '',
      zoom_account_id: r.zoom_account_id || '',
      class_mode: r.class_mode || 'online',
      location: r.location || '',
      is_active: r.is_active !== false,
    }));
  });
  const [saving, setSaving] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [insertMenu, setInsertMenu] = useState(null); // {idx, x, y}
  const [examWarn, setExamWarn] = useState(null); // {idx, x, y}
  const [unlockedExams, setUnlockedExams] = useState(new Set());
  const unlockExam = (idx) => { setUnlockedExams(p => new Set([...p, idx])); setExamWarn(null); };
  const examWarnIdx = examWarn?.idx ?? null;
  const setExamWarnIdx = (idx) => setExamWarn(idx === null ? null : { idx, x: examWarn?.x ?? 0, y: examWarn?.y ?? 0 });

  useEffect(() => {
    if (zooms.length > 0 && !cfg.zoomAccountId)
      setCfg(p => ({ ...p, zoomAccountId: zooms[0].id }));
  }, [zooms]);

  const setC = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const update = (idx, updates) => setRows(prev => {
    const next = prev.map((r, i) => i === idx ? { ...r, ...updates } : r);
    const changed = next[idx];
    if (changed.row_type === 'class' && !changed.label) {
      const examIdx = idx + 1;
      if (examIdx < next.length && next[examIdx].row_type === 'exam' && !next[examIdx].label) {
        const sync = {};
        if ('_subj_id'     in updates) sync._subj_id     = updates._subj_id;
        if ('subject_name' in updates) sync.subject_name = updates.subject_name;
        if ('topic'        in updates) sync.topic        = updates.topic;
        if ('notes'        in updates) sync.notes        = updates.notes;
        if ('scheduled_date' in updates && updates.scheduled_date) {
          const d = new Date(updates.scheduled_date);
          d.setDate(d.getDate() + 1);
          sync.scheduled_date = d.toISOString().slice(0, 10);
        }
        if (Object.keys(sync).length) next[examIdx] = { ...next[examIdx], ...sync };
      }
    }
    return next;
  });
  const deleteRow = (idx) => setRows(prev => resequence(prev.filter((_, i) => i !== idx)));
  const toggleActive = (idx) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, is_active: !r.is_active } : r));
  const insertAfter = (idx, row_type = 'class') => {
    const isExamRow = row_type === 'exam';
    const blank = {
      _id: `ins-${Date.now()}`, row_type, label: null, class_no: null, exam_no: null,
      scheduled_date: '', scheduled_time: isExamRow ? '00:00' : cfg.classTime,
      subject_name: '', _subj_id: null, topic: '', notes: '',
      teacher_id: '', zoom_account_id: isExamRow ? '' : cfg.zoomAccountId,
      class_mode: isExamRow ? 'online' : cfg.classMode,
      location: isExamRow ? '' : cfg.location, is_active: true,
    };
    setRows(prev => resequence([...prev.slice(0, idx + 1), blank, ...prev.slice(idx + 1)]));
  };
  const resequence = (rows) => {
    let classNo = 1, examNo = 1;
    return rows.map(r => {
      if (r.row_type === 'class' && !r.label) return { ...r, class_no: classNo++ };
      if (r.row_type === 'exam') return { ...r, exam_no: examNo++ };
      return r;
    });
  };

  const generate = () => {
    if (subjects.length === 0) return toast.error('প্ল্যানে সাবজেক্ট নেই');
    const newRows = [];
    let classNo = 1, examNo = 1;
    const base = { class_mode: cfg.classMode, location: cfg.location, is_active: true };

    for (let i = 0; i < Number(cfg.guidelineClasses); i++) {
      newRows.push({
        _id: `g-${i}`, row_type: 'class', label: `গাইডলাইন-${i + 1}`, class_no: null, exam_no: null,
        scheduled_date: '', scheduled_time: cfg.classTime,
        subject_name: 'গাইডলাইন', _subj_id: null,
        topic: `গাইডলাইন ক্লাস ${i + 1}`, notes: '',
        teacher_id: '', zoom_account_id: cfg.zoomAccountId, ...base,
      });
    }

    const maxRounds = Math.max(...subjects.map(s => s.lectures?.length || 0), 0);
    for (let round = 0; round < maxRounds; round++) {
      for (const subj of subjects) {
        const lecs = subj.lectures || [];
        if (round >= lecs.length) continue;
        const lec = lecs[round];
        const subjLabel = `${subj.subject_name}-${round + 1}`;
        newRows.push({
          _id: `cls-${classNo}`, row_type: 'class', label: null, class_no: classNo++, exam_no: null,
          scheduled_date: '', scheduled_time: cfg.classTime,
          subject_name: '', _subj_id: subj.id,
          topic: '', notes: '',
          teacher_id: '', zoom_account_id: cfg.zoomAccountId, ...base,
        });
        newRows.push({
          _id: `ex-${examNo}`, row_type: 'exam', label: null, class_no: null, exam_no: examNo++,
          scheduled_date: '', scheduled_time: '00:00',
          subject_name: '', _subj_id: subj.id,
          topic: '', notes: '',
          teacher_id: '', zoom_account_id: '',
          class_mode: 'online', location: '', is_active: true,
        });
      }
    }

    for (let q = 1; q <= Number(cfg.subjectivePerSubject); q++) {
      for (const subj of subjects) {
        newRows.push({
          _id: `subj-${subj.id}-${q}`, row_type: 'exam', label: 'সাবজেক্টিভ', class_no: null, exam_no: examNo++,
          scheduled_date: '', scheduled_time: '00:00',
          subject_name: subj.subject_name, _subj_id: subj.id,
          topic: '', notes: '',
          teacher_id: '', zoom_account_id: '',
          class_mode: 'online', location: '', is_active: true,
        });
      }
    }

    for (let m = 1; m <= Number(cfg.modelTests); m++) {
      newRows.push({
        _id: `model-${m}`, row_type: 'exam', label: `মডেল-${m}`, class_no: null, exam_no: examNo++,
        scheduled_date: '', scheduled_time: cfg.examTime,
        subject_name: 'মডেল টেস্ট', _subj_id: null,
        topic: '', notes: '',
        teacher_id: '', zoom_account_id: '',
        class_mode: 'online', location: '', is_active: true,
      });
    }

    setRows(newRows);
    setStep('table');
    toast.success(`${newRows.length} টি সারি তৈরি হয়েছে`);
  };

  const saveRoutine = async () => {
    const active = rows.filter(r => r.is_active !== false);
    if (!active.length) return toast.error('কোনো একটিভ সারি নেই');
    const { conflicts } = buildRowConflicts(rows);
    if (conflicts.size > 0 && !confirm(`${conflicts.size} টি সারিতে সময় conflict আছে। তবুও সেভ করবেন?`)) return;
    setSaving(true);
    try {
      await academyApi.bulkAddOutlineRows(batch.id, active);
      toast.success(`${active.length} টি সারি সেভ হয়েছে`);
      setRows([]); setStep('config'); onSaved();
    } catch { toast.error('সেভ করতে সমস্যা হয়েছে'); }
    setSaving(false);
  };

  const downloadExcel = () => {
    const data = rows.filter(r => r.is_active !== false).map(r => {
      const t = teachers.find(x => x.id === r.teacher_id);
      const z = zooms.find(x => x.id === r.zoom_account_id);
      const isExam = r.row_type === 'exam';
      const typeLabel = isExam ? (r.label ? `${r.label}-${r.exam_no||''}` : `এক্সাম-${r.exam_no||''}`) : (r.label || `ক্লাস-${r.class_no||''}`);
      return {
        'ক্রম': typeLabel, 'তারিখ': localDate(r.scheduled_date), 'বার': dayLabel(r.scheduled_date),
        'সময়': r.scheduled_time, 'সাবজেক্ট': r.subject_name, 'শিরোনাম': r.topic, 'বিস্তারিত': r.notes,
        'জুম': z?.account_name || '', 'টিচার': t?.full_name || '',
        'ধরণ': r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
        'স্থান': r.location, 'স্ট্যাটাস': routineStatus(r).label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'রুটিন');
    XLSX.writeFile(wb, `${batch.batch_name}_manual_routine.xlsx`);
    toast.success('Excel ডাউনলোড হয়েছে');
  };

  const { conflicts, warnings } = buildRowConflicts(rows);

  // Build used topics per subject (from active class rows)
  const usedTopics = {};
  subjects.forEach(s => { usedTopics[s.id] = new Set(); });
  rows.forEach(r => {
    if (r.is_active !== false && r.row_type === 'class' && r._subj_id && r.topic) {
      if (!usedTopics[r._subj_id]) usedTopics[r._subj_id] = new Set();
      usedTopics[r._subj_id].add(r.topic);
    }
  });

  const ic = 'w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-primary-400 bg-white';
  const sc = 'w-full text-xs border border-gray-200 rounded-lg pl-1.5 pr-6 py-1 focus:outline-none focus:border-primary-400 bg-white';

  if (step === 'config') return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-100 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Plus size={16} className="text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">ম্যানুয়াল রুটিন কনফিগারেশন</p>
        {subjects.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {subjects.length} সাবজেক্ট • {subjects.reduce((s, x) => s + (x.lectures?.length || 0), 0)} লেকচার
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['guidelineClasses', 'গাইডলাইন ক্লাস', 'number', 0, 20],
          ['subjectivePerSubject', 'সাবজেক্টিভ (প্রতি সাবজেক্টে)', 'number', 0, 10],
          ['modelTests', 'মডেল টেস্ট', 'number', 0, 20],
        ].map(([k, label, type, min, max]) => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <input type={type} className="input-field text-sm" min={min} max={max}
              value={cfg[k]} onChange={e => setC(k, e.target.value)} />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ক্লাস সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.classTime} onChange={e => setC('classTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">পরীক্ষার সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.examTime} onChange={e => setC('examTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ডিফল্ট ধরণ</label>
          <select className="input-field text-sm" value={cfg.classMode} onChange={e => setC('classMode', e.target.value)}>
            <option value="offline">অফলাইন</option>
            <option value="online">অনলাইন</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">ডিফল্ট স্থান</label>
          <select className="input-field text-sm" value={cfg.location} onChange={e => setC('location', e.target.value)}>
            {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Zoom একাউন্ট</label>
          <select className="input-field text-sm" value={cfg.zoomAccountId} onChange={e => setC('zoomAccountId', e.target.value)}>
            <option value="">—</option>
            {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={generate}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <Plus size={14} /> রুটিন টেবিল তৈরি করুন
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
          বাতিল
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-100 p-4 space-y-4">
      {insertMenu !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setInsertMenu(null)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            style={{ top: insertMenu.y + 8, left: insertMenu.x - 60 }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { insertAfter(insertMenu.idx, 'class'); setInsertMenu(null); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs hover:bg-blue-50 text-blue-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> ক্লাস রো
            </button>
            <button onClick={() => { insertAfter(insertMenu.idx, 'exam'); setInsertMenu(null); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs hover:bg-violet-50 text-violet-700 font-medium border-t border-gray-100">
              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> এক্সাম রো
            </button>
          </div>
        </>
      )}
      {examWarn !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExamWarn(null)} />
          <div className="fixed z-50 bg-white border-2 border-amber-300 rounded-xl p-4 shadow-2xl w-64 space-y-2.5"
            style={{ top: examWarn.y + 12, left: examWarn.x - 32 }}
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-amber-800">⚠ আগে ক্লাস সেট করুন</p>
            <p className="text-xs text-gray-500">এক্সাম রো স্বয়ংক্রিয়ভাবে ক্লাস থেকে ফিল হয়। তবুও এডিট করতে চাইলে ইগনোর করুন।</p>
            <div className="flex gap-2 pt-0.5">
              <button onClick={() => unlockExam(examWarn.idx)}
                className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium">
                ইগনোর করুন
              </button>
              <button onClick={() => setExamWarn(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                বাতিল
              </button>
            </div>
          </div>
        </>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStep('config')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ArrowLeft size={12} /> কনফিগ
        </button>
        <span className="text-xs font-semibold text-gray-700">ম্যানুয়াল রুটিন টেবিল</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{rows.length} সারি</span>
        {conflicts.size > 0 && (
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            ⚠ {conflicts.size} conflict
          </span>
        )}
        {warnings.size > 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            ! {warnings.size} warning
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={downloadExcel}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
            <FileSpreadsheet size={12} /> Excel
          </button>
          <button onClick={() => setShowPdf(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
            <FileDown size={12} /> PDF
          </button>
          <button onClick={saveRoutine} disabled={saving}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
            <Save size={12} /> {saving ? 'সেভ হচ্ছে...' : 'রুটিন ফাইনাল করুন'}
          </button>
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border-2 border-gray-200 text-gray-600 text-xs hover:bg-gray-50">
            বাতিল
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট','শিরোনাম','বিস্তারিত','জুম','টিচার','ধরণ','ক্লাসরুম','স্ট্যাটাস',''].map((h, i) => (
                  <th key={i} style={{background: CC[i]?.[0]||'#f1f5f9', color:'#374151', fontSize:10, padding:'8px 6px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap', borderBottom:'1px solid #e5e7eb'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isConflict = conflicts.has(idx);
                const isWarning = !isConflict && warnings.has(idx);
                const isExam = row.row_type === 'exam';
                const tdBg = (ccIdx) => isExam ? '#ede9fe' : CC[ccIdx][1];
                const isLocked = isExam && !row.label && !unlockedExams.has(idx);
                const lockOverlay = isLocked
                  ? <div className="absolute inset-0 z-10 cursor-pointer rounded"
                      onClick={e => setExamWarn({ idx, x: e.clientX, y: e.clientY })} />
                  : null;
                const isActive = row.is_active !== false;
                const st = routineStatus(row);
                const baseSubj = subjects.find(s => s.id === row._subj_id);
                const lectures = baseSubj?.lectures || [];
                const isRevision = row.label === 'রিভিশন' || row.subject_name === 'রিভিশন টেস্ট';

                const availableLectures = lectures.filter(l => {
                  const used = usedTopics[row._subj_id] || new Set();
                  return l.title === row.topic || !used.has(l.title);
                });

                const lecTotal = lectures.length;
                const lecUsed = row._subj_id ? (usedTopics[row._subj_id]?.size || 0) : 0;
                const lecLimitReached = lecTotal > 0 && lecUsed >= lecTotal && row.row_type === 'class' && !row.topic;

                const typeLabel = isExam
                  ? (row.label ? `${row.label}-${row.exam_no||''}` : `এক্সাম-${row.exam_no||''}`)
                  : (row.label || `ক্লাস-${row.class_no||''}`);

                const handleSubjSelect = (val) => {
                  if (val.startsWith('__')) {
                    const special = val.replace(/^__|__$/g, '');
                    update(idx, { _subj_id: null, subject_name: special, topic: '', notes: '' });
                  } else {
                    const subj = subjects.find(s => s.id === val);
                    // Count active class rows before this index using this subject
                    const count = rows.filter((r, i) => i < idx && r.is_active !== false && r.row_type === 'class' && r._subj_id === val).length;
                    const seq = count + 1;
                    update(idx, {
                      _subj_id: val,
                      subject_name: subj ? `${subj.subject_name}-${seq}` : '',
                      topic: '', notes: '',
                    });
                  }
                };

                const handleTitleSelect = (title) => {
                  const lec = lectures.find(l => l.title === title);
                  update(idx, { topic: title, notes: lec?.details || '' });
                };

                const handleRevisionFill = () => {
                  const topics = getRevisionTopics(rows, idx);
                  const topicStr = topics.length > 0 ? `রিভিশন: ${topics.join(' | ')}` : 'রিভিশন পরীক্ষা';
                  update(idx, { topic: topicStr });
                };

                return (
                  <>
                    <tr key={row._id} className={`border-t border-gray-100 ${!isActive ? 'opacity-40' : ''}`}
                      style={isConflict ? {outline:'2px solid #f87171',outlineOffset:'-1px'} : isWarning ? {outline:'2px solid #fbbf24',outlineOffset:'-1px'} : {}}>
                      <td style={{background: isExam ? '#c4b5fd' : CC[0][1]}} className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleActive(idx)}
                            className={`text-[11px] leading-none ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            {isActive ? '●' : '○'}
                          </button>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
                            isConflict ? 'bg-red-200 text-red-800' :
                            isWarning ? 'bg-yellow-200 text-yellow-800' :
                            row.label?.includes('গাইডলাইন') ? 'bg-amber-200 text-amber-800' :
                            isExam ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'
                          }`}>{typeLabel}</span>
                        </div>
                      </td>
                      <td style={{background: tdBg(1)}} className="px-1 py-1">
                        <div className="relative">
                          {lockOverlay}
                          <input type="date" className={ic} value={row.scheduled_date}
                            onChange={e => update(idx, { scheduled_date: e.target.value })} />
                        </div>
                      </td>
                      <td style={{background: tdBg(2)}} className="px-2 py-1 text-xs text-center font-medium text-amber-700">
                        {dayLabel(row.scheduled_date)}
                      </td>
                      <td style={{background: tdBg(3)}} className="px-1 py-1">
                        <div className="relative">
                          {lockOverlay}
                        {(() => {
                          const PRESETS = ['21:00','19:00','12:00','00:00'];
                          const isPreset = PRESETS.includes(row.scheduled_time);
                          return (
                            <div className="flex flex-col gap-0.5">
                              <select className={sc} value={isPreset ? row.scheduled_time : '__'}
                                onChange={e => { if (e.target.value !== '__') update(idx, { scheduled_time: e.target.value }); }}>
                                <option value="21:00">09:00 PM</option>
                                <option value="19:00">07:00 PM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="00:00">12:00 AM</option>
                                <option value="__">অন্য সময়...</option>
                              </select>
                              {!isPreset && (
                                <input type="time" className={ic} value={row.scheduled_time}
                                  onChange={e => update(idx, { scheduled_time: e.target.value })} />
                              )}
                            </div>
                          );
                        })()}
                        </div>
                      </td>
                      <td style={{background: tdBg(4)}} className="px-1 py-1">
                        <div className="relative">
                          {lockOverlay}
                        <div className="flex gap-1">
                          <select className={sc} style={{flex:'1 1 0', minWidth:0}}
                            value={row._subj_id || (SPECIAL_SUBJECTS.includes(row.subject_name) ? `__${row.subject_name}__` : '')}
                            onFocus={() => isExam && !row.label && triggerExamWarn()}
                            onChange={e => handleSubjSelect(e.target.value)}>
                            <option value="">— বেছে নিন</option>
                            <optgroup label="প্ল্যান সাবজেক্ট">
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                            </optgroup>
                            <optgroup label="বিশেষ">
                              {SPECIAL_SUBJECTS.map(s => <option key={s} value={`__${s}__`}>{s}</option>)}
                            </optgroup>
                          </select>
                          {row._subj_id && (
                            <input type="text" className={`${ic} text-center`} style={{width:'2rem', flexShrink:0}}
                              value={(row.subject_name || '').match(/-(\d+)$/)?.[1] || ''}
                              onChange={e => {
                                const base = baseSubj ? baseSubj.subject_name : (row.subject_name || '').replace(/-\d+$/, '');
                                update(idx, { subject_name: e.target.value ? `${base}-${e.target.value}` : base });
                              }}
                              placeholder="#" title="ক্রম নম্বর" />
                          )}
                        </div>
                        {lecLimitReached && (
                          <p className="text-[10px] text-red-500 mt-0.5">এই বিষয়ে আর কোন লেকচার নেই</p>
                        )}
                        </div>
                      </td>
                      <td style={{background: tdBg(5)}} className="px-1 py-1">
                        <div className="relative">{lockOverlay}
                        {isRevision ? (
                          <div className="flex gap-1">
                            <input className={ic} value={row.topic} onChange={e => update(idx, { topic: e.target.value })} placeholder="রিভিশন শিরোনাম" />
                            <button onClick={handleRevisionFill} title="অটো ফিল"
                              className="text-[11px] text-blue-500 hover:bg-blue-50 rounded px-1 whitespace-nowrap">↻</button>
                          </div>
                        ) : availableLectures.length > 0 && row.row_type === 'class' ? (
                          <select className={sc} value={row.topic} onChange={e => handleTitleSelect(e.target.value)}>
                            <option value="">— বেছে নিন</option>
                            {availableLectures.map((l, i) => <option key={i} value={l.title}>{l.title}</option>)}
                          </select>
                        ) : (
                          <input className={ic} value={row.topic}
                            onChange={e => update(idx, { topic: e.target.value })} placeholder="শিরোনাম" />
                        )}
                        </div>
                      </td>
                      <td style={{background: tdBg(6)}} className="px-1 py-1">
                        <div className="relative">
                          {lockOverlay}
                          <input className={ic} value={row.notes}
                            onChange={e => update(idx, { notes: e.target.value })} placeholder="বিস্তারিত" />
                        </div>
                      </td>
                      <td style={{background: isExam ? '#ddd6fe' : CC[7][1]}} className="px-1 py-1">
                        {isExam ? (
                          <span className="text-[10px] text-gray-300 px-1">—</span>
                        ) : (
                          <select className={sc} value={row.zoom_account_id}
                            onChange={e => update(idx, { zoom_account_id: e.target.value })}>
                            <option value="">—</option>
                            {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{background: isExam ? '#ddd6fe' : CC[8][1]}} className="px-1 py-1">
                        {isExam ? (
                          <span className="text-[10px] text-gray-300 px-1">—</span>
                        ) : (
                          <select className={sc} value={row.teacher_id}
                            onChange={e => update(idx, { teacher_id: e.target.value })}>
                            <option value="">—</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{background: isExam ? '#ddd6fe' : CC[9][1]}} className="px-1 py-1">
                        {isExam ? (
                          <span className="text-[10px] text-gray-400 px-1 font-medium">অনলাইন</span>
                        ) : (
                          <select className={sc} value={row.class_mode}
                            onChange={e => update(idx, { class_mode: e.target.value })}>
                            <option value="offline">অফলাইন</option>
                            <option value="online">অনলাইন</option>
                          </select>
                        )}
                      </td>
                      <td style={{background: isExam ? '#ddd6fe' : CC[10][1]}} className="px-1 py-1">
                        {isExam ? (
                          <span className="text-[10px] text-gray-300 px-1">—</span>
                        ) : (
                          <select className={sc} value={row.location}
                            onChange={e => update(idx, { location: e.target.value })}>
                            {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{background: tdBg(11)}} className="px-2 py-1 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-1 py-1">
                        <div className="flex gap-0.5">
                          <button
                            onClick={e => setInsertMenu({ idx, x: e.clientX, y: e.clientY })}
                            className="p-1 text-primary-400 hover:bg-primary-50 rounded" title="পরে সারি যোগ">
                            <Plus size={11} />
                          </button>
                          <button onClick={() => deleteRow(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPdf && (
        <PdfModal rows={rows.filter(r => r.is_active !== false)} batchName={batch.batch_name}
          teachers={teachers} zooms={zooms} onClose={() => setShowPdf(false)} />
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
  const [batchSubjects, setBatchSubjects] = useState([]);
  const [feedbackRow, setFeedbackRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [allBatches, setAllBatches] = useState([]);
  const [followForm, setFollowForm] = useState({
    source_batch_id: '', cutoff_type: 'class_no', cutoff_value: '',
    guideline_classes: 0, subjective_per_subject: 0, model_tests: 0,
    class_mode: 'online', location: 'ক্লাসরুম-১', zoom_account_id: '',
    selected_subjects: null,
  });
  const [sourceSubjects, setSourceSubjects] = useState([]);
  const [following, setFollowing] = useState(false);
  const [insertAfterRowNo, setInsertAfterRowNo] = useState(null);
  const [addForm, setAddForm] = useState({
    row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', subject_name: '',
    teacher_id: '', zoom_account_id: '', class_mode: 'online', location: '', notes: '',
  });

  const loadOutline = () => academyApi.getBatchOutline(id).then(r => setOutline(r.data || []));

  const handleFollow = async () => {
    if (!followForm.source_batch_id) return toast.error('উৎস ব্যাচ বেছে নিন');
    if (!followForm.cutoff_value) return toast.error('কাটঅফ মান দিন');
    setFollowing(true);
    try {
      const baseProps = {
        class_mode: followForm.class_mode,
        location: followForm.location,
        zoom_account_id: followForm.zoom_account_id || null,
        status: 'scheduled',
        teacher_id: null,
      };

      // 1. Guideline rows (prepended before follow rows — added first so they get lower row_no)
      const guidelineCount = Number(followForm.guideline_classes) || 0;
      if (guidelineCount > 0) {
        const guideRows = Array.from({ length: guidelineCount }, (_, i) => ({
          row_type: 'class', label: `গাইডলাইন-${i + 1}`,
          class_no: null, exam_no: null,
          scheduled_date: null, scheduled_time: null,
          subject_name: 'গাইডলাইন',
          topic: `গাইডলাইন ক্লাস ${i + 1}`, notes: '',
          ...baseProps,
        }));
        await academyApi.bulkAddOutlineRows(id, guideRows);
      }

      // 2. Follow main rows
      const followPayload = { ...followForm };
      if (!followPayload.selected_subjects || followPayload.selected_subjects.length === sourceSubjects.length) {
        followPayload.selected_subjects = null;
      }
      const r = await academyApi.followBatch(id, followPayload);
      const { imported, from_cutoff, before_cutoff } = r.data || {};

      // 3. Subjective exam rows (one per subject per round)
      const subjectiveRounds = Number(followForm.subjective_per_subject) || 0;
      const subjSubjects = followPayload.selected_subjects
        ? batchSubjects.filter(s => followPayload.selected_subjects.includes(s.subject_name))
        : batchSubjects;
      if (subjectiveRounds > 0 && subjSubjects.length > 0) {
        const subjRows = [];
        let examNo = 1;
        for (let q = 1; q <= subjectiveRounds; q++) {
          for (const subj of subjSubjects) {
            subjRows.push({
              row_type: 'exam', label: 'সাবজেক্টিভ',
              class_no: null, exam_no: examNo++,
              scheduled_date: null, scheduled_time: null,
              subject_name: subj.subject_name,
              topic: `সাবজেক্টিভ পরীক্ষা ${q} — ${subj.subject_name}`,
              notes: '', ...baseProps, zoom_account_id: null,
            });
          }
        }
        await academyApi.bulkAddOutlineRows(id, subjRows);
      }

      // 4. Model test rows (appended last)
      const modelCount = Number(followForm.model_tests) || 0;
      if (modelCount > 0) {
        const modelRows = Array.from({ length: modelCount }, (_, i) => ({
          row_type: 'exam', label: `মডেল-${i + 1}`,
          class_no: null, exam_no: i + 1,
          scheduled_date: null, scheduled_time: null,
          subject_name: 'মডেল টেস্ট',
          topic: `মডেল টেস্ট ${i + 1}`, notes: '',
          ...baseProps, zoom_account_id: null,
        }));
        await academyApi.bulkAddOutlineRows(id, modelRows);
      }

      const extras = guidelineCount + (subjectiveRounds * batchSubjects.length) + modelCount;
      toast.success(`${imported} টি রুটিন সারি যুক্ত হয়েছে (${from_cutoff} প্রথমে, ${before_cutoff} শেষে)${extras > 0 ? ` + ${extras} টি অতিরিক্ত সারি` : ''}`);
      setShowFollowModal(false);
      setSourceSubjects([]);
      setFollowForm({ source_batch_id: '', cutoff_type: 'class_no', cutoff_value: '', guideline_classes: 0, subjective_per_subject: 0, model_tests: 0, class_mode: 'online', location: 'ক্লাসরুম-১', zoom_account_id: '', selected_subjects: null });
      loadOutline();
    } catch { toast.error('সমস্যা হয়েছে'); }
    setFollowing(false);
  };

  useEffect(() => {
    academyApi.getBatches().then(r => {
      const list = r.data || [];
      const found = list.find(x => x.id === id) || null;
      setBatch(found);
      setAllBatches(list);
      if (found?.plan_id) {
        academyApi.getPlanSubjects(found.plan_id)
          .then(rs => setBatchSubjects((rs.data || []).sort((a, b) => a.serial_no - b.serial_no)))
          .catch(() => {});
      }
    });
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

  const EMPTY_FILTER = { subjects: [], teacher: '', dateFrom: '', dateTo: '', zoom: '', location: '', rowType: '', day: '', status: '', keyword: '' };
  const [filters, setFilters] = useState(EMPTY_FILTER);
  const ff = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const uniqueSubjects = batchSubjects.map(s => s.subject_name);
  const DAY_NAMES = ['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'];

  const filteredOutline = outline.filter(r => {
    if (filters.subjects.length > 0) {
      const sn = r.subject_name || '';
      const matched = filters.subjects.some(s => sn === s || sn.startsWith(s + '-'));
      if (!matched) return false;
    }
    if (filters.teacher && r.teacher_id !== filters.teacher) return false;
    if (filters.dateFrom && r.scheduled_date && r.scheduled_date < filters.dateFrom) return false;
    if (filters.dateTo && r.scheduled_date && r.scheduled_date > filters.dateTo) return false;
    if (filters.zoom && r.zoom_account_id !== filters.zoom) return false;
    if (filters.location && r.location !== filters.location) return false;
    if (filters.rowType && r.row_type !== filters.rowType) return false;
    if (filters.day) {
      const d = r.scheduled_date ? new Date(r.scheduled_date).getDay() : null;
      if (d === null || DAY_NAMES[d] !== filters.day) return false;
    }
    if (filters.status && r.status !== filters.status) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      if (!(r.topic || '').toLowerCase().includes(kw) && !(r.notes || '').toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTER);

  return (
    <div className="p-3 md:p-6 space-y-4">
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
        {outline.length === 0 && (
          <button onClick={() => { setShowManualBuilder(s => !s); setShowAddForm(false); }}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-colors ${showManualBuilder ? 'bg-amber-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
            <Plus size={14} /> ম্যানুয়াল তৈরি
          </button>
        )}
        {outline.length > 0 && (
          <button onClick={() => { setShowManualBuilder(s => !s); setShowAddForm(false); }}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-colors ${showManualBuilder ? 'bg-amber-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
            <Edit2 size={14} /> সম্পূর্ন রুটিন এডিট করুন
          </button>
        )}
        <button onClick={() => setShowFollowModal(true)}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white transition-colors">
          <GitMerge size={14} /> ব্যাচ ফলো করুন
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
            <button onClick={async () => {
              if (!confirm(`পুরো রুটিন (${outline.length} টি সারি) মুছে ফেলবেন?`)) return;
              try {
                await academyApi.clearBatchOutline(id);
                toast.success('রুটিন মুছে ফেলা হয়েছে');
                loadOutline();
              } catch { toast.error('সমস্যা হয়েছে'); }
            }} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border-2 border-red-300 bg-white hover:bg-red-50 text-red-700">
              <Trash2 size={14} /> রুটিন মুছুন
            </button>
          </>
        )}
      </div>

      {showGenerator && batch && (
        <AutoRoutineGenerator batch={batch} teachers={teachers} zooms={zooms}
          onSaved={() => { loadOutline(); setShowGenerator(false); }} />
      )}

      {showManualBuilder && batch && (
        <ManualRoutineBuilder batch={batch} subjects={batchSubjects} teachers={teachers} zooms={zooms}
          initialRows={outline.length > 0 ? outline : undefined}
          onSaved={() => { loadOutline(); setShowManualBuilder(false); }}
          onCancel={() => setShowManualBuilder(false)} />
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
              <input list="loc-add" className="input-field text-sm" value={addForm.location} onChange={e => af('location', e.target.value)} placeholder="ক্লাসরুম" />
              <datalist id="loc-add">{LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}</datalist>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addRow} className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-8 py-2 rounded-xl text-sm">যোগ করুন</button>
            <button onClick={() => { setShowAddForm(false); setInsertAfterRowNo(null); }} className="bg-white border-2 border-gray-200 text-gray-600 font-medium px-6 py-2 rounded-xl text-sm hover:bg-gray-50">বাতিল</button>
          </div>
        </div>
      )}

      {/* Filters */}
      {outline.length > 0 && (
        <div className="bg-slate-50 rounded-2xl border-2 border-indigo-200 shadow-sm p-4 space-y-3">
          {/* Row 1: all controls in one line */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-1.5 border-2 border-violet-300 rounded-lg px-2.5 bg-violet-50 flex-1" style={{height:30}}>
              <Search size={13} className="text-violet-500 flex-shrink-0" />
              <input className="text-xs outline-none w-full bg-transparent text-gray-900 placeholder-violet-400" placeholder="শিরোনাম / বিস্তারিত..."
                value={filters.keyword} onChange={e => ff('keyword', e.target.value)} />
            </div>
            {[
              ['teacher', 'টিচার', teachers.map(t => [t.id, t.full_name]), 'border-blue-300 bg-blue-50 text-blue-900'],
              ['zoom', 'জুম', zooms.map(z => [z.id, z.account_name]), 'border-cyan-300 bg-cyan-50 text-cyan-900'],
              ['location', 'স্থান', LOCATION_OPTIONS.map(l => [l, l]), 'border-teal-300 bg-teal-50 text-teal-900'],
              ['rowType', 'ধরণ', [['class','ক্লাস'],['exam','পরীক্ষা']], 'border-orange-300 bg-orange-50 text-orange-900'],
              ['day', 'বার', DAY_NAMES.map(d => [d, d]), 'border-pink-300 bg-pink-50 text-pink-900'],
              ['status', 'স্ট্যাটাস', [['scheduled','হবে'],['done','সম্পন্ন'],['cancelled','বাতিল']], 'border-green-300 bg-green-50 text-green-900'],
            ].map(([key, placeholder, opts, clr]) => (
              <select key={key}
                style={{height:30}}
                className={`text-xs border-2 rounded-lg px-2 flex-1 min-w-[80px] ${clr}`}
                value={filters[key]} onChange={e => ff(key, e.target.value)}>
                <option value="">— {placeholder} —</option>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <div className="flex gap-1.5 items-center border-2 border-amber-300 rounded-lg px-2.5 bg-amber-50" style={{height:30}}>
              <span className="text-xs text-amber-700 font-medium whitespace-nowrap">তারিখ:</span>
              <input type="date" className="text-xs outline-none bg-transparent text-gray-900" value={filters.dateFrom} onChange={e => ff('dateFrom', e.target.value)} />
              <span className="text-amber-300 text-xs">—</span>
              <input type="date" className="text-xs outline-none bg-transparent text-gray-900" value={filters.dateTo} onChange={e => ff('dateTo', e.target.value)} />
            </div>
            <button onClick={() => setFilters(EMPTY_FILTER)}
              style={{height:30}} className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 border flex-shrink-0 transition-colors ${isFiltered ? 'text-red-600 border-red-300 bg-white hover:bg-red-50' : 'text-gray-300 border-gray-200 cursor-default'}`}
              disabled={!isFiltered}>
              <RotateCcw size={11} /> রিসেট
            </button>
          </div>
          {/* Row 2: subject checkboxes */}
          {uniqueSubjects.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-gray-700">সাবজেক্ট:</span>
              {uniqueSubjects.map(s => (
                <label key={s} className="flex items-center gap-1 text-xs cursor-pointer select-none">
                  <input type="checkbox" className="accent-primary-500"
                    checked={filters.subjects.includes(s)}
                    onChange={e => ff('subjects', e.target.checked ? [...filters.subjects, s] : filters.subjects.filter(x => x !== s))} />
                  <span className="text-gray-900">{s}</span>
                </label>
              ))}
            </div>
          )}
          {isFiltered && (
            <p className="text-xs font-medium text-gray-700">{filteredOutline.length} / {outline.length} সারি দেখাচ্ছে</p>
          )}
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
                  {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট','শিরোনাম','বিস্তারিত','জুম','টিচার','ধরণ','ক্লাসরুম','স্ট্যাটাস',''].map((h, i) => (
                    <th key={i} style={{background: CC[i]?.[0] || '#f1f5f9', color: '#374151', fontSize: 10, padding: '8px 8px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOutline.map((row, idx) => (
                  <OutlineRow key={row.id} row={row} idx={idx}
                    teachers={teachers} zooms={zooms} allRows={outline} subjects={batchSubjects}
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

      {showFollowModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><GitMerge size={18} /> ব্যাচ ফলো করুন</h3>
              <button onClick={() => setShowFollowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <p className="text-xs text-gray-500">
              উৎস ব্যাচের রুটিন থেকে কাটঅফের পর থেকে আগে আসবে, আগেরগুলো শেষে যুক্ত হবে।
              গাইডলাইন, সাবজেক্টিভ ও মডেল টেস্ট আলাদা কনফিগ থেকে যোগ হবে।
            </p>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Source batch + cutoff */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">উৎস ব্যাচ</label>
                <select className="input-field"
                  value={followForm.source_batch_id}
                  onChange={async e => {
                    const bid = e.target.value;
                    setFollowForm(f => ({ ...f, source_batch_id: bid, selected_subjects: null }));
                    setSourceSubjects([]);
                    if (bid) {
                      const sourceBatch = allBatches.find(b => b.id === bid);
                      if (sourceBatch?.plan_id) {
                        const r = await academyApi.getPlanSubjects(sourceBatch.plan_id);
                        const subjects = (r.data || []).map(s => s.subject_name);
                        setSourceSubjects(subjects);
                        setFollowForm(f => ({ ...f, selected_subjects: subjects }));
                      }
                    }
                  }}>
                  <option value="">বেছে নিন</option>
                  {allBatches.filter(b => b.id !== id).map(b => (
                    <option key={b.id} value={b.id}>{b.batch_name} — {b.course_name}</option>
                  ))}
                </select>
              </div>

              {sourceSubjects.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-600">সাবজেক্ট বেছে নিন</label>
                  <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer pb-2 border-b border-gray-200">
                      <input type="checkbox"
                        checked={followForm.selected_subjects?.length === sourceSubjects.length}
                        onChange={e => setFollowForm(f => ({ ...f, selected_subjects: e.target.checked ? [...sourceSubjects] : [] }))} />
                      সব সাবজেক্ট
                    </label>
                    {sourceSubjects.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox"
                          checked={followForm.selected_subjects?.includes(s) ?? true}
                          onChange={e => setFollowForm(f => {
                            const cur = f.selected_subjects ?? [...sourceSubjects];
                            return { ...f, selected_subjects: e.target.checked ? [...cur, s] : cur.filter(x => x !== s) };
                          })} />
                        {s}
                      </label>
                    ))}
                  </div>
                  {(followForm.selected_subjects?.length ?? sourceSubjects.length) < sourceSubjects.length && (
                    <p className="text-xs text-amber-600">আংশিক সিলেকশন: শুধু এই সাবজেক্টের ক্লাস ও রেগুলার এক্সাম আসবে। রিভিশন এক্সাম আসবে না।</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">কাটঅফ ধরন</label>
                <div className="flex gap-3">
                  {[['class_no', 'ক্লাস নম্বর'], ['date', 'তারিখ']].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="cutoff_type" value={v}
                        checked={followForm.cutoff_type === v}
                        onChange={() => setFollowForm(f => ({ ...f, cutoff_type: v, cutoff_value: '' }))} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">
                  {followForm.cutoff_type === 'class_no' ? 'কোন ক্লাস থেকে শুরু?' : 'কোন তারিখ থেকে শুরু?'}
                </label>
                {followForm.cutoff_type === 'class_no' ? (
                  <input type="number" min="1" className="input-field" placeholder="যেমন: ১৫"
                    value={followForm.cutoff_value}
                    onChange={e => setFollowForm(f => ({ ...f, cutoff_value: e.target.value }))} />
                ) : (
                  <input type="date" className="input-field"
                    value={followForm.cutoff_value}
                    onChange={e => setFollowForm(f => ({ ...f, cutoff_value: e.target.value }))} />
                )}
                <p className="text-xs text-gray-400">
                  এই {followForm.cutoff_type === 'class_no' ? 'নম্বর' : 'তারিখ'} থেকে শুরু হবে — আগেরগুলো শেষে যাবে
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">অতিরিক্ত সারি কনফিগ</p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">গাইডলাইন ক্লাস</label>
                    <input type="number" min="0" max="10" autoComplete="off" className="input-field text-sm"
                      value={followForm.guideline_classes}
                      onChange={e => setFollowForm(f => ({ ...f, guideline_classes: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">সাবজেক্টিভ/সাবজেক্ট</label>
                    <input type="number" min="0" max="10" autoComplete="off" className="input-field text-sm"
                      value={followForm.subjective_per_subject}
                      onChange={e => setFollowForm(f => ({ ...f, subjective_per_subject: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">মডেল টেস্ট</label>
                    <input type="number" min="0" max="20" autoComplete="off" className="input-field text-sm"
                      value={followForm.model_tests}
                      onChange={e => setFollowForm(f => ({ ...f, model_tests: e.target.value }))} />
                  </div>
                </div>

                {Number(followForm.subjective_per_subject) > 0 && batchSubjects.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1.5">এই ব্যাচের প্ল্যানে সাবজেক্ট পাওয়া যায়নি — সাবজেক্টিভ রো যোগ হবে না</p>
                )}
              </div>

              {/* Class config */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ক্লাস কনফিগ (অতিরিক্ত সারির জন্য)</p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">ক্লাসের ধরন</label>
                  <div className="flex gap-3">
                    {[['online', 'অনলাইন'], ['offline', 'অফলাইন']].map(([v, l]) => (
                      <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="follow_class_mode" value={v}
                          checked={followForm.class_mode === v}
                          onChange={() => setFollowForm(f => ({ ...f, class_mode: v }))} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">ক্লাসরুম</label>
                    <select className="input-field text-sm"
                      value={followForm.location}
                      onChange={e => setFollowForm(f => ({ ...f, location: e.target.value }))}>
                      {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">জুম একাউন্ট</label>
                    <select className="input-field text-sm"
                      value={followForm.zoom_account_id}
                      onChange={e => setFollowForm(f => ({ ...f, zoom_account_id: e.target.value }))}>
                      <option value="">নেই</option>
                      {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={handleFollow} disabled={following}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {following ? 'যুক্ত হচ্ছে...' : 'রুটিন যুক্ত করুন'}
              </button>
              <button onClick={() => setShowFollowModal(false)}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
