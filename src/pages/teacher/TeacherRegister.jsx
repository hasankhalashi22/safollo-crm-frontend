import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { teacherApi } from '../../api/teacherApi';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const CAT_LABEL = { cadre: 'ক্যাডার', non_cadre: 'নন-ক্যাডার', others: 'অন্যান্য' };

export default function TeacherRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '',
    teacher_category: 'non_cadre',
    cadre_name: '', current_posting: '',
    address: '',
    password: '', confirm: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('পিন মিলছে না');
    if (form.password.length < 4) return toast.error('পিন কমপক্ষে ৪ সংখ্যার হতে হবে');
    setLoading(true);
    try {
      await teacherApi.register({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        teacher_category: form.teacher_category,
        cadre_name: form.teacher_category === 'cadre' ? form.cadre_name : null,
        current_posting: form.teacher_category !== 'cadre' ? form.current_posting : null,
        address: form.address,
        password: form.password,
      });
      toast.success('রেজিস্ট্রেশন সম্পন্ন! Admin অনুমোদনের পর লগইন করতে পারবেন।');
      navigate('/teacher/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">স</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">সাফল্য একাডেমি</h1>
          <p className="text-gray-500 text-sm mt-1">শিক্ষক রেজিস্ট্রেশন</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <form onSubmit={submit} className="space-y-4">

            {/* নাম */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পুরো নাম <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="আপনার পুরো নাম" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>

            {/* ফোন */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">মোবাইল নম্বর <span className="text-red-500">*</span></label>
              <input className="input-field" type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>

            {/* ইমেইল */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ইমেইল</label>
              <input className="input-field" type="email" placeholder="example@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>

            {/* টিচার টাইপ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">টিচার টাইপ <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {Object.entries(CAT_LABEL).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('teacher_category', k)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.teacher_category === k
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional field */}
            {form.teacher_category === 'cadre' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">কোন ক্যাডারে? <span className="text-red-500">*</span></label>
                <input className="input-field" placeholder="যেমন: প্রশাসন, পুলিশ, শিক্ষা" value={form.cadre_name} onChange={e => set('cadre_name', e.target.value)} required />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">বর্তমান পোস্টিং</label>
                <input className="input-field" placeholder="বর্তমান কর্মস্থল বা পদবি" value={form.current_posting} onChange={e => set('current_posting', e.target.value)} />
              </div>
            )}

            {/* ঠিকানা */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">বর্তমান ঠিকানা</label>
              <input className="input-field" placeholder="বর্তমান ঠিকানা লিখুন" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            {/* পিন */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পিন সেট করুন <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৪ সংখ্যা"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পিন নিশ্চিত করুন <span className="text-red-500">*</span></label>
              <input className="input-field" type="password" placeholder="পিন আবার লিখুন" value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              রেজিস্ট্রেশনের পর Admin অনুমোদন দিলে লগইন করতে পারবেন।
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন করুন'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            ইতোমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link to="/teacher/login" className="text-primary-600 font-medium hover:underline">লগইন করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
