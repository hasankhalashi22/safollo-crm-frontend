import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { hrApi, usersApi, leaveApi, payrollApi, authApi } from '../../api/client';
import { MODULES } from '../../config/modules';
import toast from 'react-hot-toast';
import { Trash2, User, Plus, Eye, Download, Key, Link, Unlink, ShieldCheck, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

function Modal({ children }) {
  return createPortal(children, document.body);
}

const MODULE_BADGE = {
  crm:        { bg: 'bg-blue-50',   text: 'text-blue-600' },
  hr:         { bg: 'bg-purple-50', text: 'text-purple-600' },
  accounting: { bg: 'bg-amber-50',  text: 'text-amber-600' },
};

function InitialsAvatar({ name, photoUrl, size = 'md' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-primary-100 text-primary-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name} className={`${sz} rounded-full object-cover object-top flex-shrink-0 border border-gray-100`} />
    );
  }
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

const STATUS_BADGE = {
  active: 'bg-green-50 text-green-700',
  on_leave: 'bg-blue-50 text-blue-700',
  resigned: 'bg-orange-50 text-orange-700',
  terminated: 'bg-red-50 text-red-700',
};

export default function Employees() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState('running');
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.allSettled([hrApi.getEmployees(), hrApi.getEmployeeHistory()]).then(([empRes, histRes]) => {
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data || []);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (emp) => {
    if (!confirm(`"${emp.full_name}"-কে ডিলিট করবেন? এই কর্মীর সব তথ্য স্থায়ীভাবে মুছে যাবে।`)) return;
    try {
      await hrApi.deleteEmployee(emp.id);
      toast.success('কর্মী মুছে ফেলা হয়েছে');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleResetPassword = async (e, emp) => {
    e.stopPropagation();
    if (!confirm(`${emp.full_name}-এর পাসওয়ার্ড রিসেট করবেন?`)) return;
    try {
      await authApi.resetPassword(emp.user_id);
      toast.success('পাসওয়ার্ড রিসেট হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const departments = useMemo(() => {
    const all = [...employees, ...history];
    return [...new Set(all.map(e => e.department).filter(Boolean))];
  }, [employees, history]);

  const currentList = activeTab === 'running' ? employees : history;

  const filtered = useMemo(() => currentList.filter(emp => {
    const q = search.toLowerCase();
    const matchSearch = !q || (emp.full_name || '').toLowerCase().includes(q) || (emp.phone || '').includes(q) || (emp.designation || '').toLowerCase().includes(q);
    const matchDept = !filterDept || emp.department === filterDept;
    return matchSearch && matchDept;
  }), [currentList, search, filterDept]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold text-dark">Employee Directory</h1>
          </div>
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setActiveTab('running')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'running' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Running Employees
              <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{employees.length}</span>
            </button>
            <button onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Employee History
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{history.length}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            try {
              const r = await hrApi.syncProfiles();
              toast.success(r.data?.message || 'Sync হয়েছে ✅');
              fetchData();
            } catch { toast.error('Sync হয়নি'); }
          }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <ShieldCheck size={14} /> Sync Profiles
          </button>
          <button onClick={() => setAddModal(true)}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="নাম, ফোন বা পদবি দিয়ে খুঁজুন..."
            className="input-field pl-9 text-sm" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field text-sm w-44" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">সব বিভাগ</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">কোনো কর্মী পাওয়া যায়নি</div>
        ) : filtered.map(emp => {
          const allBadges = [
            emp.user_id && { key: 'ess', label: 'ESS', cls: 'bg-green-50 text-green-700' },
            emp.crm_phone && { key: 'crm', label: `CRM: ${emp.crm_role_label || 'User'}`, cls: 'bg-blue-50 text-blue-600' },
            ...(emp.module_access || []).filter(a => a.module_key !== 'crm').map(a => ({
              key: a.module_key,
              label: MODULES.find(m => m.key === a.module_key)?.label || a.module_key,
              cls: MODULE_BADGE[a.module_key] ? `${MODULE_BADGE[a.module_key].bg} ${MODULE_BADGE[a.module_key].text}` : 'bg-gray-100 text-gray-500',
            })),
          ].filter(Boolean);

          const exitDate = emp.termination_date || emp.resignation_date;
          const exitLabel = emp.termination_date ? 'টার্মিনেশন' : emp.resignation_date ? 'রিজাইন' : null;

          return (
            <div key={emp.id}
              onClick={() => setEditModal(emp)}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
              <InitialsAvatar name={emp.full_name} photoUrl={emp.photo_url} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-gray-900">{emp.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[emp.status] || 'bg-gray-100 text-gray-500'}`}>
                    {emp.status || 'active'}
                  </span>
                  {allBadges.map(b => (
                    <span key={b.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.cls}`}>{b.label}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {[emp.designation || emp.position_title, emp.department,
                    emp.reports_to_name ? `রিপোর্ট: ${emp.reports_to_name}` : null,
                    emp.is_remote ? 'Remote' : null,
                    exitDate && exitLabel ? `${exitLabel}: ${format(new Date(exitDate), 'dd/MM/yyyy')}` : null,
                    emp.exit_reason ? `কারণ: ${emp.exit_reason}` : null,
                  ].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {emp.user_id && (
                  <button onClick={(e) => handleResetPassword(e, emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                    <Key size={13} /> Reset
                  </button>
                )}
                {isSuperAdmin && (
                  <button onClick={() => handleDelete(emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                    <Trash2 size={13} /> ডিলিট
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editModal && (
        <EmployeeEditModal
          employee={editModal}
          allEmployees={employees}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchData(); }}
        />
      )}
      {addModal && (
        <AddEmployeeModal
          allEmployees={employees}
          onClose={() => setAddModal(false)}
          onSuccess={() => { setAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function EmployeeViewModal({ employee, onClose }) {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadCV = () => {
    setGeneratingPdf(true);
    try {
      const cvWindow = window.open('', '_blank');
      const cvHtml = generateCVHtml(employee);
      cvWindow.document.write(cvHtml);
      cvWindow.document.close();
      cvWindow.focus();
      setTimeout(() => { cvWindow.print(); setGeneratingPdf(false); }, 500);
    } catch (err) {
      toast.error('CV তৈরি হয়নি');
      setGeneratingPdf(false);
    }
  };

  return (
    <Modal>
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary-500 text-white p-5 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {employee?.photo_url ? (
                <img src={employee.photo_url} className="w-16 h-16 rounded-full object-cover border-2 border-white" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center border-2 border-white">
                  <span className="text-2xl font-bold">{(employee?.full_name || '?')[0]}</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{employee?.full_name || '—'}</h2>
                <p className="text-primary-200">{employee?.designation || employee?.position_title || '—'}</p>
                <p className="text-primary-200 text-sm">{employee?.phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownloadCV} disabled={generatingPdf}
                className="flex items-center gap-1.5 bg-white text-primary-600 px-3 py-1.5 rounded-xl text-sm font-medium">
                <Download size={16} /> CV Download
              </button>
              <button onClick={onClose} className="p-1.5 bg-primary-400 rounded-full">✕</button>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <ViewSection title="ব্যক্তিগত তথ্য">
            <ViewRow label="পিতার নাম" value={employee?.father_name} />
            <ViewRow label="মাতার নাম" value={employee?.mother_name} />
            <ViewRow label="জন্ম তারিখ" value={employee?.date_of_birth ? format(new Date(employee.date_of_birth), 'dd/MM/yyyy') : null} />
            <ViewRow label="রক্তের গ্রুপ" value={employee?.blood_group} />
            <ViewRow label="লিঙ্গ" value={employee?.gender === 'male' ? 'পুরুষ' : employee?.gender === 'female' ? 'মহিলা' : employee?.gender} />
          </ViewSection>
          <ViewSection title="যোগাযোগ">
            <ViewRow label="মোবাইল" value={employee?.phone} />
            <ViewRow label="ইমেইল" value={employee?.email} />
            <ViewRow label="অভিভাবকের মোবাইল" value={employee?.guardian_mobile} />
            <ViewRow label="অভিভাবকের সম্পর্ক" value={employee?.guardian_relation} />
          </ViewSection>
          <ViewSection title="ঠিকানা">
            <ViewRow label="বর্তমান ঠিকানা" value={employee?.present_address} />
            <ViewRow label="স্থায়ী ঠিকানা" value={employee?.permanent_address} />
          </ViewSection>
          <ViewSection title="শিক্ষা ও পরিচয়">
            <ViewRow label="শিক্ষার স্তর" value={employee?.education_level} />
            <ViewRow label="বিস্তারিত" value={employee?.education_details} />
            <ViewRow label="NID নম্বর" value={employee?.nid_number} />
            {employee?.nid_image_url && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">NID ছবি</span>
                <a href={employee.nid_image_url} target="_blank" rel="noreferrer" className="text-primary-500 text-sm underline">দেখুন</a>
              </div>
            )}
          </ViewSection>
          <ViewSection title="চাকরির তথ্য">
            <ViewRow label="পদ" value={employee?.designation || employee?.position_title} />
            <ViewRow label="বিভাগ" value={employee?.department} />
            <ViewRow label="রিপোর্ট করে" value={employee?.reports_to_name} />
            <ViewRow label="CRM Role" value={employee?.crm_role_label} />
            <ViewRow label="স্ট্যাটাস" value={employee?.status} />
          </ViewSection>
        </div>
      </div>
    </div>
    </Modal>
  );
}

function ViewSection({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-primary-600 uppercase tracking-wide border-b-2 border-primary-50 pb-1.5 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ViewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-sm text-right max-w-xs">{value}</span>
    </div>
  );
}

function generateCVHtml(employee) {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>CV — ${employee?.full_name || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Hind Siliguri', sans-serif; color: #1C2B2A; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; align-items: center; gap: 24px; background: #1A7A6E; color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid white; }
    .photo-placeholder { width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; border: 3px solid white; }
    .header-info h1 { font-size: 24px; font-weight: 700; }
    .header-info p { opacity: 0.85; font-size: 14px; margin-top: 2px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 600; color: #1A7A6E; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #E6F4F1; padding-bottom: 6px; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 500; text-align: right; max-width: 60%; }
    .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page { padding: 20px; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    ${employee?.photo_url ? `<img src="${employee.photo_url}" class="photo" alt="photo">` : `<div class="photo-placeholder">${(employee?.full_name || '?')[0]}</div>`}
    <div class="header-info">
      <h1>${employee?.full_name || '—'}</h1>
      <p>${employee?.designation || employee?.position_title || ''}</p>
      <p>${employee?.phone || ''} ${employee?.email ? '• ' + employee.email : ''}</p>
      ${employee?.joining_date ? `<p>যোগদান: ${format(new Date(employee.joining_date), 'dd/MM/yyyy')}</p>` : ''}
    </div>
  </div>
  <div class="section">
    <div class="section-title">ব্যক্তিগত তথ্য</div>
    ${cvRow('পিতার নাম', employee?.father_name)}
    ${cvRow('মাতার নাম', employee?.mother_name)}
    ${cvRow('জন্ম তারিখ', employee?.date_of_birth ? format(new Date(employee.date_of_birth), 'dd/MM/yyyy') : null)}
    ${cvRow('রক্তের গ্রুপ', employee?.blood_group)}
    ${cvRow('লিঙ্গ', employee?.gender === 'male' ? 'পুরুষ' : employee?.gender === 'female' ? 'মহিলা' : employee?.gender)}
  </div>
  <div class="section">
    <div class="section-title">যোগাযোগ</div>
    ${cvRow('মোবাইল', employee?.phone)}
    ${cvRow('ইমেইল', employee?.email)}
    ${cvRow('অভিভাবকের মোবাইল', employee?.guardian_mobile)}
    ${cvRow('অভিভাবকের সম্পর্ক', employee?.guardian_relation)}
  </div>
  <div class="section">
    <div class="section-title">ঠিকানা</div>
    ${cvRow('বর্তমান ঠিকানা', employee?.present_address)}
    ${cvRow('স্থায়ী ঠিকানা', employee?.permanent_address)}
  </div>
  <div class="section">
    <div class="section-title">শিক্ষাগত যোগ্যতা</div>
    ${cvRow('শিক্ষার স্তর', employee?.education_level)}
    ${cvRow('বিস্তারিত', employee?.education_details)}
  </div>
  <div class="section">
    <div class="section-title">পরিচয়</div>
    ${cvRow('NID নম্বর', employee?.nid_number)}
  </div>
  <div class="section">
    <div class="section-title">চাকরির তথ্য</div>
    ${cvRow('পদ', employee?.designation || employee?.position_title)}
    ${cvRow('বিভাগ', employee?.department)}
    ${cvRow('রিপোর্ট করে', employee?.reports_to_name)}
  </div>
  <div class="footer">সাফল্য একাডেমি — সফলতার অগ্রণী | Generated: ${new Date().toLocaleDateString('bn-BD')}</div>
</div>
</body>
</html>`;
}

function cvRow(label, value) {
  if (!value) return '';
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function AddEmployeeModal({ allEmployees, onClose, onSuccess }) {
  const [mode, setMode] = useState('new');
  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [positions, setPositions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', position_id: '', designation: '', department: '',
    reports_to: '', employment_type: 'full_time', is_remote: false,
    grant_crm_access: false, crm_role_id: '', crm_manager_id: '',
    grant_basic_login: false,
  });

  useEffect(() => {
    hrApi.getUnlinkedCrmUsers().then(r => setUnlinkedUsers(r.data || []));
    hrApi.getPositions().then(r => setPositions(r.data || []));
    usersApi.getRoles().then(r => setRoles(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePositionChange = (posId) => {
    const pos = positions.find(p => p.id === posId);
    setForm(p => ({ ...p, position_id: posId, designation: pos ? pos.title : p.designation, department: pos ? (pos.department || '') : p.department }));
  };

  const handleImportSelect = (userId) => {
    setSelectedUserId(userId);
    const u = unlinkedUsers.find(x => x.id === userId);
    if (u) setForm(p => ({ ...p, full_name: u.full_name || '', phone: u.phone || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name) return toast.error('নাম দিন');
    if (mode === 'new' && form.grant_crm_access && (!form.phone || !form.crm_role_id)) return toast.error('CRM access দেওয়ার জন্য ফোন নম্বর ও Role আবশ্যক');
    if (mode === 'new' && form.grant_basic_login && !form.phone) return toast.error('ESS Portal access দেওয়ার জন্য ফোন নম্বর আবশ্যক');
    setLoading(true);
    try {
      const payload = { ...form };
      if (mode === 'import' && selectedUserId) payload.user_id = selectedUserId;
      await hrApi.createEmployee(payload);
      toast.success('কর্মী যুক্ত হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <Modal>
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Add Employee</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('new')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === 'new' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            নতুন কর্মী
          </button>
          <button onClick={() => setMode('import')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === 'import' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            CRM থেকে আনুন
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'import' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">CRM User বেছে নিন</label>
              <select className="input-field" value={selectedUserId} onChange={e => handleImportSelect(e.target.value)}>
                <option value="">-- Select --</option>
                {unlinkedUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.phone} ({u.role_label})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">নাম *</label>
            <input type="text" className="input-field" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ফোন</label>
            <input type="text" className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Position</label>
            <select className="input-field" value={form.position_id} onChange={e => handlePositionChange(e.target.value)}>
              <option value="">-- None --</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` (${p.department})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Designation</label>
            <input type="text" className="input-field" value={form.designation} onChange={e => set('designation', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Department</label>
            <input type="text" className="input-field" value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reports To</label>
            <select className="input-field" value={form.reports_to} onChange={e => set('reports_to', e.target.value)}>
              <option value="">-- None --</option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_remote} onChange={e => set('is_remote', e.target.checked)} />
            <label className="text-sm">Remote Employee</label>
          </div>
          {mode === 'new' && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={form.grant_crm_access} onChange={e => set('grant_crm_access', e.target.checked)} />
                <label className="text-sm font-medium">CRM Access দিন</label>
              </div>
              {!form.grant_crm_access && (
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={form.grant_basic_login} onChange={e => set('grant_basic_login', e.target.checked)} />
                  <label className="text-sm font-medium">শুধু ESS Portal Access দিন (CRM ছাড়া)</label>
                </div>
              )}
              {form.grant_crm_access && (
                <div className="space-y-3 bg-blue-50 p-3 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">CRM Role *</label>
                    <select className="input-field" value={form.crm_role_id} onChange={e => set('crm_role_id', e.target.value)}>
                      <option value="">-- Select --</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Manager (optional)</label>
                    <select className="input-field" value={form.crm_manager_id} onChange={e => set('crm_manager_id', e.target.value)}>
                      <option value="">-- None --</option>
                      {allEmployees.filter(e => e.crm_phone).map(e => <option key={e.user_id} value={e.user_id}>{e.full_name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
    </Modal>
  );
}

function FileUploadBox({ label, currentUrl, onUpload }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {currentUrl && (
        <a href={currentUrl} target="_blank" rel="noreferrer" className="text-primary-500 underline text-xs block mb-1.5">বর্তমান ফাইল দেখুন</a>
      )}
      <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
        <span className="text-sm text-gray-400">নতুন ফাইল আপলোড করুন</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => onUpload(e.target.files[0])} />
      </label>
    </div>
  );
}

function EmployeeEditModal({ employee, allEmployees, onClose, onSuccess }) {
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    full_name: employee.full_name || '',
    phone: employee.phone || '',
    email: employee.email || '',
    position_id: employee.position_id || '',
    designation: employee.designation || '',
    department: employee.department || '',
    reports_to: employee.reports_to || '',
    employment_type: employee.employment_type || 'full_time',
    office_start_time: employee.office_start_time || '11:00',
    office_end_time: employee.office_end_time || '21:00',
    is_remote: employee.is_remote || false,
    basic_salary: employee.basic_salary || '',
    status: employee.status || 'active',
    weekly_off_day: employee.weekly_off_day || '',
    father_name: employee.father_name || '',
    mother_name: employee.mother_name || '',
    date_of_birth: employee.date_of_birth?.split('T')[0] || '',
    blood_group: employee.blood_group || '',
    gender: employee.gender || '',
    guardian_mobile: employee.guardian_mobile || '',
    guardian_relation: employee.guardian_relation || '',
    present_address: employee.present_address || '',
    permanent_address: employee.permanent_address || '',
    education_level: employee.education_level || '',
    education_details: employee.education_details || '',
    nid_number: employee.nid_number || '',
    resignation_date: employee.resignation_date?.split('T')[0] || '',
    termination_date: employee.termination_date?.split('T')[0] || '',
    exit_reason: employee.exit_reason || '',
  });
  const [isLocked, setIsLocked] = useState(employee.is_locked || false);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [moduleAccess, setModuleAccess] = useState({});
  const [crmRoles, setCrmRoles] = useState([]);

  useEffect(() => {
    hrApi.getPositions().then(r => setPositions(r.data || []));
    hrApi.getEmployeeModuleAccess(employee.id).then(r => {
      const map = {};
      (r.data || []).forEach(a => { map[a.module_key] = a.role_key; });
      setModuleAccess(map);
    });
    usersApi.getRoles().then(r => setCrmRoles(r.data || []));
  }, []);

  const toggleModuleAccess = (moduleKey, defaultRole) => {
    setModuleAccess(prev => {
      const next = { ...prev };
      if (next[moduleKey]) { delete next[moduleKey]; } else { next[moduleKey] = defaultRole; }
      return next;
    });
  };

  const setModuleRole = (moduleKey, roleKey) => {
    setModuleAccess(prev => ({ ...prev, [moduleKey]: roleKey }));
  };

  const handleSaveModuleAccess = async () => {
    setLoading(true);
    try {
      const accessList = Object.entries(moduleAccess).map(([module_key, role_key]) => ({ module_key, role_key }));
      await hrApi.setEmployeeModuleAccess(employee.id, accessList);
      toast.success('Module Access আপডেট হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePositionChange = (e) => {
    const posId = e.target.value;
    const pos = positions.find(p => p.id === posId);
    setForm(p => ({ ...p, position_id: posId, designation: pos ? pos.title : p.designation, department: pos ? (pos.department || '') : p.department }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await hrApi.updateEmployee(employee.id, form);
      toast.success('তথ্য আপডেট হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleToggleLock = async () => {
    setLoading(true);
    try {
      await hrApi.updateEmployee(employee.id, { is_locked: !isLocked });
      setIsLocked(!isLocked);
      toast.success(!isLocked ? 'প্রোফাইল লক করা হয়েছে ✅' : 'প্রোফাইল আনলক করা হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(type, file);
      if (type === 'photo') await hrApi.uploadEmployeePhoto(employee.id, formData);
      if (type === 'nid') await hrApi.uploadEmployeeNid(employee.id, formData);
      if (type === 'signature') await hrApi.uploadEmployeeSignature(employee.id, formData);
      toast.success('আপলোড সফল হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'আপলোড ব্যর্থ হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <Modal>
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-primary-50 px-5 py-4 flex items-center gap-3 border-b border-primary-100 flex-shrink-0">
          <InitialsAvatar name={employee.full_name} photoUrl={employee.photo_url} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{employee.full_name}</p>
            <p className="text-xs text-gray-500 truncate">
              {[employee.designation || employee.position_title, employee.department].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={handleToggleLock} disabled={loading}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isLocked ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {isLocked ? '🔒 Locked' : '🔓 Lock'}
            </button>
            <button onClick={onClose} className="p-1.5 bg-white rounded-full border border-gray-200 text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        {/* 2 Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {[{ key: 'info', label: 'তথ্য ও নথি' }, { key: 'access', label: 'Access ও বেতন' }].map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5">
          <form onSubmit={handleSubmit}>
            {tab === 'info' && (
              <div className="space-y-5">
                {/* মূল তথ্য */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">মূল তথ্য</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">নাম</label>
                        <input type="text" className="input-field" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ফোন</label>
                        <input type="text" className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                        <select className="input-field" value={form.position_id} onChange={handlePositionChange}>
                          <option value="">-- None --</option>
                          {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` (${p.department})` : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                        <input type="text" className="input-field" value={form.designation} onChange={e => set('designation', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                        <input type="text" className="input-field" value={form.department} onChange={e => set('department', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Reports To</label>
                        <select className="input-field" value={form.reports_to} onChange={e => set('reports_to', e.target.value)}>
                          <option value="">-- None --</option>
                          {allEmployees.filter(e => e.id !== employee.id).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
                        <select className="input-field" value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                          <option value="contractual">Contractual</option>
                          <option value="intern">Intern</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                          <option value="active">Active</option>
                          <option value="on_leave">On Leave</option>
                          <option value="resigned">Resigned</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      </div>
                    </div>
                    {(form.status === 'resigned' || form.status === 'terminated') && (
                      <div className="space-y-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <div className="grid grid-cols-2 gap-3">
                          {form.status === 'resigned' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">রিজাইনের তারিখ</label>
                              <input type="date" className="input-field" value={form.resignation_date} onChange={e => set('resignation_date', e.target.value)} />
                            </div>
                          )}
                          {form.status === 'terminated' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">টার্মিনেশনের তারিখ</label>
                              <input type="date" className="input-field" value={form.termination_date} onChange={e => set('termination_date', e.target.value)} />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">কারণ</label>
                          <textarea className="input-field resize-none" rows={2} value={form.exit_reason} onChange={e => set('exit_reason', e.target.value)} placeholder="রিজাইন / টার্মিনেশনের কারণ..." />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_remote" checked={form.is_remote} onChange={e => set('is_remote', e.target.checked)} />
                      <label htmlFor="is_remote" className="text-sm text-gray-600">Remote Employee</label>
                    </div>
                    {!form.is_remote && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Office Start</label>
                          <input type="time" className="input-field" value={form.office_start_time} onChange={e => set('office_start_time', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Office End</label>
                          <input type="time" className="input-field" value={form.office_end_time} onChange={e => set('office_end_time', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">সাপ্তাহিক ছুটি</label>
                          <select className="input-field" value={form.weekly_off_day} onChange={e => set('weekly_off_day', e.target.value)}>
                            <option value="">নেই</option>
                            <option value="saturday">শনিবার</option>
                            <option value="sunday">রবিবার</option>
                            <option value="monday">সোমবার</option>
                            <option value="tuesday">মঙ্গলবার</option>
                            <option value="wednesday">বুধবার</option>
                            <option value="thursday">বৃহস্পতিবার</option>
                            <option value="friday">শুক্রবার</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* ব্যক্তিগত তথ্য */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ব্যক্তিগত তথ্য</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">পিতার নাম</label>
                        <input type="text" className="input-field" value={form.father_name} onChange={e => set('father_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">মাতার নাম</label>
                        <input type="text" className="input-field" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">জন্ম তারিখ</label>
                        <input type="date" className="input-field" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                        <select className="input-field" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                          <option value="">—</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                        <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
                          <option value="">—</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Mobile</label>
                        <input type="text" className="input-field" value={form.guardian_mobile} onChange={e => set('guardian_mobile', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Relation</label>
                        <input type="text" className="input-field" value={form.guardian_relation} onChange={e => set('guardian_relation', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">বর্তমান ঠিকানা</label>
                      <textarea className="input-field resize-none" rows={2} value={form.present_address} onChange={e => set('present_address', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">স্থায়ী ঠিকানা</label>
                      <textarea className="input-field resize-none" rows={2} value={form.permanent_address} onChange={e => set('permanent_address', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">শিক্ষাগত যোগ্যতা</label>
                        <input type="text" className="input-field" value={form.education_level} onChange={e => set('education_level', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">NID Number</label>
                        <input type="text" className="input-field" value={form.nid_number} onChange={e => set('nid_number', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">শিক্ষাগত বিস্তারিত</label>
                      <textarea className="input-field resize-none" rows={2} value={form.education_details} onChange={e => set('education_details', e.target.value)} />
                    </div>
                  </div>
                </section>

                {/* নথি */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">নথি ও ছবি</p>
                  <div className="space-y-3">
                    <FileUploadBox label="ছবি (Photo)" currentUrl={employee.photo_url} onUpload={file => handleFileUpload('photo', file)} />
                    <FileUploadBox label="NID Image" currentUrl={employee.nid_image_url} onUpload={file => handleFileUpload('nid', file)} />
                    <FileUploadBox label="Signature" currentUrl={employee.signature_url} onUpload={file => handleFileUpload('signature', file)} />
                  </div>
                </section>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'সংরক্ষণ হচ্ছে...' : '✅ সংরক্ষণ করুন'}
                </button>
              </div>
            )}

            {tab === 'access' && (
              <div className="space-y-5">
                {/* ESS Access */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ESS Portal Access</p>
                  <EssAccessTab employee={employee} onSuccess={onSuccess} />
                </section>

                {/* Module Access */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Module Access</p>
                  <div className="space-y-2">
                    {MODULES.map(m => {
                      const hasAccess = !!moduleAccess[m.key];
                      const roleOptions = m.key === 'crm' ? crmRoles.map(r => ({ key: r.name, label: r.label })) : (m.roles || []);
                      return (
                        <div key={m.key} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={hasAccess} onChange={() => toggleModuleAccess(m.key, roleOptions[0]?.key || '')} />
                            <span className="text-sm font-medium flex-1">{m.label}</span>
                            {hasAccess && (
                              <select className="input-field text-xs py-1 w-44" value={moduleAccess[m.key] || ''} onChange={e => setModuleRole(m.key, e.target.value)}>
                                <option value="">-- Role --</option>
                                {roleOptions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={handleSaveModuleAccess} className="btn-primary w-full mt-3" disabled={loading}>
                    {loading ? 'Saving...' : '✅ Module Access সংরক্ষণ করুন'}
                  </button>
                </section>

                {/* Salary */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">বেতন কাঠামো</p>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Basic Salary (৳)</label>
                    <input type="number" className="input-field" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} placeholder="0" />
                  </div>
                  <SalaryTab employeeId={employee.id} />
                  <button type="submit" className="btn-primary w-full mt-3" disabled={loading}>
                    {loading ? 'সংরক্ষণ হচ্ছে...' : '✅ Salary সংরক্ষণ করুন'}
                  </button>
                </section>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
    </Modal>
  );
}

function EssAccessTab({ employee, onSuccess }) {
  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEss, setHasEss] = useState(!!employee.user_id);
  const [userId, setUserId] = useState(employee.user_id || null);

  useEffect(() => {
    if (!hasEss) {
      hrApi.getUnlinkedCrmUsers().then(r => setUnlinkedUsers(r.data || []));
    }
  }, [hasEss]);

  const handleLink = async () => {
    if (!selectedUserId) return toast.error('একটি CRM User বেছে নিন');
    setLoading(true);
    try {
      const r = await hrApi.linkEssUser(employee.id, selectedUserId);
      setHasEss(true);
      setUserId(r.data?.user_id);
      toast.success('ESS Access লিঙ্ক হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  const handleCreateLogin = async () => {
    if (!employee.phone) return toast.error('কর্মীর ফোন নম্বর নেই। আগে Basic Info-তে ফোন নম্বর দিন।');
    if (!confirm(`${employee.phone} নম্বরে নতুন ESS Login তৈরি করবেন?`)) return;
    setLoading(true);
    try {
      const r = await hrApi.createEssLogin(employee.id);
      setHasEss(true);
      setUserId(r.data?.user_id);
      toast.success('ESS Login তৈরি হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  const handleUnlink = async () => {
    if (!confirm('ESS Access সরিয়ে দেবেন? CRM Account মুছবে না, শুধু লিঙ্ক ভাঙবে।')) return;
    setLoading(true);
    try {
      await hrApi.unlinkEssUser(employee.id);
      setHasEss(false);
      setUserId(null);
      toast.success('ESS Access সরানো হয়েছে');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {hasEss ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <ShieldCheck size={20} />
            <span className="font-semibold">ESS Access সক্রিয় আছে</span>
          </div>
          <p className="text-sm text-gray-600">
            এই কর্মী <strong>{employee.phone || 'তাদের ফোন নম্বর'}</strong> দিয়ে Employee Portal (ESS)-এ লগইন করতে পারবেন।
          </p>
          {employee.crm_phone && (
            <p className="text-xs text-gray-500 bg-white rounded-lg px-3 py-2">
              CRM Account: {employee.crm_role_label || 'Employee'} ({employee.crm_phone || employee.phone})
            </p>
          )}
          <button onClick={handleUnlink} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition">
            <Unlink size={15} /> ESS Access সরিয়ে দিন
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            এই কর্মীর কোনো ESS Access নেই। নিচ থেকে চালু করুন।
          </div>

          {/* Option 1: Link existing CRM user */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Link size={15} /> বিদ্যমান CRM User-এর সাথে লিঙ্ক করুন</h4>
            <p className="text-xs text-gray-400">যদি এই কর্মীর ইতোমধ্যে CRM-এ একটি Account থাকে:</p>
            <select className="input-field" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">-- CRM User বেছে নিন --</option>
              {unlinkedUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.phone} ({u.role_label})</option>
              ))}
            </select>
            <button onClick={handleLink} disabled={loading || !selectedUserId}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {loading ? 'লিঙ্ক হচ্ছে...' : '✅ লিঙ্ক করুন'}
            </button>
          </div>

          {/* Option 2: Create new ESS login */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck size={15} /> নতুন ESS Login তৈরি করুন</h4>
            <p className="text-xs text-gray-400">
              যদি এই কর্মীর কোনো CRM Account না থাকে, তাহলে তার ফোন নম্বরে একটি নতুন ESS-only login তৈরি করুন।
            </p>
            <p className="text-sm font-medium text-gray-700">ফোন: {employee.phone || <span className="text-red-500">নেই — আগে Basic Info-তে যোগ করুন</span>}</p>
            <button onClick={handleCreateLogin} disabled={loading || !employee.phone}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {loading ? 'তৈরি হচ্ছে...' : '🔐 নতুন ESS Login তৈরি করুন'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryTab({ employeeId }) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ type: 'allowance', name: '', amount: '' });
  const [adding, setAdding] = useState(false);

  const fetchComponents = () => {
    payrollApi.getEmployeeComponents(employeeId).then(r => {
      setComponents(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchComponents(); }, [employeeId]);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.amount) return toast.error('নাম ও পরিমাণ দিন');
    setAdding(true);
    try {
      await payrollApi.addComponent(employeeId, addForm);
      toast.success('যুক্ত হয়েছে ✅');
      setAddForm({ type: 'allowance', name: '', amount: '' });
      fetchComponents();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setAdding(false); }
  };

  const handleRemove = async (id) => {
    if (!confirm('এই component মুছে ফেলতে চান?')) return;
    try {
      await payrollApi.removeComponent(id);
      toast.success('মুছে ফেলা হয়েছে');
      fetchComponents();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div>;

  const allowances = components.filter(c => c.type === 'allowance');
  const deductions = components.filter(c => c.type === 'deduction');

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-green-700 mb-2">Allowances (ভাতা)</h4>
        {allowances.length === 0 ? (
          <p className="text-xs text-gray-400">কোনো allowance নেই</p>
        ) : (
          <div className="space-y-1.5">
            {allowances.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600">+৳{Number(c.amount).toLocaleString()}</span>
                  <button onClick={() => handleRemove(c.id)} className="p-1 bg-red-50 text-red-500 rounded-lg text-xs">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-red-700 mb-2">Deductions (কর্তন)</h4>
        {deductions.length === 0 ? (
          <p className="text-xs text-gray-400">কোনো deduction নেই</p>
        ) : (
          <div className="space-y-1.5">
            {deductions.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-red-600">-৳{Number(c.amount).toLocaleString()}</span>
                  <button onClick={() => handleRemove(c.id)} className="p-1 bg-red-50 text-red-500 rounded-lg text-xs">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">নতুন যুক্ত করুন</h4>
       <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">ধরন</label>
              <select className="input-field text-sm" value={addForm.type}
                onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                <option value="allowance">Allowance (ভাতা)</option>
                <option value="deduction">Deduction (কর্তন)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">পরিমাণ (৳)</label>
              <input type="number" className="input-field text-sm" value={addForm.amount}
                onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">নাম</label>
            <input type="text" className="input-field text-sm" value={addForm.name}
              onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
              placeholder="যেমন: House Rent, Provident Fund" />
          </div>
         <button type="button" onClick={handleAdd} disabled={adding}
            className="w-full bg-primary-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {adding ? 'যুক্ত হচ্ছে...' : '✅ যুক্ত করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}