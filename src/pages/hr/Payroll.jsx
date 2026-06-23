import { useState, useEffect } from 'react';
import { payrollApi, hrApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Edit2, DollarSign, Lock, Download, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../../components/Modal';

const today = new Date();
const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export default function Payroll() {
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [employeeId, setEmployeeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payslipModal, setPayslipModal] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    hrApi.getEmployees().then(r => setEmployees(r.data || []));
  }, []);

  const fetchRuns = () => {
    setLoading(true);
    const params = searchMode
      ? { employeeId, dateFrom, dateTo }
      : { month, year };
    payrollApi.getPayrollRuns(params).then(r => {
      setRuns(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(); }, [month, year, searchMode]);

  const handleSearch = () => fetchRuns();

  const handleReset = () => {
    setEmployeeId('');
    setDateFrom('');
    setDateTo('');
    setSearchMode(false);
  };

  const handlePrepare = async () => {
    setPreparing(true);
    try {
      const res = await payrollApi.prepareMonth(month, year);
      toast.success(`${res.data.length}টি payroll প্রস্তুত হয়েছে ✅`);
      fetchRuns();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setPreparing(false); }
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
    if (!confirm('এই মাসের payroll Close করতে চান?')) return;
    setClosing(true);
    try {
      const res = await payrollApi.closeMonth(month, year);
      toast.success(`${res.data.closed_count}টি payroll close হয়েছে ✅`);
      fetchRuns();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setClosing(false); }
  };

  const handleRecalculate = async (id) => {
    try {
      await payrollApi.recalculateRun(id);
      toast.success('Recalculate হয়েছে ✅');
      fetchRuns();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handlePdfDownload = () => {
    const period = searchMode ? `${dateFrom || ''} — ${dateTo || ''}` : `${monthNames[month - 1]} ${year}`;
    const rows = runs.map(r => `
      <tr>
        <td>${r.full_name}</td>
        <td>${r.working_days || 0}</td>
        <td>৳${Number(r.basic_salary).toLocaleString()}</td>
        <td>৳${Number(r.total_allowances).toLocaleString()}</td>
        <td>৳${Number(r.total_deductions).toLocaleString()}</td>
        <td>৳${Number(r.attendance_deduction || 0).toLocaleString()}</td>
        <td>৳${Number(r.previous_due).toLocaleString()}</td>
        <td>৳${Number(r.net_payable).toLocaleString()}</td>
        <td>৳${Number(r.total_paid).toLocaleString()}</td>
        <td>৳${Number(r.due_amount).toLocaleString()}</td>
        <td>${r.status}</td>
      </tr>`).join('');

    const tableHtml = `<table>
      <thead><tr><th>কর্মী</th><th>কর্মদিবস</th><th>Basic</th><th>Allowance</th><th>Deduction</th><th>Att. Penalty</th><th>পূর্ববর্তী</th><th>নেট পেয়েবল</th><th>পরিশোধিত</th><th>বাকি</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payroll Report</title>
      <style>
        @page { margin: 25px 30px 60px 30px; }
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .header { text-align: center; border-bottom: 2px solid #1A7A6E; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; color: #1A7A6E; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1A7A6E; color: white; padding: 6px 4px; font-size: 10px; }
        td { padding: 5px 4px; border-bottom: 1px solid #eee; font-size: 10px; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style></head>
      <body><div class="header"><h1>Safollo Academy</h1><h2>Payroll Report — ${period}</h2></div>${tableHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExcelDownload = () => {
    const data = runs.map(r => ({
      'কর্মী': r.full_name, 'বিভাগ': r.department || '', 'মাস': `${monthNames[(r.month || month) - 1]} ${r.year || year}`,
      'কর্মদিবস': r.working_days || 0, 'Basic Salary': Number(r.basic_salary),
      'Allowances': Number(r.total_allowances), 'Deductions': Number(r.total_deductions),
      'Att. Penalty': Number(r.attendance_deduction || 0), 'Previous Due': Number(r.previous_due),
      'Net Payable': Number(r.net_payable), 'Total Paid': Number(r.total_paid),
      'Due Amount': Number(r.due_amount), 'Status': r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
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
        {runs.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handlePdfDownload} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-medium">
              <Download size={14} /> PDF
            </button>
            <button onClick={handleExcelDownload} className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium">
              <Download size={14} /> Excel
            </button>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="card mb-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setSearchMode(false)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium ${!searchMode ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            মাস অনুযায়ী
          </button>
          <button onClick={() => setSearchMode(true)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium ${searchMode ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            কর্মী খোঁজ
          </button>
        </div>

        {!searchMode ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="input-field" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">-- কর্মী বেছে নিন --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} {e.phone ? `— ${e.phone}` : ''}</option>)}
            </select>
            <div>
              <input type="month" className="input-field" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} placeholder="থেকে" />
            </div>
            <div>
              <input type="month" className="input-field" value={dateTo}
                onChange={e => setDateTo(e.target.value)} placeholder="পর্যন্ত" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSearch} className="flex-1 bg-primary-500 text-white py-2 rounded-xl text-sm font-medium">
                খোঁজুন
              </button>
              <button onClick={handleReset} className="p-2 bg-gray-100 text-gray-600 rounded-xl">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!searchMode && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={handlePrepare} disabled={preparing}
            className="bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            {preparing ? 'প্রস্তুত হচ্ছে...' : '📋 এই মাসের স্যালারি প্রস্তুত করুন'}
          </button>
          {hasDrafts && (
            <button onClick={handleFinalizeAll} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              ✅ সব Finalize করুন
            </button>
          )}
          {hasFinalized && (
            <button onClick={handleCloseMonth} disabled={closing}
              className="bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              <Lock size={14} className="inline mr-1" />{closing ? 'Closing...' : 'মাস Close করুন'}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['কর্মী', searchMode ? 'মাস' : '', 'কর্মদিবস', 'Basic', 'Allowance', 'Deduction', 'Att. Penalty', 'পূর্ববর্তী', 'নেট পেয়েবল', 'পরিশোধিত', 'বাকি', 'Status', 'Action']
                    .filter(h => h !== '')
                    .map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">কোনো payroll record নেই</td></tr>
                ) : runs.map(run => (
                  <tr key={run.id} className="hover:bg-primary-50 cursor-pointer"
                    onClick={() => setPayslipModal(run)}>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{run.full_name}</td>
                    {searchMode && <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{monthNames[(run.month || 1) - 1]} {run.year}</td>}
                    <td className="px-3 py-3 text-center">
                      <div className="relative group cursor-help">
                        <span className="font-semibold">{run.working_days || 0}</span>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-gray-800 text-white text-xs rounded-xl p-3 w-48 shadow-xl">
                          <p className="font-semibold mb-1 text-gray-300">কর্মদিবস বিস্তারিত</p>
                          <div className="space-y-0.5">
                            <p>উপস্থিতি: {run.attendance_days || 0}</p>
                            <p>সাপ্তাহিক ছুটি: {run.weekly_off_days || 0}</p>
                            <p>অফিস ছুটি: {run.holiday_days || 0}</p>
                            <p>পেইড লিভ: {run.paid_leave_days || 0}</p>
                            <p>অতিরিক্ত: {run.extra_working_days || 0}</p>
                            <p className="border-t border-gray-600 pt-1 font-semibold">মোট: {run.working_days || 0}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.basic_salary).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">+৳{Number(run.total_allowances).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-red-500">-৳{Number(run.total_deductions).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-red-500">-৳{Number(run.attendance_deduction || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">৳{Number(run.previous_due).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold">৳{Number(run.net_payable).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-green-600">৳{Number(run.total_paid).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-amber-600">৳{Number(run.due_amount).toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{statusBadge(run.status)}</td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {run.status === 'draft' && (
                          <>
                            <button onClick={() => handleRecalculate(run.id)} title="Recalculate"
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">↻</button>
                            <button onClick={() => setEditModal(run)}
                              className="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                        <button onClick={() => setPaymentModal(run)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                          <DollarSign size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal && <EditDraftModal run={editModal} onClose={() => setEditModal(null)} onSuccess={() => { setEditModal(null); fetchRuns(); }} />}
      {paymentModal && <PaymentModal run={paymentModal} onClose={() => setPaymentModal(null)} onSuccess={() => { setPaymentModal(null); fetchRuns(); }} />}
      {payslipModal && <PayslipModal run={payslipModal} onClose={() => setPayslipModal(null)} />}
    </div>
  );
}

function PayslipModal({ run, onClose }) {
  const [payments, setPayments] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      payrollApi.getPayments(run.id),
      payrollApi.getEmployeeComponents(run.employee_id),
    ]).then(([pRes, cRes]) => {
      setPayments(pRes.data || []);
      setComponents(cRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [run.id]);

  const handlePrint = () => {
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const due = parseFloat(run.due_amount);
    const isPaidFull = due <= 0;
    const allowances = components.filter(c => c.type === 'allowance');
    const deductions = components.filter(c => c.type === 'deduction');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pay Slip</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
      .page { max-width: 700px; margin: 0 auto; padding: 30px; }
      .header { text-align: center; border-bottom: 3px solid #1A7A6E; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 20px; color: #1A7A6E; }
      .header h2 { font-size: 14px; margin-top: 4px; }
      .header p { color: #666; font-size: 12px; margin-top: 2px; }
      .employee-info { display: flex; justify-content: space-between; background: #f0fdfa; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
      .employee-info div p:first-child { font-weight: bold; font-size: 14px; }
      .employee-info div p { font-size: 12px; color: #444; margin-top: 2px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .section { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
      .section-title { background: #1A7A6E; color: white; padding: 6px 12px; font-size: 11px; font-weight: bold; }
      .section-row { display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .section-row:last-child { border-bottom: none; }
      .section-total { display: flex; justify-content: space-between; padding: 6px 12px; background: #f9fafb; font-weight: bold; font-size: 12px; }
      .net-payable { background: #1A7A6E; color: white; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .net-payable .label { font-size: 13px; }
      .net-payable .amount { font-size: 20px; font-weight: bold; }
      .payment-section { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
      .payment-row { display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .status-badge { text-align: center; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: bold; margin-bottom: 16px; }
      .paid { background: #dcfce7; color: #166534; }
      .due { background: #fef3c7; color: #92400e; }
      .footer { text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head>
    <body><div class="page">
      <div class="header">
        <h1>Safollo Academy</h1>
        <h2>Pay Slip — ${monthNames[(run.month || 1) - 1]} ${run.year}</h2>
        <p>Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </div>

      <div class="employee-info">
        <div>
          <p>${run.full_name}</p>
          <p>${run.designation || '—'}</p>
          <p>${run.department || '—'}</p>
        </div>
        <div style="text-align:right">
          <p>কর্মদিবস: ${run.working_days || 0}</p>
          <p>উপস্থিতি: ${run.attendance_days || 0} | পেইড লিভ: ${run.paid_leave_days || 0}</p>
          <p>সাপ্তাহিক: ${run.weekly_off_days || 0} | অফিস ছুটি: ${run.holiday_days || 0}</p>
        </div>
      </div>

      <div class="grid">
        <div class="section">
          <div class="section-title">আয় (Earnings)</div>
          <div class="section-row"><span>Basic Salary</span><span>৳${Number(run.basic_salary).toLocaleString()}</span></div>
          ${allowances.map(a => `<div class="section-row"><span>${a.name}</span><span>+৳${Number(a.amount).toLocaleString()}</span></div>`).join('')}
          <div class="section-total"><span>মোট আয়</span><span>৳${(Number(run.basic_salary) + Number(run.total_allowances)).toLocaleString()}</span></div>
        </div>
        <div class="section">
          <div class="section-title">কর্তন (Deductions)</div>
          ${deductions.map(d => `<div class="section-row"><span>${d.name}</span><span>-৳${Number(d.amount).toLocaleString()}</span></div>`).join('')}
          ${Number(run.attendance_deduction) > 0 ? `<div class="section-row"><span>Attendance Penalty</span><span>-৳${Number(run.attendance_deduction).toLocaleString()}</span></div>` : ''}
          ${Number(run.previous_due) > 0 ? `<div class="section-row"><span>পূর্ববর্তী বকেয়া</span><span>+৳${Number(run.previous_due).toLocaleString()}</span></div>` : ''}
          <div class="section-total"><span>মোট কর্তন</span><span>৳${(Number(run.total_deductions) + Number(run.attendance_deduction || 0)).toLocaleString()}</span></div>
        </div>
      </div>

      <div class="net-payable">
        <span class="label">নেট পেয়েবল</span>
        <span class="amount">৳${Number(run.net_payable).toLocaleString()}</span>
      </div>

      ${payments.length > 0 ? `
      <div class="payment-section">
        <div class="section-title">পেমেন্ট বিবরণ</div>
        ${payments.map(p => `<div class="payment-row"><span>${format(new Date(p.payment_date), 'dd/MM/yyyy')}${p.note ? ' — ' + p.note : ''}</span><span>৳${Number(p.amount).toLocaleString()}</span></div>`).join('')}
        <div class="section-total"><span>মোট পরিশোধিত</span><span>৳${totalPaid.toLocaleString()}</span></div>
      </div>` : ''}

      <div class="status-badge ${isPaidFull ? 'paid' : 'due'}">
        ${isPaidFull ? '✅ সম্পূর্ণ পরিশোধিত' : `⏳ বাকি: ৳${Number(due).toLocaleString()}`}
      </div>

      <div class="footer">সাফল্য একাডেমি | এই pay slip কম্পিউটার generated</div>
    </div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><div className="spinner w-8 h-8" /></div>
    </div>
  );

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const due = parseFloat(run.due_amount);
  const allowances = components.filter(c => c.type === 'allowance');
  const deductions = components.filter(c => c.type === 'deduction');

  return (
    <Modal>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h3 className="font-bold">Pay Slip — {run.full_name}</h3>
            <p className="text-primary-200 text-sm">{monthNames[(run.month || 1) - 1]} {run.year}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white text-primary-600 px-3 py-1.5 rounded-xl text-sm font-medium">
              <Download size={14} /> Print/PDF
            </button>
            <button onClick={onClose} className="p-1.5 bg-primary-500 rounded-full">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Employee Info */}
          <div className="bg-primary-50 rounded-xl p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold">{run.full_name}</p>
                <p className="text-gray-500">{run.designation || '—'} | {run.department || '—'}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>কর্মদিবস: <strong>{run.working_days || 0}</strong></p>
                <p>উপস্থিতি: {run.attendance_days || 0} | পেইড লিভ: {run.paid_leave_days || 0}</p>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-green-600 text-white px-3 py-2 text-xs font-semibold">আয় (Earnings)</div>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between px-3 py-2 text-sm">
                <span>Basic Salary</span>
                <span>৳{Number(run.basic_salary).toLocaleString()}</span>
              </div>
              {allowances.map(a => (
                <div key={a.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>{a.name}</span>
                  <span className="text-green-600">+৳{Number(a.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 text-sm font-semibold bg-gray-50">
                <span>মোট আয়</span>
                <span>৳{(Number(run.basic_salary) + Number(run.total_allowances)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {(deductions.length > 0 || Number(run.attendance_deduction) > 0 || Number(run.previous_due) > 0) && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-red-500 text-white px-3 py-2 text-xs font-semibold">কর্তন (Deductions)</div>
              <div className="divide-y divide-gray-50">
                {deductions.map(d => (
                  <div key={d.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{d.name}</span>
                    <span className="text-red-500">-৳{Number(d.amount).toLocaleString()}</span>
                  </div>
                ))}
                {Number(run.attendance_deduction) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span>Attendance Penalty</span>
                    <span className="text-red-500">-৳{Number(run.attendance_deduction).toLocaleString()}</span>
                  </div>
                )}
                {Number(run.previous_due) > 0 && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span>পূর্ববর্তী বকেয়া</span>
                    <span className="text-amber-600">+৳{Number(run.previous_due).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Net Payable */}
          <div className="bg-primary-600 text-white rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="font-medium">নেট পেয়েবল</span>
            <span className="text-xl font-bold">৳{Number(run.net_payable).toLocaleString()}</span>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-blue-600 text-white px-3 py-2 text-xs font-semibold">পেমেন্ট বিবরণ</div>
              <div className="divide-y divide-gray-50">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-gray-500">{format(new Date(p.payment_date), 'dd/MM/yyyy')}{p.note ? ` — ${p.note}` : ''}</span>
                    <span className="font-medium">৳{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 text-sm font-semibold bg-gray-50">
                  <span>মোট পরিশোধিত</span>
                  <span className="text-green-600">৳{totalPaid.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className={`rounded-xl p-3 text-center font-semibold ${due <= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {due <= 0 ? '✅ সম্পূর্ণ পরিশোধিত' : `⏳ বাকি: ৳${Number(due).toLocaleString()}`}
          </div>
        </div>
    </div>
    </Modal>
  );
}

function EditDraftModal({ run, onClose, onSuccess }) {
  const [form, setForm] = useState({
    basic_salary: run.basic_salary,
    total_allowances: run.total_allowances,
    total_deductions: run.total_deductions,
    previous_due: run.previous_due,
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const workingDays = parseFloat(run.working_days) || 0;
  const daysInMonth = new Date(run.year, run.month, 0).getDate();
  const dailyRate = (parseFloat(form.basic_salary) || 0) / daysInMonth;
  const earnedSalary = dailyRate * workingDays;
  const netPreview = earnedSalary + (parseFloat(form.total_allowances) || 0)
    - (parseFloat(form.total_deductions) || 0) + (parseFloat(form.previous_due) || 0);

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
    <Modal>
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
            <label className="block text-sm font-medium mb-1.5">Total Deductions</label>
            <input type="number" className="input-field" value={form.total_deductions} onChange={e => set('total_deductions', e.target.value)} />
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
      </div>
    </Modal>
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
  const [editingPayment, setEditingPayment] = useState(null);

  const fetchPayments = () => {
    payrollApi.getPayments(run.id).then(r => setPayments(r.data || []));
  };

  useEffect(() => { fetchPayments(); }, [run.id]);

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
      if (proofFile) { setUploading(true); proofUrl = await uploadToCloudinary(proofFile); setUploading(false); }
      await payrollApi.recordPayment(run.id, { amount, payment_date: paymentDate, note, proof_url: proofUrl });
      toast.success('পেমেন্ট রেকর্ড হয়েছে ✅');
      setAmount(''); setNote(''); setProofFile(null);
      fetchPayments(); onSuccess();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setLoading(false); setUploading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payrollApi.updatePayment(editingPayment.id, {
        amount: editingPayment.amount, payment_date: editingPayment.payment_date, note: editingPayment.note,
      });
      toast.success('Payment আপডেট হয়েছে ✅');
      setEditingPayment(null); fetchPayments(); onSuccess();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (paymentId) => {
    if (!confirm('এই payment মুছে ফেলতে চান?')) return;
    try {
      await payrollApi.deletePayment(paymentId);
      toast.success('Payment মুছে ফেলা হয়েছে ✅');
      fetchPayments(); onSuccess();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const currentDue = parseFloat(run.net_payable) - totalPaid;

return (
    <Modal>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{run.full_name}-এর পেমেন্ট</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-sm space-y-1">
          <p>নেট পেয়েবল: <strong>৳{Number(run.net_payable).toLocaleString()}</strong></p>
          <p>মোট পরিশোধিত: <strong className="text-green-600">৳{totalPaid.toLocaleString()}</strong></p>
          <p>বর্তমান বাকি: <strong className="text-red-600">৳{Math.max(0, currentDue).toLocaleString()}</strong></p>
        </div>

        {payments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">পেমেন্ট ইতিহাস</p>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id}>
                  {editingPayment?.id === p.id ? (
                    <form onSubmit={handleUpdate} className="bg-blue-50 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">পরিমাণ</label>
                          <input type="number" className="input-field text-sm" value={editingPayment.amount}
                            onChange={e => setEditingPayment(p => ({ ...p, amount: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">তারিখ</label>
                          <input type="date" className="input-field text-sm"
                            value={editingPayment.payment_date?.split('T')[0] || ''}
                            onChange={e => setEditingPayment(p => ({ ...p, payment_date: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">নোট</label>
                        <input type="text" className="input-field text-sm" value={editingPayment.note || ''}
                          onChange={e => setEditingPayment(p => ({ ...p, note: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={loading}
                          className="flex-1 bg-primary-500 text-white py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                          {loading ? 'Saving...' : '✅ Save'}
                        </button>
                        <button type="button" onClick={() => setEditingPayment(null)}
                          className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded-lg text-xs font-medium">
                          বাতিল
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium">৳{Number(p.amount).toLocaleString()}</p>
                        <p className="text-gray-400">{format(new Date(p.payment_date), 'dd/MM/yyyy')} {p.note ? `— ${p.note}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.proof_url && <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-primary-600 underline">Proof</a>}
                        <button onClick={() => setEditingPayment({ ...p })} className="p-1 bg-blue-50 text-blue-600 rounded-lg">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500">নতুন পেমেন্ট যুক্ত করুন</p>
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
            <input type="file" accept="image/*,.pdf" className="input-field" onChange={e => setProofFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || uploading}>
            {uploading ? 'Uploading...' : loading ? 'প্রক্রিয়া হচ্ছে...' : '✅ পেমেন্ট যুক্ত করুন'}
          </button>
        </form>
      </div>
    </Modal>
  );
}