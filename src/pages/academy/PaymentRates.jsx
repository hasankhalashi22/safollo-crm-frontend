import { useState, useEffect } from 'react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const COLS = [
  { mode: 'offline', cat: 'cadre',     label: 'ক্যাডার' },
  { mode: 'offline', cat: 'non_cadre', label: 'নন-ক্যাডার' },
  { mode: 'offline', cat: 'others',    label: 'অন্যান্য' },
  { mode: 'online',  cat: 'cadre',     label: 'ক্যাডার' },
  { mode: 'online',  cat: 'non_cadre', label: 'নন-ক্যাডার' },
  { mode: 'online',  cat: 'others',    label: 'অন্যান্য' },
];

export default function PaymentRates() {
  const { user } = useAuth();
  const canSuper = user?.role === 'super_admin';
  const [rates, setRates]     = useState({});
  const [dirty, setDirty]     = useState({});
  const [courses, setCourses] = useState([]); // [{ course_type: string }]
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [allPlans, setAllPlans] = useState([]); // [{id, plan_name, course_name}]

  const key = (course, mode, cat) => `${course}||${mode}||${cat}`;

  useEffect(() => {
    Promise.all([
      academyApi.getPaymentRates(),
      academyApi.getCourses(),
    ]).then(async ([ratesRes, coursesRes]) => {
      // Load all plans for all courses
      const courseList = coursesRes.data || [];
      const plans = courseList.map(c => ({
        id: c.id,
        label: c.course_name,
      }));
      setAllPlans(plans);

      // Build rates map from saved data
      const map = {};
      const courseSet = new Set();
      (ratesRes.data || []).forEach(row => {
        map[key(row.course_type, row.class_mode, row.teacher_category)] = String(row.rate_per_class);
        courseSet.add(row.course_type);
      });
      const ordered = [...courseSet];
      setCourses(ordered.map(ct => ({ course_type: ct })));
      setRates(map);
      setLoading(false);
    });
  }, []);

  const setVal = (course, mode, cat, val) => {
    const k = key(course, mode, cat);
    setRates(r => ({ ...r, [k]: val }));
    setDirty(d => ({ ...d, [k]: true }));
  };

  const changeCourseType = (oldCt, newCt) => {
    if (!newCt || newCt === oldCt) return;
    // Move all rate keys from old to new
    const newRates = { ...rates };
    const newDirty = { ...dirty };
    COLS.forEach(col => {
      const oldKey = key(oldCt, col.mode, col.cat);
      const newKey = key(newCt, col.mode, col.cat);
      if (newRates[oldKey] !== undefined) {
        newRates[newKey] = newRates[oldKey];
        newDirty[newKey] = true;
        delete newRates[oldKey];
        delete newDirty[oldKey];
      }
    });
    setRates(newRates);
    setDirty(newDirty);
    setCourses(cs => cs.map(c => c.course_type === oldCt ? { course_type: newCt } : c));
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

  const addRow = () => {
    // Find first unselected plan
    const selected = new Set(courses.map(c => c.course_type));
    const next = allPlans.find(p => !selected.has(p.label));
    if (!next && allPlans.length === 0) return toast.error('কোনো প্ল্যান নেই');
    const ct = next ? next.label : `কোর্স-${courses.length + 1}`;
    if (selected.has(ct)) return toast.error('সব প্ল্যান ইতিমধ্যে যোগ করা হয়েছে');
    setCourses(c => [...c, { course_type: ct }]);
  };

  const deleteCourse = async (course) => {
    if (!confirm(`"${course}" এর সব রেট মুছে ফেলবেন?`)) return;
    try {
      await academyApi.deleteCourseTypeRates(course);
      setCourses(c => c.filter(x => x.course_type !== course));
      setRates(r => {
        const next = { ...r };
        COLS.forEach(col => delete next[key(course, col.mode, col.cat)]);
        return next;
      });
      toast.success('মুছে ফেলা হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const selectedSet = new Set(courses.map(c => c.course_type));
  const dirtyCount = Object.keys(dirty).length;

  if (loading) return <div className="p-6 text-gray-400">লোড হচ্ছে...</div>;

  return (
    <div className="p-3 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Payment Policy</h1>
          <p className="text-sm text-gray-400 mt-0.5">প্রতি ক্লাসের শিক্ষক পেমেন্ট রেট (৳)</p>
        </div>
        {canSuper && <button onClick={saveAll} disabled={saving || !dirtyCount}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors">
          <Save size={15} /> {saving ? 'সংরক্ষণ হচ্ছে...' : `সংরক্ষণ করুন${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th colSpan={8} className="bg-[#1e3a5f] text-white text-center py-3 text-base font-bold tracking-wide">
                  Payment Policy
                </th>
              </tr>
              <tr>
                <th className="bg-[#1e3a5f] border border-white/20 w-56 py-2"></th>
                <th colSpan={3} className="bg-[#2d5986] text-white text-center py-2.5 font-bold text-sm border border-white/20">Offline</th>
                <th colSpan={3} className="bg-[#2d6b45] text-white text-center py-2.5 font-bold text-sm border border-white/20">Online</th>
                <th className="bg-[#1e3a5f] border border-white/20 w-10"></th>
              </tr>
              <tr>
                <th className="bg-[#1e3a5f] text-white text-center py-2.5 px-4 font-semibold text-sm border border-white/20">Course Name</th>
                {['ক্যাডার','নন-ক্যাডার','অন্যান্য'].map(l => (
                  <th key={`off-${l}`} className="bg-[#3a6fa8] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">{l}</th>
                ))}
                {['ক্যাডার','নন-ক্যাডার','অন্যান্য'].map(l => (
                  <th key={`on-${l}`} className="bg-[#3a8a5a] text-white text-center py-2.5 px-3 text-xs font-semibold border border-white/20">{l}</th>
                ))}
                <th className="bg-[#1e3a5f] border border-white/20"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map(({ course_type }, ci) => {
                // Available options for this row: unselected + current
                const available = allPlans.filter(p => !selectedSet.has(p.label) || p.label === course_type);
                return (
                  <tr key={course_type} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 group`}>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 bg-white"
                        value={course_type}
                        onChange={e => changeCourseType(course_type, e.target.value)}
                        disabled={!canSuper}
                      >
                        <option value={course_type}>{course_type}</option>
                        {available.filter(p => p.label !== course_type).map(p => (
                          <option key={p.id} value={p.label}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    {COLS.map(col => {
                      const k = key(course_type, col.mode, col.cat);
                      const val = rates[k];
                      const isDirty = dirty[k];
                      return (
                        <td key={`${col.mode}_${col.cat}`} className="px-2 py-2 text-center border-r border-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-400 text-xs">৳</span>
                            <input type="number"
                              className={`w-20 text-center rounded-lg border px-2 py-1.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                                isDirty ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                              value={val ?? ''}
                              onChange={e => setVal(course_type, col.mode, col.cat, e.target.value)}
                              placeholder="—"
                              readOnly={!canSuper}
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center">
                      {canSuper && <button onClick={() => deleteCourse(course_type)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>}
                    </td>
                  </tr>
                );
              })}

              {canSuper && <tr className="border-t-2 border-dashed border-gray-200 bg-gray-50/50">
                <td colSpan={8} className="px-4 py-3">
                  <button onClick={addRow}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors">
                    <Plus size={15} /> নতুন কোর্স যোগ করুন
                  </button>
                </td>
              </tr>}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
          <Info size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Marathon Class — নিয়মিত রেটের <strong>১.৫ গুণ</strong> পেমেন্ট প্রযোজ্য
          </p>
        </div>
      </div>

      {canSuper && dirtyCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={saveAll} disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm transition-colors">
            <Save size={15} /> {dirtyCount}টি পরিবর্তন সংরক্ষণ করুন
          </button>
        </div>
      )}
    </div>
  );
}
