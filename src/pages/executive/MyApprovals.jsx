import { useState, useEffect } from 'react';
import { approvalsApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Edit } from 'lucide-react';

export default function MyApprovals() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resubmitModal, setResubmitModal] = useState(null);

  const fetchMyPending = () => {
    setLoading(true);
    approvalsApi.getMyPending().then(r => {
      setSales(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchMyPending(); }, []);

  const handleResubmit = async (sale, editData) => {
    try {
      await approvalsApi.resubmit(sale.id, editData);
      toast.success('Resubmit হয়েছে ✅');
      setResubmitModal(null);
      fetchMyPending();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-display font-bold text-dark mb-4">আমার Pending/Rejected সেল</h2>

      {sales.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-gray-500">কোনো pending সেল নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => (
            <div key={sale.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{sale.student_name || sale.student_phone}</p>
                  <p className="text-sm text-gray-500">{sale.course_name}</p>
                  <p className="font-bold text-primary-600 mt-1">৳{Number(sale.total_collected).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${sale.approval_status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                    {sale.approval_status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(sale.created_at), 'dd/MM/yy')}</p>
                </div>
              </div>

              {sale.rejection_reason && (
                <div className="mt-2 p-2.5 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-600 font-medium">Reject-এর কারণ:</p>
                  <p className="text-sm text-red-700">{sale.rejection_reason}</p>
                </div>
              )}

              {sale.approval_status === 'rejected' && (
                <button onClick={() => setResubmitModal(sale)}
                  className="mt-3 flex items-center gap-2 w-full justify-center py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium">
                  <Edit size={16} /> Edit করে Resubmit করুন
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {resubmitModal && (
        <ResubmitModal
          sale={resubmitModal}
          onResubmit={handleResubmit}
          onClose={() => setResubmitModal(null)}
        />
      )}
    </div>
  );
}

function ResubmitModal({ sale, onResubmit, onClose }) {
  const [form, setForm] = useState({
    course_price: sale.course_price || '',
    reference: sale.reference || '',
    notes: sale.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onResubmit(sale, form);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center">
      <div className="bg-white w-full lg:max-w-md rounded-t-3xl lg:rounded-2xl p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Edit করে Resubmit করুন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="font-medium">{sale.student_name || sale.student_phone}</p>
          <p className="text-sm text-gray-500">{sale.course_name}</p>
          {sale.rejection_reason && (
            <p className="text-xs text-red-500 mt-1">কারণ: {sale.rejection_reason}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">কোর্স মূল্য</label>
            <input type="number" className="input-field" value={form.course_price}
              onChange={e => setForm(p => ({ ...p, course_price: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">রেফারেন্স</label>
            <input type="text" className="input-field" value={form.reference}
              onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">নোট</label>
            <textarea className="input-field resize-none" rows={2} value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'হচ্ছে...' : '✅ Resubmit করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}