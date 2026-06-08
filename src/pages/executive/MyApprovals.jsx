import { useState, useEffect } from 'react';
import { approvalsApi, salesApi, coursesApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Edit, Trash2, Camera, X } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'bkash',  label: 'বিকাশ' },
  { value: 'nagad',  label: 'নগদ' },
  { value: 'rocket', label: 'রকেট' },
  { value: 'cash',   label: 'ক্যাশ' },
  { value: 'cod',    label: 'COD' },
];

export default function MyApprovals() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resubmitModal, setResubmitModal] = useState(null);
const [duePayments, setDuePayments] = useState([]);

  const fetchMyPending = () => {
    setLoading(true);
    Promise.all([
      approvalsApi.getMyPending(),
      approvalsApi.getMyPendingDue(),
    ]).then(([salesRes, dueRes]) => {
      setSales(salesRes.data || []);
      setDuePayments(dueRes.data || []);
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

  const handleCancel = async (sale) => {
    if (!confirm('এই সেল entry বাতিল করবেন?')) return;
    try {
      await salesApi.delete(sale.id);
      toast.success('সেল বাতিল হয়েছে');
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
                  <p className="text-sm text-gray-500">{sale.course_name} {sale.batch_name ? '• ' + sale.batch_name : ''}</p>
                  <p className="font-bold text-primary-600 mt-1">৳{Number(sale.total_collected).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${sale.approval_status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                    {sale.approval_status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(sale.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
              </div>

              {sale.rejection_reason && (
                <div className="mt-2 p-2.5 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-600 font-medium">Reject-এর কারণ:</p>
                  <p className="text-sm text-red-700">{sale.rejection_reason}</p>
                </div>
              )}

              {sale.approval_status === 'rejected' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setResubmitModal(sale)}
                    className="flex-1 flex items-center gap-2 justify-center py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium active:scale-95">
                    <Edit size={16} /> Edit করে Resubmit
                  </button>
                  <button onClick={() => handleCancel(sale)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium active:scale-95">
                    <Trash2 size={16} /> বাতিল
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

     {duePayments.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-dark mb-3">Pending বকেয়া Payment</h3>
          {duePayments.map(payment => (
            <div key={payment.id} className="card mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{payment.student_name || payment.student_phone}</p>
                  <p className="text-sm text-gray-500">{payment.course_name}</p>
                  <p className="font-bold text-green-600 mt-1">৳{Number(payment.amount).toLocaleString()} পাঠিয়েছি</p>
                </div>
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⏳ Pending</span>
              </div>
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
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [form, setForm] = useState({
    student_name: sale.student_name || '',
    course_id: sale.course_id || '',
    batch_id: sale.batch_id || '',
    course_price: sale.course_price || '',
    collected_amount: sale.total_collected || '',
    payment_method: sale.payment_history?.[0]?.payment_method || '',
    transaction_id: sale.payment_history?.[0]?.transaction_id || '',
    due_date: '',
    reference: sale.reference || '',
    notes: sale.notes || '',
    payment_proof: null,
  });

  useEffect(() => {
    coursesApi.getAll().then(r => setCourses(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const selectedCourse = courses.find(c => c.id == form.course_id);
  const batches = selectedCourse?.batches || [];
  const dueAmount = form.course_price && form.collected_amount
    ? Math.max(0, Number(form.course_price) - Number(form.collected_amount)) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.payment_method) return toast.error('পেমেন্ট পদ্ধতি বেছে নিন');
    setLoading(true);
    try {
      await onResubmit(sale, form);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-end lg:items-center justify-center p-4">
        <div className="bg-white w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">Edit করে Resubmit করুন</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          {sale.rejection_reason && (
            <div className="mx-5 mt-4 p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-red-600 font-medium">Reject-এর কারণ:</p>
              <p className="text-sm text-red-700">{sale.rejection_reason}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Student */}
            <div className="card space-y-3">
              <h4 className="font-semibold text-sm text-gray-600 uppercase">স্টুডেন্ট তথ্য</h4>
              <div>
                <label className="block text-sm font-medium mb-1.5">ফোন নম্বর</label>
                <input className="input-field bg-gray-50" value={sale.student_phone} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">নাম</label>
                <input className="input-field" value={form.student_name}
                  onChange={e => set('student_name', e.target.value)} />
              </div>
            </div>

            {/* Course */}
            <div className="card space-y-3">
              <h4 className="font-semibold text-sm text-gray-600 uppercase">কোর্স তথ্য</h4>
              <div>
                <label className="block text-sm font-medium mb-1.5">কোর্স</label>
                <select className="input-field" value={form.course_id}
                  onChange={e => { set('course_id', e.target.value); set('batch_id', ''); }}>
                  <option value="">-- কোর্স বেছে নিন --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {batches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">ব্যাচ</label>
                  <select className="input-field" value={form.batch_id}
                    onChange={e => set('batch_id', e.target.value)}>
                    <option value="">-- ব্যাচ বেছে নিন --</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">কোর্স মূল্য (৳)</label>
                <input type="number" className="input-field" value={form.course_price}
                  onChange={e => set('course_price', e.target.value)} />
              </div>
            </div>

            {/* Payment */}
            <div className="card space-y-3">
              <h4 className="font-semibold text-sm text-gray-600 uppercase">পেমেন্ট তথ্য</h4>
              <div>
                <label className="block text-sm font-medium mb-1.5">সংগৃহীত টাকা (৳)</label>
                <input type="number" className="input-field" value={form.collected_amount}
                  onChange={e => set('collected_amount', e.target.value)} />
              </div>
              {dueAmount > 0 && (
                <div className="bg-red-50 rounded-xl p-3 flex justify-between">
                  <span className="text-sm text-red-600">বাকি থাকবে</span>
                  <span className="font-bold text-red-600">৳{dueAmount.toLocaleString()}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">পেমেন্ট পদ্ধতি *</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => set('payment_method', m.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                        ${form.payment_method === m.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">ট্রানজেকশন আইডি</label>
                <input type="text" className="input-field" value={form.transaction_id}
                  onChange={e => set('transaction_id', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">পেমেন্ট প্রুফ</label>
                {proofPreview ? (
                  <div className="relative">
                    <img src={proofPreview} className="w-full h-32 object-cover rounded-xl" alt="proof" />
                    <button type="button" onClick={() => { setProofPreview(null); set('payment_proof', null); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                    <Camera size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-400">নতুন প্রুফ আপলোড করুন</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files[0];
                      if (file) { set('payment_proof', file); setProofPreview(URL.createObjectURL(file)); }
                    }} />
                  </label>
                )}
              </div>
              {dueAmount > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">বাকি দেওয়ার তারিখ</label>
                  <input type="date" className="input-field" value={form.due_date}
                    onChange={e => set('due_date', e.target.value)} />
                </div>
              )}
            </div>

            {/* Extra */}
            <div className="card space-y-3">
              <h4 className="font-semibold text-sm text-gray-600 uppercase">অতিরিক্ত তথ্য</h4>
              <div>
                <label className="block text-sm font-medium mb-1.5">রেফারেন্স</label>
                <input type="text" className="input-field" value={form.reference}
                  onChange={e => set('reference', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">নোট</label>
                <textarea className="input-field resize-none" rows={2} value={form.notes}
                  onChange={e => set('notes', e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'হচ্ছে...' : '✅ Resubmit করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}