import { useState, useEffect } from 'react';
import { profilesApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Camera, Save } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    profilesApi.getMe().then(r => {
      setProfile(r.data);
      setForm({
        full_name: r.data.full_name || '',
        father_name: r.data.father_name || '',
        mother_name: r.data.mother_name || '',
        date_of_birth: r.data.date_of_birth?.split('T')[0] || '',
        blood_group: r.data.blood_group || '',
        gender: r.data.gender || '',
        mobile_number: r.data.mobile_number || '',
        guardian_mobile: r.data.guardian_mobile || '',
        guardian_relation: r.data.guardian_relation || '',
        email: r.data.email || '',
        present_address: r.data.present_address || '',
        permanent_address: r.data.permanent_address || '',
        education_level: r.data.education_level || '',
        education_details: r.data.education_details || '',
        nid_number: r.data.nid_number || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profilesApi.updateMe(form);
      toast.success('প্রোফাইল সেভ হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await profilesApi.uploadPhoto(fd);
      setProfile(p => ({ ...p, photo_url: res.data.photo_url }));
      toast.success('ছবি আপলোড হয়েছে');
    } catch { toast.error('ছবি আপলোড হয়নি'); }
  };

  const handleNidUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('nid', file);
    try {
      await profilesApi.uploadNid(fd);
      toast.success('NID আপলোড হয়েছে');
    } catch { toast.error('NID আপলোড হয়নি'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-4 pb-8">
      <h2 className="text-xl font-display font-bold text-dark mb-4">আমার প্রোফাইল</h2>

      {/* Photo */}
      <div className="card flex items-center gap-4 mb-4">
        <div className="relative">
          {profile?.photo_url ? (
            <img src={profile.photo_url} className="w-16 h-16 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-500">{(user?.full_name || user?.phone)?.[0]}</span>
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 bg-primary-500 text-white rounded-full p-1 cursor-pointer">
            <Camera size={12} />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>
        <div>
          <p className="font-semibold">{form.full_name || 'নাম দিন'}</p>
          <p className="text-sm text-gray-400">{user?.role_label}</p>
          <p className="text-sm text-gray-400">{user?.phone}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Basic info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">ব্যক্তিগত তথ্য</h3>
          <Field label="পূর্ণ নাম *" value={form.full_name} onChange={v => set('full_name', v)} />
          <Field label="পিতার নাম" value={form.father_name} onChange={v => set('father_name', v)} />
          <Field label="মাতার নাম" value={form.mother_name} onChange={v => set('mother_name', v)} />
          <Field label="জন্ম তারিখ" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
          <div>
            <label className="block text-sm font-medium mb-1.5">রক্তের গ্রুপ</label>
            <select className="input-field" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
              <option value="">-- বেছে নিন --</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">লিঙ্গ</label>
            <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">-- বেছে নিন --</option>
              <option value="male">পুরুষ</option>
              <option value="female">মহিলা</option>
              <option value="other">অন্যান্য</option>
            </select>
          </div>
        </div>

        {/* Contact */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">যোগাযোগ</h3>
          <Field label="মোবাইল নম্বর" value={form.mobile_number} onChange={v => set('mobile_number', v)} type="tel" />
          <Field label="অভিভাবকের মোবাইল" value={form.guardian_mobile} onChange={v => set('guardian_mobile', v)} type="tel" />
          <Field label="অভিভাবকের সম্পর্ক" value={form.guardian_relation} onChange={v => set('guardian_relation', v)} placeholder="বাবা / মা / ভাই..." />
          <Field label="ইমেইল" value={form.email} onChange={v => set('email', v)} type="email" />
        </div>

        {/* Address */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">ঠিকানা</h3>
          <div>
            <label className="block text-sm font-medium mb-1.5">বর্তমান ঠিকানা</label>
            <textarea className="input-field resize-none" rows={2} value={form.present_address} onChange={e => set('present_address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">স্থায়ী ঠিকানা</label>
            <textarea className="input-field resize-none" rows={2} value={form.permanent_address} onChange={e => set('permanent_address', e.target.value)} />
          </div>
        </div>

        {/* Education */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">শিক্ষাগত যোগ্যতা</h3>
          <Field label="শিক্ষার স্তর" value={form.education_level} onChange={v => set('education_level', v)} placeholder="SSC / HSC / Honors..." />
          <div>
            <label className="block text-sm font-medium mb-1.5">বিস্তারিত</label>
            <textarea className="input-field resize-none" rows={2} value={form.education_details} onChange={e => set('education_details', e.target.value)} />
          </div>
        </div>

        {/* NID */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">জাতীয় পরিচয়পত্র</h3>
          <Field label="NID নম্বর" value={form.nid_number} onChange={v => set('nid_number', v)} />
          <div>
            <label className="block text-sm font-medium mb-1.5">NID ছবি আপলোড</label>
            {profile?.nid_image_url ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-sm">✅ আপলোড করা আছে</span>
                <a href={profile.nid_image_url} target="_blank" rel="noreferrer" className="text-primary-500 text-sm underline">দেখুন</a>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                <Camera size={20} className="text-gray-400" />
                <span className="text-sm text-gray-400">NID ছবি আপলোড করুন</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleNidUpload} />
              </label>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={saving}>
          <Save size={18} />
          {saving ? 'সেভ হচ্ছে...' : 'প্রোফাইল সেভ করুন'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} className="input-field" placeholder={placeholder || label} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
