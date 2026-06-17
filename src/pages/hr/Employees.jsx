import { useState, useEffect } from 'react';
import { hrApi, usersApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Edit2, User, Plus, Eye, Download, Key } from 'lucide-react';
import { format } from 'date-fns';
import { usersApi } from '../../api/client';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);

  const fetchEmployees = () => {
    setLoading(true);
    hrApi.getEmployees().then(r => {
      setEmployees(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchEmployees(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-dark">Employee Directory</h1>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Designation', 'Department', 'Reports To', 'Type', 'CRM Access', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No employees found</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <User size={16} />
                      </div>
                      <p className="font-medium">{emp.full_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.designation || emp.position_title || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.reports_to_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {emp.is_remote ? 'Remote' : 'On-site'} {emp.employment_type ? `(${emp.employment_type})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {emp.crm_phone ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{emp.crm_role_label || 'CRM User'}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">No CRM access</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${emp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setViewModal(emp)}
                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setEditModal(emp)}
                        className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editModal && (
        <EmployeeEditModal
          employee={editModal}
          allEmployees={employees}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchEmployees(); }}
        />
      )}

     {addModal && (
        <AddEmployeeModal
          allEmployees={employees}
          onClose={() => setAddModal(false)}
          onSuccess={() => { setAddModal(false); fetchEmployees(); }}
        />
      )}

      {viewModal && (
        <EmployeeViewModal
          employee={viewModal}
          onClose={() => setViewModal(null)}
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
      setTimeout(() => {
        cvWindow.print();
        setGeneratingPdf(false);
      }, 500);
    } catch (err) {
      toast.error('CV তৈরি হয়নি');
      setGeneratingPdf(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee.user_id) return toast.error('এই কর্মীর CRM access নেই');
    if (!confirm('পাসওয়ার্ড রিসেট করবেন?')) return;
    try {
      await usersApi.resetPassword(employee.user_id);
      toast.success('পাসওয়ার্ড রিসেট হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  return (
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
                className="flex items-center gap-1.5 bg-white text-primary-600 px-3 py-1.5 rounded-xl text-sm font-medium active:scale-95">
                <Download size={16} /> CV Download
              </button>
              {employee?.user_id && (
                <button onClick={handleResetPassword}
                  className="flex items-center gap-1.5 bg-amber-400 text-white px-3 py-1.5 rounded-xl text-sm font-medium active:scale-95">
                  <Key size={16} /> Reset Password
                </button>
              )}
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
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    ${employee?.photo_url
      ? `<img src="${employee.photo_url}" class="photo" alt="photo">`
      : `<div class="photo-placeholder">${(employee?.full_name || '?')[0]}</div>`
    }
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
  <div class="footer">
    সাফল্য একাডেমি — সফলতার অগ্রণী | Generated: ${new Date().toLocaleDateString('bn-BD')}
  </div>
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
    if (u) {
      setForm(p => ({ ...p, full_name: u.full_name || '', phone: u.phone || '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name) return toast.error('নাম দিন');
    if (mode === 'new' && form.grant_crm_access && (!form.phone || !form.crm_role_id)) {
      return toast.error('CRM access দেওয়ার জন্য ফোন নম্বর ও Role আবশ্যক');
    }
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
              <select className="input-field" value={selectedUserId}
                onChange={e => handleImportSelect(e.target.value)}>
                <option value="">-- Select --</option>
                {unlinkedUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.phone} ({u.role_label})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">নাম *</label>
            <input type="text" className="input-field" value={form.full_name}
              onChange={e => set('full_name', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ফোন</label>
            <input type="text" className="input-field" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Position</label>
            <select className="input-field" value={form.position_id}
              onChange={e => handlePositionChange(e.target.value)}>
              <option value="">-- None --</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` (${p.department})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Designation (editable)</label>
            <input type="text" className="input-field" value={form.designation}
              onChange={e => set('designation', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Department (editable)</label>
            <input type="text" className="input-field" value={form.department}
              onChange={e => set('department', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reports To</label>
            <select className="input-field" value={form.reports_to}
              onChange={e => set('reports_to', e.target.value)}>
              <option value="">-- None --</option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_remote}
              onChange={e => set('is_remote', e.target.checked)} />
            <label className="text-sm">Remote Employee</label>
          </div>

          {mode === 'new' && (
            <div className="border-t border-gray-100 pt-3 mt-1">
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={form.grant_crm_access}
                  onChange={e => set('grant_crm_access', e.target.checked)} />
                <label className="text-sm font-medium">CRM Access দিন</label>
              </div>

              {form.grant_crm_access && (
                <div className="space-y-3 bg-blue-50 p-3 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">CRM Role *</label>
                    <select className="input-field" value={form.crm_role_id}
                      onChange={e => set('crm_role_id', e.target.value)}>
                      <option value="">-- Select --</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Manager (optional)</label>
                    <select className="input-field" value={form.crm_manager_id}
                      onChange={e => set('crm_manager_id', e.target.value)}>
                      <option value="">-- None --</option>
                      {allEmployees.filter(e => e.crm_phone).map(e => (
                        <option key={e.user_id} value={e.user_id}>{e.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">ফোন নম্বর দিয়ে প্রথমবার লগইন করার সময় OTP যাচাই করে পাসওয়ার্ড সেট করতে হবে।</p>
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
  const [tab, setTab] = useState('basic');
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
  });
  const [isLocked, setIsLocked] = useState(employee.is_locked || false);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    hrApi.getPositions().then(r => setPositions(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePositionChange = (e) => {
    const posId = e.target.value;
    const pos = positions.find(p => p.id === posId);
    setForm(p => ({
      ...p,
      position_id: posId,
      designation: pos ? pos.title : p.designation,
      department: pos ? (pos.department || '') : p.department,
    }));
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

  const tabs = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'personal', label: 'Personal Details' },
    { key: 'documents', label: 'Documents' },
    { key: 'hr', label: 'HR Settings' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-3">
          <h3 className="font-bold text-lg">{employee.full_name}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="flex items-center justify-between mb-4 p-2.5 bg-gray-50 rounded-xl">
          <span className="text-sm font-medium">{isLocked ? '🔒 প্রোফাইল লক করা আছে' : '🔓 প্রোফাইল আনলক করা আছে'}</span>
          <button type="button" onClick={handleToggleLock} disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isLocked ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'}`}>
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto border-b border-gray-100">
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">নাম</label>
                <input type="text" className="input-field" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">ফোন</label>
                <input type="text" className="input-field" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" className="input-field" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Position</label>
                <select className="input-field" value={form.position_id} onChange={handlePositionChange}>
                  <option value="">-- None --</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` (${p.department})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Designation (editable)</label>
                <input type="text" className="input-field" value={form.designation}
                  onChange={e => set('designation', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Department (editable)</label>
                <input type="text" className="input-field" value={form.department}
                  onChange={e => set('department', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reports To</label>
                <select className="input-field" value={form.reports_to} onChange={e => set('reports_to', e.target.value)}>
                  <option value="">-- None --</option>
                  {allEmployees.filter(e => e.id !== employee.id).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
            </>
          )}

          {tab === 'personal' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">পিতার নাম</label>
                  <input type="text" className="input-field" value={form.father_name}
                    onChange={e => set('father_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">মাতার নাম</label>
                  <input type="text" className="input-field" value={form.mother_name}
                    onChange={e => set('mother_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">জন্ম তারিখ</label>
                  <input type="date" className="input-field" value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Blood Group</label>
                  <select className="input-field" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                    <option value="">-- Select --</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Gender</label>
                <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Guardian Mobile</label>
                  <input type="text" className="input-field" value={form.guardian_mobile}
                    onChange={e => set('guardian_mobile', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Guardian Relation</label>
                  <input type="text" className="input-field" value={form.guardian_relation}
                    onChange={e => set('guardian_relation', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">বর্তমান ঠিকানা</label>
                <textarea className="input-field resize-none" rows={2} value={form.present_address}
                  onChange={e => set('present_address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">স্থায়ী ঠিকানা</label>
                <textarea className="input-field resize-none" rows={2} value={form.permanent_address}
                  onChange={e => set('permanent_address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">শিক্ষাগত যোগ্যতা</label>
                <input type="text" className="input-field" value={form.education_level}
                  onChange={e => set('education_level', e.target.value)} placeholder="e.g. Honours" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">শিক্ষাগত বিস্তারিত</label>
                <textarea className="input-field resize-none" rows={2} value={form.education_details}
                  onChange={e => set('education_details', e.target.value)} />
              </div>
            </>
          )}

          {tab === 'documents' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">NID Number</label>
                <input type="text" className="input-field" value={form.nid_number}
                  onChange={e => set('nid_number', e.target.value)} />
              </div>

              <FileUploadBox label="ছবি (Photo)" currentUrl={employee.photo_url}
                onUpload={file => handleFileUpload('photo', file)} />

              <FileUploadBox label="NID Image" currentUrl={employee.nid_image_url}
                onUpload={file => handleFileUpload('nid', file)} />

              <FileUploadBox label="Signature" currentUrl={employee.signature_url}
                onUpload={file => handleFileUpload('signature', file)} />
            </>
          )}

          {tab === 'hr' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Employment Type</label>
                <select className="input-field" value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contractual">Contractual</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_remote} onChange={e => set('is_remote', e.target.checked)} />
                <label className="text-sm">Remote Employee</label>
              </div>
              {!form.is_remote && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Office Start</label>
                    <input type="time" className="input-field" value={form.office_start_time}
                      onChange={e => set('office_start_time', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Office End</label>
                    <input type="time" className="input-field" value={form.office_end_time}
                      onChange={e => set('office_end_time', e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Weekly Off Day</label>
                <select className="input-field" value={form.weekly_off_day} onChange={e => set('weekly_off_day', e.target.value)}>
                  <option value="">-- কোনো সাপ্তাহিক ছুটি নেই --</option>
                  <option value="saturday">শনিবার</option>
                  <option value="sunday">রবিবার</option>
                  <option value="monday">সোমবার</option>
                  <option value="tuesday">মঙ্গলবার</option>
                  <option value="wednesday">বুধবার</option>
                  <option value="thursday">বৃহস্পতিবার</option>
                  <option value="friday">শুক্রবার</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Basic Salary</label>
                <input type="number" className="input-field" value={form.basic_salary}
                  onChange={e => set('basic_salary', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="resigned">Resigned</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
  );
}