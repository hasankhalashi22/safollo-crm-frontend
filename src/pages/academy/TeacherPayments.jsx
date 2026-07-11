import { useState, useEffect } from 'react';
import { Banknote, CheckCircle, Filter } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_LABEL = { pending: 'à¦¬à¦¾à¦•à¦¿', paid: 'à¦ªà¦°à¦¿à¦¶à§‹à¦§à¦¿à¦¤' };
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
    if (selected.length === 0) return toast.error('à¦…à¦¨à§à¦¤à¦¤ à¦à¦•à¦Ÿà¦¿ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨');
    try {
      await academyApi.payTeacher({ payment_ids: selected, note: payNote });
      toast.success('à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); setShowPayModal(false); setSelected([]); setPayNote(''); load(selectedTeacher);
    } catch { toast.error('à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); }
  };

  const totalPending = pending.filter(p => selected.includes(p.id)).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">à¦¶à¦¿à¦•à§à¦·à¦• à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ</h1>
        <div className="flex gap-3 items-center">
          <select className="input text-sm py-2" value={selectedTeacher} onChange={e => { setSelectedTeacher(e.target.value); load(e.target.value); }}>
            <option value="">à¦¸à¦•à¦² à¦¶à¦¿à¦•à§à¦·à¦•</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>)}
          </select>
          {selected.length > 0 && (
            <button onClick={() => setShowPayModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle size={15} /> {selected.length}à¦Ÿà¦¿ à¦ªà¦°à¦¿à¦¶à§‹à¦§ (à§³{totalPending.toLocaleString()})
            </button>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-700">
            à¦®à§‹à¦Ÿ à¦¬à¦¾à¦•à¦¿: <strong>{pending.length}à¦Ÿà¦¿</strong> â€” à§³{pending.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
          </p>
          <button onClick={selectAll} className="text-xs text-orange-600 hover:text-orange-800 underline">à¦¸à¦¬ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Banknote size={40} className="mx-auto mb-3 opacity-30" /><p>à¦•à§‹à¦¨à§‹ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¨à§‡à¦‡</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                {['à¦¶à¦¿à¦•à§à¦·à¦•', 'à¦¬à§à¦¯à¦¾à¦š', 'à¦•à§à¦²à¦¾à¦¸ à¦¤à¦¾à¦°à¦¿à¦–', 'à¦•à§à¦²à¦¾à¦¸ à¦§à¦°à¦¨', 'à¦ªà¦°à¦¿à¦®à¦¾à¦£', 'à¦…à¦¬à¦¸à§à¦¥à¦¾', 'à¦ªà¦°à¦¿à¦¶à§‹à¦§à§‡à¦° à¦¤à¦¾à¦°à¦¿à¦–'].map(h => (
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
                  <td className="px-4 py-3 text-xs text-gray-500">{row.class_date ? new Date(row.class_date).toLocaleDateString('bn-BD') : 'â€”'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{row.class_type}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">à§³{Number(row.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{row.paid_at ? new Date(row.paid_at).toLocaleDateString('bn-BD') : 'â€”'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold">à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤ à¦•à¦°à§à¦¨</h3>
            <p className="text-sm text-gray-600">{selected.length}à¦Ÿà¦¿ à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ â€” à¦®à§‹à¦Ÿ <strong>à§³{totalPending.toLocaleString()}</strong></p>
            <div><label className="label">à¦¨à§‹à¦Ÿ (à¦à¦šà§à¦›à¦¿à¦•)</label><textarea className="input-field" rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} /></div>
            <div className="flex gap-3">
              <button onClick={pay} className="btn-primary flex-1">à¦ªà¦°à¦¿à¦¶à§‹à¦§ à¦•à¦°à§à¦¨</button>
              <button onClick={() => setShowPayModal(false)} className="btn-secondary">à¦¬à¦¾à¦¤à¦¿à¦²</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

