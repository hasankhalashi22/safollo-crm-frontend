import { useState, useEffect } from 'react';
import { profilesApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function CompleteProfile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [nidFile, setNidFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    mother_name: '',
    date_of_birth: '',
    blood_group: '',
    gender: '',
    mobile_number: '',
    guardian_mobile: '',
    guardian_relation: '',
    present_address: '',
    permanent_address: '',
    education_level: '',
    nid_number: '',
    joining_date: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all mandatory fields
    const mandatory = [
      { key: 'full_name', label: 'পূর্ণ নাম' },
      { key: 'father_name', label: 'পিতার নাম' },
      { key: 'mother_name', label: 'মাতার নাম' },
      { key: 'date_of_birth', label: 'জন্ম তারিখ' },
      { key: 'blood_group', label: 'রক্তের গ্রুপ' },
      { key: 'gender', label: 'লিঙ্গ' },
      { key: 'mobile_number', label: 'মোবাইল নম্বর' },
      { key: 'guardian_mobile', label: 'অভিভাবকের মোবাইল' },
      { key: 'guardian_relation', label: 'অভিভাবকের সম্পর্ক' },
      { key: 'present_address', label: 'বর্তমান ঠিকানা' },
      { key: 'permanent_address', label: 'স্থায়ী ঠিকানা' },
      { key: 'education_level', label: 'শিক্ষাগত যোগ্যতা' },
      { key: 'nid_number', label: 'NID নম্বর' },
      { key: 'joining_date', label: 'যোগদানের তারিখ' },
    ];

    for (const field of mandatory) {
      if (!form[field.key]) {
        toast.error(`${field.label} দিন`);
        return;
      }
    }

    if (!nidFile) {
      toast.error('NID ছবি আপলোড করুন');
      return;
    }

    if (!photoFile) {
      toast.error('প্রোফাইল ছবি আপলোড করুন');
      return;
    }

    setSaving(true);
    try {
      // Save profile data
      await profilesApi.updateMe(form);

      // Upload photo
      const photoFd = new FormData();
      photoFd.append('photo', photoFile);
      await profilesApi.uploadPhoto(photoFd);

      // Upload NID
      const nidFd = new FormData();
      nidFd.append('nid', nidFile);
      await profilesApi.uploadNid(nidFd);

      toast.success('প্রোফাইল সম্পন্ন হয়েছে ✅');

      // Update user in localStorage
      const updatedUser = { ...user, is_profile_complete: true, full_name: form.full_name };
      localStorage.setItem('crm_user', JSON.stringify(updatedUser));
      login(localStorage.getItem('crm_token'), updatedUser);

      // Redirect by role
      if (user.role === 'manager') navigate('/manager');
      else navigate('/executive');

    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-display font-bold text-dark">প্রোফাইল সম্পন্ন করুন</h1>
          <p className="text-gray-500 text-sm mt-1">কাজ শুরু করার আগে আপনার তথ্য পূরণ করুন</p>
          <button onClick={async () => { await logout(); navigate('/login'); toast.success('লগআউট হয়েছে'); }}
            className="mt-3 text-sm text-red-500 underline">
            লগআউট করুন
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="card flex items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} className="w-16 h-16 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <Camera size={24} className="text-primary-400" />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 bg-primary-500 text-white rounded-full p-1 cursor-pointer">
                <Camera size={12} />
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0];
                  if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
                }} />
              </label>
            </div>
            <div>
              <p className="font-medium text-sm">প্রোফাইল ছবি *</p>
              <p className="text-xs text-gray-400">আপনার ছবি আপলোড করুন</p>
            </div>
          </div>

          {/* Basic info */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">ব্যক্তিগত তথ্য</h3>
            <Field label="পূর্ণ নাম *" value={form.full_name} onChange={v => set('full_name', v)} />
            <Field label="পিতার নাম *" value={form.father_name} onChange={v => set('father_name', v)} />
            <Field label="মাতার নাম *" value={form.mother_name} onChange={v => set('mother_name', v)} />
            <Field label="জন্ম তারিখ *" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
            <div>
              <label className="block text-sm font-medium mb-1.5">রক্তের গ্রুপ *</label>
              <select className="input-field" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                <option value="">-- বেছে নিন --</option>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">লিঙ্গ *</label>
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
            <Field label="মোবাইল নম্বর *" type="tel" value={form.mobile_number} onChange={v => set('mobile_number', v)} />
            <Field label="অভিভাবকের মোবাইল *" type="tel" value={form.guardian_mobile} onChange={v => set('guardian_mobile', v)} />
            <Field label="অভিভাবকের সম্পর্ক *" value={form.guardian_relation} onChange={v => set('guardian_relation', v)} placeholder="বাবা / মা / ভাই..." />
          </div>

          {/* Address */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">ঠিকানা</h3>
            <div>
              <label className="block text-sm font-medium mb-1.5">বর্তমান ঠিকানা *</label>
              <textarea className="input-field resize-none" rows={2} value={form.present_address} onChange={e => set('present_address', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">স্থায়ী ঠিকানা *</label>
              <textarea className="input-field resize-none" rows={2} value={form.permanent_address} onChange={e => set('permanent_address', e.target.value)} />
            </div>
          </div>

          {/* Education */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">শিক্ষাগত যোগ্যতা</h3>
            <Field label="শিক্ষার স্তর *" value={form.education_level} onChange={v => set('education_level', v)} placeholder="SSC / HSC / Honors..." />
          </div>

          {/* NID */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">জাতীয় পরিচয়পত্র</h3>
            <Field label="NID নম্বর *" value={form.nid_number} onChange={v => set('nid_number', v)} />
            <div>
              <label className="block text-sm font-medium mb-1.5">NID ছবি *</label>
              {nidFile ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm text-green-600">{nidFile.name}</span>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">NID ছবি আপলোড করুন *</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setNidFile(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

{/* Joining date */}
<div className="card space-y-3">
  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">চাকরির তথ্য</h3>
  <Field label="যোগদানের তারিখ *" type="date" value={form.joining_date} onChange={v => set('joining_date', v)} />
</div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5" /> সেভ হচ্ছে...
              </span>
            ) : '✅ প্রোফাইল সম্পন্ন করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} className="input-field" placeholder={placeholder || label.replace(' *', '')}
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}