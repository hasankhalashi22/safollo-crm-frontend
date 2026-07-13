import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { teacherApi } from '../../api/teacherApi';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await teacherApi.login({ phone, password });
      const { token, teacher } = r.data.data;
      localStorage.setItem('teacher_token', token);
      localStorage.setItem('teacher_info', JSON.stringify(teacher));
      toast.success(`স্বাগতম, ${teacher.full_name}!`);
      if (!teacher.is_profile_complete) {
        navigate('/teacher/profile/complete');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-14 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">শিক্ষক পোর্টাল</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ফোন নম্বর / টিচার আইডি</label>
              <input
                className="input-field"
                type="text"
                placeholder="01XXXXXXXXX অথবা TCH-0001"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="পাসওয়ার্ড লিখুন"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            নতুন শিক্ষক?{' '}
            <Link to="/teacher/register" className="text-primary-600 font-medium hover:underline">রেজিস্ট্রেশন করুন</Link>
          </p>
          <p className="text-center text-xs text-gray-400">
            পিন ভুলে গেলে Admin এর সাথে যোগাযোগ করুন
          </p>
        </div>
      </div>
    </div>
  );
}
