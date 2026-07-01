import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { salesApi, coursesApi, usersApi } from '../../api/client';
import { format } from 'date-fns';
import { Search, Filter, Download, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const CHART_COLORS = ['#378ADD','#1D9E75','#BA7517','#D85A30','#7F77DD','#D4537E','#639922','#E24B4A'];

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="input-field flex items-center justify-between gap-2 cursor-pointer text-left w-full"
        style={{ minHeight: 38 }}>
        <span className="truncate text-sm" style={{ color: allSelected ? '#9ca3af' : 'inherit' }}>
          {allSelected ? placeholder : `${selected.length}টি নির্বাচিত`}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {!allSelected && (
        <button type="button" onClick={() => onChange([])}
          className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      )}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-background-primary, #fff)', border: '0.5px solid var(--color-border-tertiary, #e5e7eb)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 text-sm font-medium">
            <input type="checkbox" checked={allSelected} onChange={() => onChange([])} className="rounded" />
            সব নির্বাচন করুন
          </label>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
                className="rounded" />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCards({ items }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="text-lg font-medium" style={{ color: color || 'inherit' }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function PieChartCard({ title, data, nameKey, valueKey }) {
  return (
    <div className="card flex-1">
      <p className="text-xs font-medium text-gray-500 mb-3">{title}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {data.map((d, i) => (
          <span key={d[nameKey]} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary, #666)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
            {d[nameKey]} {d.pct}%
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieCountCard({ title, data, nameKey }) {
  return (
    <div className="card flex-1">
      <p className="text-xs font-medium text-gray-500 mb-3">{title}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {data.map((d, i) => (
          <span key={d[nameKey]} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary, #666)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
            {d[nameKey]} {d.pct}%
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}টি`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


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
  const [subTab, setSubTab] = useState('details');
  const [dailyFilters, setDailyFilters] = useState({ month: format(new Date(), 'yyyy-MM'), date_from: '', date_to: '', executive_id: '', course_id: '' });
  const [courseFilters, setCourseFilters] = useState({ month: format(new Date(), 'yyyy-MM'), date_from: '', date_to: '', executive_id: '', selected: [] });
  const [execFilters, setExecFilters] = useState({ month: format(new Date(), 'yyyy-MM'), date_from: '', date_to: '', course_id: '', selected: [] });

const fetchSales = (f = filters) => {
    setLoading(true);
    const params = { limit: 5000 };
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

  // Daily Summary computed from existing sales data
  const dailySummaryRows = (() => {
    let filtered = [...sales];
    if (dailyFilters.course_id) filtered = filtered.filter(s => String(s.course_id) === String(dailyFilters.course_id));
    if (dailyFilters.executive_id) filtered = filtered.filter(s => String(s.executive_id) === String(dailyFilters.executive_id));
    if (dailyFilters.date_from) filtered = filtered.filter(s => s.created_at.split('T')[0] >= dailyFilters.date_from);
    if (dailyFilters.date_to) filtered = filtered.filter(s => s.created_at.split('T')[0] <= dailyFilters.date_to);
    if (dailyFilters.month && !dailyFilters.date_from && !dailyFilters.date_to)
      filtered = filtered.filter(s => s.created_at.startsWith(dailyFilters.month));
    const map = {};
    filtered.forEach(s => {
      const d = s.created_at.split('T')[0];
      if (!map[d]) map[d] = { date: d, count: 0, gross: 0, collected: 0, due: 0 };
      map[d].count++;
      map[d].gross += Number(s.course_price) || 0;
      map[d].collected += Number(s.total_collected) || 0;
      map[d].due += Number(s.due_amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  })();

  const courseRows = useMemo(() => {
    let f = [...sales];
    if (courseFilters.executive_id) f = f.filter(s => String(s.executive_id) === String(courseFilters.executive_id));
    if (courseFilters.date_from) f = f.filter(s => s.created_at.split('T')[0] >= courseFilters.date_from);
    if (courseFilters.date_to) f = f.filter(s => s.created_at.split('T')[0] <= courseFilters.date_to);
    if (courseFilters.month && !courseFilters.date_from && !courseFilters.date_to) f = f.filter(s => s.created_at.startsWith(courseFilters.month));
    const map = {};
    f.forEach(s => {
      const k = s.course_name || 'অন্যান্য';
      if (!map[k]) map[k] = { name: k, count: 0, gross: 0, collected: 0, due: 0 };
      map[k].count++; map[k].gross += Number(s.course_price) || 0;
      map[k].collected += Number(s.total_collected) || 0; map[k].due += Number(s.due_amount) || 0;
    });
    let rows = Object.values(map).sort((a, b) => b.gross - a.gross);
    if (courseFilters.selected.length > 0) rows = rows.filter(r => courseFilters.selected.includes(r.name));
    const totalCount = rows.reduce((a, r) => a + r.count, 0);
    const totalGross = rows.reduce((a, r) => a + r.gross, 0);
    return rows.map(r => ({ ...r, pct: totalGross ? Math.round(r.gross / totalGross * 100) : 0, countPct: totalCount ? Math.round(r.count / totalCount * 100) : 0 }));
  }, [sales, courseFilters]);

  const execRows = useMemo(() => {
    let f = [...sales];
    if (execFilters.course_id) f = f.filter(s => String(s.course_id) === String(execFilters.course_id));
    if (execFilters.date_from) f = f.filter(s => s.created_at.split('T')[0] >= execFilters.date_from);
    if (execFilters.date_to) f = f.filter(s => s.created_at.split('T')[0] <= execFilters.date_to);
    if (execFilters.month && !execFilters.date_from && !execFilters.date_to) f = f.filter(s => s.created_at.startsWith(execFilters.month));
    const map = {};
    f.forEach(s => {
      const k = s.executive_name || 'অজানা';
      if (!map[k]) map[k] = { name: k, count: 0, gross: 0, collected: 0, due: 0 };
      map[k].count++; map[k].gross += Number(s.course_price) || 0;
      map[k].collected += Number(s.total_collected) || 0; map[k].due += Number(s.due_amount) || 0;
    });
    let rows = Object.values(map).sort((a, b) => b.gross - a.gross);
    if (execFilters.selected.length > 0) rows = rows.filter(r => execFilters.selected.includes(r.name));
    const totalCount = rows.reduce((a, r) => a + r.count, 0);
    const totalGross = rows.reduce((a, r) => a + r.gross, 0);
    return rows.map(r => ({ ...r, pct: totalGross ? Math.round(r.gross / totalGross * 100) : 0, countPct: totalCount ? Math.round(r.count / totalCount * 100) : 0 }));
  }, [sales, execFilters]);

  const handleExportCourseWisePdf = () => {
    if (courseRows.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['কোর্স', 'এনরোলমেন্ট', 'গ্রস সেল (৳)', 'সংগৃহীত (৳)', 'বকেয়া (৳)', 'শেয়ার'];
    const rows = courseRows.map(r => [r.name, r.count, Number(r.gross).toLocaleString(), Number(r.collected).toLocaleString(), Number(r.due).toLocaleString(), r.pct + '%']);
    const t = courseRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
    rows.push(['মোট', t.count, Number(t.gross).toLocaleString(), Number(t.collected).toLocaleString(), Number(t.due).toLocaleString(), '100%']);
    const fi = [];
    if (courseFilters.month && !courseFilters.date_from) fi.push(`মাস: ${courseFilters.month}`);
    if (courseFilters.date_from) fi.push(`From: ${courseFilters.date_from}`);
    if (courseFilters.date_to) fi.push(`To: ${courseFilters.date_to}`);
    if (courseFilters.executive_id) fi.push(`Executive: ${executives.find(e => e.id == courseFilters.executive_id)?.full_name || ''}`);
    exportPdf(headers, rows, `Course_Wise_${format(new Date(), 'dd-MM-yyyy')}.pdf`, 'Course Wise Sales Report - Safollo Academy', fi);
  };

  const handleExportExecWisePdf = () => {
    if (execRows.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['Executive', 'এনরোলমেন্ট', 'গ্রস সেল (৳)', 'সংগৃহীত (৳)', 'বকেয়া (৳)', 'শেয়ার'];
    const rows = execRows.map(r => [r.name, r.count, Number(r.gross).toLocaleString(), Number(r.collected).toLocaleString(), Number(r.due).toLocaleString(), r.pct + '%']);
    const t = execRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
    rows.push(['মোট', t.count, Number(t.gross).toLocaleString(), Number(t.collected).toLocaleString(), Number(t.due).toLocaleString(), '100%']);
    const fi = [];
    if (execFilters.month && !execFilters.date_from) fi.push(`মাস: ${execFilters.month}`);
    if (execFilters.date_from) fi.push(`From: ${execFilters.date_from}`);
    if (execFilters.date_to) fi.push(`To: ${execFilters.date_to}`);
    if (execFilters.course_id) fi.push(`Course: ${courses.find(c => c.id == execFilters.course_id)?.name || ''}`);
    exportPdf(headers, rows, `Executive_Wise_${format(new Date(), 'dd-MM-yyyy')}.pdf`, 'Executive Wise Sales Report - Safollo Academy', fi);
  };

  const handleExportDailySummaryPdf = () => {
    if (dailySummaryRows.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['তারিখ', 'এনরোলমেন্ট', 'গ্রস সেল (৳)', 'সংগৃহীত (৳)', 'বকেয়া (৳)'];
    const rows = dailySummaryRows.map(r => [
      format(new Date(r.date), 'dd/MM/yyyy'),
      r.count,
      Number(r.gross).toLocaleString(),
      Number(r.collected).toLocaleString(),
      Number(r.due).toLocaleString(),
    ]);
    const totals = dailySummaryRows.reduce((acc, r) => ({
      count: acc.count + r.count, gross: acc.gross + r.gross,
      collected: acc.collected + r.collected, due: acc.due + r.due
    }), { count: 0, gross: 0, collected: 0, due: 0 });
    rows.push(['মোট', totals.count, Number(totals.gross).toLocaleString(), Number(totals.collected).toLocaleString(), Number(totals.due).toLocaleString()]);
    const filterInfo = [];
    if (dailyFilters.month && !dailyFilters.date_from) filterInfo.push(`মাস: ${dailyFilters.month}`);
    if (dailyFilters.date_from) filterInfo.push(`From: ${dailyFilters.date_from}`);
    if (dailyFilters.date_to) filterInfo.push(`To: ${dailyFilters.date_to}`);
    if (dailyFilters.course_id) filterInfo.push(`Course: ${courses.find(c => c.id == dailyFilters.course_id)?.name || ''}`);
    if (dailyFilters.executive_id) filterInfo.push(`Executive: ${executives.find(e => e.id == dailyFilters.executive_id)?.full_name || ''}`);
    exportPdf(headers, rows, `Daily_Summary_${format(new Date(), 'dd-MM-yyyy')}.pdf`, 'Daily Sales Summary - Safollo Academy', filterInfo);
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
          {!(activeTab === 'enrollment' && subTab === 'daily') && (
            <button onClick={activeTab === 'enrollment' ? handleExportEnrollmentCsv : handleExportRevenueCsv}
              className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">
              <Download size={16} /> Excel
            </button>
          )}
          <button onClick={
            activeTab === 'enrollment' && subTab === 'daily' ? handleExportDailySummaryPdf :
            activeTab === 'enrollment' && subTab === 'course' ? handleExportCourseWisePdf :
            activeTab === 'enrollment' && subTab === 'exec' ? handleExportExecWisePdf :
            activeTab === 'enrollment' ? handleExportEnrollmentPdf : handleExportRevenuePdf}
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

      {/* Sub-tabs for enrollment */}
      {activeTab === 'enrollment' && (
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5 max-w-xl">
          {[['details','Details Report'],['daily','Daily Summary'],['course','Course Wise'],['exec','Executive Wise']].map(([k,l]) => (
            <button key={k} onClick={() => setSubTab(k)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${subTab === k ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'enrollment' && subTab === 'daily' ? (
        <>
          <div className="card mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">মাস</label>
                <input type="month" className="input-field" value={dailyFilters.month}
                  onChange={e => setDailyFilters(p => ({ ...p, month: e.target.value, date_from: '', date_to: '' }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">তারিখ থেকে</label>
                <input type="date" className="input-field" value={dailyFilters.date_from}
                  onChange={e => setDailyFilters(p => ({ ...p, date_from: e.target.value, month: '' }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">তারিখ পর্যন্ত</label>
                <input type="date" className="input-field" value={dailyFilters.date_to}
                  onChange={e => setDailyFilters(p => ({ ...p, date_to: e.target.value, month: '' }))} />
              </div>
              <select className="input-field" value={dailyFilters.executive_id}
                onChange={e => setDailyFilters(p => ({ ...p, executive_id: e.target.value }))}>
                <option value="">সব Executive</option>
                {executives.map(e => <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>)}
              </select>
              <select className="input-field" value={dailyFilters.course_id}
                onChange={e => setDailyFilters(p => ({ ...p, course_id: e.target.value }))}>
                <option value="">সব কোর্স</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => setDailyFilters({ month: format(new Date(), 'yyyy-MM'), date_from: '', date_to: '', executive_id: '', course_id: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium self-end">
                রিসেট
              </button>
            </div>
          </div>

          {dailySummaryRows.length > 0 && (
            <div className="card mb-4">
              <p className="text-xs font-medium text-gray-500 mb-3">দৈনিক সেলস চার্ট</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, fontSize: 11, color: '#666' }}>
                {[['গ্রস সেল','#378ADD'],['সংগৃহীত','#1D9E75'],['বকেয়া','#E24B4A']].map(([l,c]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailySummaryRows.map(r => ({ date: format(new Date(r.date), 'dd/MM'), gross: r.gross, collected: r.collected, due: r.due }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
                  <Bar dataKey="gross" name="গ্রস সেল" fill="#378ADD" radius={[3,3,0,0]} />
                  <Bar dataKey="collected" name="সংগৃহীত" fill="#1D9E75" radius={[3,3,0,0]} />
                  <Bar dataKey="due" name="বকেয়া" fill="#E24B4A" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['তারিখ', 'এনরোলমেন্ট', 'গ্রস সেল', 'সংগৃহীত', 'বকেয়া'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
                  ) : dailySummaryRows.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
                  ) : dailySummaryRows.map(r => (
                    <tr key={r.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{format(new Date(r.date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-center font-medium">{r.count}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold whitespace-nowrap">৳{Number(r.gross).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">৳{Number(r.collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-500 whitespace-nowrap">৳{Number(r.due).toLocaleString()}</td>
                    </tr>
                  ))}
                  {dailySummaryRows.length > 0 && (() => {
                    const t = dailySummaryRows.reduce((acc, r) => ({
                      count: acc.count + r.count, gross: acc.gross + r.gross,
                      collected: acc.collected + r.collected, due: acc.due + r.due
                    }), { count: 0, gross: 0, collected: 0, due: 0 });
                    return (
                      <tr className="bg-primary-50 font-bold border-t-2 border-primary-100">
                        <td className="px-4 py-3 text-primary-700">মোট</td>
                        <td className="px-4 py-3 text-center text-primary-700">{t.count}</td>
                        <td className="px-4 py-3 text-blue-700 whitespace-nowrap">৳{Number(t.gross).toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-700 whitespace-nowrap">৳{Number(t.collected).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 whitespace-nowrap">৳{Number(t.due).toLocaleString()}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'enrollment' && subTab === 'course' ? (
        <>
          {/* Course Wise filters */}
          <div className="card mb-4">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">কোর্স নির্বাচন</label>
                <MultiSelect options={courses.map(c => c.name)} selected={courseFilters.selected}
                  onChange={v => setCourseFilters(p => ({ ...p, selected: v }))} placeholder="সব কোর্স" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">মাস</label>
                <input type="month" className="input-field" value={courseFilters.month}
                  onChange={e => setCourseFilters(p => ({ ...p, month: e.target.value, date_from: '', date_to: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">তারিখ থেকে</label>
                <input type="date" className="input-field" value={courseFilters.date_from}
                  onChange={e => setCourseFilters(p => ({ ...p, date_from: e.target.value, month: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">তারিখ পর্যন্ত</label>
                <input type="date" className="input-field" value={courseFilters.date_to}
                  onChange={e => setCourseFilters(p => ({ ...p, date_to: e.target.value, month: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Executive</label>
                <select className="input-field" value={courseFilters.executive_id}
                  onChange={e => setCourseFilters(p => ({ ...p, executive_id: e.target.value }))}>
                  <option value="">সব</option>
                  {executives.map(e => <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>)}
                </select></div>
            </div>
          </div>

          {/* Summary cards */}
          {(() => {
            const t = courseRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
            return <SummaryCards items={[
              { label: 'মোট কোর্স', value: courseRows.length },
              { label: 'মোট এনরোলমেন্ট', value: t.count },
              { label: 'গ্রস সেল', value: `৳${Number(t.gross).toLocaleString()}`, color: '#185FA5' },
              { label: 'সংগৃহীত', value: `৳${Number(t.collected).toLocaleString()}`, color: '#3B6D11' },
            ]} />;
          })()}

          {/* Pie charts */}
          <div className="flex gap-4 mb-4">
            <PieCountCard title="এনরোলমেন্ট — কোর্স অনুযায়ী" data={courseRows} nameKey="name" />
            <PieChartCard title="গ্রস সেল — কোর্স অনুযায়ী" data={courseRows} nameKey="name" valueKey="gross" />
          </div>

          {/* Table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['কোর্স','এনরোলমেন্ট','গ্রস সেল','সংগৃহীত','বকেয়া','শেয়ার'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courseRows.length === 0
                    ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
                    : courseRows.map((r, i) => (
                    <tr key={r.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], marginRight: 8 }} />
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-center">{r.count}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold whitespace-nowrap">৳{Number(r.gross).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600 whitespace-nowrap">৳{Number(r.collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-500 whitespace-nowrap">৳{Number(r.due).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{r.pct}%</span></td>
                    </tr>
                  ))}
                  {courseRows.length > 0 && (() => {
                    const t = courseRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
                    return <tr className="bg-primary-50 font-bold border-t-2 border-primary-100">
                      <td className="px-4 py-3 text-primary-700">মোট</td>
                      <td className="px-4 py-3 text-center text-primary-700">{t.count}</td>
                      <td className="px-4 py-3 text-blue-700 whitespace-nowrap">৳{Number(t.gross).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-700 whitespace-nowrap">৳{Number(t.collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600 whitespace-nowrap">৳{Number(t.due).toLocaleString()}</td>
                      <td className="px-4 py-3"></td>
                    </tr>;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'enrollment' && subTab === 'exec' ? (
        <>
          {/* Executive Wise filters */}
          <div className="card mb-4">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Executive নির্বাচন</label>
                <MultiSelect options={executives.map(e => e.full_name || e.phone)} selected={execFilters.selected}
                  onChange={v => setExecFilters(p => ({ ...p, selected: v }))} placeholder="সব Executive" />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">মাস</label>
                <input type="month" className="input-field" value={execFilters.month}
                  onChange={e => setExecFilters(p => ({ ...p, month: e.target.value, date_from: '', date_to: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">তারিখ থেকে</label>
                <input type="date" className="input-field" value={execFilters.date_from}
                  onChange={e => setExecFilters(p => ({ ...p, date_from: e.target.value, month: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">তারিখ পর্যন্ত</label>
                <input type="date" className="input-field" value={execFilters.date_to}
                  onChange={e => setExecFilters(p => ({ ...p, date_to: e.target.value, month: '' }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">কোর্স</label>
                <select className="input-field" value={execFilters.course_id}
                  onChange={e => setExecFilters(p => ({ ...p, course_id: e.target.value }))}>
                  <option value="">সব</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
            </div>
          </div>

          {/* Summary cards */}
          {(() => {
            const t = execRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
            return <SummaryCards items={[
              { label: 'মোট Executive', value: execRows.length },
              { label: 'মোট এনরোলমেন্ট', value: t.count },
              { label: 'গ্রস সেল', value: `৳${Number(t.gross).toLocaleString()}`, color: '#185FA5' },
              { label: 'সংগৃহীত', value: `৳${Number(t.collected).toLocaleString()}`, color: '#3B6D11' },
            ]} />;
          })()}

          {/* Pie charts */}
          <div className="flex gap-4 mb-4">
            <PieCountCard title="এনরোলমেন্ট — Executive অনুযায়ী" data={execRows} nameKey="name" />
            <PieChartCard title="গ্রস সেল — Executive অনুযায়ী" data={execRows} nameKey="name" valueKey="gross" />
          </div>

          {/* Table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Executive','এনরোলমেন্ট','গ্রস সেল','সংগৃহীত','বকেয়া','শেয়ার'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {execRows.length === 0
                    ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
                    : execRows.map((r, i) => (
                    <tr key={r.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], marginRight: 8 }} />
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-center">{r.count}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold whitespace-nowrap">৳{Number(r.gross).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600 whitespace-nowrap">৳{Number(r.collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-500 whitespace-nowrap">৳{Number(r.due).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{r.pct}%</span></td>
                    </tr>
                  ))}
                  {execRows.length > 0 && (() => {
                    const t = execRows.reduce((a, r) => ({ count: a.count + r.count, gross: a.gross + r.gross, collected: a.collected + r.collected, due: a.due + r.due }), { count: 0, gross: 0, collected: 0, due: 0 });
                    return <tr className="bg-primary-50 font-bold border-t-2 border-primary-100">
                      <td className="px-4 py-3 text-primary-700">মোট</td>
                      <td className="px-4 py-3 text-center text-primary-700">{t.count}</td>
                      <td className="px-4 py-3 text-blue-700 whitespace-nowrap">৳{Number(t.gross).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-700 whitespace-nowrap">৳{Number(t.collected).toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600 whitespace-nowrap">৳{Number(t.due).toLocaleString()}</td>
                      <td className="px-4 py-3"></td>
                    </tr>;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'enrollment' ? (
        <>
          <div className="card mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input className="input-field pl-9" placeholder="ফোন বা নাম" value={revenueFilters.search}
                  onChange={e => setRevenueFilter('search', e.target.value)}
                />
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

    {selected && createPortal(
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
              )}</div>
          </div>
        </div>,
        document.body
      )}

    {editModal && createPortal(
        <EditSaleModal
          sale={editModal}
          executives={executives}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchSales(); }}
        />,
        document.body
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
    total_collected: sale.total_collected || '',
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
            <label className="block text-sm font-medium mb-1.5">সংগৃহীত টাকা (Total Collected)</label>
            <input type="number" className="input-field" value={form.total_collected}
              onChange={e => setForm(p => ({ ...p, total_collected: e.target.value }))} />
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