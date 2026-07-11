import { useState, useEffect } from 'react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Save, Info } from 'lucide-react';

const COURSE_TYPES = [
  'BCS',
  '9-10th Non Cadre',
  'Primary/NTRCA',
  '11-20 Grade',
  'FB Live',
  'Ads Shooting',
];

const MODES = ['offline', 'online'];
const CATEGORIES = ['bcs_cadre', 'bcs_non_cadre', 'others'];

const MODE_LABEL = { offline: 'Offline', online: 'Online' };
const CAT_LABEL = { bcs_cadre: 'BCS Cadre', bcs_non_cadre: 'BCS Non Cadre', others: 'Others' };

const MODE_COLOR = {
  offline: { header: 'bg-[#2e4057] text-white', sub: 'bg-[#3d5a80] text-white' },
  online:  { header: 'bg-[#4a7c59] text-white', sub: 'bg-[#5a9e6f] text-white' },
};

const ROW_BG = [
  'bg-[#f5f0e8]',
  'bg-[#eef4ee]',
  'bg-[#eef4ee]',
  'bg-[#eef4ee]',
  'bg-[#eef4ee]',
  'bg-[#eef4ee]',
];

export default function PaymentRates() {
  const [rates, setRates] = useState({});
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    academyApi.getPaymentRates().then(r => {
      const map = {};
      (r.data || []).forEach(row => {
        const key = `${row.course_type}__${row.class_mode}__${row.teacher_category}`;
        map[key] = row.rate_per_class;
      });
      setRates(map);
      setLoading(false);
    });
  }, []);

  const key = (course, mode, cat) => `${course}__${mode}__${cat}`;

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
        const [course_type, class_mode, teacher_category] = k.split('__');
        const val = rates[k];
        if (val === '' || val === null || val === undefined) return Promise.resolve();
        return academyApi.upsertPaymentRate({ course_type, class_mode, teacher_category, rate_per_class: Number(val) });
      }));
      toast.success('সব রেট সংরক্ষিত হয়েছে');
      setDirty({});
    } catch { toast.error('সমস্যা হয়েছে'); }
    setSaving(false);
  };

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
          disabled={saving || !Object.keys(dirty).length}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors"
        >
          <Save size={15} /> {saving ? 'সংরক্ষণ হচ্ছে...' : 'সব সংরক্ষণ করুন'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Row 1: Title */}
              <tr>
                <th
                  colSpan={7}
                  className="bg-[#2e4057] text-white text-center py-3 text-base font-bold tracking-wide border-b-2 border-white"
                >
                  Payment Policy
                </th>
              </tr>
              {/* Row 2: Offline / Online */}
              <tr>
                <th className="bg-[#2e4057] border border-white w-44"></th>
                {MODES.map(mode => (
                  <th
                    key={mode}
                    colSpan={3}
                    className={`${MODE_COLOR[mode].header} text-center py-2.5 font-bold text-sm border border-white`}
                  >
                    {MODE_LABEL[mode]}
                  </th>
                ))}
              </tr>
              {/* Row 3: Category headers */}
              <tr>
                <th className="bg-[#2e4057] text-white text-center py-2.5 px-4 font-semibold text-sm border border-white">
                  Course Name
                </th>
                {MODES.map(mode =>
                  CATEGORIES.map(cat => (
                    <th
                      key={`${mode}_${cat}`}
                      className={`${MODE_COLOR[mode].sub} text-center py-2.5 px-3 font-semibold text-xs border border-white whitespace-nowrap`}
                    >
                      {CAT_LABEL[cat]}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {COURSE_TYPES.map((course, ci) => (
                <tr key={course} className={`${ROW_BG[ci]} border-b border-gray-200`}>
                  <td className="px-4 py-3 font-bold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                    {course}
                  </td>
                  {MODES.map(mode =>
                    CATEGORIES.map(cat => {
                      const k = key(course, mode, cat);
                      const val = rates[k];
                      const isDirty = dirty[k];
                      // Ads Shooting online cols are N/A
                      const isNA = course === 'Ads Shooting' && (mode === 'online' || cat === 'others');
                      return (
                        <td key={`${mode}_${cat}`} className="px-2 py-2 text-center border-r border-gray-200">
                          {isNA ? (
                            <span className="text-gray-400 text-sm font-medium">—</span>
                          ) : (
                            <input
                              type="number"
                              className={`w-20 text-center rounded-lg border px-2 py-1.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                                isDirty
                                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                                  : 'border-gray-300 bg-white text-gray-800'
                              }`}
                              value={val ?? ''}
                              onChange={e => setVal(course, mode, cat, e.target.value)}
                              placeholder="0"
                            />
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
          <Info size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Marathon Class — নিয়মিত রেটের <strong>১.৫ গুণ</strong> পেমেন্ট প্রযোজ্য
          </p>
        </div>
      </div>

      {Object.keys(dirty).length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm transition-colors"
          >
            <Save size={15} /> {Object.keys(dirty).length}টি পরিবর্তন সংরক্ষণ করুন
          </button>
        </div>
      )}
    </div>
  );
}
