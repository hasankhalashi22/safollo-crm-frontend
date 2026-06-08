import { useState, useEffect } from 'react';
import { usersApi, authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { UserPlus, ToggleLeft, ToggleRight, Eye, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminStaff() {
const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [form, setForm] = useState({ phone: '', role_id: '', manager_id: '' });
  const [creating, setCreating] = useState(false);

  const fetchUsers = () => {
    usersApi.getAll().then(r => {
      const filtered = (r.data || []).filter(u => u.role !== 'super_admin');
      setUsers(filtered);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchUsers();
    usersApi.getRoles().then(r => setRoles(r.data || []));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.phone || form.phone.length !== 11) return toast.error('সঠিক ফোন নম্বর দিন');
    if (!form.role_id) return toast.error('Role বেছে নিন');
    setCreating(true);
    try {
      await usersApi.create({ ...form, role_id: parseInt(form.role_id) });
      toast.success('স্টাফ তৈরি হয়েছে ✅');
      setShowCreate(false);
      setForm({ phone: '', role_id: '', manager_id: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    try {
      await usersApi.toggleActive(id);
      toast.success('স্ট্যাটাস পরিবর্তন হয়েছে');
      fetchUsers();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`${name || 'এই স্টাফ'}-এর পাসওয়ার্ড রিসেট করবেন?`)) return;
    try {
      await authApi.resetPassword(id);
      toast.success('পাসওয়ার্ড রিসেট হয়েছে ✅');
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

const handleDeleteUser = async (u) => {
    if (!confirm(`"${u.full_name || u.phone}" কে permanently delete করবেন? এই কাজ ফেরানো যাবে না!`)) return;
    try {
      await usersApi.deleteUser(u.id);
      toast.success('স্টাফ delete হয়েছে');
      fetchUsers();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

const handleExport = () => {
    if (users.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['নাম', 'ফোন', 'পদ', 'ম্যানেজার', 'যোগদান', 'স্ট্যাটাস'];
    const rows = users.map(u => [
      u.full_name || '—',
      u.phone,
      u.role_label,
      u.manager_name || '—',
      u.joining_date ? format(new Date(u.joining_date), 'dd/MM/yyyy') : '—',
      u.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `স্টাফ_তালিকা_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download হয়েছে ✅');
  };

  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">স্টাফ ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 text-sm">মোট {users.length} জন</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
            ⬇️ Excel
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
            <UserPlus size={18} /> নতুন স্টাফ
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['নাম', 'ফোন', 'Role', 'ম্যানেজার', 'স্ট্যাটাস', 'অ্যাকশন'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.photo_url ? (
                      <img src={u.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-xs">{(u.full_name || u.phone)?.[0]}</span>
                      </div>
                    )}
                    <span className="font-medium">{u.full_name || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className="bg-primary-50 text-primary-600 text-xs px-2 py-0.5 rounded-full">{u.role_label}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.manager_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <button onClick={() => setViewProfile(u)} className="p-1.5 hover:bg-primary-50 rounded-lg" title="প্রোফাইল দেখুন">
                    <Eye size={18} className="text-primary-500" />
                  </button>
                  <button onClick={() => handleToggle(u.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    {u.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  <button onClick={() => handleResetPassword(u.id, u.full_name)} className="p-1.5 hover:bg-red-50 rounded-lg" title="পাসওয়ার্ড রিসেট">
                    🔑
                  </button>
                  {currentUser?.role === 'super_admin' && (
                    <button onClick={() => handleDeleteUser(u)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">নতুন স্টাফ যোগ করুন</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">ফোন নম্বর *</label>
                <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role *</label>
                <select className="input-field" value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}>
                  <option value="">-- Role বেছে নিন --</option>
                  {roles.filter(r => r.name !== 'super_admin').map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              {form.role_id && roles.find(r => r.id == form.role_id)?.level >= 4 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">ম্যানেজার</label>
                  <select className="input-field" value={form.manager_id} onChange={e => setForm(p => ({ ...p, manager_id: e.target.value }))}>
                    <option value="">-- ম্যানেজার বেছে নিন --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.phone}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'তৈরি হচ্ছে...' : '✅ স্টাফ তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {viewProfile && (
        <ProfileModal
          user={viewProfile}
          onClose={() => setViewProfile(null)}
        />
      )}
    </div>
  );
}

function ProfileModal({ user, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    usersApi.getById(user.id).then(r => {
      console.log('Profile data:', r);
      setProfile(r.data || r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  const handleDownloadCV = async () => {
    setGeneratingPdf(true);
    try {
      const cvWindow = window.open('', '_blank');
      const cvHtml = generateCVHtml(profile);
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

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><div className="spinner w-8 h-8" /></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary-500 text-white p-5 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile?.photo_url ? (
                <img src={profile.photo_url} className="w-16 h-16 rounded-full object-cover border-2 border-white" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center border-2 border-white">
                  <span className="text-2xl font-bold">{(profile?.full_name || profile?.phone)?.[0]}</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{profile?.full_name || '—'}</h2>
                <p className="text-primary-200">{profile?.role_label}</p>
                <p className="text-primary-200 text-sm">{profile?.phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownloadCV} disabled={generatingPdf}
                className="flex items-center gap-1.5 bg-white text-primary-600 px-3 py-1.5 rounded-xl text-sm font-medium active:scale-95">
                <Download size={16} /> CV Download
              </button>
              <button onClick={onClose} className="p-1.5 bg-primary-400 rounded-full">✕</button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <Section title="ব্যক্তিগত তথ্য">
            <Row label="পিতার নাম" value={profile?.father_name} />
            <Row label="মাতার নাম" value={profile?.mother_name} />
            <Row label="জন্ম তারিখ" value={profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'dd/MM/yyyy') : null} />
            <Row label="রক্তের গ্রুপ" value={profile?.blood_group} />
            <Row label="লিঙ্গ" value={profile?.gender === 'male' ? 'পুরুষ' : profile?.gender === 'female' ? 'মহিলা' : profile?.gender} />
          </Section>

          <Section title="যোগাযোগ">
            <Row label="মোবাইল" value={profile?.mobile_number} />
            <Row label="ইমেইল" value={profile?.email} />
            <Row label="অভিভাবকের মোবাইল" value={profile?.guardian_mobile} />
            <Row label="অভিভাবকের সম্পর্ক" value={profile?.guardian_relation} />
          </Section>

          <Section title="ঠিকানা">
            <Row label="বর্তমান ঠিকানা" value={profile?.present_address} />
            <Row label="স্থায়ী ঠিকানা" value={profile?.permanent_address} />
          </Section>

          <Section title="শিক্ষা ও পরিচয়">
            <Row label="শিক্ষার স্তর" value={profile?.education_level} />
            <Row label="বিস্তারিত" value={profile?.education_details} />
            <Row label="NID নম্বর" value={profile?.nid_number} />
            {profile?.nid_image_url && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">NID ছবি</span>
                <a href={profile.nid_image_url} target="_blank" rel="noreferrer" className="text-primary-500 text-sm underline">দেখুন</a>
              </div>
            )}
          </Section>

          <Section title="চাকরির তথ্য">
            <Row label="যোগদানের তারিখ" value={profile?.joining_date ? format(new Date(profile.joining_date), 'dd/MM/yyyy') : null} />
            <Row label="পদ" value={profile?.role_label} />
            <Row label="ম্যানেজার" value={profile?.manager_name} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-sm text-right max-w-xs">{value}</span>
    </div>
  );
}

function generateCVHtml(profile) {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>CV — ${profile?.full_name || ''}</title>
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
    ${profile?.photo_url
      ? `<img src="${profile.photo_url}" class="photo" alt="photo">`
      : `<div class="photo-placeholder">${(profile?.full_name || '?')[0]}</div>`
    }
    <div class="header-info">
      <h1>${profile?.full_name || '—'}</h1>
      <p>${profile?.role_label || ''}</p>
      <p>${profile?.phone || ''} ${profile?.email ? '• ' + profile.email : ''}</p>
      ${profile?.joining_date ? `<p>যোগদান: ${format(new Date(profile.joining_date), 'dd/MM/yyyy')}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">ব্যক্তিগত তথ্য</div>
    ${cvRow('পিতার নাম', profile?.father_name)}
    ${cvRow('মাতার নাম', profile?.mother_name)}
    ${cvRow('জন্ম তারিখ', profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'dd/MM/yyyy') : null)}
    ${cvRow('রক্তের গ্রুপ', profile?.blood_group)}
    ${cvRow('লিঙ্গ', profile?.gender === 'male' ? 'পুরুষ' : profile?.gender === 'female' ? 'মহিলা' : profile?.gender)}
  </div>

  <div class="section">
    <div class="section-title">যোগাযোগ</div>
    ${cvRow('মোবাইল', profile?.mobile_number)}
    ${cvRow('ইমেইল', profile?.email)}
    ${cvRow('অভিভাবকের মোবাইল', profile?.guardian_mobile)}
    ${cvRow('অভিভাবকের সম্পর্ক', profile?.guardian_relation)}
  </div>

  <div class="section">
    <div class="section-title">ঠিকানা</div>
    ${cvRow('বর্তমান ঠিকানা', profile?.present_address)}
    ${cvRow('স্থায়ী ঠিকানা', profile?.permanent_address)}
  </div>

  <div class="section">
    <div class="section-title">শিক্ষাগত যোগ্যতা</div>
    ${cvRow('শিক্ষার স্তর', profile?.education_level)}
    ${cvRow('বিস্তারিত', profile?.education_details)}
  </div>

  <div class="section">
    <div class="section-title">পরিচয়</div>
    ${cvRow('NID নম্বর', profile?.nid_number)}
  </div>

  <div class="section">
    <div class="section-title">চাকরির তথ্য</div>
    ${cvRow('পদ', profile?.role_label)}
    ${cvRow('যোগদানের তারিখ', profile?.joining_date ? format(new Date(profile.joining_date), 'dd/MM/yyyy') : null)}
    ${cvRow('ম্যানেজার', profile?.manager_name)}
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