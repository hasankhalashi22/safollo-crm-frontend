import { useState, useEffect } from 'react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const TEACHER_TYPES = ['senior', 'junior', 'guest'];
const CLASS_TYPES = ['regular', 'makeup', 'exam_review'];
const LABEL = { senior: 'সিনিয়র', junior: 'জুনিয়র', guest: 'গেস্ট', regular: 'নিয়মিত ক্লাস', makeup: 'মেকআপ ক্লাস', exam_review: 'পরীক্ষা রিভিউ' };

export default function PaymentRates() {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academyApi.getPaymentRates().then(r => {
      const map = {};
      (r.data || []).forEach(row => { map[`${row.teacher_type}_${row.class_type}`] = { id: row.id, rate: row.rate_per_class }; });
      setRates(map);
      setLoading(false);
    });
  }, []);

  const save = async (teacher_type, class_type) => {
    const key = `${teacher_type}_${class_type}`;
    const current = rates[key];
    if (!current?.rate && current?.rate !== 0) return toast.error('রেট দিন');
    try {
      await academyApi.upsertPaymentRate({ teacher_type, class_type, rate_per_class: Number(current.rate) });
      toast.success('সংরক্ষিত হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const setRate = (key, val) => setRates(r => ({ ...r, [key]: { ...(r[key] || {}), rate: val } }));

  if (loading) return <div className="p-6 text-gray-400">লোড হচ্ছে...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Payment Rates (প্রতি ক্লাস)</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Teacher Type</th>
              {CLASS_TYPES.map(ct => <th key={ct} className="px-4 py-3 text-center">{LABEL[ct]}</th>)}
            </tr>
          </thead>
          <tbody>
            {TEACHER_TYPES.map(tt => (
              <tr key={tt} className="border-t border-gray-50">
                <td className="px-4 py-3 font-medium">{LABEL[tt]}</td>
                {CLASS_TYPES.map(ct => {
                  const key = `${tt}_${ct}`;
                  return (
                    <td key={ct} className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-gray-400 text-xs">৳</span>
                        <input
                          type="number"
                          className="input w-24 text-center"
                          value={rates[key]?.rate ?? ''}
                          onChange={e => setRate(key, e.target.value)}
                        />
                        <button onClick={() => save(tt, ct)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg">
                          <Save size={14} />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
