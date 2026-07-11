import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, BookMarked, Save, X, BookOpen, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ── Template download helpers ─────────────────────────────────────────────────
function downloadPlanTemplate() {
  const wb = XLSX.utils.book_new();
  // Sheet 1: Bangla (sample)
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['শিরোনাম', 'বিস্তারিত'],
    ['বাংলা ব্যাকরণ পরিচিতি', 'সন্ধি, সমাস, কারক সম্পর্কে প্রাথমিক ধারণা'],
    ['বর্ণমালা ও উচ্চারণ', 'স্বরবর্ণ ও ব্যঞ্জনবর্ণের বিস্তারিত আলোচনা'],
  ]);
  // Sheet 2: English (sample)
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['শিরোনাম', 'বিস্তারিত'],
    ['Parts of Speech', 'Noun, Pronoun, Verb, Adjective introduction'],
    ['Tense', 'Present, Past, Future tense with examples'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Bangla');
  XLSX.utils.book_append_sheet(wb, ws2, 'English');
  XLSX.writeFile(wb, 'plan_import_template.xlsx');
}

function downloadSubjectTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['শিরোনাম', 'বিস্তারিত'],
    ['লেকচার ১ এর শিরোনাম', 'এখানে বিস্তারিত লিখুন'],
    ['লেকচার ২ এর শিরোনাম', 'এখানে বিস্তারিত লিখুন'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Lectures');
  XLSX.writeFile(wb, 'subject_import_template.xlsx');
}

// Subject color palette — header bg + light row stripe
const SUBJECT_COLORS = [
  { header: 'bg-violet-600', stripe: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  { header: 'bg-blue-600',   stripe: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',     border: 'border-blue-200'   },
  { header: 'bg-teal-600',   stripe: 'bg-teal-50',   badge: 'bg-teal-100 text-teal-700',     border: 'border-teal-200'   },
  { header: 'bg-orange-500', stripe: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  { header: 'bg-rose-600',   stripe: 'bg-rose-50',   badge: 'bg-rose-100 text-rose-700',     border: 'border-rose-200'   },
  { header: 'bg-emerald-600',stripe: 'bg-emerald-50',badge: 'bg-emerald-100 text-emerald-700',border:'border-emerald-200'},
  { header: 'bg-amber-500',  stripe: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700',   border: 'border-amber-200'  },
  { header: 'bg-indigo-600', stripe: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
];

// Column header colors
const COL_COLORS = {
  serial:   'bg-gray-500 text-white',
  lectureNo:'bg-blue-500 text-white',
  title:    'bg-teal-600 text-white',
  details:  'bg-violet-600 text-white',
};

// ── Lectures Editor (full modal) ──────────────────────────────────────────────
function LecturesModal({ subject, colorIdx, onClose, onSaved }) {
  const clr = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];

  const [rows, setRows] = useState(
    (subject.lectures || []).length > 0
      ? subject.lectures.map(l => ({ _key: l.id, title: l.title || '', details: l.details || '' }))
      : [{ _key: Date.now(), title: '', details: '' }]
  );

  const addRow = () => setRows(r => [...r, { _key: Date.now(), title: '', details: '' }]);
  const del = (key) => setRows(r => r.filter(x => x._key !== key));
  const set = (key, k, v) => setRows(r => r.map(x => x._key === key ? { ...x, [k]: v } : x));

  const save = async () => {
    const valid = rows.filter(r => r.title.trim());
    if (!valid.length) return toast.error('অন্তত একটি লেকচারের শিরোনাম দিন');
    try {
      await academyApi.saveLectures(subject.id, valid.map(r => ({
        title: r.title.trim(),
        details: r.details.trim(),
      })));
      toast.success('লেকচার সংরক্ষিত হয়েছে');
      onSaved();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const validCount = rows.filter(r => r.title.trim()).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl">

        {/* Colored header */}
        <div className={`${clr.header} px-6 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-white/70 text-xs mb-0.5">লেকচার সম্পাদনা</p>
            <h3 className="font-bold text-white text-lg">{subject.subject_name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Table */}
        <div className="p-5">
          <div className={`rounded-xl border-2 ${clr.border}`}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`${COL_COLORS.serial} px-4 py-3 text-left text-xs font-semibold w-20`}>ক্রমিক নং</th>
                  <th className={`${COL_COLORS.lectureNo} px-4 py-3 text-left text-xs font-semibold w-24`}>লেকচার নং</th>
                  <th className={`${COL_COLORS.title} px-4 py-3 text-left text-xs font-semibold`}>শিরোনাম</th>
                  <th className={`${COL_COLORS.details} px-4 py-3 text-left text-xs font-semibold`}>বিস্তারিত</th>
                  <th className="bg-gray-100 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r._key} className={`border-t-2 ${clr.border} ${i % 2 === 0 ? 'bg-white' : clr.stripe}`}>
                    {/* Auto serial */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold ${clr.badge}`} style={{lineHeight:'1.7'}}>
                        {i + 1}
                      </span>
                    </td>
                    {/* Auto lecture no */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-blue-100 text-blue-700">
                        L-{String(i + 1).padStart(2, '0')}
                      </span>
                    </td>
                    {/* Title input */}
                    <td className="px-3 py-2">
                      <input
                        className="input-field text-sm w-full"
                        placeholder={`লেকচার ${i + 1} এর শিরোনাম`}
                        value={r.title}
                        onChange={e => set(r._key, 'title', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addRow()}
                      />
                    </td>
                    {/* Details input */}
                    <td className="px-3 py-2">
                      <input
                        className="input-field text-sm w-full"
                        placeholder="বিস্তারিত বিবরণ (ঐচ্ছিক)"
                        value={r.details}
                        onChange={e => set(r._key, 'details', e.target.value)}
                      />
                    </td>
                    {/* Delete */}
                    <td className="px-2 py-2 text-center">
                      {rows.length > 1 && (
                        <button onClick={() => del(r._key)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addRow} className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 px-1 font-medium">
            <Plus size={15} /> নতুন লেকচার যোগ
          </button>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t-2 ${clr.border} ${clr.stripe}`}>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${clr.badge}`}>
            {validCount} টি লেকচার
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">বাতিল</button>
            <button onClick={save} className="btn-primary flex items-center gap-2">
              <Save size={15} /> সংরক্ষণ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subject row ───────────────────────────────────────────────────────────────
function SubjectRow({ subject, colorIdx, onRefresh, onEditLectures, onImportExcel }) {
  const clr = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
  const fileRef = useRef();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.subject_name);

  const save = async () => {
    if (!name.trim()) return;
    await academyApi.updateSubject(subject.id, { subject_name: name });
    toast.success('আপডেট হয়েছে');
    setEditing(false);
    onRefresh();
  };

  const del = async () => {
    if (!confirm('এই বিষয়টি মুছে ফেলবেন?')) return;
    await academyApi.deleteSubject(subject.id);
    onRefresh();
  };

  const lectureCount = subject.lecture_count || (subject.lectures || []).length || 0;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white border-2 ${clr.border} rounded-xl hover:shadow-sm transition-all group`}>
      <span className={`min-w-[2rem] min-h-[2.25rem] px-2 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${clr.badge}`} style={{lineHeight:'1.7'}}>
        {subject.serial_no}
      </span>

      {editing ? (
        <>
          <input
            className="input-field flex-1 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
          <button onClick={save} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save size={15} /></button>
          <button onClick={() => { setName(subject.subject_name); setEditing(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={15} /></button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-gray-700 flex-1">{subject.subject_name}</span>

          {/* Lecture count + edit button */}
          <button
            onClick={() => onEditLectures(subject)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${clr.badge} hover:opacity-80`}
          >
            <BookOpen size={13} />
            {lectureCount > 0 ? `${lectureCount} লেকচার` : 'লেকচার যোগ'}
          </button>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              title="Excel থেকে লেকচার ইমপোর্ট"
              onClick={() => fileRef.current?.click()}
              className="p-1.5 hover:bg-green-50 rounded-lg text-green-500"
            >
              <Upload size={14} />
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { if (e.target.files[0]) { onImportExcel(subject.id, e.target.files[0]); e.target.value = ''; } }} />
            <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400"><Edit2 size={14} /></button>
            <button onClick={del} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [lectureModal, setLectureModal] = useState(null);
  const planFileRef = useRef();

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    const r = await academyApi.getPlanSubjects(plan.id);
    setSubjects(r.data || []);
    setLoadingSubjects(false);
  };

  useEffect(() => { if (open) loadSubjects(); }, [open]);

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    await academyApi.createSubject(plan.id, { subject_name: newSubject });
    setNewSubject(''); setShowAdd(false); loadSubjects();
  };

  const delPlan = async () => {
    if (!confirm('এই প্ল্যানটি মুছে ফেলবেন?')) return;
    await academyApi.deletePlan(plan.id); onRefresh();
  };

  const importPlanFile = async (file) => {
    try {
      toast.loading('ইমপোর্ট হচ্ছে...');
      const r = await academyApi.importPlanExcel(plan.id, file);
      toast.dismiss();
      toast.success(`${r.data?.imported || 0} টি বিষয় ইমপোর্ট হয়েছে`);
      if (!open) setOpen(true); else loadSubjects();
    } catch { toast.dismiss(); toast.error('ইমপোর্ট ব্যর্থ হয়েছে'); }
  };

  const importSubjectFile = async (subjectId, file) => {
    try {
      toast.loading('লেকচার ইমপোর্ট হচ্ছে...');
      const r = await academyApi.importSubjectExcel(subjectId, file);
      toast.dismiss();
      toast.success(`${r.data?.imported || 0} টি লেকচার ইমপোর্ট হয়েছে`);
      loadSubjects();
    } catch { toast.dismiss(); toast.error('ইমপোর্ট ব্যর্থ হয়েছে'); }
  };

  // Totals
  const subjectCount = subjects.length > 0 ? subjects.length : (plan.subject_count || 0);
  const totalLectures = subjects.reduce((s, sub) => s + Number(sub.lecture_count || 0), 0);

  return (
    <>
      <div className="border-2 border-gray-100 rounded-2xl">
        {/* Plan header */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-t-2xl cursor-pointer hover:bg-gray-100 transition-colors group"
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-gray-400 flex-shrink-0">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2.5 py-1 rounded-full">
            v{plan.version}
          </span>
          <span className="font-semibold text-gray-700 flex-1">{plan.plan_name}</span>

          {plan.is_active && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">সক্রিয়</span>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
              {subjectCount} বিষয়
            </span>
            {totalLectures > 0 && (
              <span className="bg-primary-50 border border-primary-100 text-primary-600 px-2.5 py-1 rounded-lg font-medium">
                {totalLectures} লেকচার
              </span>
            )}
          </div>

          {/* Import plan Excel */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button title="Excel দিয়ে পুরো প্ল্যান ইমপোর্ট" onClick={() => planFileRef.current?.click()}
              className="p-1.5 hover:bg-green-50 rounded-lg text-green-500 flex items-center gap-1 text-xs">
              <FileSpreadsheet size={14} /> ইমপোর্ট
            </button>
            <input ref={planFileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { if (e.target.files[0]) { importPlanFile(e.target.files[0]); e.target.value = ''; } }} />
            <button onClick={delPlan} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Subjects — indented */}
        {open && (
          <div className="pl-8 pr-4 py-3 space-y-2 border-t border-gray-100">
            {/* Left border accent */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 rounded-full -ml-4"></div>

              {loadingSubjects ? (
                <p className="text-sm text-gray-400 py-2 pl-2">লোড হচ্ছে...</p>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 pl-2">কোনো বিষয় নেই।</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((s, idx) => (
                    <SubjectRow
                      key={s.id}
                      subject={s}
                      colorIdx={idx}
                      onRefresh={loadSubjects}
                      onEditLectures={(subj) => setLectureModal({ subject: subj, colorIdx: idx })}
                      onImportExcel={importSubjectFile}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Add subject + template download */}
            <div className="pt-1 flex items-center gap-3">
              {showAdd ? (
                <div className="flex gap-2 flex-1">
                  <input
                    className="input-field flex-1 text-sm"
                    placeholder="নতুন বিষয়ের নাম..."
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubject(); if (e.key === 'Escape') setShowAdd(false); }}
                    autoFocus
                  />
                  <button onClick={addSubject} className="btn-primary text-sm px-4">যোগ</button>
                  <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-3">বাতিল</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
                    <Plus size={14} /> নতুন বিষয়
                  </button>
                  <span className="text-gray-200">|</span>
                  <button onClick={downloadPlanTemplate}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                    <Download size={12} /> প্ল্যান টেমপ্লেট
                  </button>
                  <button onClick={downloadSubjectTemplate}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                    <Download size={12} /> বিষয় টেমপ্লেট
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {lectureModal && (
        <LecturesModal
          subject={lectureModal.subject}
          colorIdx={lectureModal.colorIdx}
          onClose={() => setLectureModal(null)}
          onSaved={() => { setLectureModal(null); loadSubjects(); }}
        />
      )}
    </>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(false);
  const [courseName, setCourseName] = useState(course.course_name);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ plan_name: '', total_classes: 24 });

  const loadPlans = () => academyApi.getCoursePlans(course.id).then(r => setPlans(r.data || []));
  useEffect(() => { if (open) loadPlans(); }, [open]);

  const saveCourse = async () => {
    if (!courseName.trim()) return;
    await academyApi.updateCourse(course.id, { course_name: courseName });
    toast.success('কোর্স আপডেট হয়েছে');
    setEditing(false);
    onRefresh();
  };

  const delCourse = async () => {
    if (!confirm('কোর্সটি মুছে ফেলবেন?')) return;
    await academyApi.deleteCourse(course.id);
    onRefresh();
  };

  const addPlan = async () => {
    if (!planForm.plan_name.trim()) return toast.error('প্ল্যানের নাম দিন');
    await academyApi.createPlan(course.id, planForm);
    toast.success('প্ল্যান যোগ হয়েছে');
    setShowPlanForm(false);
    setPlanForm({ plan_name: '', total_classes: 24 });
    loadPlans();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Course header */}
      <div className="flex items-center gap-4 px-5 py-4 group">
        <button
          onClick={() => setOpen(o => !o)}
          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
        >
          {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <BookMarked size={18} className="text-primary-500" />
        </div>

        {editing ? (
          <>
            <input
              className="input-field flex-1 font-semibold"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCourse(); if (e.key === 'Escape') { setCourseName(course.course_name); setEditing(false); } }}
              autoFocus
            />
            <button onClick={saveCourse} className="p-2 text-green-600 hover:bg-green-50 rounded-xl flex-shrink-0"><Save size={16} /></button>
            <button onClick={() => { setCourseName(course.course_name); setEditing(false); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl flex-shrink-0"><X size={16} /></button>
          </>
        ) : (
          <>
            <div className="flex-1 cursor-pointer" onClick={() => setOpen(o => !o)}>
              <p className="font-semibold text-gray-800">{course.course_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {course.course_code} · {course.plan_count || 0} টি প্ল্যান
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="p-2 hover:bg-blue-50 rounded-xl text-blue-400"><Edit2 size={15} /></button>
              <button onClick={delCourse} className="p-2 hover:bg-red-50 rounded-xl text-red-400"><Trash2 size={15} /></button>
            </div>
          </>
        )}
      </div>

      {/* Plans section */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
          {plans.length === 0 && !showPlanForm && (
            <p className="text-sm text-gray-400">কোনো প্ল্যান নেই।</p>
          )}

          {plans.map(p => (
            <PlanCard key={p.id} plan={p} onRefresh={loadPlans} />
          ))}

          {/* Add plan form */}
          {showPlanForm ? (
            <div className="border-2 border-primary-200 rounded-2xl p-5 space-y-4 bg-primary-50/40">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
                <p className="text-base font-semibold text-gray-700">নতুন কোর্স প্ল্যান</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-600">প্ল্যানের নাম <span className="text-red-500">*</span></label>
                  <input
                    className="input-field text-base"
                    placeholder="যেমন: ব্যাসিক ব্যাচ প্ল্যান"
                    value={planForm.plan_name}
                    onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPlan()}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-600">মোট ক্লাস</label>
                  <input
                    type="number"
                    className="input-field text-base"
                    value={planForm.total_classes}
                    onChange={e => setPlanForm(f => ({ ...f, total_classes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={addPlan} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">প্ল্যান যোগ করুন</button>
                <button onClick={() => setShowPlanForm(false)} className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-5 py-2.5 rounded-xl border-2 border-gray-200 transition-colors text-sm">বাতিল</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPlanForm(true)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 border border-dashed border-primary-200 hover:border-primary-300 rounded-xl px-4 py-2.5 w-full justify-center transition-colors"
            >
              <Plus size={15} /> নতুন প্ল্যান যোগ করুন
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const load = () => {
    setLoading(true);
    academyApi.getCourses().then(r => { setCourses(r.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const addCourse = async () => {
    if (!newName.trim()) return toast.error('কোর্সের নাম দিন');
    await academyApi.createCourse({ course_name: newName });
    toast.success('কোর্স যোগ হয়েছে');
    setNewName('');
    setShowNew(false);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">কোর্স ও প্ল্যান</h1>
          <p className="text-sm text-gray-400 mt-0.5">কোর্স → প্ল্যান → বিষয় → লেকচার</p>
        </div>
        <button onClick={() => { setShowNew(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> নতুন কোর্স
        </button>
      </div>

      {/* New course form */}
      {showNew && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">নতুন কোর্স যোগ করুন</p>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="কোর্সের নাম লিখুন..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCourse(); if (e.key === 'Escape') setShowNew(false); }}
              autoFocus
            />
            <button onClick={addCourse} className="btn-primary px-6">যোগ করুন</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">বাতিল</button>
          </div>
        </div>
      )}

      {/* Course list */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">লোড হচ্ছে...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookMarked size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">কোনো কোর্স নেই</p>
          <p className="text-gray-400 text-sm mt-1">উপরে "নতুন কোর্স" বাটনে ক্লিক করে শুরু করুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(c => <CourseCard key={c.id} course={c} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}
