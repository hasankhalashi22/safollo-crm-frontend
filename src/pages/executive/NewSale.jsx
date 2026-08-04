import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi, salesApi, usersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'bkash',  label: 'বিকাশ' },
  { value: 'nagad',  label: 'নগদ' },
  { value: 'rocket', label: 'রকেট' },
  { value: 'cash',   label: 'ক্যাশ' },
  { value: 'cod',    label: 'COD' },
];
const DELIVERY_PAYMENT_METHODS = PAYMENT_METHODS.filter(m => m.value !== 'cod');

// Material Symbol helper
function Icon({ name, fill = false, className = '', size = 22 }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        lineHeight: 1,
      }}
    >
      {name}
    </span>
  );
}

// Input with left icon
function Field({ label, required, icon, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <Icon name={icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        )}
        {children}
      </div>
    </div>
  );
}

const inputCls = (hasIcon = true) =>
  `w-full ${hasIcon ? 'pl-10' : 'pl-3'} pr-3 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm
   focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all`;

// Section card with left accent bar
function Section({ icon, title, children }) {
  return (
    <section className="relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 rounded-l-2xl" />
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
        <Icon name={icon} fill className="text-blue-500" size={22} />
        {title}
      </h2>
      {children}
    </section>
  );
}

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
    payment_type: 'full',
    delivery_charge: '',
    cod_book_price: '',
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

  useEffect(() => {
    if (isCOD) {
      const delivery = Number(form.delivery_charge || 0);
      const bookPrice = Number(form.cod_book_price || 0);
      setForm(prev => ({ ...prev, course_price: delivery + bookPrice, collected_amount: delivery }));
    }
  }, [isCOD, form.delivery_charge, form.cod_book_price]);

  const dueAmount = form.course_price && form.collected_amount
    ? Math.max(0, Number(form.course_price) - Number(form.collected_amount)) : 0;

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id == courseId);
    setForm(prev => ({
      ...prev,
      course_id: courseId,
      batch_id: '',
      course_price: course?.default_price || '',
      collected_amount: '',
      payment_type: 'full',
      delivery_charge: '',
      cod_book_price: course?.default_price || '',
      payment_method: '',
    }));
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
    if (dueAmount > 0 && !isCOD && !form.due_date) return toast.error('বাকি দেওয়ার তারিখ দিন');

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== '' && key !== 'payment_proof' && key !== 'payment_type' && key !== 'delivery_charge' && key !== 'cod_book_price') {
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
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 active:scale-95 transition-all"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">নতুন সেল এন্ট্রি</h1>
          <p className="text-xs text-gray-400">নতুন স্টুডেন্টের ভর্তি ও পেমেন্ট লিপিবদ্ধ করুন</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pt-4">

        {/* ১. স্টুডেন্ট তথ্য */}
        <Section icon="person" title="স্টুডেন্ট তথ্য">
          <Field label="মোবাইল নম্বর" required icon="call">
            <input
              type="tel" className={inputCls()} placeholder="01XXXXXXXXX"
              value={form.student_phone}
              onChange={e => set('student_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </Field>
          <Field label="স্টুডেন্টের নাম" required icon="badge">
            <input
              type="text" className={inputCls()} placeholder="পূর্ণ নাম লিখুন"
              value={form.student_name}
              onChange={e => set('student_name', e.target.value)}
            />
          </Field>
          {user?.role_level <= 3 && executives.length > 0 && (
            <Field label="কোন Executive-এর নামে?" icon="manage_accounts">
              <select className={inputCls()} value={form.override_executive_id}
                onChange={e => set('override_executive_id', e.target.value)}>
                <option value="">নিজের নামে</option>
                {executives.map(ex => <option key={ex.id} value={ex.id}>{ex.full_name || ex.phone}</option>)}
              </select>
              <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </Field>
          )}
        </Section>

        {/* ২. কোর্স তথ্য */}
        <Section icon="school" title="কোর্স তথ্য">
          <Field label="কোর্স" required icon="book">
            <select className={inputCls()} value={form.course_id} onChange={e => handleCourseChange(e.target.value)}>
              <option value="">-- কোর্স বেছে নিন --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_book ? ' 📕' : ''}</option>)}
            </select>
            <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </Field>

          {batches.length > 0 && (
            <Field label="ব্যাচ" required icon="groups">
              <select className={inputCls()} value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
                <option value="">-- ব্যাচ বেছে নিন --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </Field>
          )}

          {isBook && (
            <Field label="পেমেন্ট টাইপ" required icon="payments">
              <select className={inputCls()} value={form.payment_type} onChange={e => set('payment_type', e.target.value)}>
                <option value="full">ফুল পেমেন্ট</option>
                <option value="cod">ক্যাশ অন ডেলিভারি (COD)</option>
              </select>
              <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </Field>
          )}

          {!isCOD && (
            <Field label="কোর্স মূল্য (৳)" required icon="attach_money">
              <input type="number" className={inputCls()} placeholder="০.০০"
                value={form.course_price} onChange={e => set('course_price', e.target.value)} />
            </Field>
          )}
        </Section>

        {/* COD বিবরণ */}
        {isCOD && (
          <Section icon="local_shipping" title="COD বিবরণ">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ডেলিভারি চার্জ (৳)" required icon="attach_money">
                <input type="number" className={inputCls()} placeholder="যেমন: ১৪০"
                  value={form.delivery_charge} onChange={e => set('delivery_charge', e.target.value)} />
              </Field>
              <Field label="COD বই মূল্য (৳)" icon="menu_book">
                <input type="number" className={inputCls()}
                  value={form.cod_book_price} onChange={e => set('cod_book_price', e.target.value)} />
              </Field>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-blue-600 font-medium">মোট মূল্য (বই + ডেলিভারি)</span>
              <span className="font-bold text-blue-600">৳{Number(form.course_price || 0).toLocaleString()}</span>
            </div>
          </Section>
        )}

        {/* ৩. পেমেন্ট তথ্য */}
        <Section icon="payments" title={isCOD ? 'ডেলিভারি চার্জ পেমেন্ট তথ্য' : 'পেমেন্ট তথ্য'}>

          {!isCOD && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="সংগৃহীত টাকা (৳)" required icon="account_balance_wallet">
                <input type="number" className={inputCls()} placeholder="০"
                  value={form.collected_amount} onChange={e => set('collected_amount', e.target.value)} />
              </Field>
              {form.course_price && (
                <div className={`flex flex-col justify-center rounded-xl p-3 ${dueAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${dueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {dueAmount > 0 ? 'বাকি থাকবে' : 'সম্পূর্ণ পরিশোধ'}
                  </span>
                  <span className={`text-lg font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{dueAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* পেমেন্ট পদ্ধতি */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              পেমেন্ট পদ্ধতি <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethodOptions.map(m => (
                <button
                  key={m.value} type="button"
                  onClick={() => set('payment_method', m.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95
                    ${form.payment_method === m.value
                      ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="যে নম্বর হতে পেমেন্ট এসেছে" required icon="phone_iphone">
            <input type="tel" className={inputCls()} placeholder="01XXXXXXXXX"
              value={form.sender_number}
              onChange={e => set('sender_number', e.target.value.replace(/\D/g, '').slice(0, 11))} />
          </Field>

          <Field label="ট্রানজেকশন আইডি" icon="receipt_long">
            <input type="text" className={inputCls()} placeholder="TXN ID"
              value={form.transaction_id} onChange={e => set('transaction_id', e.target.value)} />
          </Field>

          {dueAmount > 0 && !isCOD && (
            <Field label="বাকি দেওয়ার তারিখ" required icon="event">
              <input type="date" className={inputCls()}
                value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </Field>
          )}

          {/* পেমেন্ট প্রুফ */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              পেমেন্ট প্রুফ <span className="text-red-500">*</span>
            </span>
            {proofPreview ? (
              <div className="relative inline-block">
                <img src={proofPreview} alt="proof" className="h-32 w-full object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => { setProofPreview(null); set('payment_proof', null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ) : (
              <label
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                onClick={() => document.getElementById('proofUpload').click()}
              >
                <Icon name="cloud_upload" className="text-gray-400" size={32} />
                <span className="text-sm font-medium text-gray-500">ছবি বা ফাইল আপলোড করুন</span>
                <span className="text-xs text-gray-400">JPG, PNG (সর্বোচ্চ ৫ MB)</span>
                <input
                  id="proofUpload" type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) { set('payment_proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }}
                />
              </label>
            )}
          </div>
        </Section>

        {/* ৪. রেফারেন্স ও নোট */}
        <Section icon="note_alt" title="রেফারেন্স ও নোট">
          <Field label="রেফারেন্স (যিনি পাঠিয়েছেন)" icon="share">
            <input type="text" className={inputCls()} placeholder="রেফারেন্সের নাম (ঐচ্ছিক)"
              value={form.reference} onChange={e => set('reference', e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">অভ্যন্তরীণ নোট</span>
            <textarea
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
              rows={3} placeholder="বিশেষ মন্তব্য বা নির্দেশনা লিখুন..."
              value={form.notes} onChange={e => set('notes', e.target.value)}
            />
          </div>
        </Section>

      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-20">
        <button
          type="button" onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-base"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              সেভ হচ্ছে...
            </>
          ) : (
            <>
              <Icon name="check_circle" fill size={22} />
              সেল সেভ করুন
            </>
          )}
        </button>
      </div>
    </div>
  );
}
