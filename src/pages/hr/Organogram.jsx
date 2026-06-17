import { useState, useEffect } from 'react';
import { hrApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';

export default function Organogram() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(null); // { parentId, parentTitle }
  const [editModal, setEditModal] = useState(null);
  const [zoom, setZoom] = useState(1);

  const fetchPositions = () => {
    setLoading(true);
    hrApi.getPositions().then(r => {
      setPositions(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchPositions(); }, []);

  const handleDelete = async (pos) => {
    if (!confirm(`"${pos.title}" পদটি ডিলিট করবেন?`)) return;
    try {
      await hrApi.deletePosition(pos.id);
      toast.success('পদ ডিলিট হয়েছে ✅');
      fetchPositions();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  const buildTree = (parentId = null) =>
    positions.filter(p => (p.parent_position_id || null) === parentId)
      .map(p => ({ ...p, children: buildTree(p.id) }));

  const tree = buildTree(null);

  // Tier-wise employee count
  const tiers = [];
  const collectTiers = (nodes, level) => {
    if (!tiers[level]) tiers[level] = { level: level + 1, positions: [], employeeCount: 0 };
    nodes.forEach(n => {
      tiers[level].positions.push(n.title);
      tiers[level].employeeCount += n.employees.length;
      if (n.children.length > 0) collectTiers(n.children, level + 1);
    });
  };
  collectTiers(tree, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-dark">Organogram</h1>
        {tree.length === 0 && (
          <button onClick={() => setAddModal({ parentId: null, parentTitle: null })}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
            <Plus size={16} /> Add Top Position
          </button>
        )}
      </div>

      {tree.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">কোনো পদ তৈরি করা হয়নি। "Add Top Position" দিয়ে শুরু করুন।</div>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2 mb-3">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
              − Zoom Out
            </button>
            <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
              + Zoom In
            </button>
            <button onClick={() => setZoom(1)}
              className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium">
              Reset
            </button>
          </div>

         <div className="overflow-auto mb-8 border border-gray-100 rounded-2xl bg-white" style={{ maxHeight: '75vh' }}>
            <div className="p-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content', minWidth: '100%' }}>
              {tree.map(topNode => (
                <div key={topNode.id} className="mb-6">
                  {/* Tier 1 node */}
                  <div className="flex justify-center mb-2">
                    <PositionCard node={topNode}
                      onAddChild={(parentId, parentTitle) => setAddModal({ parentId, parentTitle })}
                      onEdit={setEditModal} onDelete={handleDelete} />
                  </div>

                  {/* Tier 2 row - horizontal */}
                  {topNode.children && topNode.children.length > 0 && (
                    <>
                      <div className="flex justify-center"><div className="w-px h-6 bg-gray-300" /></div>
                      <div className="flex gap-6 justify-center flex-wrap">
                        {topNode.children.map(tier2Node => (
                          <div key={tier2Node.id} className="flex flex-col items-center">
                            <PositionCard node={tier2Node}
                              onAddChild={(parentId, parentTitle) => setAddModal({ parentId, parentTitle })}
                              onEdit={setEditModal} onDelete={handleDelete} />

                            {/* Tier 3+ as vertical staircase below this Tier 2 node */}
                            {tier2Node.children && tier2Node.children.length > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-center"><div className="w-px h-4 bg-gray-300" /></div>
                                {tier2Node.children.map(child => (
                                  <VerticalBranch key={child.id} node={child}
                                    onAddChild={(parentId, parentTitle) => setAddModal({ parentId, parentTitle })}
                                    onEdit={setEditModal} onDelete={handleDelete} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>


          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users size={18} /> Tier-wise Employee Summary
            </h3>
            <div className="space-y-2">
              {tiers.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl text-sm">
                  <div>
                    <span className="font-medium">Tier {t.level}</span>
                    <span className="text-gray-400 ml-2">({t.positions.join(', ')})</span>
                  </div>
                  <span className="font-bold text-primary-600">{t.employeeCount} জন</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {addModal && (
        <PositionModal
          parentId={addModal.parentId}
          parentTitle={addModal.parentTitle}
          onClose={() => setAddModal(null)}
          onSuccess={() => { setAddModal(null); fetchPositions(); }}
        />
      )}

      {editModal && (
        <PositionModal
          position={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchPositions(); }}
        />
      )}
    </div>
  );
}

function VerticalBranch({ node, onAddChild, onEdit, onDelete }) {
  // Renders node and all its descendants as a vertical staircase
  const chain = [];
  let current = node;
  while (current) {
    chain.push(current);
    current = current.children && current.children.length > 0 ? current.children[0] : null;
  }
  // Note: only follows first child path; if a node has multiple children at deeper levels, render them as nested branches

  return (
    <div className="flex flex-col">
      {chain.map((n, idx) => (
        <div key={n.id} className="flex flex-col" style={{ paddingLeft: `${idx * 24}px` }}>
          {idx > 0 && <div className="w-px h-4 bg-gray-300" style={{ marginLeft: '20px' }} />}
          <PositionCard node={n} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
          {n.children && n.children.length > 1 && (
            <div className="mt-2 space-y-2" style={{ paddingLeft: '24px' }}>
              {n.children.slice(1).map(child => (
                <VerticalBranch key={child.id} node={child} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PositionCard({ node, onAddChild, onEdit, onDelete }) {
  return (
    <div className="bg-white border-2 border-primary-100 rounded-xl px-3 py-2 shadow-sm w-64">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{node.title}</p>
          {node.department && <p className="text-xs text-gray-400">{node.department}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(node)} className="p-1 bg-primary-50 text-primary-600 rounded-md">
            <Edit2 size={12} />
          </button>
          <button onClick={() => onDelete(node)} className="p-1 bg-red-50 text-red-500 rounded-md">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {node.employees.length > 0 ? (
        <div className="mt-1 space-y-0.5">
          {node.employees.map(e => (
            <p key={e.user_id} className="text-xs text-gray-500">👤 {e.full_name || 'Unnamed'}</p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 mt-1">কোনো কর্মী নিয়োগ করা হয়নি</p>
      )}

      <button onClick={() => onAddChild(node.id, node.title)}
        className="flex items-center gap-1 text-xs text-primary-500 font-medium mt-1.5">
        <Plus size={12} /> Add Sub-position
      </button>
    </div>
  );
}

function PositionModal({ position, parentId, parentTitle, onClose, onSuccess }) {
  const isEdit = !!position;
  const [title, setTitle] = useState(position?.title || '');
  const [department, setDepartment] = useState(position?.department || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('পদের নাম দিন');
    setLoading(true);
    try {
      if (isEdit) {
        await hrApi.updatePosition(position.id, { title, department });
        toast.success('পদ আপডেট হয়েছে ✅');
      } else {
        await hrApi.createPosition({ title, department, parent_position_id: parentId });
        toast.success('পদ তৈরি হয়েছে ✅');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">
            {isEdit ? 'Edit Position' : parentTitle ? `Add under "${parentTitle}"` : 'Add Top Position'}
          </h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">পদের নাম *</label>
            <input type="text" className="input-field" value={title}
              onChange={e => setTitle(e.target.value)} placeholder="e.g. Managing Director" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Department</label>
            <input type="text" className="input-field" value={department}
              onChange={e => setDepartment(e.target.value)} placeholder="e.g. Sales" />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
  );
}