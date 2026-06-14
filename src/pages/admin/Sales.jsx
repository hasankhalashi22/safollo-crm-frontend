import { useState, useEffect } from 'react';
import { salesApi, coursesApi, usersApi } from '../../api/client';
import { format } from 'date-fns';
import { Search, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_LABELS = {
  paid: { label: 'পেইড', cls: 'badge-paid' },
  due: { label: 'বকেয়া', cls: 'badge-due' },
  partial: { label: 'আংশিক', cls: 'badge-partial' }
};

const EMPTY_ENROLLMENT_FILTERS = { search: '', course_id: '', payment_status: '', date_from: '', date_to: '', executive_id: '' };
const EMPTY_REVENUE_FILTERS = { search: '', course_id: '', date_from: '', date_to: '', executive_id: '', payment_method: '' };

export default function AdminSales() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('enrollment');
  const [sales, setSales] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [total, setTotal] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueTotalAmount, setRevenueTotalAmount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [filters, setFilters] = useState(EMPTY_ENROLLMENT_FILTERS);
  const [revenueFilters, setRevenueFilters] = useState(EMPTY_REVENUE_FILTERS);

  const fetchSales = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.search) params.search = f.search;
    if (f.course_id) params.course_id = f.course_id;
    if (f.payment_status) params.payment_status = f.payment_status;
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    if (f.executive_id) params.executive_id = f.executive_id;
    salesApi.getAll(params).then(res => {
      setSales(res.data || []);
      setTotal(res.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const fetchRevenue = (f = revenueFilters) => {
    setLoading(true);
    const params = {};
    if (f.search) params.search = f.search;
    if (f.course_id) params.course_id = f.course_id;
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    if (f.executive_id) params.executive_id = f.executive_id;
    if (f.payment_method) params.payment_method = f.payment_method;
    salesApi.getRevenue(params).then(res => {
      setRevenue(res.data || []);
      setRevenueTotal(res.total || 0);
      setRevenueTotalAmount(res.total_amount || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleDelete = async (sale) => {
    if (!confirm(`এই সেল permanently delete করবেন?`)) return;
    try {
      await salesApi.delete(sale.id);
      toast.success('সেল delete হয়েছে ✅');
      fetchSales();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  useEffect(() => {
    coursesApi.getAll().then(r => setCourses(r.data || []));
    usersApi.getAll().then(r => setExecutives(r.data || []));
    fetchSales();
  }, []);

  useEffect(() => {
    if (activeTab === 'revenue') fetchRevenue();
  }, [activeTab]);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const setRevenueFilter = (k, v) => setRevenueFilters(p => ({ ...p, [k]: v }));

  const resetEnrollmentFilters = () => {
    setFilters(EMPTY_ENROLLMENT_FILTERS);
    fetchSales(EMPTY_ENROLLMENT_FILTERS);
  };

  const resetRevenueFilters = () => {
    setRevenueFilters(EMPTY_REVENUE_FILTERS);
    fetchRevenue(EMPTY_REVENUE_FILTERS);
  };

  // CSV Export
  const exportCsv = (headers, rows, filename) => {
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Excel Download হয়েছে ✅');
  };

  // PDF Export
 const exportPdf = (headers, rows, filename, title, filterInfo) => {
    const printWindow = window.open('', '_blank');
    const tableRows = rows.map(row =>
      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
    const tableHeaders = headers.map(h => `<th>${h}</th>`).join('');
    const filterRows = filterInfo ? filterInfo.map(f =>
      `<span style="background:#f0f9f7;border:1px solid #1A7A6E;color:#1A7A6E;padding:3px 8px;border-radius:12px;font-size:11px;margin-right:6px;">${f}</span>`
    ).join('') : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #1A7A6E; padding-bottom: 10px; }
          .header-left h2 { color: #1A7A6E; margin: 0 0 3px 0; }
          .header-left p { color: #666; margin: 0; font-size: 11px; }
          .logo { height: 50px; }
          .filters { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 15px; }
          .filters p { margin: 0 0 6px 0; font-size: 11px; color: #444; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1A7A6E; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h2>${title}</h2>
            <p>তৈরির তারিখ: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <img src="https://safollo-crm-frontend.vercel.app/logo.png" class="logo" alt="Safollo Academy" />
        </div>
        ${filterRows ? `<div class="filters"><p>ফিল্টার:</p>${filterRows}</div>` : ''}
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <span>মোট রেকর্ড: ${rows.length}</span>
          <span>প্রস্তুতকারী: ${user?.full_name || user?.phone || 'N/A'} (${user?.role_label || ''})</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
    toast.success('Print/PDF window খুলেছে ✅');
  };

  const handleExportEnrollmentCsv = () => {
    if (sales.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['তারিখ', 'স্টুডেন্ট', 'ফোন', 'কোর্স', 'ব্যাচ', 'মূল্য', 'সংগৃহীত', 'বাকি', 'স্ট্যাটাস', 'পেমেন্ট পদ্ধতি', 'পেমেন্ট নম্বর', 'Executive', 'Approver'];
    const rows = sales.map(s => [
      format(new Date(s.created_at), 'dd/MM/yyyy'),
      s.student_name || '', s.student_phone, s.course_name, s.batch_name || '',
      s.course_price, s.total_collected, s.due_amount || 0,
      s.payment_status === 'paid' ? 'পেইড' : s.payment_status === 'due' ? 'বকেয়া' : 'আংশিক',
      s.payment_history?.[0]?.payment_method || '',
      s.payment_history?.[0]?.sender_number || '',
      s.executive_name || '', s.approver_name || '',
    ]);
    exportCsv(headers, rows, `এনরোলমেন্ট_${format(new Date(), 'dd-MM-yyyy')}.csv`);
  };

  const handleExportEnrollmentPdf = () => {
    if (sales.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['Date', 'Student', 'Phone', 'Course', 'Price', 'Collected', 'Due', 'Status', 'Executive'];
    const rows = sales.map(s => [
      format(new Date(s.created_at), 'dd/MM/yyyy'),
      s.student_name || '', s.student_phone, s.course_name,
      s.course_price, s.total_collected, s.due_amount || 0,
      s.payment_status === 'paid' ? 'Paid' : s.payment_status === 'due' ? 'Due' : 'Partial',
      s.executive_name || '',
    ]);
    const filterInfo = [];
    if (filters.date_from) filterInfo.push(`From: ${filters.date_from}`);
    if (filters.date_to) filterInfo.push(`To: ${filters.date_to}`);
    if (filters.course_id) filterInfo.push(`Course: ${courses.find(c => c.id == filters.course_id)?.name || ''}`);
    if (filters.payment_status) filterInfo.push(`Status: ${filters.payment_status}`);
    if (filters.executive_id) filterInfo.push(`Executive: ${executives.find(e => e.id == filters.executive_id)?.full_name || ''}`);
    exportPdf(headers, rows, `Enrollment_Report_${format(new Date(), 'dd-MM-yyyy')}.pdf`, 'Enrollment Report - Safollo Academy', filterInfo);
  };

  const handleExportRevenueCsv = () => {
    if (revenue.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['পেমেন্ট তারিখ', 'স্টুডেন্ট', 'ফোন', 'কোর্স', 'পরিমাণ', 'পেমেন্ট পদ্ধতি', 'পেমেন্ট নম্বর', 'ট্রানজেকশন', 'Executive', 'ধরন'];
    const rows = revenue.map(r => [
      format(new Date(r.payment_date), 'dd/MM/yyyy'),
      r.student_name || '', r.student_phone, r.course_name,
      r.amount, r.payment_method, r.sender_number || '',
      r.transaction_id || '', r.executive_name || '',
      r.is_due_payment ? 'বকেয়া' : 'প্রথম',
    ]);
    exportCsv(headers, rows, `রেভিনিউ_${format(new Date(), 'dd-MM-yyyy')}.csv`);
  };

 const handleExportRevenuePdf = () => {
    if (revenue.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['Date', 'Student', 'Phone', 'Course', 'Amount', 'Method', 'Sender No', 'Transaction', 'Executive', 'Type'];
    const rows = revenue.map(r => [
      format(new Date(r.payment_date), 'dd/MM/yyyy'),
      r.student_name || '', r.student_phone, r.course_name,
      r.amount, r.payment_method, r.sender_number || '',
      r.transaction_id || '', r.executive_name || '',
      r.is_due_payment ? 'Due' : 'First',
    ]);
    const filterInfo = [];
    if (revenueFilters.date_from) filterInfo.push(`From: ${revenueFilters.date_from}`);
    if (revenueFilters.date_to) filterInfo.push(`To: ${revenueFilters.date_to}`);
    if (revenueFilters.course_id) filterInfo.push(`Course: ${courses.find(c => c.id == revenueFilters.course_id)?.name || ''}`);
    if (revenueFilters.payment_method) filterInfo.push(`Method: ${revenueFilters.payment_method}`);
    if (revenueFilters.executive_id) filterInfo.push(`Executive: ${executives.find(e => e.id == revenueFilters.executive_id)?.full_name || ''}`);
    exportPdf(headers, rows, `Revenue_Report_${format(new Date(), 'dd-MM-yyyy')}.pdf`, 'Revenue Report - Safollo Academy', filterInfo);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">সেলস রিপোর্ট</h1>
          <p className="text-gray-500 text-sm">মোট {activeTab === 'enrollment' ? total : revenueTotal}টি রেকর্ড
            {activeTab === 'revenue' && revenueTotalAmount > 0 && (
              <span className="ml-2 text-green-600 font-medium">• মোট ৳{Number(revenueTotalAmount).toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={activeTab === 'enrollment' ? handleExportEnrollmentCsv : handleExportRevenueCsv}
            className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">
            <Download size={16} /> Excel
          </button>
          <button onClick={activeTab === 'enrollment' ? handleExportEnrollmentPdf : handleExportRevenuePdf}
            className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      {/* Tabs */}
      {user?.role !== 'manager' && (
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 max-w-sm">
          <button onClick={() => setActiveTab('enrollment')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'enrollment' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
            এনরোলমেন্ট রিপোর্ট
          </button>
          <button onClick={() => setActiveTab('revenue')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'revenue' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
            রেভিনিউ রিপোর্ট
          </button>
        </div>
      )}

      {activeTab === 'enrollment' ? (
        <>
          <div className="card mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input className="input-field pl-9" placeholder="ফোন বা নাম" value={filters.search}
                  onChange={e => setFilter('search', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchSales()} />
              </div>
              <select className="input-field" value={filters.course_id} onChange={e => setFilter('course_id', e.target.value)}>
                <option value="">সব কোর্স</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input-field" value={filters.payment_status} onChange={e => setFilter('payment_status', e.target.value)}>
                <option value="">সব স্ট্যাটাস</option>
                <option value="paid">পেইড</option>
                <option value="due">বকেয়া</option>
                <option value="partial">আংশিক</option>
              </select>
              <select className="input-field" value={filters.executive_id} onChange={e => setFilter('executive_id', e.target.value)}>
                <option value="">সব Executive</option>
                {executives.map(e => <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>)}
              </select>
              <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
              <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => fetchSales()} className="btn-primary py-2 px-6">খুঁজুন</button>
              <button onClick={resetEnrollmentFilters} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট</button>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['তারিখ', 'স্টুডেন্ট', 'কোর্স', 'মূল্য', 'সংগৃহীত', 'বাকি', 'স্ট্যাটাস', 'পেমেন্ট পদ্ধতি', 'পেমেন্ট নম্বর', 'Executive', 'Approver', 'অ্যাকশন'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={12} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
                  ) : sales.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
                  ) : sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(s)}>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(s.created_at), 'dd/MM/yy')}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.student_name || '—'}</p>
                        <p className="text-xs text-gray-400">{s.student_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{s.course_name}</p>
                        <p className="text-xs text-gray-400">{s.batch_name}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{Number(s.course_price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600 font-medium whitespace-nowrap">৳{Number(s.total_collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600 whitespace-nowrap">৳{Number(s.due_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={STATUS_LABELS[s.payment_status]?.cls || 'badge-due'}>
                          {STATUS_LABELS[s.payment_status]?.label || s.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.payment_history?.[0]?.payment_method || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.payment_history?.[0]?.sender_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.executive_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.approver_name || '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                       {user?.role === 'super_admin' && (
                          <button onClick={() => setEditModal(s)}
                            className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                            ✏️ Edit
                          </button>
                        )}
                        {user?.role === 'super_admin' && (
                          <button onClick={() => handleDelete(s)}
                            className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium ml-1">
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input className="input-field pl-9" placeholder="ফোন বা নাম" value={revenueFilters.search}
                  onChange={e => setRevenueFilter('search', e.target.value)} />
              </div>
              <select className="input-field" value={revenueFilters.course_id} onChange={e => setRevenueFilter('course_id', e.target.value)}>
                <option value="">সব কোর্স</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input-field" value={revenueFilters.payment_method} onChange={e => setRevenueFilter('payment_method', e.target.value)}>
                <option value="">সব পেমেন্ট পদ্ধতি</option>
                <option value="bkash">বিকাশ</option>
                <option value="nagad">নগদ</option>
                <option value="rocket">রকেট</option>
                <option value="cash">ক্যাশ</option>
                <option value="cod">COD</option>
              </select>
              <select className="input-field" value={revenueFilters.executive_id} onChange={e => setRevenueFilter('executive_id', e.target.value)}>
                <option value="">সব Executive</option>
                {executives.map(e => <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>)}
              </select>
              <input type="date" className="input-field" value={revenueFilters.date_from} onChange={e => setRevenueFilter('date_from', e.target.value)} />
              <input type="date" className="input-field" value={revenueFilters.date_to} onChange={e => setRevenueFilter('date_to', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => fetchRevenue(revenueFilters)} className="btn-primary py-2 px-6">খুঁজুন</button>
              <button onClick={resetRevenueFilters} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট</button>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['পেমেন্ট তারিখ', 'স্টুডেন্ট', 'কোর্স', 'পরিমাণ', 'পেমেন্ট পদ্ধতি', 'পেমেন্ট নম্বর', 'ট্রানজেকশন আইডি', 'Executive', 'ধরন'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
                  ) : revenue.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
                  ) : revenue.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(r.payment_date), 'dd/MM/yy')}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.student_name || '—'}</p>
                        <p className="text-xs text-gray-400">{r.student_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{r.course_name}</p>
                        <p className="text-xs text-gray-400">{r.batch_name}</p>
                      </td>
                      <td className="px-4 py-3 text-green-600 font-bold whitespace-nowrap">৳{Number(r.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{r.payment_method}</td>
                      <td className="px-4 py-3 text-gray-500">{r.sender_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{r.transaction_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{r.executive_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_due_payment ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                          {r.is_due_payment ? 'বকেয়া' : 'প্রথম'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">সেল বিস্তারিত</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="স্টুডেন্ট" value={selected.student_name || '—'} />
              <Row label="ফোন" value={selected.student_phone} />
              <Row label="কোর্স" value={`${selected.course_name} ${selected.batch_name ? '• ' + selected.batch_name : ''}`} />
              <Row label="কোর্স মূল্য" value={`৳${Number(selected.course_price).toLocaleString()}`} />
              <Row label="সংগৃহীত" value={`৳${Number(selected.total_collected).toLocaleString()}`} />
              <Row label="বাকি" value={`৳${Number(selected.due_amount || 0).toLocaleString()}`} />
              <Row label="Executive" value={selected.executive_name || '—'} />
              <Row label="Approver" value={selected.approver_name || '—'} />
              {selected.reference && <Row label="রেফারেন্স" value={selected.reference} />}
              {selected.payment_history?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">পেমেন্ট ইতিহাস</p>
                  {selected.payment_history.map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                      <div className="flex justify-between">
                        <span className="font-medium">৳{Number(p.amount).toLocaleString()}</span>
                        <span className="text-gray-400 text-xs">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</span>
                      </div>
                      <p className="text-xs text-gray-500">{p.payment_method} {p.transaction_id ? '• ' + p.transaction_id : ''}</p>
                      {p.sender_number && <p className="text-xs text-gray-500">পেমেন্ট নম্বর: {p.sender_number}</p>}
                      {p.payment_proof_url && (
                        <a href={p.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary-500 underline">প্রুফ দেখুন</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <EditSaleModal
          sale={editModal}
          executives={executives}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchSales(); }}
        />
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EditSaleModal({ sale, executives, onClose, onSuccess }) {
  const [form, setForm] = useState({
    student_name: sale.student_name || '',
    student_phone: sale.student_phone || '',
    created_at: sale.created_at?.split('T')[0] || '',
    course_price: sale.course_price || '',
    executive_id: sale.executive_id || '',
    reference: sale.reference || '',
    notes: sale.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await salesApi.edit(sale.id, form);
      toast.success('সেল আপডেট হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 my-8">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">সেল এডিট করুন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p className="font-medium">{sale.student_name || sale.student_phone}</p>
          <p className="text-gray-500">{sale.course_name} • {sale.batch_name}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">নাম</label>
              <input type="text" className="input-field" value={form.student_name}
                onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">মোবাইল</label>
              <input type="tel" className="input-field" value={form.student_phone}
                onChange={e => setForm(p => ({ ...p, student_phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">এনরোলমেন্ট তারিখ</label>
            <input type="date" className="input-field" value={form.created_at}
              onChange={e => setForm(p => ({ ...p, created_at: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">কোর্স মূল্য</label>
            <input type="number" className="input-field" value={form.course_price}
              onChange={e => setForm(p => ({ ...p, course_price: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Executive পরিবর্তন</label>
            <select className="input-field" value={form.executive_id}
              onChange={e => setForm(p => ({ ...p, executive_id: e.target.value }))}>
              {executives.map(e => (
                <option key={e.id} value={e.id}>{e.full_name || e.phone} ({e.role_label})</option>
              ))}
            </select>
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
            {loading ? 'আপডেট হচ্ছে...' : '✅ আপডেট করুন'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}