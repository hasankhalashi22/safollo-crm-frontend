import { useState, useEffect } from 'react';
import { salesApi, paymentsApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Phone, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';

export default function DueList() {
  const [dues, setDues] = useState([]);
const [filtered, setFiltered] = useState([]);
const [search, setSearch] = useState('');
const [loading, setLoading] = useState(true);
const [expanded, setExpanded] = useState(null);
const [payModal, setPayModal] = useState(null);

  const fetchDues = () => {
    salesApi.getDueList({ limit: 500 }).then(res => {
      setDues(res.data || []);
      setFiltered(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleSearch = (val) => {
    setSearch(val);
    if (!val) {
      setFiltered(dues);
    } else {
      setFiltered(dues.filter(d =>
        d.student_phone?.includes(val) ||
        d.student_name?.toLowerCase().includes(val.toLowerCase())
      ));
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return toast.error('কোনো ডেটা নেই');

    const headers = ['স্টুডেন্টের নাম', 'ফোন নম্বর', 'কোর্স', 'ব্যাচ', 'কোর্স মূল্য', 'সংগৃহীত', 'বাকি', 'শেষ তারিখ'];
    const rows = filtered.map(d => [
      d.student_name || '',
      d.student_phone,
      d.course_name,
      d.batch_name || '',
      d.course_price,
      d.total_collected,
      d.due_amount,
      d.last_due_date ? format(new Date(d.last_due_date), 'dd/MM/yyyy') : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `বকেয়া_তালিকা_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Excel-এ export হয়েছে ✅');
  };

  useEffect(() => { fetchDues(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  return (
    <div className="p-4">
     <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-dark">
          বকেয়া তালিকা
          <span className="ml-2 text-sm font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            {filtered.length}টি
          </span>
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95"
        >
          <Download size={16} /> Excel
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
        <input
          type="tel"
          className="input-field pl-9"
          placeholder="ফোন নম্বর বা নাম দিয়ে খুঁজুন..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {dues.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500">কোনো বকেয়া নেই!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(due => (
            <div key={due.id} className="card">
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === due.id ? null : due.id)}
              >
                <div className="flex-1">
                  <p className="font-semibold">{due.student_name || due.student_phone}</p>
                  <p className="text-xs text-gray-500">{due.course_name} • {due.batch_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge-due">বকেয়া ৳{Number(due.due_amount).toLocaleString()}</span>
                    {due.last_due_date && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(due.last_due_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                {expanded === due.id ? <ChevronUp size={18} className="text-gray-400 mt-1" /> : <ChevronDown size={18} className="text-gray-400 mt-1" />}
              </div>

              {expanded === due.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">ফোন</p>
                      <p className="font-medium">{due.student_phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">কোর্স মূল্য</p>
                      <p className="font-medium">৳{Number(due.course_price).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">সংগৃহীত</p>
                      <p className="font-medium text-green-600">৳{Number(due.total_collected).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">বাকি</p>
                      <p className="font-bold text-red-600">৳{Number(due.due_amount).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`tel:${due.student_phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-medium"
                    >
                      <Phone size={16} /> কল করুন
                    </a>
                    <button
                      onClick={() => setPayModal(due)}
                      className="flex-1 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium active:scale-95"
                    >
                      পেমেন্ট নিন
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <PaymentModal
          due={payModal}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); fetchDues(); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ due, onClose, onSuccess }) {
 const [amount, setAmount] = useState('');
const [method, setMethod] = useState('');
const [txnId, setTxnId] = useState('');
const [dueDate, setDueDate] = useState('');
const [proof, setProof] = useState(null);
const [proofPreview, setProofPreview] = useState(null);
const [loading, setLoading] = useState(false);

  const maxAmount = due.course_price - due.total_collected;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('টাকার পরিমাণ দিন');
    if (!method) return toast.error('পেমেন্ট পদ্ধতি বেছে নিন');
    if (!txnId) return toast.error('ট্রানজেকশন আইডি দিন');
    if (!proof) return toast.error('পেমেন্ট প্রুফ আপলোড করুন');

    setLoading(true);
    try {
    const formData = new FormData();
      formData.append('enrollment_id', due.id);
      formData.append('amount', amount);
      formData.append('payment_method', method);
      formData.append('transaction_id', txnId);
      if (dueDate) formData.append('due_date', dueDate);
      if (proof) formData.append('payment_proof', proof);

      await paymentsApi.add(formData);
      toast.success('পেমেন্ট রেকর্ড হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-lg">পেমেন্ট নিন</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100">✕</button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-medium">{due.student_name || due.student_phone}</p>
          <p className="text-sm text-gray-500">{due.course_name}</p>
          <p className="text-red-600 font-bold mt-1">বাকি: ৳{Number(maxAmount).toLocaleString()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="number"
            className="input-field"
            placeholder={`সর্বোচ্চ ৳${maxAmount}`}
            value={amount}
            onChange={e => setAmount(Math.min(e.target.value, maxAmount))}
          />

          <div className="flex flex-wrap gap-2">
            {['bkash','nagad','rocket','cash','cod'].map(m => (
              <button key={m} type="button"
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                  ${method === m ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                {m === 'bkash' ? 'বিকাশ' : m === 'nagad' ? 'নগদ' : m === 'rocket' ? 'রকেট' : m === 'cash' ? 'ক্যাশ' : 'COD'}
              </button>
            ))}
          </div>

          <input type="text" className="input-field" placeholder="ট্রানজেকশন আইডি" value={txnId} onChange={e => setTxnId(e.target.value)} />

{/* Payment proof */}
{proofPreview ? (
  <div className="relative">
    <img src={proofPreview} alt="proof" className="w-full h-28 object-cover rounded-xl" />
    <button type="button"
      onClick={() => { setProof(null); setProofPreview(null); }}
      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
  </div>
) : (
  <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
    <span className="text-gray-400 text-sm">📷 পেমেন্ট প্রুফ আপলোড করুন *</span>
    <input type="file" accept="image/*" className="hidden"
      onChange={e => {
        const file = e.target.files[0];
        if (file) { setProof(file); setProofPreview(URL.createObjectURL(file)); }
      }} />
  </label>
)}

          {Number(amount) < maxAmount && (
            <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'সেভ হচ্ছে...' : '✅ পেমেন্ট সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
