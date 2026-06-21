import { useState, useEffect } from 'react';
import { payrollApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Edit2, CheckCircle, DollarSign, Lock } from 'lucide-react';

const today = new Date();

export default function Payroll() {
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [closing, setClosing] = useState(false);

  const fetchRuns = () => {
    setLoading(true);
    payrollApi.getPayrollRuns(month, year).then(r => {
      setRuns(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(); }, [month, year]);

  const handlePrepare = async () => {
    setPreparing(true);
    try {
      const res = await payrollApi.prepareMonth(month, year);
      toast.success(`${res.data.length}টি payroll প্রস্তুত হয়েছে ✅`);
      fetchRuns();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setPreparing(false); }
  };

  const handleFinalizeAll = async () => {
    if (!confirm('সব draft payroll finalize করতে চান? এরপর আর edit করা যাবে না।')) return;
    try {
      await payrollApi.finalizeAllDrafts(month, year);
      toast.success('সব payroll finalize হয়েছে ✅');
      fetchRuns();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleCloseMonth = async () => {
    if (!confirm('এই মাসের payroll Close করতে চান? বাকি থাকা টাকা Accounting-এ Payable হিসেবে যুক্ত হবে।')) return;
    setClosing(true);
    try {
      const res = await payrollApi.closeMonth(month, year);
      toast.success(`${res.data.closed_count}টি payroll close হয়েছে ✅`);
      fetchRuns();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setClosing(false); }
  };

  const statusBadge = (status) => {
    const map = {
      draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
      finalized: { label: 'Finalized', cls: 'bg-blue-50 text-blue-600' },
      closed: { label: 'Closed', cls: 'bg-green-50 text-green-600' },
    };
    const info = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>;
  };

  const hasDrafts = runs.some(r => r.status === 'draft');
  const hasFinalized = runs.some(r => r.status === 'finalized');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-dark">Payroll</h1>
        <div className="flex gap-2">
          <select className="input-field" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{format(new Date(2000, m - 1), 'MMMM')}</option>
            ))}
          </select>
          <select className="input-field max-w-[100px]" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={handlePrepare} disabled={preparing}
          className="flex items-center gap-1.5 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
          {preparing ? 'প্রস্তুত হচ্ছে...' : '📋 এই মাসের স্যালারি প্রস্তুত করুন'}
        </button>
        {hasDrafts && (
          <button onClick={handleFinalizeAll}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
            <CheckCircle size={16} /> সব Finalize করুন
          </button>
        )}
        {hasFinalized && (
          <button onClick={handleCloseMonth} disabled={closing}
            className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            <Lock size={16} /> {closing ? 'Closing...' : 'মাস Close করুন'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['কর্মী', 'Basic', 'Allowance', 'Deduction', 'প্রেভিয়াস ডিউ', 'নেট পেয়েবল', 'পরিশোধিত', 'বাকি', 'স্ট্যাটাস', 'Action'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">এই মাসের payroll এখনো প্রস্তুত হয়নি</td></tr>
                ) : runs.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{run.full_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.basic_salary).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">+৳{Number(run.total_allowances).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-red-500">-৳{Number(run.total_deductions).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.previous_due).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold">৳{Number(run.net_payable).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">৳{Number(run.total_paid).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-amber-600">৳{Number(run.due_amount).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{statusBadge(run.status)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {run.status === 'draft' && (
                          <button onClick={() => setEditModal(run)} className="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {(run.status === 'finalized' || run.status === 'closed') && run.due_amount > 0 && (
                          <button onClick={() => setPaymentModal(run)} className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                            <DollarSign size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal && (
        <EditDraftModal run={editModal} onClose={() => setEditModal(null)} onSuccess={() => { setEditModal(null); fetchRuns(); }} />
      )}
      {paymentModal && (
        <PaymentModal run={paymentModal} onClose={() => setPaymentModal(null)} onSuccess={() => { setPaymentModal(null); fetchRuns(); }} />
      )}
    </div>
  );
}

function EditDraftModal({ run, onClose, onSuccess }) {
  const [form, setForm] = useState({
    basic_salary: run.basic_salary,
    total_allowances: run.total_allowances,
    total_deductions: run.total_deductions,
    unpaid_leave_deduction: run.unpaid_leave_deduction,
    previous_due: run.previous_due,
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const netPreview = (parseFloat(form.basic_salary) || 0) + (parseFloat(form.total_allowances) || 0)
    - (parseFloat(form.total_deductions) || 0) - (parseFloat(form.unpaid_leave_deduction) || 0)
    + (parseFloat(form.previous_due) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payrollApi.updateDraftRun(run.id, form);
      toast.success('আপডেট হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{run.full_name}-এর Payroll Edit</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Basic Salary</label>
            <input type="number" className="input-field" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Total Allowances</label>
            <input type="number" className="input-field" value={form.total_allowances} onChange={e => set('total_allowances', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Total Deductions (Attendance penalty সহ)</label>
            <input type="number" className="input-field" value={form.total_deductions} onChange={e => set('total_deductions', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Unpaid Leave Deduction</label>
            <input type="number" className="input-field" value={form.unpaid_leave_deduction} onChange={e => set('unpaid_leave_deduction', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Previous Due (পূর্ববর্তী বাকি)</label>
            <input type="number" className="input-field" value={form.previous_due} onChange={e => set('previous_due', e.target.value)} />
          </div>

          <div className="bg-primary-50 rounded-xl p-3">
            <p className="text-sm text-gray-500">Net Payable (প্রিভিউ)</p>
            <p className="text-xl font-bold text-primary-600">৳{netPreview.toLocaleString()}</p>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ সংরক্ষণ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ run, onClose, onSuccess }) {
  const [amount, setAmount] = useState(run.due_amount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('সঠিক পরিমাণ দিন');
    setLoading(true);
    try {
      await payrollApi.recordPayment(run.id, { amount, payment_date: paymentDate, note });
      toast.success('পেমেন্ট রেকর্ড হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{run.full_name}-কে পেমেন্ট</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-sm">
          <p>মোট বাকি: <span className="font-bold">৳{Number(run.due_amount).toLocaleString()}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">পরিমাণ *</label>
            <input type="number" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">তারিখ</label>
            <input type="date" className="input-field" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">নোট (ঐচ্ছিক)</label>
            <textarea className="input-field resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'প্রক্রিয়া হচ্ছে...' : '✅ পেমেন্ট নিশ্চিত করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}