import { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, BookMarked, BookOpen, List, GripVertical, Save, X } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

// ── Lectures inline table ─────────────────────────────────
function LecturesEditor({ subjectId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academyApi.getPlanSubjects(subjectId).then(r => {
      // We load lectures indirectly; for now init with empty
      setLoading(false);
    });
    // Actually lectures come under subject. We need a separate endpoint.
    // Use a simple approach: load the subject's lectures from batch outline context.
    // Since the API doesn't have a direct get-lectures route, we'll manage locally.
    setRows([{ id: Date.now(), title: '', duration_min: 60, is_practical: false }]);
    setLoading(false);
  }, [subjectId]);

  const addRow = () => setRows(r => [...r, { id: Date.now(), title: '', duration_min: 60, is_practical: false }]);
  const del = (id) => setRows(r => r.filter(x => x.id !== id));
  const set = (id, k, v) => setRows(r => r.map(x => x.id === id ? { ...x, [k]: v } : x));

  const save = async () => {
    try {
      await academyApi.saveLectures(subjectId, rows.map((r, i) => ({ title: r.title, duration_min: Number(r.duration_min), is_practical: r.is_practical })));
      toast.success('লেকচার সংরক্ষিত হয়েছে');
      onClose();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  if (loading) return <div className="p-4 text-gray-400 text-sm">লোড হচ্ছে...</div>;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mt-2">
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 font-medium flex justify-between items-center">
        <span>লেকচার তালিকা</span>
        <div className="flex gap-2">
          <button onClick={addRow} className="text-primary-600 hover:text-primary-700 flex items-center gap-1"><Plus size={12} /> যোগ করুন</button>
          <button onClick={save} className="text-green-600 hover:text-green-700 flex items-center gap-1"><Save size={12} /> সংরক্ষণ</button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-50/50">
          <tr><th className="px-3 py-2 text-left w-8">#</th><th className="px-3 py-2 text-left">শিরোনাম</th><th className="px-3 py-2 text-center w-24">সময় (মিনিট)</th><th className="px-3 py-2 text-center w-20">প্র্যাক্টিক্যাল</th><th className="w-8"></th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2"><input className="input py-1 text-xs" value={r.title} onChange={e => set(r.id, 'title', e.target.value)} /></td>
              <td className="px-3 py-2"><input type="number" className="input py-1 text-xs text-center" value={r.duration_min} onChange={e => set(r.id, 'duration_min', e.target.value)} /></td>
              <td className="px-3 py-2 text-center"><input type="checkbox" checked={r.is_practical} onChange={e => set(r.id, 'is_practical', e.target.checked)} /></td>
              <td className="px-3 py-2"><button onClick={() => del(r.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Subject row ───────────────────────────────────────────
function SubjectRow({ subject, planId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.subject_name);

  const saveSubject = async () => {
    await academyApi.updateSubject(subject.id, { subject_name: name });
    toast.success('বিষয় আপডেট হয়েছে'); setEditing(false); onRefresh();
  };

  const del = async () => {
    if (!confirm('বিষয়টি মুছে ফেলবেন?')) return;
    await academyApi.deleteSubject(subject.id); onRefresh();
  };

  return (
    <div className="border border-gray-100 rounded-xl mb-2">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 rounded-xl">
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {editing ? (
          <>
            <input className="input py-1 text-sm flex-1" value={name} onChange={e => setName(e.target.value)} />
            <button onClick={saveSubject} className="p-1 text-green-600"><Save size={14} /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400"><X size={14} /></button>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400 w-6">{subject.serial_no}</span>
            <span className="text-sm font-medium flex-1">{subject.subject_name}</span>
            <button onClick={() => setEditing(true)} className="p-1 hover:bg-blue-50 rounded text-blue-500"><Edit2 size={13} /></button>
            <button onClick={del} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
          </>
        )}
      </div>
      {expanded && <div className="px-4 pb-3"><LecturesEditor subjectId={subject.id} onClose={() => setExpanded(false)} /></div>}
    </div>
  );
}

// ── Plan section ──────────────────────────────────────────
function PlanSection({ plan, courseId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const loadSubjects = () => academyApi.getPlanSubjects(plan.id).then(r => setSubjects(r.data || []));

  useEffect(() => { if (expanded) loadSubjects(); }, [expanded]);

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    await academyApi.createSubject(plan.id, { subject_name: newSubject });
    setNewSubject(''); setShowAdd(false); loadSubjects();
  };

  const delPlan = async () => {
    if (!confirm('প্ল্যান মুছে ফেলবেন?')) return;
    await academyApi.deletePlan(plan.id); onRefresh();
  };

  return (
    <div className="border border-primary-100 rounded-xl mb-3">
      <div className="flex items-center gap-3 px-4 py-3 bg-primary-50/30 rounded-t-xl">
        <button onClick={() => setExpanded(e => !e)} className="text-primary-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">v{plan.version}</span>
        <span className="font-medium text-sm flex-1">{plan.plan_name}</span>
        {plan.is_active && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">সক্রিয়</span>}
        <span className="text-xs text-gray-400">{plan.total_classes} ক্লাস</span>
        <button onClick={delPlan} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
      </div>
      {expanded && (
        <div className="px-4 py-3">
          {subjects.map(s => <SubjectRow key={s.id} subject={s} planId={plan.id} onRefresh={loadSubjects} />)}
          {showAdd ? (
            <div className="flex gap-2 mt-2">
              <input className="input flex-1 text-sm py-1.5" placeholder="বিষয়ের নাম" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} autoFocus />
              <button onClick={addSubject} className="btn-primary text-xs py-1.5">যোগ</button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1.5">বাতিল</button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"><Plus size={13} /> নতুন বিষয় যোগ</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Course row ────────────────────────────────────────────
function CourseRow({ course, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [plans, setPlans] = useState([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ plan_name: '', total_classes: 24 });
  const [editing, setEditing] = useState(false);
  const [courseName, setCourseName] = useState(course.course_name);

  const loadPlans = () => academyApi.getCoursePlans(course.id).then(r => setPlans(r.data || []));
  useEffect(() => { if (expanded) loadPlans(); }, [expanded]);

  const addPlan = async () => {
    if (!planForm.plan_name.trim()) return toast.error('প্ল্যানের নাম দিন');
    await academyApi.createPlan(course.id, planForm);
    toast.success('প্ল্যান যোগ হয়েছে'); setShowPlanForm(false); setPlanForm({ plan_name: '', total_classes: 24 }); loadPlans();
  };

  const saveCourse = async () => {
    await academyApi.updateCourse(course.id, { course_name: courseName });
    toast.success('কোর্স আপডেট হয়েছে'); setEditing(false); onRefresh();
  };

  const delCourse = async () => {
    if (!confirm('কোর্স মুছে ফেলবেন?')) return;
    await academyApi.deleteCourse(course.id); onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <BookMarked size={18} className="text-primary-500 flex-shrink-0" />
        {editing ? (
          <>
            <input className="input py-1 flex-1" value={courseName} onChange={e => setCourseName(e.target.value)} />
            <button onClick={saveCourse} className="p-1.5 text-green-600"><Save size={16} /></button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400"><X size={16} /></button>
          </>
        ) : (
          <>
            <span className="font-semibold flex-1">{course.course_name}</span>
            <span className="text-xs text-gray-400">{course.course_code}</span>
            <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Edit2 size={15} /></button>
            <button onClick={delCourse} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={15} /></button>
          </>
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-5">
          {plans.map(p => <PlanSection key={p.id} plan={p} courseId={course.id} onRefresh={loadPlans} />)}
          {showPlanForm ? (
            <div className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label text-xs">প্ল্যানের নাম *</label><input className="input text-sm" value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} /></div>
                <div><label className="label text-xs">মোট ক্লাস</label><input type="number" className="input text-sm" value={planForm.total_classes} onChange={e => setPlanForm(f => ({ ...f, total_classes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addPlan} className="btn-primary text-sm">প্ল্যান যোগ</button>
                <button onClick={() => setShowPlanForm(false)} className="btn-secondary text-sm">বাতিল</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowPlanForm(true)} className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-2">
              <Plus size={14} /> নতুন কোর্স প্ল্যান
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const load = () => academyApi.getCourses().then(r => setCourses(r.data || []));
  useEffect(() => { load(); }, []);

  const addCourse = async () => {
    if (!newName.trim()) return toast.error('কোর্সের নাম দিন');
    await academyApi.createCourse({ course_name: newName });
    toast.success('কোর্স যোগ হয়েছে'); setNewName(''); setShowNew(false); load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">কোর্স ও প্ল্যান</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> নতুন কোর্স</button>
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3 items-end">
          <div className="flex-1"><label className="label">কোর্সের নাম *</label><input className="input" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCourse()} autoFocus /></div>
          <button onClick={addCourse} className="btn-primary">যোগ করুন</button>
          <button onClick={() => setShowNew(false)} className="btn-secondary">বাতিল</button>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <BookMarked size={40} className="mx-auto mb-3 opacity-30" />
          <p>কোনো কোর্স নেই। নতুন কোর্স যোগ করুন।</p>
        </div>
      ) : (
        courses.map(c => <CourseRow key={c.id} course={c} onRefresh={load} />)
      )}
    </div>
  );
}
