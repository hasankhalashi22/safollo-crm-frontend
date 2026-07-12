import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { teacherApi } from '../../api/teacherApi';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function TeacherRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', specialization: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('পাসওয়ার্ড মিলছে না');
    setLoading(true);
    try {
      await teacherApi.register({ full_name: form.full_name, phone: form.phone, email: form.email, specialization: form.specialization, password: form.password });
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">স</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">সাফল্য একাডেমি</h1>
          <p className="text-gray-500 text-sm mt-1">শিক্ষক রেজিস্ট্রেশন</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পুরো নাম <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="আপনার পুরো নাম" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ফোন নম্বর <span className="text-red-500">*</span></label>
              <input className="input-field" type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ইমেইল</label>
              <input className="input-field" type="email" placeholder="example@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">বিষয়/বিশেষত্ব</label>
              <input className="input-field" placeholder="যেমন: বাংলা, গণিত, ইংরেজি" value={form.specialization} onChange={e => set('specialization', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পাসওয়ার্ড <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৬ অক্ষর"
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
              <label className="text-sm font-medium text-gray-600">পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span></label>
              <input className="input-field" type="password" placeholder="পাসওয়ার্ড আবার লিখুন" value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              রেজিস্ট্রেশনের পর Admin অনুমোদন দিলে আপনি লগইন করতে পারবেন।
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
