import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi, salesApi, fieldConfigsApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Camera, X } from 'lucide-react';
import { coursesApi, salesApi, fieldConfigsApi, usersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const PAYMENT_METHODS = [
  { value: 'bkash',  label: 'বিকাশ',  color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'nagad',  label: 'নগদ',    color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'rocket', label: 'রকেট',   color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'cash',   label: 'ক্যাশ',  color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'cod',    label: 'COD',     color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

export default function NewSale() {
  const [courses, setCourses] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    student_phone: '',
    student_name: '',
    course_id: '',
    batch_id: '',
    course_price: '',
    collected_amount: '',
    payment_method: '',
    transaction_id: '',
    due_date: '',
    reference: '',
    notes: '',
    payment_proof: null,
  });

  useEffect(() => {
    Promise.all([coursesApi.getAll(), fieldConfigsApi.getAll()]).then(([cRes, fRes]) => {
      setCourses(cRes.data || []);
      setFieldConfigs(fRes.data || []);
    });
  }, []);

  const selectedCourse = courses.find(c => c.id == form.course_id);
  const batches = selectedCourse?.batches || [];
  const dueAmount = form.course_price && form.collected_amount
    ? Math.max(0, Number(form.course_price) - Number(form.collected_amount))
    : 0;

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id == courseId);
    set('course_id', courseId);
    set('batch_id', '');
    set('course_price', course?.default_price || '');
  };

  const handleBatchChange = (batchId) => {
    const batch = batches.find(b => b.id == batchId);
    set('batch_id', batchId);
    if (batch?.price) set('course_price', batch.price);
  };

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set('payment_proof', file);
    setProofPreview(URL.createObjectURL(file));
  };

  const isFieldMandatory = (key) => {
    const config = fieldConfigs.find(f => f.field_key === key);
    return config?.is_mandatory || false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.student_phone || form.student_phone.length !== 11) {
      return toast.error('সঠিক মোবাইল নম্বর দিন');
    }
    if (!form.course_id) return toast.error('কোর্স বেছে নিন');
    if (!form.collected_amount || Number(form.collected_amount) <= 0) {
      return toast.error('সংগৃহীত টাকার পরিমাণ দিন');
    }
    if (!form.payment_method) return toast.error('পেমেন্ট পদ্ধতি বেছে নিন');

    // Mandatory field check
    for (const config of fieldConfigs) {
      if (config.is_mandatory && config.field_key !== 'payment_proof') {
        if (!form[config.field_key]) {
          return toast.error(`${config.field_label} দেওয়া আবশ্যক`);
        }
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== '' && key !== 'payment_proof') {
          formData.append(key, val);
        }
      });
      if (form.payment_proof) formData.append('payment_proof', form.payment_proof);

      await salesApi.create(formData);
      toast.success('সেল সফলভাবে যোগ হয়েছে! ✅');
      navigate('/executive');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-8">
      <h2 className="text-xl font-display font-bold text-dark mb-4">নতুন সেল যোগ করুন</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">স্টুডেন্ট তথ্য</h3>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              মোবাইল নম্বর <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="01XXXXXXXXX"
              value={form.student_phone}
              onChange={e => set('student_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </div>

          {(!isFieldMandatory('student_name') === false || true) && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                স্টুডেন্টের নাম {isFieldMandatory('student_name') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="নাম লিখুন"
                value={form.student_name}
                onChange={e => set('student_name', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Course selection */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">কোর্স তথ্য</h3>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">কোর্স <span className="text-red-500">*</span></label>
            <select
              className="input-field"
              value={form.course_id}
              onChange={e => handleCourseChange(e.target.value)}
            >
              <option value="">-- কোর্স বেছে নিন --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {batches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">ব্যাচ</label>
              <select
                className="input-field"
                value={form.batch_id}
                onChange={e => handleBatchChange(e.target.value)}
              >
                <option value="">-- ব্যাচ বেছে নিন --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">কোর্স মূল্য (৳)</label>
            <input
              type="number"
              className="input-field"
              value={form.course_price}
              onChange={e => set('course_price', e.target.value)}
            />
          </div>
        </div>

        {/* Payment info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">পেমেন্ট তথ্য</h3>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">সংগৃহীত টাকা (৳) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="input-field"
              placeholder="0"
              value={form.collected_amount}
              onChange={e => set('collected_amount', e.target.value)}
            />
          </div>

          {/* Due amount display */}
          {dueAmount > 0 && (
            <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-red-600">বাকি থাকবে</span>
              <span className="font-bold text-red-600">৳{dueAmount.toLocaleString()}</span>
            </div>
          )}
          {form.course_price && form.collected_amount && dueAmount === 0 && (
            <div className="bg-green-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-green-600">সম্পূর্ণ পরিশোধ</span>
              <span className="font-bold text-green-600">✅ পেইড</span>
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">পেমেন্ট পদ্ধতি <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set('payment_method', m.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-95
                    ${form.payment_method === m.value ? m.color + ' border-2' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              ট্রানজেকশন আইডি {isFieldMandatory('transaction_id') && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="TXN ID"
              value={form.transaction_id}
              onChange={e => set('transaction_id', e.target.value)}
            />
          </div>

          {/* Payment proof */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              পেমেন্ট প্রুফ {isFieldMandatory('payment_proof') && <span className="text-red-500">*</span>}
            </label>
            {proofPreview ? (
              <div className="relative inline-block">
                <img src={proofPreview} alt="proof" className="w-full h-32 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setProofPreview(null); set('payment_proof', null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer active:bg-gray-50">
                <Camera size={20} className="text-gray-400" />
                <span className="text-sm text-gray-400">ছবি বা স্ক্রিনশট যোগ করুন</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
              </label>
            )}
          </div>

          {/* Due date */}
          {dueAmount > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                বাকি দেওয়ার তারিখ {isFieldMandatory('due_date') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                className="input-field"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Extra info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">অতিরিক্ত তথ্য</h3>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              রেফারেন্স {isFieldMandatory('reference') && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="রেফারেন্স (ঐচ্ছিক)"
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              নোট {isFieldMandatory('notes') && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="বিশেষ মন্তব্য (ঐচ্ছিক)"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
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
