import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 11) return toast.error('সঠিক মোবাইল নম্বর দিন');
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP পাঠানো হয়েছে');
      setStep('otp');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('৬ সংখ্যার OTP দিন');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      login(res.token, res.user);
      toast.success(`স্বাগতম, ${res.user.full_name || res.user.phone}!`);
      // Role-based redirect
      if (res.user.role_level <= 2) navigate('/admin');
      else if (res.user.role === 'manager') navigate('/manager');
      else navigate('/executive');
    } catch (err) {
      toast.error(err.message || 'OTP ভুল');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <span className="text-2xl font-display text-primary-600 font-bold">স</span>
          </div>
          <h1 className="text-2xl font-display text-white font-bold">সাফল্য একাডেমি</h1>
          <p className="text-primary-200 text-sm mt-1">CRM Management System</p>
        </div>

        {/* Card */}
        <div className="card">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">লগইন করুন</h2>
                <p className="text-gray-500 text-sm">আপনার মোবাইল নম্বরে OTP পাঠানো হবে</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-5 h-5" /> পাঠানো হচ্ছে...
                  </span>
                ) : 'OTP পাঠান'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">OTP যাচাই</h2>
                <p className="text-gray-500 text-sm">{phone} নম্বরে পাঠানো ৬ সংখ্যার কোড দিন</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">OTP কোড</label>
                <input
                  type="number"
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-5 h-5" /> যাচাই হচ্ছে...
                  </span>
                ) : 'লগইন করুন'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                className="w-full text-center text-sm text-primary-500 py-2"
              >
                নম্বর পরিবর্তন করুন
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          সাফল্য একাডেমি © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
