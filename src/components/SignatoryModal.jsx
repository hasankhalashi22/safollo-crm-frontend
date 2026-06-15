import { useState } from 'react';

export default function SignatoryModal({ onClose, onConfirm }) {
  const [mdName, setMdName] = useState('');
  const [ceoName, setCeoName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ mdName: mdName.trim(), ceoName: ceoName.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Report Signatory Info</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Leave blank to show title only, without a name</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Managing Director's Name (optional)</label>
            <input type="text" className="input-field" value={mdName} onChange={e => setMdName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CEO's Name (optional)</label>
            <input type="text" className="input-field" value={ceoName} onChange={e => setCeoName(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">✅ Generate PDF</button>
        </form>
      </div>
    </div>
  );
}