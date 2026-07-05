import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { salesApi, paymentsApi, bookApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Phone, ChevronDown, ChevronUp, Search, Download, X, ZoomIn } from 'lucide-react';

export default function DueList() {
  const [dues, setDues] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);

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
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
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
        <button onClick={handleExport}
          className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">
          <Download size={16} /> Excel
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
        <input type="tel" className="input-field pl-9" placeholder="ফোন নম্বর বা নাম দিয়ে খুঁজুন..."
          value={search} onChange={e => handleSearch(e.target.value)} />
      </div>

      {dues.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500">কোনো বকেয়া নেই!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(due => (
            <div key={due.id} className="card cursor-pointer" onClick={() => setHistoryModal(due)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{due.student_name || due.student_phone}</p>
                  <p className="text-xs text-gray-500">{due.course_name} • {due.batch_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge-due">বকেয়া ৳{Number(due.due_amount).toLocaleString()}</span>
                    {due.last_due_date && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                        পরিশোধের তারিখ: {format(new Date(due.last_due_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-1">বিস্তারিত →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {historyModal && (
        <PaymentHistoryModal
          due={historyModal}
          onClose={() => setHistoryModal(null)}
          onPay={(due) => { setHistoryModal(null); setPayModal(due); }}
        />
      )}

   {payModal && (
        payModal.is_book ? (
          <BookDeliveryModal
            due={payModal}
            onClose={() => setPayModal(null)}
            onSuccess={() => { setPayModal(null); fetchDues(); }}
          />
        ) : (
          <PaymentModal
            due={payModal}
            onClose={() => setPayModal(null)}
            onSuccess={() => { setPayModal(null); fetchDues(); }}
          />
        )
      )}
    </div>
  );
}

function PaymentModal({ due, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [txnId, setTxnId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [proof, setProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const maxAmount = due.course_price - due.total_collected;
  const remainingAfterPayment = maxAmount - Number(amount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('টাকার পরিমাণ দিন');
    if (!method) return toast.error('পেমেন্ট পদ্ধতি বেছে নিন');
    if (!senderNumber || senderNumber.length !== 11) return toast.error('যে নম্বর হতে পেমেন্ট এসেছে দিন');
    if (!proof) return toast.error('পেমেন্ট প্রুফ আপলোড করুন');
    if (remainingAfterPayment > 0 && !dueDate) return toast.error('বাকি দেওয়ার তারিখ দিন');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('enrollment_id', due.id);
      formData.append('amount', amount);
      formData.append('payment_method', method);
      formData.append('sender_number', senderNumber);
      if (txnId) formData.append('transaction_id', txnId);
      if (dueDate) formData.append('due_date', dueDate);
      formData.append('payment_proof', proof);

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
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
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
          <div>
            <label className="block text-sm font-medium mb-1">সংগৃহীত টাকা (৳) *</label>
            <input type="number" className="input-field"
              placeholder={`সর্বোচ্চ ৳${maxAmount}`}
              value={amount}
              onChange={e => setAmount(Math.min(e.target.value, maxAmount))} />
          </div>

          {amount && Number(amount) > 0 && remainingAfterPayment > 0 && (
            <div className="bg-red-50 rounded-xl p-3 flex justify-between">
              <span className="text-sm text-red-600">পেমেন্টের পর বাকি থাকবে</span>
              <span className="font-bold text-red-600">৳{remainingAfterPayment.toLocaleString()}</span>
            </div>
          )}

          {amount && Number(amount) > 0 && remainingAfterPayment === 0 && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <span className="text-sm text-green-600 font-medium">✅ সম্পূর্ণ পরিশোধ হবে</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">পেমেন্ট পদ্ধতি *</label>
            <div className="flex flex-wrap gap-2">
              {['bkash', 'nagad', 'rocket', 'cash', 'cod'].map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                    ${method === m ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {m === 'bkash' ? 'বিকাশ' : m === 'nagad' ? 'নগদ' : m === 'rocket' ? 'রকেট' : m === 'cash' ? 'ক্যাশ' : 'COD'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">যে নম্বর হতে পেমেন্ট এসেছে *</label>
            <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
              value={senderNumber}
              onChange={e => setSenderNumber(e.target.value.replace(/\D/g, '').slice(0, 11))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ট্রানজেকশন আইডি</label>
            <input type="text" className="input-field" placeholder="ঐচ্ছিক"
              value={txnId} onChange={e => setTxnId(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">পেমেন্ট প্রুফ *</label>
            {proofPreview ? (
              <div className="relative">
                <img src={proofPreview} alt="proof" className="w-full h-28 object-cover rounded-xl" />
                <button type="button" onClick={() => { setProof(null); setProofPreview(null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                <span className="text-gray-400 text-sm">📷 পেমেন্ট প্রুফ আপলোড করুন</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) { setProof(file); setProofPreview(URL.createObjectURL(file)); }
                  }} />
              </label>
            )}
          </div>

          {remainingAfterPayment > 0 && amount && Number(amount) > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">বাকি দেওয়ার তারিখ *</label>
              <input type="date" className="input-field" value={dueDate}
                onChange={e => setDueDate(e.target.value)} />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'সেভ হচ্ছে...' : '✅ পেমেন্ট সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

function BookDeliveryModal({ due, onClose, onSuccess }) {
  const [status, setStatus] = useState(''); // 'delivered' or 'returned'
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const dueAmount = due.course_price - due.total_collected;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!status) return toast.error('স্ট্যাটাস বেছে নিন');
    if (!referenceNumber) return toast.error('Steadfast রেফারেন্স নম্বর দিন');

    setLoading(true);
    try {
      if (status === 'delivered') {
        await bookApi.confirmDelivery(due.id, referenceNumber);
        toast.success('ডেলিভারি কনফার্ম হয়েছে — Approval pending ✅');
      } else {
        await bookApi.markReturned(due.id, referenceNumber);
        toast.success('রিটার্ন রেকর্ড হয়েছে ✅');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-lg">বই ডেলিভারি স্ট্যাটাস</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100">✕</button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-medium">{due.student_name || due.student_phone}</p>
          <p className="text-sm text-gray-500">{due.course_name}</p>
          <p className="text-red-600 font-bold mt-1">COD বই মূল্য: ৳{Number(dueAmount).toLocaleString()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">স্ট্যাটাস *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStatus('delivered')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${status === 'delivered' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                ✅ ডেলিভারড
              </button>
              <button type="button" onClick={() => setStatus('returned')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${status === 'returned' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                ↩️ রিটার্নড
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Steadfast রেফারেন্স নম্বর *</label>
            <input type="text" className="input-field" placeholder="Steadfast একাউন্টে যেটা দেখাচ্ছে"
              value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'সেভ হচ্ছে...' : '✅ সাবমিট করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
function PaymentHistoryModal({ due, onClose, onPay }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomImg, setZoomImg] = useState(null);

  useEffect(() => {
    salesApi.getById(due.id).then(res => {
      setDetail(res.data || res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [due.id]);

  const history = detail?.payment_history || [];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-display font-bold text-lg">{due.student_name || due.student_phone}</p>
            <p className="text-xs text-gray-400">{due.course_name} • {due.batch_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner w-6 h-6" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">ভর্তির তারিখ</p>
                  <p className="font-semibold text-sm">{detail?.created_at ? format(new Date(detail.created_at), 'dd MMM yyyy') : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">কোর্স মূল্য</p>
                  <p className="font-semibold text-sm">৳{Number(due.course_price).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">মোট সংগৃহীত</p>
                  <p className="font-semibold text-sm text-green-600">৳{Number(due.total_collected).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">বকেয়া</p>
                  <p className="font-bold text-sm text-red-600">৳{Number(due.due_amount).toLocaleString()}</p>
                </div>
                {due.last_due_date && (
                  <div className="col-span-2 bg-orange-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">পরিশোধের প্রতিশ্রুতির তারিখ</p>
                    <p className="font-semibold text-sm text-orange-600">{format(new Date(due.last_due_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">পেমেন্ট ইতিহাস ({history.length}টি)</p>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">কোনো পেমেন্ট রেকর্ড নেই</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((p, i) => (
                      <div key={p.id || i} className="border border-gray-100 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-600">৳{Number(p.amount).toLocaleString()}</span>
                          <span className="text-xs text-gray-400">{p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a') : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                          {p.payment_method && <span>পদ্ধতি: <strong className="text-gray-700">{p.payment_method}</strong></span>}
                          {p.sender_number && <span>নম্বর: <strong className="text-gray-700">{p.sender_number}</strong></span>}
                          {p.transaction_id && <span className="col-span-2">TxnID: <strong className="text-gray-700">{p.transaction_id}</strong></span>}
                          {p.due_date && <span className="col-span-2 text-orange-600">পরবর্তী পরিশোধ: <strong>{format(new Date(p.due_date), 'dd MMM yyyy')}</strong></span>}
                          {p.collected_by_name && <span className="col-span-2">এন্ট্রি: <strong className="text-gray-700">{p.collected_by_name}</strong></span>}
                          {p.note && <span className="col-span-2 text-blue-600">নোট: {p.note}</span>}
                        </div>
                        {p.proof_url && (
                          <button onClick={() => setZoomImg(p.proof_url)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl">
                            <ZoomIn size={14} /> পেমেন্ট প্রুফ দেখুন
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <a href={`tel:${due.student_phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium">
            <Phone size={16} /> কল করুন
          </a>
          {!due.is_book && (
            <button onClick={() => onPay(due)}
              className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium">
              পেমেন্ট নিন
            </button>
          )}
        </div>
      </div>

      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="proof" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"><X size={20} /></button>
        </div>
      )}
    </div>,
    document.body
  );
}
