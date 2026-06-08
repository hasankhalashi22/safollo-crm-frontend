import { useState, useEffect } from 'react';
import { approvalsApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ZoomIn, CheckCircle, XCircle, Edit } from 'lucide-react';

export default function SaleApproval() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [duePayments, setDuePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedDue, setSelectedDue] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectDueModal, setRejectDueModal] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      approvalsApi.getPending(),
      approvalsApi.getPendingDue(),
    ]).then(([salesRes, dueRes]) => {
      setSales(salesRes.data || []);
      setDuePayments(dueRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (sale, editData) => {
    try {
      await approvalsApi.approve(sale.id, editData || {});
      toast.success('Approve হয়েছে ✅');
      setSelected(null);
      fetchData();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleReject = async (sale, reason) => {
    try {
      await approvalsApi.reject(sale.id, reason);
      toast.success('Reject হয়েছে');
      setRejectModal(null);
      setSelected(null);
      fetchData();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleApproveDue = async (payment) => {
    try {
      await approvalsApi.approveDuePayment(payment.id);
      toast.success('Payment Approve হয়েছে ✅');
      setSelectedDue(null);
      fetchData();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleRejectDue = async (payment, reason) => {
    try {
      await approvalsApi.rejectDuePayment(payment.id, reason);
      toast.success('Payment Reject হয়েছে');
      setRejectDueModal(null);
      setSelectedDue(null);
      fetchData();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">সেল এন্ট্রি Approval</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6 max-w-sm">
        <button onClick={() => setActiveTab('sales')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'sales' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
          নতুন সেল
          {sales.length > 0 && <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">{sales.length}</span>}
        </button>
        <button onClick={() => setActiveTab('due')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'due' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
          বকেয়া Payment
          {duePayments.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{duePayments.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : activeTab === 'sales' ? (
        /* New Sales */
        sales.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">কোনো pending সেল নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map(sale => (
              <div key={sale.id} className="card hover:shadow-card-hover cursor-pointer" onClick={() => setSelected(sale)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{sale.student_name || sale.student_phone}</p>
                    <p className="text-sm text-gray-500">{sale.course_name} {sale.batch_name ? '• ' + sale.batch_name : ''}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-primary-600 font-bold">৳{Number(sale.total_collected).toLocaleString()}</span>
                      {Number(sale.due_amount) > 0 && (
                        <span className="text-red-500 text-sm">বাকি: ৳{Number(sale.due_amount).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{format(new Date(sale.created_at), 'dd/MM/yy HH:mm')}</p>
                    <p className="text-sm text-gray-500 mt-1">{sale.executive_name || sale.executive_phone}</p>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Due Payments */
        duePayments.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">কোনো pending বকেয়া payment নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {duePayments.map(payment => (
              <div key={payment.id} className="card hover:shadow-card-hover cursor-pointer" onClick={() => setSelectedDue(payment)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{payment.student_name || payment.student_phone}</p>
                    <p className="text-sm text-gray-500">{payment.course_name} {payment.batch_name ? '• ' + payment.batch_name : ''}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-green-600 font-bold">৳{Number(payment.amount).toLocaleString()} পরিশোধ</span>
                      <span className="text-red-500 text-sm">বাকি: ৳{Number(payment.remaining_due).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{format(new Date(payment.created_at), 'dd/MM/yy HH:mm')}</p>
                    <p className="text-sm text-gray-500 mt-1">{payment.executive_name}</p>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Sale Approval Modal */}
      {selected && (
        <ApprovalModal
          sale={selected}
          onApprove={handleApprove}
          onReject={(sale) => setRejectModal(sale)}
          onClose={() => setSelected(null)}
          onZoom={(url) => setZoomImage(url)}
        />
      )}

      {/* Due Payment Approval Modal */}
      {selectedDue && (
        <DuePaymentModal
          payment={selectedDue}
          onApprove={handleApproveDue}
          onReject={(payment) => setRejectDueModal(payment)}
          onClose={() => setSelectedDue(null)}
          onZoom={(url) => setZoomImage(url)}
        />
      )}

      {rejectModal && (
        <RejectModal sale={rejectModal} onReject={handleReject} onClose={() => setRejectModal(null)} />
      )}

      {rejectDueModal && (
        <RejectDueModal payment={rejectDueModal} onReject={handleRejectDue} onClose={() => setRejectDueModal(null)} />
      )}

      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="proof" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">✕</button>
        </div>
      )}
    </div>
  );
}

function ApprovalModal({ sale, onApprove, onReject, onClose, onZoom }) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    course_price: sale.course_price,
    reference: sale.reference || '',
    notes: sale.notes || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-500 text-white p-5 rounded-t-2xl flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{sale.student_name || sale.student_phone}</h2>
            <p className="text-primary-200">{sale.course_name} {sale.batch_name ? '• ' + sale.batch_name : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-primary-400 rounded-full">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="স্টুডেন্ট ফোন" value={sale.student_phone} />
            <InfoCard label="Executive" value={sale.executive_name || sale.executive_phone} />
            <InfoCard label="এন্ট্রির সময়" value={format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')} />
            <InfoCard label="রেফারেন্স" value={sale.reference || '—'} />
          </div>

          <div className="card bg-gray-50 p-4">
            <h3 className="font-semibold mb-3">পেমেন্ট তথ্য</h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">কোর্স মূল্য</label>
                  <input type="number" className="input-field" value={editData.course_price}
                    onChange={e => setEditData(p => ({ ...p, course_price: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">রেফারেন্স</label>
                  <input type="text" className="input-field" value={editData.reference}
                    onChange={e => setEditData(p => ({ ...p, reference: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">নোট</label>
                  <textarea className="input-field resize-none" rows={2} value={editData.notes}
                    onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="কোর্স মূল্য" value={`৳${Number(sale.course_price).toLocaleString()}`} />
                <InfoCard label="সংগৃহীত" value={`৳${Number(sale.total_collected).toLocaleString()}`} />
                <InfoCard label="বাকি" value={`৳${Number(sale.due_amount || 0).toLocaleString()}`} />
                <InfoCard label="নোট" value={sale.notes || '—'} />
              </div>
            )}
          </div>

          {sale.payment_history?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold mb-3">পেমেন্ট ইতিহাস</h3>
              {sale.payment_history.map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">৳{Number(p.amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{p.payment_method} {p.transaction_id ? '• ' + p.transaction_id : ''}</p>
                    </div>
                    <p className="text-xs text-gray-400">{p.created_at ? format(new Date(p.created_at), 'dd/MM/yy HH:mm') : ''}</p>
                  </div>
                  {p.payment_proof_url && (
                    <div className="mt-2 cursor-pointer" onClick={() => onZoom(p.payment_proof_url)}>
                      <div className="relative inline-block">
                        <img src={p.payment_proof_url} className="h-24 w-40 object-cover rounded-lg border" alt="proof" />
                        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                          <ZoomIn size={24} className="text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">
              <Edit size={16} /> {editMode ? 'Edit বন্ধ' : 'Edit করুন'}
            </button>
            <button onClick={() => onReject(sale)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">
              <XCircle size={18} /> Reject
            </button>
            <button onClick={() => onApprove(sale, editMode ? editData : null)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium">
              <CheckCircle size={18} /> Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuePaymentModal({ payment, onApprove, onReject, onClose, onZoom }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-red-500 text-white p-5 rounded-t-2xl flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{payment.student_name || payment.student_phone}</h2>
            <p className="text-red-200">{payment.course_name} {payment.batch_name ? '• ' + payment.batch_name : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-red-400 rounded-full">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="স্টুডেন্ট ফোন" value={payment.student_phone} />
            <InfoCard label="Executive" value={payment.executive_name} />
            <InfoCard label="পরিশোধের পরিমাণ" value={`৳${Number(payment.amount).toLocaleString()}`} />
            <InfoCard label="পেমেন্ট পদ্ধতি" value={payment.payment_method} />
            {payment.transaction_id && <InfoCard label="Transaction ID" value={payment.transaction_id} />}
            <InfoCard label="কোর্স মূল্য" value={`৳${Number(payment.course_price).toLocaleString()}`} />
            <InfoCard label="মোট পরিশোধ" value={`৳${Number(payment.total_collected).toLocaleString()}`} />
            <InfoCard label="এখনো বাকি" value={`৳${Number(payment.remaining_due).toLocaleString()}`} />
          </div>

          {/* Payment proof */}
          {payment.payment_proof_url && (
            <div className="card p-4">
              <h3 className="font-semibold mb-3">পেমেন্ট প্রুফ</h3>
              <div className="cursor-pointer" onClick={() => onZoom(payment.payment_proof_url)}>
                <div className="relative inline-block">
                  <img src={payment.payment_proof_url} className="h-32 w-full object-cover rounded-xl border" alt="proof" />
                  <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                    <ZoomIn size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full transaction history */}
          {payment.full_payment_history?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold mb-3">সম্পূর্ণ লেনদেন ইতিহাস</h3>
              {payment.full_payment_history.map((p, i) => (
                <div key={i} className={`rounded-xl p-3 mb-2 ${p.id === payment.id ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">৳{Number(p.amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{p.payment_method} {p.transaction_id ? '• ' + p.transaction_id : ''}</p>
                      <p className="text-xs text-gray-400">{p.is_due_payment ? 'বকেয়া পেমেন্ট' : 'প্রথম পেমেন্ট'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{p.created_at ? format(new Date(p.created_at), 'dd/MM/yy HH:mm') : ''}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.approval_status === 'approved' ? 'bg-green-100 text-green-600' : p.approval_status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {p.approval_status === 'approved' ? 'Approved' : p.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                      {p.id === payment.id && <p className="text-xs text-orange-500 mt-0.5">← এই payment</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => onReject(payment)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">
              <XCircle size={18} /> Reject
            </button>
            <button onClick={() => onApprove(payment)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium">
              <CheckCircle size={18} /> Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ sale, onReject, onClose }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (withReason) => {
    setLoading(true);
    try { await onReject(sale, withReason ? reason : ''); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg text-red-600">Reject করুন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="space-y-3">
          <textarea className="input-field resize-none" rows={3} placeholder="কারণ লিখুন (ঐচ্ছিক)"
            value={reason} onChange={e => setReason(e.target.value)} />
          <button onClick={() => handleSubmit(true)} disabled={loading} className="btn-danger">
            {loading ? 'হচ্ছে...' : '❌ কারণসহ Reject'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={loading} className="btn-secondary">
            কারণ ছাড়া Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectDueModal({ payment, onReject, onClose }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (withReason) => {
    setLoading(true);
    try { await onReject(payment, withReason ? reason : ''); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg text-red-600">Payment Reject করুন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="bg-red-50 rounded-xl p-3 mb-4">
          <p className="font-medium text-sm">{payment.student_name || payment.student_phone}</p>
          <p className="text-sm text-gray-500">{payment.course_name}</p>
          <p className="text-red-600 font-bold">৳{Number(payment.amount).toLocaleString()}</p>
        </div>
        <div className="space-y-3">
          <textarea className="input-field resize-none" rows={3} placeholder="কারণ লিখুন (ঐচ্ছিক)"
            value={reason} onChange={e => setReason(e.target.value)} />
          <button onClick={() => handleSubmit(true)} disabled={loading} className="btn-danger">
            {loading ? 'হচ্ছে...' : '❌ কারণসহ Reject'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={loading} className="btn-secondary">
            কারণ ছাড়া Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}