import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, Save, X,
  Wand2, FileDown, FileSpreadsheet, ChevronDown,
} from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_LABEL = { scheduled: 'নির্ধারিত', done: 'সম্পন্ন', cancelled: 'বাতিল', rescheduled: 'পুনর্নির্ধারিত' };
const STATUS_COLOR = { scheduled: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600', rescheduled: 'bg-yellow-100 text-yellow-700' };
const DAY_LABELS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const TODAY = new Date().toISOString().split('T')[0];

function routineStatus(row) {
  if (row.feedback_status === 'approved' || row.status === 'done') return { label: 'সম্পন্ন', cls: 'bg-green-100 text-green-700' };
  const d = row.scheduled_date?.split?.('T')[0] ?? row.scheduled_date;
  if (d === TODAY) return { label: 'আজ', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'হবে', cls: 'bg-gray-100 text-gray-500' };
}

function nextDate(dateStr, addDays) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split('T')[0];
}

function findNextDay(fromDateStr, targetDay) {
  // find next occurrence of targetDay (0=Sun…6=Sat) from fromDateStr inclusive
  let d = new Date(fromDateStr + 'T00:00:00');
  while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function findPrevClassDays(beforeDateStr, selectedDays, count) {
  // find `count` class days going backwards from beforeDateStr (exclusive)
  const days = [];
  let d = new Date(beforeDateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  while (days.length < count) {
    if (selectedDays.includes(d.getDay())) days.unshift(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 1);
  }
  return days;
}

// ── Feedback Modal ─────────────────────────────────────────────────────────────
function FeedbackModal({ outlineRow, teachers, onClose, onDone }) {
  const [teacherId, setTeacherId] = useState('');
  const [note, setNote] = useState('');
  const submit = async () => {
    if (!teacherId) return toast.error('শিক্ষক বেছে নিন');
    try {
      await academyApi.submitFeedback(outlineRow.id, teacherId, note);
      toast.success('ফিডব্যাক জমা হয়েছে'); onDone();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ক্লাস ফিডব্যাক জমা</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500">{outlineRow.topic || `ক্লাস ${outlineRow.class_no}`}</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">শিক্ষক *</label>
          <select className="input-field" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">বেছে নিন</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">নোট</label>
          <textarea className="input-field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="মন্তব্য..." />
        </div>
        <div className="flex gap-3">
          <button onClick={submit} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex-1">জমা দিন</button>
          <button onClick={onClose} className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm">বাতিল</button>
        </div>
      </div>
    </div>
  );
}

// ── Saved Outline Row ──────────────────────────────────────────────────────────
function OutlineRow({ row, idx, teachers, zooms, onRefresh, onFeedback, onInsertAfter }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: row.scheduled_date?.split('T')[0] || '',
    scheduled_time: row.scheduled_time || '',
    topic: row.topic || '',
    subject_name: row.subject_name || '',
    teacher_id: row.teacher_id || '',
    zoom_account_id: row.zoom_account_id || '',
    class_mode: row.class_mode || 'online',
    location: row.location || '',
    zoom_link: row.zoom_link || '',
    notes: row.notes || '',
    status: row.status || 'scheduled',
  });

  const save = async () => {
    try {
      await academyApi.updateOutlineRow(row.id, form);
      toast.success('আপডেট হয়েছে'); setEditing(false); onRefresh();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const del = async () => {
    if (!confirm('এই সারি মুছে ফেলবেন?')) return;
    await academyApi.deleteOutlineRow(row.id); onRefresh();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const teacher = teachers.find(t => t.id === row.teacher_id);
  const zoom = zooms.find(z => z.id === row.zoom_account_id);
  const st = routineStatus(row);
  const isExam = row.row_type === 'exam';
  const typeLabel = isExam ? `এক্সাম-${row.class_no || ''}` : `ক্লাস-${row.class_no || ''}`;

  return (
    <>
      <tr className={`border-t border-gray-100 hover:bg-gray-50/50 group ${isExam ? 'bg-purple-50/20' : ''}`}>
        <td className="px-3 py-2 text-xs text-gray-400 w-8">{row.row_no}</td>
        <td className="px-3 py-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExam ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {typeLabel}
          </span>
        </td>
        {editing ? (
          <>
            <td className="px-2 py-1"><input type="date" className="input-field text-xs py-1" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></td>
            <td className="px-2 py-1"><input type="time" className="input-field text-xs py-1" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} /></td>
            <td className="px-2 py-1"><input className="input-field text-xs py-1 w-24" value={form.subject_name} onChange={e => set('subject_name', e.target.value)} placeholder="সাবজেক্ট" /></td>
            <td className="px-2 py-1"><input className="input-field text-xs py-1" value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="শিরোনাম" /></td>
            <td className="px-2 py-1"><input className="input-field text-xs py-1" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="বিস্তারিত" /></td>
            <td className="px-2 py-1">
              <select className="input-field text-xs py-1" value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">—</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </td>
            <td className="px-2 py-1">
              <select className="input-field text-xs py-1" value={form.zoom_account_id} onChange={e => set('zoom_account_id', e.target.value)}>
                <option value="">—</option>
                {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
              </select>
            </td>
            <td className="px-2 py-1">
              <select className="input-field text-xs py-1" value={form.class_mode} onChange={e => set('class_mode', e.target.value)}>
                <option value="online">অনলাইন</option>
                <option value="offline">অফলাইন</option>
              </select>
            </td>
            <td className="px-2 py-1"><input className="input-field text-xs py-1 w-20" value={form.location} onChange={e => set('location', e.target.value)} placeholder="স্থান" /></td>
            <td className="px-2 py-1">
              <select className="input-field text-xs py-1" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
            <td className="px-2 py-1">
              <div className="flex gap-1">
                <button onClick={save} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save size={13} /></button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={13} /></button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString('bn-BD') : '—'}</td>
            <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.scheduled_time || '—'}</td>
            <td className="px-3 py-2 text-xs text-primary-600 font-medium max-w-[100px] truncate">{row.subject_name || '—'}</td>
            <td className="px-3 py-2 text-sm max-w-[140px] truncate" title={row.topic}>{row.topic || '—'}</td>
            <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={row.notes}>{row.notes || '—'}</td>
            <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{teacher?.full_name || row.teacher_name || '—'}</td>
            <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{zoom?.account_name || row.zoom_account_name || '—'}</td>
            <td className="px-3 py-2 text-xs text-gray-500">{row.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন'}</td>
            <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.location || '—'}</td>
            <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
            <td className="px-3 py-2">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {row.status === 'scheduled' && row.row_type === 'class' && (
                  <button onClick={() => onFeedback(row)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="ফিডব্যাক"><CheckCircle size={13} /></button>
                )}
                <button onClick={() => setEditing(true)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="সম্পাদনা"><Edit2 size={13} /></button>
                <button onClick={del} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="মুছুন"><Trash2 size={13} /></button>
              </div>
            </td>
          </>
        )}
      </tr>
      {/* Insert after button row */}
      <tr className="opacity-0 hover:opacity-100 transition-opacity group/ins">
        <td colSpan={12} className="p-0 h-0">
          <button
            onClick={() => onInsertAfter(idx)}
            className="w-full flex items-center justify-center gap-1 text-xs text-primary-500 hover:bg-primary-50 py-0.5 transition-colors"
            title="এখানে নতুন সারি যোগ করুন"
          >
            <Plus size={11} /> সারি যোগ করুন
          </button>
        </td>
      </tr>
    </>
  );
}

// ── Preview Generated Row ─────────────────────────────────────────────────────
function GenRow({ row, idx, teachers, zooms, onChange, onDelete, onInsertAfter }) {
  const st = routineStatus(row);
  const isExam = row.row_type === 'exam';
  const set = (k, v) => onChange(idx, k, v);
  const dayLabel = row.scheduled_date ? DAY_LABELS[new Date(row.scheduled_date + 'T00:00:00').getDay()] : '—';
  const typeLabel = isExam ? `এক্সাম-${row.exam_no || ''}` : row.class_no ? `ক্লাস-${row.class_no}` : row.label || '';

  const cellCls = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-400 bg-white';

  return (
    <>
      <tr className={`border-t border-gray-100 ${isExam ? 'bg-purple-50/30' : ''}`}>
        <td className="px-2 py-1.5 text-center">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isExam ? 'bg-purple-100 text-purple-700' : row.label ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {typeLabel}
          </span>
        </td>
        <td className="px-2 py-1.5">
          <input type="date" className={cellCls} value={row.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
        </td>
        <td className="px-2 py-1.5 text-xs text-center text-gray-500 w-10">{dayLabel}</td>
        <td className="px-2 py-1.5">
          <input type="time" className={cellCls} value={row.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
        </td>
        <td className="px-2 py-1.5">
          <input className={cellCls} value={row.subject_name} onChange={e => set('subject_name', e.target.value)} placeholder="সাবজেক্ট" />
        </td>
        <td className="px-2 py-1.5">
          <input className={cellCls} value={row.topic} onChange={e => set('topic', e.target.value)} placeholder="শিরোনাম" />
        </td>
        <td className="px-2 py-1.5">
          <input className={cellCls} value={row.notes} onChange={e => set('notes', e.target.value)} placeholder="বিস্তারিত" />
        </td>
        <td className="px-2 py-1.5">
          <select className={cellCls} value={row.zoom_account_id} onChange={e => set('zoom_account_id', e.target.value)} disabled={isExam}>
            <option value="">—</option>
            {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <select className={cellCls} value={row.teacher_id} onChange={e => set('teacher_id', e.target.value)} disabled={isExam}>
            <option value="">—</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <select className={cellCls} value={row.class_mode} onChange={e => set('class_mode', e.target.value)}>
            <option value="online">অনলাইন</option>
            <option value="offline">অফলাইন</option>
          </select>
        </td>
        <td className="px-2 py-1.5">
          <input className={cellCls} value={row.location} onChange={e => set('location', e.target.value)} placeholder="স্থান" />
        </td>
        <td className="px-2 py-1.5 text-center">
          <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex gap-1">
            <button onClick={() => onInsertAfter(idx)} className="p-1 text-primary-400 hover:bg-primary-50 rounded" title="পরে সারি যোগ"><Plus size={12} /></button>
            <button onClick={() => onDelete(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
          </div>
        </td>
      </tr>
    </>
  );
}

// ── PDF Download Modal ─────────────────────────────────────────────────────────
const PDF_COLS = [
  { key: 'type_label', label: 'ক্রম' },
  { key: 'scheduled_date', label: 'তারিখ' },
  { key: 'day', label: 'বার' },
  { key: 'scheduled_time', label: 'সময়' },
  { key: 'subject_name', label: 'সাবজেক্ট' },
  { key: 'topic', label: 'শিরোনাম' },
  { key: 'notes', label: 'বিস্তারিত' },
  { key: 'zoom_account_name', label: 'জুম একাউন্ট' },
  { key: 'teacher_name', label: 'টিচার' },
  { key: 'class_mode', label: 'ধরণ' },
  { key: 'location', label: 'স্থান' },
  { key: 'status_label', label: 'স্ট্যাটাস' },
];

function PdfModal({ rows, batchName, teachers, zooms, onClose }) {
  const [selectedCols, setSelectedCols] = useState(PDF_COLS.map(c => c.key));
  const [coordinator, setCoordinator] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleCol = (k) => setSelectedCols(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);

  const enrichRow = (row) => {
    const t = teachers.find(x => x.id === row.teacher_id);
    const z = zooms.find(x => x.id === row.zoom_account_id);
    const isExam = row.row_type === 'exam';
    const d = row.scheduled_date?.split?.('T')[0] ?? row.scheduled_date;
    const st = routineStatus(row);
    return {
      ...row,
      type_label: isExam ? `এক্সাম-${row.class_no || row.exam_no || ''}` : row.label || `ক্লাস-${row.class_no || ''}`,
      day: d ? DAY_LABELS[new Date(d + 'T00:00:00').getDay()] : '',
      scheduled_date: d ? new Date(d + 'T00:00:00').toLocaleDateString('bn-BD') : '',
      teacher_name: t?.full_name || row.teacher_name || '',
      zoom_account_name: z?.account_name || row.zoom_account_name || '',
      class_mode: row.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
      status_label: st.label,
    };
  };

  const downloadPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Load logo
      let logoDataUrl = null;
      try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        logoDataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      } catch { /* no logo */ }

      const pageW = doc.internal.pageSize.getWidth();

      // Header
      if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 10, 6, 22, 22);
      doc.setFontSize(16).setFont('helvetica', 'bold');
      doc.text('Safollo Academy', pageW / 2, 13, { align: 'center' });
      doc.setFontSize(11).setFont('helvetica', 'normal');
      doc.text(`Class Routine — ${batchName}`, pageW / 2, 20, { align: 'center' });
      doc.setFontSize(9).setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-BD')}`, pageW / 2, 26, { align: 'center' });
      doc.setTextColor(0);

      // Table
      const cols = PDF_COLS.filter(c => selectedCols.includes(c.key));
      const enriched = rows.map(enrichRow);
      const body = enriched.map(r => cols.map(c => r[c.key] ?? ''));

      autoTable(doc, {
        head: [cols.map(c => c.label)],
        body,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 20 } },
        didParseCell: (data) => {
          // Highlight exam rows
          const row = enriched[data.row.index];
          if (row?.row_type === 'exam' && data.section === 'body') {
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY + 10;
      if (coordinator) {
        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text(`Academic Coordinator: ${coordinator}`, 10, finalY);
        doc.setLineWidth(0.3).line(10, finalY + 1, 80, finalY + 1);
      }

      // Page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8).setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
      }

      doc.save(`${batchName}_routine.pdf`);
      toast.success('PDF ডাউনলোড হয়েছে');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('PDF তৈরিতে সমস্যা হয়েছে');
    }
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">PDF ডাউনলোড সেটিংস</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">Academic Coordinator এর নাম</label>
          <input className="input-field" placeholder="নাম লিখুন" value={coordinator} onChange={e => setCoordinator(e.target.value)} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">কলাম নির্বাচন করুন</p>
          <div className="grid grid-cols-2 gap-2">
            {PDF_COLS.map(c => (
              <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" checked={selectedCols.includes(c.key)}
                  onChange={() => toggleCol(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={downloadPDF} disabled={generating || selectedCols.length === 0}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <FileDown size={15} /> {generating ? 'তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm hover:bg-gray-50">বাতিল</button>
        </div>
      </div>
    </div>
  );
}

// ── Auto Routine Generator ─────────────────────────────────────────────────────
function AutoRoutineGenerator({ batch, teachers, zooms, onSaved }) {
  const [cfg, setCfg] = useState({
    startDate: batch?.start_date?.split('T')[0] || '',
    days: [6, 1, 3],
    classTime: '21:00',
    examTime: '12:00',
    classMode: 'online',
    location: 'রিমোট',
    zoomAccountId: '',
    guidelineClasses: 3,
    revisionExamDay: 0,
    subjectivePerSubject: 2,
    modelTests: 2,
  });
  const [subjects, setSubjects] = useState([]);
  const [generatedRows, setGeneratedRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    if (batch?.plan_id) {
      academyApi.getPlanSubjects(batch.plan_id)
        .then(r => setSubjects((r.data || []).sort((a, b) => a.serial_no - b.serial_no)))
        .catch(() => {});
    }
  }, [batch?.plan_id]);

  const setC = (k, v) => setCfg(f => ({ ...f, [k]: v }));

  const toggleDay = (d) => {
    setCfg(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort((a, b) => a - b),
    }));
  };

  const findTeacher = (subjectName) => {
    for (const t of teachers) {
      const interests = t.teaching_interests || [];
      if (interests.some(item => item.subjects?.includes(subjectName))) return t;
    }
    return null;
  };

  const advanceToNextClassDay = (dateStr, days) => {
    let d = new Date(dateStr + 'T00:00:00');
    while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const generate = () => {
    if (!cfg.startDate) return toast.error('শুরুর তারিখ দিন');
    if (cfg.days.length === 0) return toast.error('ক্লাসের বার বেছে নিন');
    if (subjects.length === 0) return toast.error('প্ল্যানে কোনো সাবজেক্ট নেই — আগে কোর্স প্ল্যানে সাবজেক্ট যোগ করুন');

    const rows = [];
    const base = { class_mode: cfg.classMode, location: cfg.location, status: 'scheduled', zoom_account_id: cfg.zoomAccountId };

    // ── 1. Guideline classes (before startDate) ──
    const guidelineDates = findPrevClassDays(cfg.startDate, cfg.days, Number(cfg.guidelineClasses));
    guidelineDates.forEach((d, i) => {
      rows.push({
        _id: `g-${i}`,
        row_type: 'class',
        label: `গাইডলাইন-${i + 1}`,
        class_no: null,
        exam_no: null,
        scheduled_date: d,
        scheduled_time: cfg.classTime,
        subject_name: 'গাইডলাইন',
        topic: `গাইডলাইন ক্লাস ${i + 1}`,
        notes: '',
        teacher_id: '',
        ...base,
      });
    });

    // ── 2. Regular classes + daily exams ──
    let classNo = 1;
    let examNo = 1;
    let cur = cfg.startDate;

    for (const subj of subjects) {
      const teacher = findTeacher(subj.subject_name);
      const lectures = subj.lectures || [];

      if (lectures.length > 0) {
        for (const lec of lectures) {
          cur = advanceToNextClassDay(cur, cfg.days);
          rows.push({
            _id: `cls-${classNo}`,
            row_type: 'class',
            class_no: classNo,
            exam_no: null,
            label: null,
            scheduled_date: cur,
            scheduled_time: cfg.classTime,
            subject_name: subj.subject_name,
            topic: lec.title || '',
            notes: lec.details || '',
            teacher_id: teacher?.id || '',
            ...base,
          });
          classNo++;

          // exam next day
          const examDate = nextDate(cur, 1);
          rows.push({
            _id: `ex-${examNo}`,
            row_type: 'exam',
            class_no: null,
            exam_no: examNo,
            label: null,
            scheduled_date: examDate,
            scheduled_time: cfg.examTime,
            subject_name: subj.subject_name,
            topic: `পরীক্ষা — ${subj.subject_name} (${lec.title || `লেকচার ${lec.lecture_no}`})`,
            notes: '',
            teacher_id: '',
            zoom_account_id: '',
            class_mode: cfg.classMode,
            location: cfg.location,
            status: 'scheduled',
          });
          examNo++;

          // next class starts after exam day
          cur = nextDate(examDate, 1);
        }
      } else {
        // Subject has no lectures — just one class + exam
        cur = advanceToNextClassDay(cur, cfg.days);
        const teacher2 = findTeacher(subj.subject_name);
        rows.push({
          _id: `cls-${classNo}`,
          row_type: 'class',
          class_no: classNo,
          exam_no: null,
          label: null,
          scheduled_date: cur,
          scheduled_time: cfg.classTime,
          subject_name: subj.subject_name,
          topic: '',
          notes: '',
          teacher_id: teacher2?.id || '',
          ...base,
        });
        classNo++;
        const examDate = nextDate(cur, 1);
        rows.push({
          _id: `ex-${examNo}`,
          row_type: 'exam',
          class_no: null,
          exam_no: examNo,
          label: null,
          scheduled_date: examDate,
          scheduled_time: cfg.examTime,
          subject_name: subj.subject_name,
          topic: `পরীক্ষা — ${subj.subject_name}`,
          notes: '',
          teacher_id: '',
          zoom_account_id: '',
          class_mode: cfg.classMode,
          location: cfg.location,
          status: 'scheduled',
        });
        examNo++;
        cur = nextDate(examDate, 1);
      }
    }

    // ── 3. Revision exams (one per subject, on revisionExamDay) ──
    let revDate = cur;
    subjects.forEach((subj, i) => {
      revDate = findNextDay(revDate, Number(cfg.revisionExamDay));
      rows.push({
        _id: `rev-${i}`,
        row_type: 'exam',
        class_no: null,
        exam_no: examNo++,
        label: `রিভিশন`,
        scheduled_date: revDate,
        scheduled_time: cfg.examTime,
        subject_name: subj.subject_name,
        topic: `রিভিশন পরীক্ষা — ${subj.subject_name}`,
        notes: '',
        teacher_id: '',
        zoom_account_id: '',
        class_mode: cfg.classMode,
        location: cfg.location,
        status: 'scheduled',
      });
      revDate = nextDate(revDate, 1);
    });

    // ── 4. Subjective exams (2 per subject) ──
    let subjDate = revDate;
    subjects.forEach((subj) => {
      for (let q = 1; q <= Number(cfg.subjectivePerSubject); q++) {
        subjDate = findNextDay(subjDate, Number(cfg.revisionExamDay));
        rows.push({
          _id: `subj-${subj.id}-${q}`,
          row_type: 'exam',
          class_no: null,
          exam_no: examNo++,
          label: `সাবজেক্টিভ`,
          scheduled_date: subjDate,
          scheduled_time: cfg.examTime,
          subject_name: subj.subject_name,
          topic: `সাবজেক্টিভ পরীক্ষা ${q} — ${subj.subject_name}`,
          notes: '',
          teacher_id: '',
          zoom_account_id: '',
          class_mode: cfg.classMode,
          location: cfg.location,
          status: 'scheduled',
        });
        subjDate = nextDate(subjDate, 1);
      }
    });

    // ── 5. Model tests ──
    let modelDate = subjDate;
    for (let m = 1; m <= Number(cfg.modelTests); m++) {
      modelDate = advanceToNextClassDay(modelDate, cfg.days);
      rows.push({
        _id: `model-${m}`,
        row_type: 'exam',
        class_no: null,
        exam_no: examNo++,
        label: `মডেল-${m}`,
        scheduled_date: modelDate,
        scheduled_time: cfg.examTime,
        subject_name: 'মডেল টেস্ট',
        topic: `মডেল টেস্ট ${m}`,
        notes: '',
        teacher_id: '',
        zoom_account_id: '',
        class_mode: cfg.classMode,
        location: cfg.location,
        status: 'scheduled',
      });
      modelDate = nextDate(modelDate, 1);
    }

    setGeneratedRows(rows);
    toast.success(`${rows.length} টি সারি জেনারেট হয়েছে`);
  };

  const updateRow = (idx, field, value) => {
    setGeneratedRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const deleteRow = (idx) => {
    setGeneratedRows(prev => prev.filter((_, i) => i !== idx));
  };

  const insertAfter = (idx) => {
    const blank = {
      _id: `ins-${Date.now()}`,
      row_type: 'class',
      class_no: null,
      exam_no: null,
      label: '',
      scheduled_date: '',
      scheduled_time: cfg.classTime,
      subject_name: '',
      topic: '',
      notes: '',
      zoom_account_id: cfg.zoomAccountId,
      teacher_id: '',
      class_mode: cfg.classMode,
      location: cfg.location,
      status: 'scheduled',
    };
    setGeneratedRows(prev => [...prev.slice(0, idx + 1), blank, ...prev.slice(idx + 1)]);
  };

  const saveRoutine = async () => {
    if (generatedRows.length === 0) return;
    setSaving(true);
    try {
      await academyApi.bulkAddOutlineRows(batch.id, generatedRows);
      toast.success(`${generatedRows.length} টি সারি সেভ হয়েছে`);
      setGeneratedRows([]);
      onSaved();
    } catch { toast.error('সেভ করতে সমস্যা হয়েছে'); }
    setSaving(false);
  };

  const downloadExcel = () => {
    const data = generatedRows.map(r => {
      const t = teachers.find(x => x.id === r.teacher_id);
      const z = zooms.find(x => x.id === r.zoom_account_id);
      const isExam = r.row_type === 'exam';
      const d = r.scheduled_date;
      return {
        'ক্রম': isExam ? `এক্সাম-${r.exam_no || ''}` : r.label || `ক্লাস-${r.class_no || ''}`,
        'তারিখ': d ? new Date(d + 'T00:00:00').toLocaleDateString('bn-BD') : '',
        'বার': d ? DAY_LABELS[new Date(d + 'T00:00:00').getDay()] : '',
        'সময়': r.scheduled_time,
        'সাবজেক্ট': r.subject_name,
        'শিরোনাম': r.topic,
        'বিস্তারিত': r.notes,
        'জুম একাউন্ট': z?.account_name || '',
        'টিচার': t?.full_name || '',
        'ধরণ': r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
        'স্থান': r.location,
        'স্ট্যাটাস': routineStatus(r).label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'রুটিন');
    XLSX.writeFile(wb, `${batch.batch_name}_routine.xlsx`);
    toast.success('Excel ডাউনলোড হয়েছে');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-primary-100 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Wand2 size={15} className="text-primary-500" /> অটো রুটিন কনফিগারেশন
        </p>
        {subjects.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {subjects.length}টি সাবজেক্ট • {subjects.reduce((s, x) => s + (x.lectures?.length || 0), 0)} লেকচার
          </span>
        )}
      </div>

      {/* Config grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">শুরুর তারিখ (মূল ক্লাস)</label>
          <input type="date" className="input-field text-sm" value={cfg.startDate} onChange={e => setC('startDate', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">গাইডলাইন ক্লাস সংখ্যা</label>
          <input type="number" className="input-field text-sm" min="0" max="20" value={cfg.guidelineClasses} onChange={e => setC('guidelineClasses', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">ক্লাসের সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.classTime} onChange={e => setC('classTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">পরীক্ষার সময়</label>
          <input type="time" className="input-field text-sm" value={cfg.examTime} onChange={e => setC('examTime', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">রিভিশন পরীক্ষার বার</label>
          <select className="input-field text-sm" value={cfg.revisionExamDay} onChange={e => setC('revisionExamDay', Number(e.target.value))}>
            {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">সাবজেক্টিভ পরীক্ষা (প্রতি সাবজেক্টে)</label>
          <input type="number" className="input-field text-sm" min="0" max="10" value={cfg.subjectivePerSubject} onChange={e => setC('subjectivePerSubject', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">মডেল টেস্ট সংখ্যা</label>
          <input type="number" className="input-field text-sm" min="0" max="20" value={cfg.modelTests} onChange={e => setC('modelTests', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Zoom একাউন্ট</label>
          <select className="input-field text-sm" value={cfg.zoomAccountId} onChange={e => setC('zoomAccountId', e.target.value)}>
            <option value="">— বেছে নিন</option>
            {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">ক্লাসের ধরণ</label>
          <select className="input-field text-sm" value={cfg.classMode} onChange={e => setC('classMode', e.target.value)}>
            <option value="online">অনলাইন</option>
            <option value="offline">অফলাইন</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">স্থান</label>
          <input className="input-field text-sm" placeholder="রিমোট / ক্লাসরুম-১" value={cfg.location} onChange={e => setC('location', e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">ক্লাসের বার (একাধিক বেছে নিন)</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${cfg.days.includes(i) ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="flex gap-3 flex-wrap pt-1">
        <button onClick={generate}
          className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
          <Wand2 size={15} /> রুটিন জেনারেট করুন
        </button>
        {generatedRows.length > 0 && (
          <>
            <button onClick={saveRoutine} disabled={saving}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <Save size={15} /> {saving ? 'সেভ হচ্ছে...' : `রুটিন সেভ করুন (${generatedRows.length} সারি)`}
            </button>
            <button onClick={() => setShowPdfModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <FileDown size={15} /> PDF
            </button>
            <button onClick={downloadExcel}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button onClick={() => setGeneratedRows([])}
              className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm transition-colors">
              বাতিল
            </button>
          </>
        )}
      </div>

      {/* Preview table */}
      {generatedRows.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700 font-medium border-b border-amber-100 flex items-center justify-between">
            <span>প্রিভিউ — সেভ করার আগে যেকোনো ঘর সম্পাদনা করুন | <span className="text-primary-600">+ বাটন চাপলে নতুন সারি যোগ হবে</span></span>
            <span className="text-gray-500">{generatedRows.length} সারি</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{width:90}} /><col style={{width:100}} /><col style={{width:40}} />
                <col style={{width:88}} /><col style={{width:110}} /><col style={{width:130}} />
                <col style={{width:120}} /><col style={{width:110}} /><col style={{width:100}} />
                <col style={{width:80}} /><col style={{width:90}} /><col style={{width:70}} /><col style={{width:50}} />
              </colgroup>
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট নাম','শিরোনাম','বিস্তারিত','জুম একাউন্ট','টিচার নাম','ক্লাসের ধরণ','স্থান','ক্লাস স্ট্যাটাস',''].map((h, i) => (
                    <th key={i} className="px-2 py-2.5 text-left text-xs font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generatedRows.map((row, idx) => (
                  <GenRow key={row._id} row={row} idx={idx} teachers={teachers} zooms={zooms}
                    onChange={updateRow} onDelete={deleteRow} onInsertAfter={insertAfter} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPdfModal && (
        <PdfModal
          rows={generatedRows}
          batchName={batch.batch_name}
          teachers={teachers}
          zooms={zooms}
          onClose={() => setShowPdfModal(false)}
        />
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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [insertAfterIdx, setInsertAfterIdx] = useState(null);
  const [addForm, setAddForm] = useState({
    row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', subject_name: '',
    teacher_id: '', zoom_account_id: '', class_type: 'regular', class_mode: 'online', location: '', notes: '',
  });

  const loadOutline = () => academyApi.getBatchOutline(id).then(r => setOutline(r.data || []));

  useEffect(() => {
    academyApi.getBatches().then(r => { const b = (r.data || []).find(x => x.id === id); setBatch(b); });
    academyApi.getTeachers().then(r => setTeachers(r.data || []));
    academyApi.getZoomAccounts().then(r => setZooms(r.data || []));
    loadOutline();
  }, [id]);

  const addRow = async (afterRowNo) => {
    try {
      await academyApi.addOutlineRow(id, { ...addForm, after_row_no: afterRowNo });
      toast.success('সারি যোগ হয়েছে');
      setShowAddForm(false);
      setInsertAfterIdx(null);
      setAddForm({ row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', subject_name: '', teacher_id: '', zoom_account_id: '', class_type: 'regular', class_mode: 'online', location: '', notes: '' });
      loadOutline();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const handleInsertAfter = (idx) => {
    setInsertAfterIdx(idx);
    setShowAddForm(true);
    setShowGenerator(false);
  };

  const set = (k, v) => setAddForm(f => ({ ...f, [k]: v }));
  const classRows = outline.filter(r => r.row_type === 'class');
  const examRows = outline.filter(r => r.row_type === 'exam');
  const doneRows = outline.filter(r => r.status === 'done' || r.feedback_status === 'approved');

  const downloadSavedExcel = () => {
    const data = outline.map(r => {
      const t = teachers.find(x => x.id === r.teacher_id);
      const z = zooms.find(x => x.id === r.zoom_account_id);
      const isExam = r.row_type === 'exam';
      const d = r.scheduled_date?.split?.('T')[0] ?? r.scheduled_date;
      return {
        '#': r.row_no,
        'ক্রম': isExam ? `এক্সাম-${r.class_no || ''}` : `ক্লাস-${r.class_no || ''}`,
        'তারিখ': d ? new Date(d + 'T00:00:00').toLocaleDateString('bn-BD') : '',
        'বার': d ? DAY_LABELS[new Date(d + 'T00:00:00').getDay()] : '',
        'সময়': r.scheduled_time,
        'সাবজেক্ট': r.subject_name,
        'শিরোনাম': r.topic,
        'বিস্তারিত': r.notes,
        'জুম': z?.account_name || r.zoom_account_name || '',
        'টিচার': t?.full_name || r.teacher_name || '',
        'ধরণ': r.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন',
        'স্থান': r.location,
        'স্ট্যাটাস': routineStatus(r).label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'রুটিন');
    XLSX.writeFile(wb, `${batch?.batch_name}_routine.xlsx`);
    toast.success('Excel ডাউনলোড হয়েছে');
  };

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
          <span><span className="font-semibold text-gray-700">{classRows.length}</span> ক্লাস</span>
          <span><span className="font-semibold text-gray-700">{examRows.length}</span> পরীক্ষা</span>
          <span><span className="font-semibold text-green-600">{doneRows.length}</span> সম্পন্ন</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => { setShowGenerator(s => !s); setShowAddForm(false); setInsertAfterIdx(null); }}
          className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors ${showGenerator ? 'bg-primary-600 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white'}`}>
          <Wand2 size={15} /> অটো রুটিন তৈরি
        </button>
        <button onClick={() => { setShowAddForm(s => !s); setShowGenerator(false); setInsertAfterIdx(null); }}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">
          <Plus size={15} /> ম্যানুয়াল সারি
        </button>
        {outline.length > 0 && (
          <>
            <button onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border-2 border-red-200 bg-white hover:bg-red-50 text-red-600 transition-colors">
              <FileDown size={15} /> PDF
            </button>
            <button onClick={downloadSavedExcel}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border-2 border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 transition-colors">
              <FileSpreadsheet size={15} /> Excel
            </button>
          </>
        )}
      </div>

      {/* Auto-routine generator */}
      {showGenerator && batch && (
        <AutoRoutineGenerator
          batch={batch}
          teachers={teachers}
          zooms={zooms}
          onSaved={() => { loadOutline(); setShowGenerator(false); }}
        />
      )}

      {/* Manual add / insert form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gray-400 rounded-full"></div>
            <p className="text-sm font-semibold text-gray-700">
              {insertAfterIdx !== null ? `সারি ${outline[insertAfterIdx]?.row_no} এর পরে নতুন সারি` : 'ম্যানুয়াল সারি যোগ করুন'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">ধরন</label>
              <select className="input-field text-sm" value={addForm.row_type} onChange={e => set('row_type', e.target.value)}>
                <option value="class">ক্লাস</option>
                <option value="exam">পরীক্ষা</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">সাবজেক্ট</label>
              <input className="input-field text-sm" placeholder="সাবজেক্ট নাম" value={addForm.subject_name} onChange={e => set('subject_name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">শিরোনাম</label>
              <input className="input-field text-sm" placeholder="ক্লাসের বিষয়" value={addForm.topic} onChange={e => set('topic', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">তারিখ</label>
              <input type="date" className="input-field text-sm" value={addForm.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">সময়</label>
              <input type="time" className="input-field text-sm" value={addForm.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">শিক্ষক</label>
              <select className="input-field text-sm" value={addForm.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">বেছে নিন</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Zoom Account</label>
              <select className="input-field text-sm" value={addForm.zoom_account_id} onChange={e => set('zoom_account_id', e.target.value)}>
                <option value="">বেছে নিন</option>
                {zooms.map(z => <option key={z.id} value={z.id}>{z.account_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">ধরণ / স্থান</label>
              <div className="flex gap-2">
                <select className="input-field text-sm flex-1" value={addForm.class_mode} onChange={e => set('class_mode', e.target.value)}>
                  <option value="online">অনলাইন</option>
                  <option value="offline">অফলাইন</option>
                </select>
                <input className="input-field text-sm flex-1" placeholder="স্থান" value={addForm.location} onChange={e => set('location', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => addRow(insertAfterIdx !== null ? outline[insertAfterIdx]?.row_no : null)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-8 py-2.5 rounded-xl transition-colors text-sm">যোগ করুন</button>
            <button onClick={() => { setShowAddForm(false); setInsertAfterIdx(null); }}
              className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-6 py-2.5 rounded-xl border-2 border-gray-200 transition-colors text-sm">বাতিল</button>
          </div>
        </div>
      )}

      {/* Saved outline table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {outline.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="mb-2">কোনো রুটিন নেই</p>
            <p className="text-sm">উপরে "অটো রুটিন তৈরি" বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
              <colgroup>
                <col style={{width:36}} /><col style={{width:80}} /><col style={{width:90}} />
                <col style={{width:76}} /><col style={{width:90}} /><col style={{width:130}} />
                <col style={{width:120}} /><col style={{width:95}} /><col style={{width:95}} />
                <col style={{width:68}} /><col style={{width:76}} /><col style={{width:72}} /><col style={{width:90}} />
              </colgroup>
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  {['#','ধরন','তারিখ','সময়','সাবজেক্ট','শিরোনাম','বিস্তারিত','শিক্ষক','Zoom','ধরণ','স্থান','স্ট্যাটাস',''].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outline.map((row, idx) => (
                  <OutlineRow key={row.id} row={row} idx={idx} teachers={teachers} zooms={zooms}
                    onRefresh={loadOutline} onFeedback={setFeedbackRow} onInsertAfter={handleInsertAfter} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {feedbackRow && (
        <FeedbackModal
          outlineRow={feedbackRow}
          teachers={teachers}
          onClose={() => setFeedbackRow(null)}
          onDone={() => { setFeedbackRow(null); loadOutline(); }}
        />
      )}

      {showPdfModal && outline.length > 0 && (
        <PdfModal
          rows={outline}
          batchName={batch?.batch_name || 'রুটিন'}
          teachers={teachers}
          zooms={zooms}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
