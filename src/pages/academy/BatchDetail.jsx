import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Save, X, History } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const ROW_TYPE_LABEL = { class: 'à¦•à§à¦²à¦¾à¦¸', exam: 'à¦ªà¦°à§€à¦•à§à¦·à¦¾' };
const STATUS_LABEL = { scheduled: 'à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤', done: 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨', cancelled: 'à¦¬à¦¾à¦¤à¦¿à¦²', rescheduled: 'à¦ªà§à¦¨à¦°à§à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤' };
const STATUS_COLOR = { scheduled: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600', rescheduled: 'bg-yellow-100 text-yellow-700' };
const CLASS_TYPE_LABEL = { regular: 'à¦¨à¦¿à¦¯à¦¼à¦®à¦¿à¦¤', makeup: 'à¦®à§‡à¦•à¦†à¦ª', exam_review: 'à¦ªà¦°à§€à¦•à§à¦·à¦¾ à¦°à¦¿à¦­à¦¿à¦‰' };

function FeedbackModal({ outlineRow, teachers, onClose, onDone }) {
  const [teacherId, setTeacherId] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!teacherId) return toast.error('à¦¶à¦¿à¦•à§à¦·à¦• à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨');
    try {
      await academyApi.submitFeedback(outlineRow.id, teacherId, note);
      toast.success('à¦«à¦¿à¦¡à¦¬à§à¦¯à¦¾à¦• à¦œà¦®à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); onDone();
    } catch { toast.error('à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">à¦•à§à¦²à¦¾à¦¸ à¦«à¦¿à¦¡à¦¬à§à¦¯à¦¾à¦• à¦œà¦®à¦¾</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500">{outlineRow.topic || `à¦•à§à¦²à¦¾à¦¸ ${outlineRow.class_no}`}</p>
        <div>
          <label className="label">à¦¶à¦¿à¦•à§à¦·à¦• *</label>
          <select className="input-field" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">à¦¨à§‹à¦Ÿ</label>
          <textarea className="input-field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="à¦•à§à¦²à¦¾à¦¸ à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡ à¦®à¦¨à§à¦¤à¦¬à§à¦¯..." />
        </div>
        <div className="flex gap-3">
          <button onClick={submit} className="btn-primary flex-1">à¦œà¦®à¦¾ à¦¦à¦¿à¦¨</button>
          <button onClick={onClose} className="btn-secondary">à¦¬à¦¾à¦¤à¦¿à¦²</button>
        </div>
      </div>
    </div>
  );
}

function OutlineRow({ row, teachers, onRefresh, onFeedback }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: row.scheduled_date?.split('T')[0] || '',
    scheduled_time: row.scheduled_time || '',
    topic: row.topic || '',
    teacher_id: row.teacher_id || '',
    class_type: row.class_type || 'regular',
    zoom_link: row.zoom_link || '',
    notes: row.notes || '',
    status: row.status || 'scheduled',
  });

  const save = async () => {
    try {
      await academyApi.updateOutlineRow(row.id, form);
      toast.success('à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); setEditing(false); onRefresh();
    } catch { toast.error('à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); }
  };

  const del = async () => {
    if (!confirm('à¦à¦‡ à¦¸à¦¾à¦°à¦¿ à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¬à§‡à¦¨?')) return;
    await academyApi.deleteOutlineRow(row.id); onRefresh();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const teacher = teachers.find(t => t.id === row.teacher_id);

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50 group">
      <td className="px-4 py-3 text-xs text-gray-400 w-8">{row.row_no}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${row.row_type === 'exam' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {row.row_type === 'exam' ? 'à¦ªà¦°à§€à¦•à§à¦·à¦¾' : `à¦•à§à¦²à¦¾à¦¸ ${row.class_no}`}
        </span>
      </td>
      {editing ? (
        <>
          <td className="px-2 py-2"><input type="date" className="input py-1 text-xs" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></td>
          <td className="px-2 py-2"><input type="time" className="input py-1 text-xs" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} /></td>
          <td className="px-2 py-2"><input className="input py-1 text-xs" value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="à¦¬à¦¿à¦·à¦¯à¦¼" /></td>
          <td className="px-2 py-2">
            <select className="input py-1 text-xs" value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
              <option value="">â€”</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">
            <select className="input py-1 text-xs" value={form.class_type} onChange={e => set('class_type', e.target.value)}>
              {Object.entries(CLASS_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">
            <select className="input py-1 text-xs" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </td>
          <td className="px-2 py-2 flex gap-1">
            <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={14} /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3 text-xs text-gray-600">{row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString('bn-BD') : 'â€”'}</td>
          <td className="px-4 py-3 text-xs text-gray-500">{row.scheduled_time || 'â€”'}</td>
          <td className="px-4 py-3 text-sm">{row.topic || 'â€”'}</td>
          <td className="px-4 py-3 text-xs text-gray-500">{teacher?.full_name || 'â€”'}</td>
          <td className="px-4 py-3 text-xs text-gray-500">{CLASS_TYPE_LABEL[row.class_type] || 'â€”'}</td>
          <td className="px-4 py-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status] || 'bg-gray-100'}`}>
              {STATUS_LABEL[row.status] || row.status}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {row.status === 'scheduled' && row.row_type === 'class' && (
                <button onClick={() => onFeedback(row)} className="p-1 text-green-600 hover:bg-green-50 rounded text-xs" title="à¦«à¦¿à¦¡à¦¬à§à¦¯à¦¾à¦•"><CheckCircle size={14} /></button>
              )}
              <button onClick={() => setEditing(true)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
              <button onClick={del} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [outline, setOutline] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [feedbackRow, setFeedbackRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', teacher_id: '', class_type: 'regular' });

  const loadOutline = () => academyApi.getBatchOutline(id).then(r => setOutline(r.data || []));

  useEffect(() => {
    academyApi.getBatches().then(r => { const b = (r.data || []).find(x => x.id === id); setBatch(b); });
    academyApi.getTeachers().then(r => setTeachers(r.data || []));
    loadOutline();
  }, [id]);

  const addRow = async () => {
    try {
      await academyApi.addOutlineRow(id, addForm);
      toast.success('à¦¸à¦¾à¦°à¦¿ à¦¯à§‹à¦— à¦¹à¦¯à¦¼à§‡à¦›à§‡'); setShowAddForm(false); setAddForm({ row_type: 'class', scheduled_date: '', scheduled_time: '', topic: '', teacher_id: '', class_type: 'regular' }); loadOutline();
    } catch { toast.error('à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); }
  };

  const set = (k, v) => setAddForm(f => ({ ...f, [k]: v }));

  const classRows = outline.filter(r => r.row_type === 'class');
  const examRows = outline.filter(r => r.row_type === 'exam');
  const doneRows = outline.filter(r => r.status === 'done');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/academy/batches')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{batch?.batch_name || 'à¦¬à§à¦¯à¦¾à¦š à¦†à¦‰à¦Ÿà¦²à¦¾à¦‡à¦¨'}</h1>
          <p className="text-sm text-gray-400">{batch?.course_name}</p>
        </div>
        <div className="ml-auto flex gap-4 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-700">{classRows.length}</span> à¦•à§à¦²à¦¾à¦¸</span>
          <span><span className="font-semibold text-gray-700">{examRows.length}</span> à¦ªà¦°à§€à¦•à§à¦·à¦¾</span>
          <span><span className="font-semibold text-green-600">{doneRows.length}</span> à¦¸à¦®à§à¦ªà¦¨à§à¦¨</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(s => !s)} className="btn-primary flex items-center gap-2"><Plus size={16} /> à¦¨à¦¤à§à¦¨ à¦¸à¦¾à¦°à¦¿</button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">à¦§à¦°à¦¨</label>
              <select className="input text-sm" value={addForm.row_type} onChange={e => set('row_type', e.target.value)}>
                <option value="class">à¦•à§à¦²à¦¾à¦¸</option>
                <option value="exam">à¦ªà¦°à§€à¦•à§à¦·à¦¾</option>
              </select>
            </div>
            <div><label className="label text-xs">à¦¤à¦¾à¦°à¦¿à¦–</label><input type="date" className="input text-sm" value={addForm.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></div>
            <div><label className="label text-xs">à¦¸à¦®à¦¯à¦¼</label><input type="time" className="input text-sm" value={addForm.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} /></div>
            <div>
              <label className="label text-xs">à¦¶à¦¿à¦•à§à¦·à¦•</label>
              <select className="input text-sm" value={addForm.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">â€”</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div><label className="label text-xs">à¦¬à¦¿à¦·à¦¯à¦¼/à¦¶à¦¿à¦°à§‹à¦¨à¦¾à¦®</label><input className="input text-sm" value={addForm.topic} onChange={e => set('topic', e.target.value)} /></div>
            {addForm.row_type === 'class' && (
              <div>
                <label className="label text-xs">à¦•à§à¦²à¦¾à¦¸ à¦§à¦°à¦¨</label>
                <select className="input text-sm" value={addForm.class_type} onChange={e => set('class_type', e.target.value)}>
                  {Object.entries(CLASS_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={addRow} className="btn-primary text-sm">à¦¯à§‹à¦— à¦•à¦°à§à¦¨</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">à¦¬à¦¾à¦¤à¦¿à¦²</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {outline.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>à¦•à§‹à¦¨à§‹ à¦†à¦‰à¦Ÿà¦²à¦¾à¦‡à¦¨ à¦¨à§‡à¦‡à¥¤ à¦¨à¦¤à§à¦¨ à¦¸à¦¾à¦°à¦¿ à¦¯à§‹à¦— à¦•à¦°à§à¦¨à¥¤</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  {['#', 'à¦§à¦°à¦¨', 'à¦¤à¦¾à¦°à¦¿à¦–', 'à¦¸à¦®à¦¯à¦¼', 'à¦¬à¦¿à¦·à¦¯à¦¼', 'à¦¶à¦¿à¦•à§à¦·à¦•', 'à¦•à§à¦²à¦¾à¦¸ à¦§à¦°à¦¨', 'à¦…à¦¬à¦¸à§à¦¥à¦¾', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outline.map(row => (
                  <OutlineRow key={row.id} row={row} teachers={teachers} onRefresh={loadOutline} onFeedback={setFeedbackRow} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {feedbackRow && (
        <FeedbackModal
          outlineRow={feedbackRow}
          teachers={teachers}
          onClose={() => setFeedbackRow(null)}
          onDone={() => { setFeedbackRow(null); loadOutline(); }}
        />
      )}
    </div>
  );
}

