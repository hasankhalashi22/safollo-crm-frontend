import { useState, useEffect } from 'react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, Info } from 'lucide-react';

const COLS = [
  { mode: 'offline', cat: 'cadre',     label: 'Offline\nক্যাডার' },
  { mode: 'offline', cat: 'non_cadre', label: 'Offline\nনন-ক্যাডার' },
  { mode: 'online',  cat: 'cadre',     label: 'Online\nক্যাডার' },
  { mode: 'online',  cat: 'non_cadre', label: 'Online\nনন-ক্যাডার' },
];

const DEFAULT_COURSES = ['BCS', '9-10th Non Cadre', 'Primary/NTRCA', '11-20 Grade', 'FB Live', 'Ads Shooting'];

export default function PaymentRates() {
  const [rates, setRates]       = useState({});   // key → rate value
  const [dirty, setDirty]       = useState({});   // key → true if changed
  const [courses, setCourses]   = useState([]);   // ordered list of course_type strings
  const [newCourse, setNewCourse] = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  const key = (course, mode, cat) => `${course}||${mode}||${cat}`;

  useEffect(() => {
    academyApi.getPaymentRates().then(r => {
      const map = {};
      const courseSet = new Set();
      (r.data || []).forEach(row => {
        map[key(row.course_type, row.class_mode, row.teacher_category)] = String(row.rate_per_class);
        courseSet.add(row.course_type);
      });
      // preserve default order, append any extras
      const ordered = DEFAULT_COURSES.filter(c => courseSet.has(c));
      courseSet.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
      // if nothing saved yet, start with defaults
      setCourses(ordered.length ? ordered : DEFAULT_COURSES);
      setRates(map);
      setLoading(false);
    });
  }, []);

  const setVal = (course, mode, cat, val) => {
    const k = key(course, mode, cat);
    setRates(r => ({ ...r, [k]: val }));
    setDirty(d => ({ ...d, [k]: true }));
  };

  const saveAll = async () => {
    const changed = Object.keys(dirty);
    if (!changed.length) return toast('পরিবর্তন নেই');
    setSaving(true);
    try {
      await Promise.all(changed.map(k => {
        const [course_type, class_mode, teacher_category] = k.split('||');
        const val = rates[k];
        if (val === '' || val === undefined) return Promise.resolve();
        return academyApi.upsertPaymentRate({ course_type, class_mode, teacher_category, rate_per_class: Number(val) });
      }));
      toast.success('সব রেট সংরক্ষিত হয়েছে');
      setDirty({});
    } catch { toast.error('সমস্যা হয়েছে'); }
    setSaving(false);
  };

  const addCourse = () => {
    const name = newCourse.trim();
    if (!name) return;
    if (courses.includes(name)) return toast.error('এই নামে ইতোমধ্যে আছে');
    setCourses(c => [...c, name]);
    setNewCourse(''); setShowAdd(false);
  };

  const deleteCourse = async (course) => {
    if (!confirm(`"${course}" এর সব রেট মুছে ফেলবেন?`)) return;
    try {
      await academyApi.deleteCourseTypeRates(course);
      setCourses(c => c.filter(x => x !== course));
      setRates(r => {
        const next = { ...r };
        COLS.forEach(col => delete next[key(course, col.mode, col.cat)]);
        return next;
      });
      toast.success('মুছে ফেলা হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const dirtyCount = Object.keys(dirty).length;

  if (loading) return <div className="p-6 text-gray-400">লোড হচ্ছে...</div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Payment Policy</h1>
          <p className="text-sm text-gray-400 mt-0.5">প্রতি ক্লাসের শিক্ষক পেমেন্ট রেট (৳)</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || !dirtyCount}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors"
        >
          <Save size={15} /> {saving ? 'সংরক্ষণ হচ্ছে...' : `সংরক্ষণ করুন${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Title row */}
              <tr>
                <th colSpan={6} className="bg-[#1e3a5f] text-white text-center py-3 text-base font-bold tracking-wide">
                  Payment Policy
                </th>
              </tr>
              {/* Mode group row */}
              <tr>
                <th className="bg-[#1e3a5f] border border-white/20 w-48 py-2"></th>
                <th colSpan={2} className="bg-[#2d5986] text-white text-center py-2.5 font-bold text-sm border border-white/20">
                  Offline
                </th>
                <th colSpan={2} className="bg-[#2d6b45] text-white text-center py-2.5 font-bold text-sm border border-white/20">
                  Online
                </th>
                <th className="bg-[#1e3a5f] border border-white/20 w-10"></th>
              </tr>
              {/* Category row */}
              <tr>
                <th className="bg-[#1e3a5f] text-white text-center py-2.5 px-4 font-semibold text-sm border border-white/20">
                  Course Name
                </th>
                <th className="bg-[#3a6fa8] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">ক্যাডার</th>
                <th className="bg-[#3a6fa8] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">নন-ক্যাডার</th>
                <th className="bg-[#3a8a5a] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">ক্যাডার</th>
                <th className="bg-[#3a8a5a] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">নন-ক্যাডার</th>
                <th className="bg-[#1e3a5f] border border-white/20"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, ci) => (
                <tr key={course} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 group`}>
                  <td className="px-4 py-3 font-semibold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                    {course}
                  </td>
                  {COLS.map(col => {
                    const k = key(course, col.mode, col.cat);
                    const val = rates[k];
                    const isDirty = dirty[k];
                    return (
                      <td key={`${col.mode}_${col.cat}`} className="px-2 py-2 text-center border-r border-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-400 text-xs">৳</span>
                          <input
                            type="number"
                            className={`w-20 text-center rounded-lg border px-2 py-1.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                              isDirty
                                ? 'border-primary-400 bg-primary-50 text-primary-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                            value={val ?? ''}
                            onChange={e => setVal(course, col.mode, col.cat, e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      </td>
                    );
                  })}
                  {/* Delete row */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => deleteCourse(course)}
                      className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="এই কোর্স টাইপ মুছুন"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add new course row */}
              <tr className="border-t-2 border-dashed border-gray-200 bg-gray-50/50">
                <td colSpan={6} className="px-4 py-3">
                  {showAdd ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input-field flex-1 text-sm"
                        placeholder="নতুন কোর্স টাইপের নাম..."
                        value={newCourse}
                        onChange={e => setNewCourse(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCourse(); if (e.key === 'Escape') setShowAdd(false); }}
                        autoFocus
                      />
                      <button onClick={addCourse} className="bg-primary-500 hover:bg-primary-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">যোগ</button>
                      <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">বাতিল</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <Plus size={15} /> নতুন কোর্স টাইপ যোগ করুন
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Marathon note */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
          <Info size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Marathon Class — নিয়মিত রেটের <strong>১.৫ গুণ</strong> পেমেন্ট প্রযোজ্য
          </p>
        </div>
      </div>

      {/* Floating save */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm transition-colors"
          >
            <Save size={15} /> {dirtyCount}টি পরিবর্তন সংরক্ষণ করুন
          </button>
        </div>
      )}
    </div>
  );
}
