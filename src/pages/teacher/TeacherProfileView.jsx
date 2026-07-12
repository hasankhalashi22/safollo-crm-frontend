import { useState, useEffect } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { academyApi } from '../../api/client';

const CAT_LABEL = { cadre: 'ক্যাডার', non_cadre: 'নন-ক্যাডার', others: 'অন্যান্য' };
const TYPE_LABEL = { senior: 'সিনিয়র', junior: 'জুনিয়র', guest: 'গেস্ট' };

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
    </div>
  );
}

// Used by teacher dashboard (loads own profile via token)
export function MyProfileView() {
  const [p, setP] = useState(null);
  useEffect(() => {
    teacherApi.getMe().then(r => setP(r.data?.data || null)).catch(() => {});
  }, []);
  if (!p) return <div className="text-center py-8 text-gray-400 text-sm">লোড হচ্ছে...</div>;
  return <ProfileContent p={p} />;
}

// Used by admin (loads by teacher id via admin token)
export function AdminProfileView({ teacherId }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!teacherId) return;
    academyApi.getTeacher(teacherId).then(r => setP(r.data || null)).catch(() => {});
    // client.js interceptor unwraps response.data, so r = { success, data: teacher }
  }, [teacherId]);
  if (!p) return <div className="text-center py-8 text-gray-400 text-sm">লোড হচ্ছে...</div>;
  return <ProfileContent p={p} />;
}

function ProfileContent({ p }) {
  const interests = Array.isArray(p.teaching_interests) ? p.teaching_interests : [];

  return (
    <div className="space-y-5">
      {/* ছবি ও মূল তথ্য */}
      <div className="flex items-center gap-4">
        {p.profile_photo ? (
          <img src={p.profile_photo} alt="profile" className="w-20 h-20 rounded-2xl object-cover border border-gray-200" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
            {p.full_name?.[0] || '?'}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-800 text-base">{p.full_name}</p>
          <p className="text-xs text-primary-600 font-mono">{p.teacher_code}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {p.teacher_type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{TYPE_LABEL[p.teacher_type] || p.teacher_type}</span>}
            {p.teacher_category && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{CAT_LABEL[p.teacher_category] || p.teacher_category}</span>}
            {p.fixed_rate && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">ফিক্সড ৳{Number(p.fixed_rate).toLocaleString()}</span>}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* যোগাযোগ */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">যোগাযোগ</p>
        <div className="grid grid-cols-2 gap-3">
          <Row label="ফোন" value={p.phone} />
          <Row label="ইমেইল" value={p.email} />
          <Row label="ব্যাকআপ ফোন" value={p.backup_phone ? `${p.backup_phone}${p.backup_whatsapp ? ' (WhatsApp)' : ''}` : null} />
          {p.cadre_name && <Row label="ক্যাডার" value={p.cadre_name} />}
          {p.current_posting && <Row label="বর্তমান পোস্টিং" value={p.current_posting} />}
        </div>
      </div>

      {/* ঠিকানা */}
      {(p.address || p.permanent_address) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ঠিকানা</p>
          <div className="grid grid-cols-2 gap-3">
            <Row label="বর্তমান ঠিকানা" value={p.address} />
            <Row label="স্থায়ী ঠিকানা" value={p.permanent_address} />
          </div>
        </div>
      )}

      {/* শিক্ষাগত যোগ্যতা */}
      {(p.last_degree || p.degree_subject || p.degree_institution) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">শিক্ষাগত যোগ্যতা</p>
          <div className="grid grid-cols-2 gap-3">
            <Row label="সর্বশেষ ডিগ্রি" value={p.last_degree} />
            <Row label="বিষয়" value={p.degree_subject} />
            <Row label="প্রতিষ্ঠান" value={p.degree_institution} />
          </div>
        </div>
      )}

      {/* ক্লাস আগ্রহ */}
      {interests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ক্লাস আগ্রহ</p>
          <div className="space-y-2">
            {interests.map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-700 mb-1">{item.course_name || `কোর্স ${i + 1}`}</p>
                {item.subjects?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.subjects.map(s => (
                      <span key={s} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* অভিজ্ঞতা */}
      {p.experience && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">পূর্বের অভিজ্ঞতা</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{p.experience}</p>
        </div>
      )}

      {/* পেমেন্ট তথ্য */}
      {(p.bank_account_no || p.bkash_phone || p.nagad_phone) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">পেমেন্ট তথ্য</p>
          <div className="space-y-2">
            {p.bank_account_no && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-blue-800">ব্যাংক</p>
                <p className="text-gray-600">{p.bank_account_no} • {p.bank_account_name}</p>
                {p.bank_branch && <p className="text-gray-500 text-xs">{p.bank_branch}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {p.bkash_phone && (
                <div className="bg-pink-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-pink-700 text-xs">বিকাশ</p>
                  <p className="text-gray-700">{p.bkash_phone}</p>
                </div>
              )}
              {p.nagad_phone && (
                <div className="bg-orange-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-orange-700 text-xs">নগদ</p>
                  <p className="text-gray-700">{p.nagad_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
