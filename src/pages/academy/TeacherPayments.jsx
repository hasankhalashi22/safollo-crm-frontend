import { useState, useEffect } from 'react';
import { Banknote, CheckCircle, Filter } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_LABEL = { pending: 'বাকি', paid: 'পরিশোধিত' };
const STATUS_COLOR = { pending: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700' };

export default function TeacherPayments() {
  const [list, setList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selected, setSelected] = useState([]);
  const [payNote, setPayNote] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  const load = (teacherId) => academyApi.getTeacherPayments(teacherId || null).then(r => setList(r.data || []));

  useEffect(() => {
    academyApi.getTeachers().then(r => setTeachers(r.data || []));
    load('');
  }, []);

  const pending = list.filter(p => p.status === 'pending');
  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll = () => setSelected(pending.map(p => p.id));

  const pay = async () => {
    if (selected.length === 0) return toast.error('অন্তত একটি পেমেন্ট বেছে নিন');
    try {
      await academyApi.payTeacher({ payment_ids: selected, note: payNote });
      toast.success('পেমেন্ট সম্পন্ন হয়েছে'); setShowPayModal(false); setSelected([]); setPayNote(''); load(selectedTeacher);
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const totalPending = pending.filter(p => selected.includes(p.id)).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">শিক্ষক পেমেন্ট</h1>
        <div className="flex gap-3 items-center">
          <select className="input text-sm py-2" value={selectedTeacher} onChange={e => { setSelectedTeacher(e.target.value); load(e.target.value); }}>
            <option value="">সকল শিক্ষক</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>)}
          </select>
          {selected.length > 0 && (
            <button onClick={() => setShowPayModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle size={15} /> {selected.length}টি পরিশোধ (৳{totalPending.toLocaleString()})
            </button>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-700">
            মোট বাকি: <strong>{pending.length}টি</strong> — ৳{pending.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
          </p>
          <button onClick={selectAll} className="text-xs text-orange-600 hover:text-orange-800 underline">সব বেছে নিন</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Banknote size={40} className="mx-auto mb-3 opacity-30" /><p>কোনো পেমেন্ট নেই</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                {['শিক্ষক', 'ব্যাচ', 'ক্লাস তারিখ', 'ক্লাস ধরন', 'পরিমাণ', 'অবস্থা', 'পরিশোধের তারিখ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {row.status === 'pending' && (
                      <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.teacher_name}<br /><span className="text-xs text-gray-400">{row.teacher_code}</span></td>
                  <td className="px-4 py-3 text-gray-500">{row.batch_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{row.class_date ? new Date(row.class_date).toLocaleDateString('bn-BD') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{row.class_type}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">৳{Number(row.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{row.paid_at ? new Date(row.paid_at).toLocaleDateString('bn-BD') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold">পেমেন্ট নিশ্চিত করুন</h3>
            <p className="text-sm text-gray-600">{selected.length}টি পেমেন্ট — মোট <strong>৳{totalPending.toLocaleString()}</strong></p>
            <div><label className="label">নোট (ঐচ্ছিক)</label><textarea className="input" rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} /></div>
            <div className="flex gap-3">
              <button onClick={pay} className="btn-primary flex-1">পরিশোধ করুন</button>
              <button onClick={() => setShowPayModal(false)} className="btn-secondary">বাতিল</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
