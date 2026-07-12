import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherApi } from '../../api/teacherApi';
import toast from 'react-hot-toast';
import { Camera, Plus, X, Check } from 'lucide-react';

const DEGREES = ['এসএসসি', 'এইচএসসি', 'স্নাতক', 'স্নাতকোত্তর', 'এমফিল', 'পিএইচডি', 'অন্যান্য'];

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h2 className="font-semibold text-gray-800 text-base flex items-center gap-2">
        <span className="w-1 h-5 bg-primary-500 rounded-full inline-block"></span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function CourseInterestRow({ courses, row, onChange, onRemove }) {
  const course = courses.find(c => c.id === row.course_id);
  const subjects = course?.subjects || [];

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <select
          className="input-field flex-1 mr-3"
          value={row.course_id}
          onChange={e => onChange({ ...row, course_id: e.target.value, subjects: [] })}
        >
          <option value="">— কোর্স সিলেক্ট করুন —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
        </select>
        <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-600">
          <X size={16} />
        </button>
      </div>
      {row.course_id && subjects.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {subjects.map(s => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={row.subjects.includes(s.subject_name)}
                onChange={e => {
                  const updated = e.target.checked
                    ? [...row.subjects, s.subject_name]
                    : row.subjects.filter(x => x !== s.subject_name);
                  onChange({ ...row, subjects: updated });
                }}
                className="w-4 h-4 rounded accent-primary-500"
              />
              {s.subject_name}
            </label>
          ))}
        </div>
      )}
      {row.course_id && subjects.length === 0 && (
        <p className="text-xs text-gray-400">এই কোর্সে কোনো সাবজেক্ট যোগ করা নেই</p>
      )}
    </div>
  );
}

export default function TeacherProfileComplete() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);

  const [photo, setPhoto] = useState('');
  const [form, setForm] = useState({
    last_degree: '', degree_subject: '', degree_institution: '',
    permanent_address: '', backup_phone: '', backup_whatsapp: false,
    experience: '',
    bank_account_no: '', bank_account_name: '', bank_branch: '',
    bkash_phone: '', nagad_phone: '',
  });
  const [interests, setInterests] = useState([{ course_id: '', subjects: [] }]);

  useEffect(() => {
    const token = localStorage.getItem('teacher_token');
    if (!token) { navigate('/teacher/login'); return; }
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const r = await teacherApi.getCourses();
      const list = r.data?.data || [];
      const withSubjects = await Promise.all(
        list.map(async c => {
          try {
            const pr = await teacherApi.getCoursePlans(c.id);
            const plans = pr.data?.data || [];
            const subjects = plans.flatMap(p => p.subjects || []);
            return { ...c, subjects };
          } catch { return { ...c, subjects: [] }; }
        })
      );
      setCourses(withSubjects);
    } catch { toast.error('কোর্স লোড করতে সমস্যা'); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('ছবির সাইজ ২MB-এর বেশি হবে না');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const addCourse = () => setInterests(i => [...i, { course_id: '', subjects: [] }]);
  const removeCourse = (idx) => setInterests(i => i.filter((_, j) => j !== idx));
  const updateCourse = (idx, val) => setInterests(i => i.map((r, j) => j === idx ? val : r));

  const submit = async () => {
    if (!form.last_degree) return toast.error('শিক্ষাগত যোগ্যতা দিন');
    if (!form.permanent_address) return toast.error('স্থায়ী ঠিকানা দিন');
    setLoading(true);
    try {
      await teacherApi.updateProfile({
        ...form,
        profile_photo: photo || null,
        teaching_interests: interests.filter(r => r.course_id),
      });
      // update local storage
      const info = JSON.parse(localStorage.getItem('teacher_info') || '{}');
      localStorage.setItem('teacher_info', JSON.stringify({ ...info, is_profile_complete: true }));
      toast.success('প্রোফাইল সম্পন্ন হয়েছে!');
      navigate('/teacher/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে');
    }
    setLoading(false);
  };

  const teacher = JSON.parse(localStorage.getItem('teacher_info') || '{}');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white px-5 py-4">
        <p className="text-primary-200 text-xs">সাফল্য একাডেমি</p>
        <h1 className="font-bold text-lg">প্রোফাইল সম্পন্ন করুন</h1>
        <p className="text-primary-200 text-xs mt-0.5">Dashboard-এ প্রবেশের আগে প্রোফাইল পূরণ করা আবশ্যক</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">

        {/* ছবি */}
        <Section title="প্রোফাইল ছবি">
          <div className="flex items-center gap-5">
            <div
              className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative hover:border-primary-400 transition-colors"
              onClick={() => fileRef.current.click()}
            >
              {photo ? (
                <img src={photo} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <Camera size={24} className="mx-auto mb-1" />
                  <p className="text-xs">ছবি দিন</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">{teacher.full_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{teacher.teacher_code}</p>
              <button
                onClick={() => fileRef.current.click()}
                className="mt-2 text-xs text-primary-600 hover:underline"
              >
                ছবি আপলোড করুন (সর্বোচ্চ ২MB)
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
        </Section>

        {/* শিক্ষাগত যোগ্যতা */}
        <Section title="শিক্ষাগত যোগ্যতা">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">সর্বশেষ ডিগ্রি <span className="text-red-500">*</span></label>
              <select className="input-field" value={form.last_degree} onChange={e => set('last_degree', e.target.value)}>
                <option value="">— সিলেক্ট করুন —</option>
                {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">বিষয়</label>
              <input className="input-field" placeholder="যেমন: বাংলা, পদার্থবিজ্ঞান" value={form.degree_subject} onChange={e => set('degree_subject', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">শিক্ষা প্রতিষ্ঠান</label>
              <input className="input-field" placeholder="বিশ্ববিদ্যালয় বা কলেজের নাম" value={form.degree_institution} onChange={e => set('degree_institution', e.target.value)} />
            </div>
          </div>
        </Section>

        {/* ঠিকানা ও যোগাযোগ */}
        <Section title="ঠিকানা ও যোগাযোগ">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">স্থায়ী ঠিকানা <span className="text-red-500">*</span></label>
            <textarea className="input-field" rows={2} placeholder="গ্রাম/মহল্লা, উপজেলা, জেলা" value={form.permanent_address} onChange={e => set('permanent_address', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">ব্যাকআপ মোবাইল নম্বর</label>
            <input className="input-field" type="tel" placeholder="01XXXXXXXXX" value={form.backup_phone} onChange={e => set('backup_phone', e.target.value)} />
            {form.backup_phone && (
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.backup_whatsapp}
                  onChange={e => set('backup_whatsapp', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <span className="text-sm text-gray-600">এই নম্বরে WhatsApp আছে</span>
              </label>
            )}
          </div>
        </Section>

        {/* ক্লাস আগ্রহ */}
        <Section title="কোন বিষয়ে ক্লাস নিতে আগ্রহী">
          <div className="space-y-3">
            {interests.map((row, idx) => (
              <CourseInterestRow
                key={idx}
                courses={courses}
                row={row}
                onChange={val => updateCourse(idx, val)}
                onRemove={() => removeCourse(idx)}
              />
            ))}
            <button
              onClick={addCourse}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-2 border-2 border-dashed border-primary-200 hover:border-primary-400 rounded-xl w-full justify-center transition-colors"
            >
              <Plus size={15} /> আরেকটি কোর্স যোগ করুন
            </button>
          </div>
        </Section>

        {/* পূর্বের অভিজ্ঞতা */}
        <Section title="পূর্বের অভিজ্ঞতা (ঐচ্ছিক)">
          <textarea
            className="input-field"
            rows={3}
            placeholder="পূর্বে কোথায় কী পড়িয়েছেন, কতদিন — সংক্ষেপে লিখুন"
            value={form.experience}
            onChange={e => set('experience', e.target.value)}
          />
        </Section>

        {/* পেমেন্ট তথ্য */}
        <Section title="পেমেন্ট তথ্য">
          <div className="space-y-3">
            <p className="text-xs text-gray-400 -mt-2">পেমেন্ট পাওয়ার জন্য অন্তত একটি মাধ্যম পূরণ করুন</p>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-blue-700">ব্যাংক একাউন্ট</p>
              <div className="flex flex-col gap-1.5">
                <input className="input-field" placeholder="একাউন্ট নম্বর" value={form.bank_account_no} onChange={e => set('bank_account_no', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input className="input-field" placeholder="একাউন্টধারীর নাম" value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input className="input-field" placeholder="ব্যাংক ও শাখার নাম" value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-pink-50 border border-pink-100 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-pink-700">বিকাশ</p>
                <input className="input-field text-sm" placeholder="01XXXXXXXXX" value={form.bkash_phone} onChange={e => set('bkash_phone', e.target.value)} />
              </div>
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-orange-700">নগদ</p>
                <input className="input-field text-sm" placeholder="01XXXXXXXXX" value={form.nagad_phone} onChange={e => set('nagad_phone', e.target.value)} />
              </div>
            </div>
          </div>
        </Section>

      </div>

      {/* Fixed bottom save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={submit}
          disabled={loading}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {loading ? 'সংরক্ষণ হচ্ছে...' : <><Check size={18} /> প্রোফাইল সংরক্ষণ করুন</>}
        </button>
      </div>
    </div>
  );
}
