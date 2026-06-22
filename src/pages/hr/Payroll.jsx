import { useState, useEffect } from 'react';
import { payrollApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Edit2, DollarSign, Lock, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const today = new Date();

const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

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

const handleRecalculate = async (id) => {
    try {
      await payrollApi.recalculateRun(id);
      toast.success('Recalculate হয়েছে ✅');
      fetchRuns();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleFinalizeAll = async () => {
    if (!confirm('সব draft payroll finalize করতে চান?')) return;
    try {
      await payrollApi.finalizeAllDrafts(month, year);
      toast.success('সব payroll finalize হয়েছে ✅');
      fetchRuns();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleCloseMonth = async () => {
    if (!confirm('এই মাসের payroll Close করতে চান? বাকি টাকা Accounting-এ Payable হবে।')) return;
    setClosing(true);
    try {
      const res = await payrollApi.closeMonth(month, year);
      toast.success(`${res.data.closed_count}টি payroll close হয়েছে ✅`);
      fetchRuns();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setClosing(false); }
  };

  const handlePdfDownload = () => {
    const period = `${monthNames[month - 1]} ${year}`;
   const rows = runs.map(r => `
      <tr>
        <td>${r.full_name}</td>
        <td>${r.attendance_days || 0}</td>
        <td>${r.weekly_off_days || 0}</td>
        <td>${r.holiday_days || 0}</td>
        <td>${r.paid_leave_days || 0}</td>
        <td>${r.extra_working_days || 0}</td>
        <td><strong>${r.working_days || 0}</strong></td>
        <td>৳${Number(r.basic_salary).toLocaleString()}</td>
        <td>৳${Number(r.total_allowances).toLocaleString()}</td>
        <td>৳${Number(r.total_deductions).toLocaleString()}</td>
        <td>৳${Number(r.previous_due).toLocaleString()}</td>
        <td>৳${Number(r.net_payable).toLocaleString()}</td>
        <td>৳${Number(r.total_paid).toLocaleString()}</td>
        <td>৳${Number(r.due_amount).toLocaleString()}</td>
        <td>${r.status === 'draft' ? 'Draft' : r.status === 'finalized' ? 'Finalized' : 'Closed'}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead>
          <tr>
         <th>কর্মী</th><th>উপস্থিতি</th><th>সাপ্তাহিক</th><th>অফিস ছুটি</th>
            <th>পেইড লিভ</th><th>অতিরিক্ত</th><th>মোট</th>
            <th>Basic</th><th>Allowance</th><th>Deduction</th>
            <th>পূর্ববর্তী</th><th>নেট পেয়েবল</th><th>পরিশোধিত</th><th>বাকি</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payroll Report</title>
      <style>
        @page { margin: 25px 30px 60px 30px; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #222; }
        .content { padding: 20px 30px; }
        .header { text-align: center; border-bottom: 2px solid #1A7A6E; padding-bottom: 12px; margin-bottom: 16px; padding-top: 60px; position: relative; }
        .logo { position: absolute; top: 0; right: 0; height: 55px; }
        .header h1 { font-size: 18px; color: #1A7A6E; margin: 0 0 4px 0; }
        .header h2 { font-size: 14px; margin: 0 0 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1A7A6E; color: white; padding: 6px 4px; font-size: 10px; }
        td { padding: 5px 4px; border-bottom: 1px solid #eee; font-size: 10px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #999; text-align: center; padding: 6px; border-top: 1px solid #eee; }
      </style></head>
      <body><div class="content">
        <div class="header">
          <img src="https://safollo-crm-frontend.vercel.app/logo.png" class="logo" />
          <h1>Safollo Academy</h1>
          <h2>Payroll Report — ${period}</h2>
        </div>
        ${tableHtml}
      </div>
      <div class="footer">Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExcelDownload = () => {
   const data = runs.map(r => ({
      'কর্মী': r.full_name,
      'বিভাগ': r.department || '',
      'উপস্থিতি দিন': r.attendance_days || 0,
      'সাপ্তাহিক ছুটি': r.weekly_off_days || 0,
      'অফিস ছুটি': r.holiday_days || 0,
      'পেইড লিভ': r.paid_leave_days || 0,
      'অতিরিক্ত দিন': r.extra_working_days || 0,
      'মোট কর্মদিবস': r.working_days || 0,
      'Basic Salary': Number(r.basic_salary),
      'Allowances': Number(r.total_allowances),
      'Deductions': Number(r.total_deductions),
      'Attendance Deduction': Number(r.attendance_deduction || 0),
      'Previous Due': Number(r.previous_due),
      'Net Payable': Number(r.net_payable),
      'Total Paid': Number(r.total_paid),
      'Due Amount': Number(r.due_amount),
      'Status': r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Payroll ${month}-${year}`);
    XLSX.writeFile(wb, `Payroll_${month}_${year}.xlsx`);
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-dark">Payroll</h1>
        <div className="flex gap-2">
          <select className="input-field" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{monthNames[m - 1]}</option>
            ))}
          </select>
          <select className="input-field max-w-[100px]" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={handlePrepare} disabled={preparing}
          className="bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
          {preparing ? 'প্রস্তুত হচ্ছে...' : '📋 এই মাসের স্যালারি প্রস্তুত করুন'}
        </button>
        {hasDrafts && (
          <button onClick={handleFinalizeAll}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
            ✅ সব Finalize করুন
          </button>
        )}
        {hasFinalized && (
          <button onClick={handleCloseMonth} disabled={closing}
            className="bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            <Lock size={14} className="inline mr-1" />{closing ? 'Closing...' : 'মাস Close করুন'}
          </button>
        )}
        {runs.length > 0 && (
          <>
            <button onClick={handlePdfDownload}
              className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2.5 rounded-xl text-sm font-medium">
              <Download size={14} /> PDF
            </button>
            <button onClick={handleExcelDownload}
              className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2.5 rounded-xl text-sm font-medium">
              <Download size={14} /> Excel
            </button>
          </>
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
              {['কর্মী', 'উপস্থিতি', 'সাপ্তাহিক ছুটি', 'অফিস ছুটি', 'পেইড লিভ', 'অতিরিক্ত', 'মোট কর্মদিবস', 'Basic', 'Allowance', 'Deduction', 'Att. Penalty', 'পূর্ববর্তী', 'নেট পেয়েবল', 'পরিশোধিত', 'বাকি', 'Status', 'Action'].map(h => (

                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">এই মাসের payroll এখনো প্রস্তুত হয়নি</td></tr>
                ) : runs.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{run.full_name}</td>
                   <td className="px-3 py-3 text-center">{run.attendance_days || 0}</td>
                    <td className="px-3 py-3 text-center">{run.weekly_off_days || 0}</td>
                    <td className="px-3 py-3 text-center">{run.holiday_days || 0}</td>
                    <td className="px-3 py-3 text-center">{run.paid_leave_days || 0}</td>
                    <td className="px-3 py-3 text-center">{run.extra_working_days || 0}</td>
                    <td className="px-3 py-3 text-center font-semibold">{run.working_days || 0}</td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.basic_salary).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">+৳{Number(run.total_allowances).toLocaleString()}</td>
                   <td className="px-3 py-3 whitespace-nowrap text-red-500">-৳{Number(run.total_deductions).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-red-500">-৳{Number(run.attendance_deduction || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.previous_due).toLocaleString()}</td>

                    <td className="px-3 py-3 whitespace-nowrap font-semibold">৳{Number(run.net_payable).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">৳{Number(run.total_paid).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-amber-600">৳{Number(run.due_amount).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{statusBadge(run.status)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                      {run.status === 'draft' && (
                          <>
                            <button onClick={() => handleRecalculate(run.id)} title="Recalculate"
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                              ↻
                            </button>
                            <button onClick={() => setEditModal(run)} title="Edit"
                              className="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}

                        {(run.status === 'finalized' || run.status === 'closed') && (
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
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{run.full_name}-এর Payroll Edit</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-3 text-sm">
            <p>কর্মদিবস: <strong>{run.working_days || 0}</strong> | অতিরিক্ত: <strong>{run.extra_working_days || 0}</strong></p>
          </div>
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
            <label className="block text-sm font-medium mb-1.5">Previous Due</label>
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
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    payrollApi.getPayments(run.id).then(r => setPayments(r.data || []));
  }, [run.id]);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'safollo_unsigned');
    const res = await fetch('https://api.cloudinary.com/v1_1/safollo/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('সঠিক পরিমাণ দিন');
    setLoading(true);
    try {
      let proofUrl = null;
      if (proofFile) {
        setUploading(true);
        proofUrl = await uploadToCloudinary(proofFile);
        setUploading(false);
      }
      await payrollApi.recordPayment(run.id, { amount, payment_date: paymentDate, note, proof_url: proofUrl });
      toast.success('পেমেন্ট রেকর্ড হয়েছে ✅');
      setAmount('');
      setNote('');
      setProofFile(null);
      const res = await payrollApi.getPayments(run.id);
      setPayments(res.data || []);
      onSuccess();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setLoading(false); setUploading(false); }
  };

  const currentDue = parseFloat(run.net_payable) - payments.reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{run.full_name}-এর পেমেন্ট</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-sm space-y-1">
          <p>নেট পেয়েবল: <strong>৳{Number(run.net_payable).toLocaleString()}</strong></p>
          <p>মোট পরিশোধিত: <strong className="text-green-600">৳{payments.reduce((s, p) => s + parseFloat(p.amount), 0).toLocaleString()}</strong></p>
          <p>বর্তমান বাকি: <strong className="text-red-600">৳{Math.max(0, currentDue).toLocaleString()}</strong></p>
        </div>

        {payments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">পেমেন্ট ইতিহাস</p>
            <div className="space-y-1.5">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">৳{Number(p.amount).toLocaleString()}</p>
                    <p className="text-gray-400">{format(new Date(p.payment_date), 'dd/MM/yyyy')} {p.note ? `— ${p.note}` : ''}</p>
                  </div>
                  {p.proof_url && (
                    <a href={p.proof_url} target="_blank" rel="noreferrer"
                      className="text-primary-600 underline">Proof</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">পরিমাণ *</label>
            <input type="number" className="input-field" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`সর্বোচ্চ ৳${Math.max(0, currentDue).toLocaleString()}`} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">তারিখ</label>
            <input type="date" className="input-field" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">নোট (ঐচ্ছিক)</label>
            <input type="text" className="input-field" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Proof (ঐচ্ছিক)</label>
            <input type="file" accept="image/*,.pdf" className="input-field"
              onChange={e => setProofFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || uploading}>
            {uploading ? 'Uploading...' : loading ? 'প্রক্রিয়া হচ্ছে...' : '✅ পেমেন্ট নিশ্চিত করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}