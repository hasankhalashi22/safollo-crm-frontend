import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi, salesApi, fieldConfigsApi, usersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Camera, X } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'bkash',  label: 'বিকাশ' },
  { value: 'nagad',  label: 'নগদ' },
  { value: 'rocket', label: 'রকেট' },
  { value: 'cash',   label: 'ক্যাশ' },
  { value: 'cod',    label: 'COD' },
];

// For book COD entries — delivery charge collected now (no COD option here)
const DELIVERY_PAYMENT_METHODS = PAYMENT_METHODS.filter(m => m.value !== 'cod');

export default function NewSale() {
  const [courses, setCourses] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    student_phone: '',
    student_name: '',
    course_id: '',
    batch_id: '',
    course_price: '',
    collected_amount: '',
    payment_method: '',
    sender_number: '',
    transaction_id: '',
    due_date: '',
    reference: '',
    notes: '',
    payment_proof: null,
    override_executive_id: '',
    payment_type: 'full',     // 'full' or 'cod' — only relevant for books
    delivery_charge: '',      // only used when payment_type === 'cod'
  });

  useEffect(() => {
    coursesApi.getAll().then(r => setCourses(r.data || []));
    if (user?.role_level <= 3) {
      usersApi.getAll({ role: 'executive' }).then(r => setExecutives(r.data || []));
    }
  }, []);

  const selectedCourse = courses.find(c => c.id == form.course_id);
  const batches = selectedCourse?.batches || [];
  const isBook = !!selectedCourse?.is_book;
  const isCOD = isBook && form.payment_type === 'cod';
  const codBookPrice = Number(selectedCourse?.default_price || 0);

  // Sync course_price & collected_amount when in COD mode
  useEffect(() => {
    if (isCOD) {
      const delivery = Number(form.delivery_charge || 0);
      const total = delivery + codBookPrice;
      setForm(prev => ({ ...prev, course_price: total, collected_amount: delivery }));
    }
  }, [isCOD, form.delivery_charge, codBookPrice]);

  const dueAmount = form.course_price && form.collected_amount
    ? Math.max(0, Number(form.course_price) - Number(form.collected_amount)) : 0;

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id == courseId);
    set('course_id', courseId);
    set('batch_id', '');
    set('course_price', course?.default_price || '');
    set('collected_amount', '');
    set('payment_type', 'full');
    set('delivery_charge', '');
    set('payment_method', '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_phone || form.student_phone.length !== 11) return toast.error('সঠিক মোবাইল নম্বর দিন');
    if (!form.student_name) return toast.error('স্টুডেন্টের নাম দিন');
    if (!form.course_id) return toast.error('কোর্স বেছে নিন');
    if (batches.length > 0 && !form.batch_id) return toast.error('ব্যাচ বেছে নিন');

    if (isCOD) {
      if (!form.delivery_charge || Number(form.delivery_charge) <= 0) return toast.error('ডেলিভারি চার্জ দিন');
    } else {
      if (!form.course_price) return toast.error('কোর্স মূল্য দিন');
      if (!form.collected_amount || Number(form.collected_amount) <= 0) return toast.error('সংগৃহীত টাকার পরিমাণ দিন');
    }

    if (!form.payment_method) return toast.error('পেমেন্ট পদ্ধতি বেছে নিন');
    if (!form.sender_number || form.sender_number.length !== 11) return toast.error('যে নম্বর হতে পেমেন্ট এসেছে দিন');
    if (!form.payment_proof) return toast.error('পেমেন্ট প্রুফ আপলোড করুন');
    if (dueAmount > 0 && !form.due_date) return toast.error('বাকি দেওয়ার তারিখ দিন');

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== '' && key !== 'payment_proof' && key !== 'payment_type' && key !== 'delivery_charge') {
          formData.append(key, val);
        }
      });
      if (form.payment_proof) formData.append('payment_proof', form.payment_proof);
      await salesApi.create(formData);
      toast.success('সেল সফলভাবে যোগ হয়েছে! ✅');
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodOptions = isCOD ? DELIVERY_PAYMENT_METHODS : PAYMENT_METHODS;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8">
      <h2 className="text-xl font-display font-bold text-dark mb-4">নতুন সেল যোগ করুন</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">স্টুডেন্ট তথ্য</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">মোবাইল নম্বর *</label>
              <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
                value={form.student_phone}
                onChange={e => set('student_phone', e.target.value.replace(/\D/g, '').slice(0, 11))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">নাম *</label>
              <input type="text" className="input-field" placeholder="স্টুডেন্টের নাম"
                value={form.student_name} onChange={e => set('student_name', e.target.value)} />
            </div>
          </div>
          {user?.role_level <= 3 && executives.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">কোন Executive-এর নামে?</label>
              <select className="input-field" value={form.override_executive_id}
                onChange={e => set('override_executive_id', e.target.value)}>
                <option value="">নিজের নামে</option>
                {executives.map(e => <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Course */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">কোর্স তথ্য</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">কোর্স *</label>
              <select className="input-field" value={form.course_id} onChange={e => handleCourseChange(e.target.value)}>
                <option value="">-- কোর্স বেছে নিন --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_book ? ' 📕' : ''}</option>)}
              </select>
            </div>
            {batches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-dark mb-1">ব্যাচ *</label>
                <select className="input-field" value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
                  <option value="">-- ব্যাচ বেছে নিন --</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {/* Payment type selector — only for books */}
            {isBook && (
              <div>
                <label className="block text-sm font-medium text-dark mb-1">পেমেন্ট টাইপ *</label>
                <select className="input-field" value={form.payment_type}
                  onChange={e => set('payment_type', e.target.value)}>
                  <option value="full">ফুল পেমেন্ট</option>
                  <option value="cod">ক্যাশ অন ডেলিভারি</option>
                </select>
              </div>
            )}

            {!isCOD && (
              <div>
                <label className="block text-sm font-medium text-dark mb-1">কোর্স মূল্য (৳) *</label>
                <input type="number" className="input-field" value={form.course_price}
                  onChange={e => set('course_price', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* COD breakdown — only for book COD */}
        {isCOD && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">COD বিবরণ</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">ডেলিভারি চার্জ (৳) *</label>
                <input type="number" className="input-field" placeholder="যেমন: 140"
                  value={form.delivery_charge} onChange={e => set('delivery_charge', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">COD বই মূল্য (৳)</label>
                <input type="number" className="input-field bg-gray-50" value={codBookPrice} readOnly />
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-blue-600">মোট মূল্য (বই + ডেলিভারি)</span>
              <span className="font-bold text-blue-600">৳{Number(form.course_price || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            {isCOD ? 'ডেলিভারি চার্জ পেমেন্ট তথ্য' : 'পেমেন্ট তথ্য'}
          </h3>

          {!isCOD && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">সংগৃহীত টাকা (৳) *</label>
                <input type="number" className="input-field" placeholder="0"
                  value={form.collected_amount} onChange={e => set('collected_amount', e.target.value)} />
              </div>
            </div>
          )}

          {dueAmount > 0 && (
            <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-red-600">{isCOD ? 'COD বই মূল্য (বাকি)' : 'বাকি থাকবে'}</span>
              <span className="font-bold text-red-600">৳{dueAmount.toLocaleString()}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark mb-2">পেমেন্ট পদ্ধতি *</label>
            <div className="flex flex-wrap gap-2">
              {paymentMethodOptions.map(m => (
                <button key={m.value} type="button" onClick={() => set('payment_method', m.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                    ${form.payment_method === m.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">যে নম্বর হতে পেমেন্ট এসেছে *</label>
              <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
                value={form.sender_number}
                onChange={e => set('sender_number', e.target.value.replace(/\D/g, '').slice(0, 11))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">ট্রানজেকশন আইডি</label>
              <input type="text" className="input-field" placeholder="TXN ID"
                value={form.transaction_id} onChange={e => set('transaction_id', e.target.value)} />
            </div>
            {dueAmount > 0 && (
              <div>
                <label className="block text-sm font-medium text-dark mb-1">বাকি দেওয়ার তারিখ *</label>
                <input type="date" className="input-field" value={form.due_date}
                  onChange={e => set('due_date', e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark mb-1">রেফারেন্স</label>
              <input type="text" className="input-field" placeholder="রেফারেন্স"
                value={form.reference} onChange={e => set('reference', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1">পেমেন্ট প্রুফ</label>
            {proofPreview ? (
              <div className="relative inline-block">
                <img src={proofPreview} alt="proof" className="h-24 w-40 object-cover rounded-xl" />
                <button type="button" onClick={() => { setProofPreview(null); set('payment_proof', null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer max-w-xs">
                <Camera size={18} className="text-gray-400" />
                <span className="text-sm text-gray-400">ছবি আপলোড করুন</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0];
                  if (file) { set('payment_proof', file); setProofPreview(URL.createObjectURL(file)); }
                }} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1">নোট</label>
            <textarea className="input-field resize-none" rows={2} placeholder="বিশেষ মন্তব্য"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn-primary max-w-xs" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner w-5 h-5" /> সেভ হচ্ছে...
            </span>
          ) : '✅ সেল সেভ করুন'}
        </button>
      </form>
    </div>
  );
}