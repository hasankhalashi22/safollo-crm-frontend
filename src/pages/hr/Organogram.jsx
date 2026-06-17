import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const TIER_COLORS = [
  { border: '#fb7185', bg: '#fff1f2', text: '#be123c' },
  { border: '#818cf8', bg: '#eef2ff', text: '#4338ca' },
  { border: '#fbbf24', bg: '#fffbeb', text: '#b45309' },
  { border: '#2dd4bf', bg: '#f0fdfa', text: '#0f766e' },
  { border: '#a78bfa', bg: '#f5f3ff', text: '#6d28d9' },
  { border: '#38bdf8', bg: '#f0f9ff', text: '#0369a1' },
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(node => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach(edge => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  const layoutedNodes = nodes.map(node => {
    const { x, y } = g.node(node.id);
    return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
  });

  return { nodes: layoutedNodes, edges };
}

function PositionNode({ data }) {
  const hasEmployee = data.employees.length > 0;
  const tierColor = TIER_COLORS[data.tier % TIER_COLORS.length];

  return (
    <div
      style={{
        background: tierColor.bg,
        border: `1px solid ${tierColor.border}`,
        borderBottom: `3px solid ${hasEmployee ? '#22c55e' : '#fbbf24'}`,
        borderRadius: 10,
        padding: '8px 10px',
        width: NODE_WIDTH,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: tierColor.border }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 12, color: tierColor.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.title}</p>
          {data.department && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{data.department}</p>}
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => data.onEdit(data.raw)} style={{ padding: 3, background: '#eff6ff', color: '#2563eb', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
            <Edit2 size={10} />
          </button>
          <button onClick={() => data.onDelete(data.raw)} style={{ padding: 3, background: '#fef2f2', color: '#ef4444', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {hasEmployee && (
        <div style={{ marginTop: 3 }}>
          {data.employees.map(e => (
            <p key={e.user_id} style={{ fontSize: 10, color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {e.full_name || 'Unnamed'}</p>
          ))}
        </div>
      )}

      <button onClick={() => data.onAddChild(data.raw.id, data.raw.title)}
        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#3b82f6', fontWeight: 500, marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <Plus size={10} /> Add Sub-position
      </button>

      <Handle type="source" position={Position.Bottom} style={{ background: tierColor.border }} />
    </div>
  );
}

const nodeTypes = { position: PositionNode };

export default function Organogram() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchPositions = () => {
    setLoading(true);
    hrApi.getPositions().then(r => {
      setPositions(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchPositions(); }, []);

  const handleDelete = useCallback(async (pos) => {
    if (!confirm(`"${pos.title}" পদটি ডিলিট করবেন?`)) return;
    try {
      await hrApi.deletePosition(pos.id);
      toast.success('পদ ডিলিট হয়েছে ✅');
      fetchPositions();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  }, []);

  const handleAddChild = useCallback((parentId, parentTitle) => {
    setAddModal({ parentId, parentTitle });
  }, []);

  const handleEdit = useCallback((pos) => {
    setEditModal(pos);
  }, []);

  // Compute tier for each position (depth from root)
  const tierMap = useMemo(() => {
    const map = {};
    const getTier = (id) => {
      if (map[id] !== undefined) return map[id];
      const pos = positions.find(p => p.id === id);
      if (!pos || !pos.parent_position_id) {
        map[id] = 0;
      } else {
        map[id] = getTier(pos.parent_position_id) + 1;
      }
      return map[id];
    };
    positions.forEach(p => getTier(p.id));
    return map;
  }, [positions]);

  useEffect(() => {
    if (positions.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const flowNodes = positions.map(p => ({
      id: p.id,
      type: 'position',
      data: {
        title: p.title,
        department: p.department,
        employees: p.employees,
        tier: tierMap[p.id] || 0,
        raw: p,
        onAddChild: handleAddChild,
        onEdit: handleEdit,
        onDelete: handleDelete,
      },
      position: { x: 0, y: 0 },
    }));

    const flowEdges = positions
      .filter(p => p.parent_position_id)
      .map(p => ({
        id: `${p.parent_position_id}-${p.id}`,
        source: p.parent_position_id,
        target: p.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      }));

    const layouted = getLayoutedElements(flowNodes, flowEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [positions, tierMap, handleAddChild, handleEdit, handleDelete, setNodes, setEdges]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  // Tier-wise employee count summary
  const tiers = [];
  positions.forEach(p => {
    const t = tierMap[p.id] || 0;
    if (!tiers[t]) tiers[t] = { level: t + 1, positions: [], employeeCount: 0 };
    tiers[t].positions.push(p.title);
    tiers[t].employeeCount += p.employees.length;
  });

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-2xl font-display font-bold text-dark">Organogram</h1>
        {positions.length === 0 && (
          <button onClick={() => setAddModal({ parentId: null, parentTitle: null })}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
            <Plus size={16} /> Add Top Position
          </button>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">কোনো পদ তৈরি করা হয়নি। "Add Top Position" দিয়ে শুরু করুন।</div>
      ) : (
        <>
          <div className="border border-gray-100 rounded-2xl bg-gray-50 flex-shrink-0" style={{ height: '65vh' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls />
              <MiniMap pannable zoomable style={{ width: 120, height: 80 }} />
            </ReactFlow>
          </div>

          <div className="card mt-4">
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