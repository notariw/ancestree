'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AppNode, AppEdge } from '@/lib/db';
import { getLayoutedElements } from '@/lib/layout';
import CustomNode from './CustomNode';
import UnionNode from './UnionNode';
import { Plus, Users } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
  union: UnionNode,
};

export default function TreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [relationship, setRelationship] = useState<'child' | 'parent' | 'spouse'>('child');
  const [selectedRelativeId, setSelectedRelativeId] = useState('');
  const [secondaryRelativeId, setSecondaryRelativeId] = useState('');

  // Load from DB
  const dbNodes = useLiveQuery(() => db.nodes.toArray());
  const dbEdges = useLiveQuery(() => db.edges.toArray());

  useEffect(() => {
    const initDb = async () => {
      if (dbNodes === undefined || dbEdges === undefined) return;

      if (dbNodes.length === 0 && isInitializing) {
        setIsInitializing(false);
        const rootId = uuidv4();
        const rootNode: AppNode = {
          id: rootId,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { label: 'Leluhur Pertama' },
        };
        await db.nodes.add(rootNode);
      } else if (isInitializing) {
        setIsInitializing(false);
      }

      if (dbNodes.length > 0 && !isInitializing) {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          dbNodes,
          dbEdges
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      }
    };

    initDb();
  }, [dbNodes, dbEdges, isInitializing, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const newEdge = { ...params, id: uuidv4() } as AppEdge;
      db.edges.add(newEdge);
    },
    []
  );

  const handleAddRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !selectedRelativeId) return;

    const newNodeId = uuidv4();
    const newNode: AppNode = {
      id: newNodeId,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label: newName },
    };

    const newEdges: AppEdge[] = [];
    const newNodes: AppNode[] = [newNode];

    if (relationship === 'child' && secondaryRelativeId) {
      const p1 = selectedRelativeId;
      const p2 = secondaryRelativeId;
      const unionId = `union-${[p1, p2].sort().join('-')}`;
      
      const unionExists = dbNodes?.find((n) => n.id === unionId);
      
      if (!unionExists) {
        newNodes.push({
          id: unionId,
          type: 'union',
          position: { x: 0, y: 0 },
          data: { label: 'Union' },
        });
        
        newEdges.push({
          id: uuidv4(),
          source: p1,
          sourceHandle: 'union-source',
          target: unionId,
          targetHandle: 'union-target',
          type: 'straight',
        });
        newEdges.push({
          id: uuidv4(),
          source: p2,
          sourceHandle: 'union-source',
          target: unionId,
          targetHandle: 'union-target',
          type: 'straight',
        });
      }
      
      newEdges.push({
        id: uuidv4(),
        source: unionId,
        target: newNodeId,
      });
    } else if (relationship === 'spouse') {
      const p1 = selectedRelativeId;
      const p2 = newNodeId;
      const unionId = `union-${[p1, p2].sort().join('-')}`;
      
      newNodes.push({
        id: unionId,
        type: 'union',
        position: { x: 0, y: 0 },
        data: { label: 'Union' },
      });
      
      newEdges.push({
        id: uuidv4(),
        source: p1,
        sourceHandle: 'union-source',
        target: unionId,
        targetHandle: 'union-target',
        type: 'straight',
      });
      newEdges.push({
        id: uuidv4(),
        source: p2,
        sourceHandle: 'union-source',
        target: unionId,
        targetHandle: 'union-target',
        type: 'straight',
      });
    } else {
      newEdges.push({
        id: uuidv4(),
        source: relationship === 'child' ? selectedRelativeId : newNodeId,
        target: relationship === 'child' ? newNodeId : selectedRelativeId,
      });
    }

    await db.nodes.bulkAdd(newNodes);
    await db.edges.bulkAdd(newEdges);

    setNewName('');
    setSelectedRelativeId('');
    setSecondaryRelativeId('');
    setIsFormOpen(false);
  };

  return (
    <div className="w-screen h-screen bg-[#0B0F19]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0B0F19]"
        minZoom={0.1}
      >
        <Background color="#1e293b" gap={24} size={2} />
        <Controls className="bg-slate-900 border-slate-700 fill-slate-300 [&>button]:bg-slate-800 [&>button]:border-slate-700 [&>button]:text-slate-300 hover:[&>button]:bg-slate-700" />
        
        <Panel position="top-left" className="m-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ancestree</h1>
          </div>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Kerabat
          </button>

          {isFormOpen && (
            <div className="mt-4 p-5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-80 animate-in fade-in slide-in-from-top-4 duration-200">
              <h2 className="text-lg font-semibold text-white mb-4">Anggota Keluarga Baru</h2>
              <form onSubmit={handleAddRelative} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="misal: Budi Santoso"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Hubungan</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as 'child' | 'parent' | 'spouse')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="child">Anak dari</option>
                    <option value="parent">Orang Tua dari</option>
                    <option value="spouse">Pasangan dari</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {relationship === 'child' ? 'Orang Tua 1' : relationship === 'spouse' ? 'Pasangan' : 'Anak'}
                  </label>
                  <select
                    value={selectedRelativeId}
                    onChange={(e) => setSelectedRelativeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="" disabled>Pilih {relationship === 'child' ? 'Orang Tua 1' : relationship === 'spouse' ? 'Pasangan' : 'Anak'}</option>
                    {dbNodes?.filter(n => n.type !== 'union').map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.data.label as string}
                      </option>
                    ))}
                  </select>
                </div>

                {relationship === 'child' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Orang Tua 2 (Opsional)</label>
                    <select
                      value={secondaryRelativeId}
                      onChange={(e) => setSecondaryRelativeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      <option value="">Tidak ada</option>
                      {dbNodes?.filter(node => node.id !== selectedRelativeId && node.type !== 'union').map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.data.label as string}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-md transition-all active:scale-[0.98]"
                  >
                    Simpan ke Silsilah
                  </button>
                </div>
              </form>
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}
