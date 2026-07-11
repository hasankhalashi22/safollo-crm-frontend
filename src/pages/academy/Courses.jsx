import { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, BookMarked, Save, X, BookOpen, GripVertical } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

// ── Lectures Editor (full modal) ──────────────────────────────────────────────
function LecturesModal({ subject, onClose, onSaved }) {
  const [rows, setRows] = useState(
    (subject.lectures || []).length > 0
      ? subject.lectures.map(l => ({ ...l, _key: l.id }))
      : [{ _key: Date.now(), title: '', duration_min: 60, is_practical: false }]
  );

  const addRow = () =>
    setRows(r => [...r, { _key: Date.now(), title: '', duration_min: 60, is_practical: false }]);

  const del = (key) => setRows(r => r.filter(x => x._key !== key));

  const set = (key, k, v) =>
    setRows(r => r.map(x => x._key === key ? { ...x, [k]: v } : x));

  const save = async () => {
    const valid = rows.filter(r => r.title.trim());
    if (!valid.length) return toast.error('অন্তত একটি লেকচারের শিরোনাম দিন');
    try {
      await academyApi.saveLectures(subject.id, valid.map(r => ({
        title: r.title.trim(),
        duration_min: Number(r.duration_min) || 60,
        is_practical: !!r.is_practical,
      })));
      toast.success('লেকচার সংরক্ষিত হয়েছে');
      onSaved();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">লেকচার সম্পাদনা</p>
            <h3 className="font-semibold text-gray-800">{subject.subject_name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">লেকচারের শিরোনাম</th>
                  <th className="px-4 py-3 text-center w-32">সময় (মিনিট)</th>
                  <th className="px-4 py-3 text-center w-28">প্র্যাক্টিক্যাল</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r._key} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        className="input py-2 text-sm"
                        placeholder={`লেকচার ${i + 1} এর শিরোনাম`}
                        value={r.title}
                        onChange={e => set(r._key, 'title', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addRow()}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        className="input py-2 text-sm text-center"
                        value={r.duration_min}
                        onChange={e => set(r._key, 'duration_min', e.target.value)}
                        min={1}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary-600"
                          checked={!!r.is_practical}
                          onChange={e => set(r._key, 'is_practical', e.target.checked)}
                        />
                      </label>
                    </td>
                    <td className="px-3 py-2.5">
                      {rows.length > 1 && (
                        <button onClick={() => del(r._key)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 px-1"
          >
            <Plus size={15} /> নতুন লেকচার যোগ
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-gray-400">{rows.filter(r => r.title.trim()).length} টি লেকচার</p>
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
function SubjectRow({ subject, onRefresh, onEditLectures }) {
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
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors group">
      <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs font-mono flex items-center justify-center flex-shrink-0">
        {subject.serial_no}
      </span>

      {editing ? (
        <>
          <input
            className="input flex-1 py-1.5 text-sm"
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
            className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <BookOpen size={13} />
            {lectureCount > 0 ? `${lectureCount} লেকচার` : 'লেকচার যোগ'}
          </button>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  const [lectureModal, setLectureModal] = useState(null); // subject object

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
    await academyApi.deletePlan(plan.id);
    onRefresh();
  };

  return (
    <>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Plan header */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          <button className="text-gray-400 flex-shrink-0">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="text-xs bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
            v{plan.version}
          </span>
          <span className="font-medium text-gray-700 flex-1 text-sm">{plan.plan_name}</span>

          {plan.is_active && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">সক্রিয়</span>
          )}
          <span className="text-xs text-gray-400">
            {subjects.length > 0 ? `${subjects.length} বিষয়` : plan.subject_count > 0 ? `${plan.subject_count} বিষয়` : 'কোনো বিষয় নেই'}
          </span>
          <button
            onClick={e => { e.stopPropagation(); delPlan(); }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Subjects */}
        {open && (
          <div className="px-4 py-3 space-y-2">
            {loadingSubjects ? (
              <p className="text-sm text-gray-400 py-2">লোড হচ্ছে...</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">কোনো বিষয় নেই। নিচে থেকে যোগ করুন।</p>
            ) : (
              subjects.map(s => (
                <SubjectRow
                  key={s.id}
                  subject={s}
                  onRefresh={loadSubjects}
                  onEditLectures={setLectureModal}
                />
              ))
            )}

            {/* Add subject */}
            {showAdd ? (
              <div className="flex gap-2 pt-1">
                <input
                  className="input flex-1 text-sm py-2"
                  placeholder="নতুন বিষয়ের নাম লিখুন..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubject(); if (e.key === 'Escape') setShowAdd(false); }}
                  autoFocus
                />
                <button onClick={addSubject} className="btn-primary text-sm px-4">যোগ</button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-3">বাতিল</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 pt-1 px-1"
              >
                <Plus size={14} /> নতুন বিষয় যোগ করুন
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lecture modal */}
      {lectureModal && (
        <LecturesModal
          subject={lectureModal}
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
              className="input flex-1 font-semibold"
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
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
          {plans.length === 0 && !showPlanForm && (
            <p className="text-sm text-gray-400">কোনো প্ল্যান নেই।</p>
          )}

          {plans.map(p => (
            <PlanCard key={p.id} plan={p} onRefresh={loadPlans} />
          ))}

          {/* Add plan form */}
          {showPlanForm ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-600">নতুন কোর্স প্ল্যান</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label text-xs">প্ল্যানের নাম *</label>
                  <input
                    className="input"
                    placeholder="যেমন: ব্যাসিক ব্যাচ প্ল্যান"
                    value={planForm.plan_name}
                    onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPlan()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label text-xs">মোট ক্লাস</label>
                  <input
                    type="number"
                    className="input"
                    value={planForm.total_classes}
                    onChange={e => setPlanForm(f => ({ ...f, total_classes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addPlan} className="btn-primary text-sm">প্ল্যান যোগ করুন</button>
                <button onClick={() => setShowPlanForm(false)} className="btn-secondary text-sm">বাতিল</button>
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
              className="input flex-1"
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
