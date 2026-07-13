import { useState, useEffect } from 'react';
import { Banknote, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { academyApi } from '../../api/client';
import EntryModal from '../../components/accounting/EntryModal';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(-2)}`;
}

export default function TeacherPayments() {
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null); // { id, full_name, teacher_code }
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('classes');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = () => {
    setLoading(true);
    academyApi.getTeacherPaymentSummary()
      .then(r => setTeachers(r.data || []))
      .catch(() => toast.error('লোড করতে সমস্যা'))
      .finally(() => setLoading(false));
  };

  const openDetail = async (teacher) => {
    setSelected(teacher);
    setDetailLoading(true);
    setDetailTab('classes');
    try {
      const r = await academyApi.getTeacherPaymentDetails(teacher.id);
      setDetail(r.data);
    } catch { toast.error('বিবরণ লোড করতে সমস্যা'); }
    setDetailLoading(false);
  };

  const handleEntrySuccess = async (txnData) => {
    try {
      await academyApi.createTeacherPaymentTransaction({
        teacher_id: selected.id,
        amount: txnData?.amount || detail?.remaining || 0,
        proof_url: txnData?.proof_url || null,
        transaction_date: txnData?.transaction_date || new Date().toISOString().split('T')[0],
        accounting_transaction_id: txnData?.id ? String(txnData.id) : null,
      });
      toast.success('পেমেন্ট এন্ট্রি সম্পন্ন হয়েছে');
      // reload both
      const [sumR, detR] = await Promise.all([
        academyApi.getTeacherPaymentSummary(),
        academyApi.getTeacherPaymentDetails(selected.id),
      ]);
      setTeachers(sumR.data || []);
      setDetail(detR.data);
    } catch { toast.error('এন্ট্রি করতে সমস্যা হয়েছে'); }
    setShowEntryModal(false);
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const r = await academyApi.recalculatePayments();
      const { created = 0, updated = 0 } = r.data || {};
      toast.success(`${created} টি নতুন যোগ, ${updated} টি আপডেট হয়েছে`);
      loadSummary();
    } catch { toast.error('সমস্যা হয়েছে'); }
    setRecalculating(false);
  };

  // ── Summary List View ────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-800">শিক্ষক পেমেন্ট</h1>
          <button onClick={recalculate} disabled={recalculating}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors">
            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
            রেট পুনরায় প্রয়োগ করুন
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">লোড হচ্ছে...</div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Banknote size={40} className="mx-auto mb-3 opacity-30" /><p>কোনো শিক্ষক নেই</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['শিক্ষক', 'মোট ক্লাস', 'মোট প্রাপ্য', 'পরিশোধিত', 'বকেয়া', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} onClick={() => openDetail(t)}
                      className="border-t border-gray-100 hover:bg-primary-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{t.full_name}</p>
                        <p className="text-xs text-gray-400">{t.teacher_code}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.total_classes}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">৳{Number(t.total_due).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-green-600">৳{Number(t.total_paid).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${Number(t.remaining) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          ৳{Number(t.remaining).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────────────────────────────
  const remaining = detail?.remaining || 0;

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelected(null); setDetail(null); }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{selected.full_name}</h1>
            <p className="text-xs text-gray-400">{selected.teacher_code}</p>
          </div>
        </div>
        {remaining > 0 && (
          <button onClick={() => setShowEntryModal(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors">
            <Banknote size={15} /> পরিশোধ করুন
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
          <p className="text-lg font-bold text-gray-800">৳{Number(detail?.total_due || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">মোট প্রাপ্য</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
          <p className="text-lg font-bold text-green-600">৳{Number(detail?.total_paid || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">পরিশোধিত</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border shadow-sm ${remaining > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
          <p className={`text-lg font-bold ${remaining > 0 ? 'text-orange-600' : 'text-gray-400'}`}>৳{Number(remaining).toLocaleString()}</p>
          <p className={`text-xs mt-0.5 ${remaining > 0 ? 'text-orange-400' : 'text-gray-400'}`}>বকেয়া</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['classes', 'ক্লাস হিস্ট্রি'], ['payments', 'পেমেন্ট হিস্ট্রি']].map(([key, label]) => (
          <button key={key} onClick={() => setDetailTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${detailTab === key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {detailLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">লোড হচ্ছে...</div>
      ) : detailTab === 'classes' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {(detail?.class_history || []).length === 0 ? (
            <div className="p-12 text-center text-gray-400">কোনো ক্লাস নেই</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['তারিখ', 'ব্যাচ', 'বিষয়', 'শিরোনাম', 'ধরন', 'পরিমাণ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detail?.class_history || []).map(c => (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.scheduled_date?.split?.('T')[0])}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{c.batch_name || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{c.subject_name || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-700 max-w-[160px] truncate" title={c.topic}>{c.topic || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">{c.row_type === 'exam' ? 'পরীক্ষা' : 'ক্লাস'} · {c.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন'}</td>
                      <td className="px-4 py-2 font-semibold text-gray-800">৳{Number(c.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(detail?.payment_history || []).length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">কোনো পেমেন্ট রেকর্ড নেই</div>
          ) : (detail?.payment_history || []).map(t => (
            <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              {t.proof_url ? (
                <button onClick={() => setZoomImg(t.proof_url)} className="flex-shrink-0">
                  <img src={t.proof_url} alt="proof" className="w-14 h-14 rounded-xl object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                </button>
              ) : (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Banknote size={20} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-lg">৳{Number(t.amount || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.transaction_date)}</p>
                {t.note && <p className="text-xs text-gray-500 mt-0.5">{t.note}</p>}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">পরিশোধিত</span>
            </div>
          ))}
        </div>
      )}

      {showEntryModal && (
        <EntryModal
          mode="out"
          initialAmount={remaining > 0 ? remaining : ''}
          initialParty={selected.full_name}
          initialDescription="শিক্ষক সম্মানী"
          onClose={() => setShowEntryModal(false)}
          onSuccess={handleEntrySuccess}
        />
      )}

      {zoomImg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="proof" className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
