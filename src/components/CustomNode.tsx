import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { User, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';

export default function CustomNode({ id, data }: { id: string, data: { label: string } }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
    
    // Delete the node
    await db.nodes.delete(id);
    
    // Delete connected edges
    const relatedEdges = await db.edges
      .filter(edge => edge.source === id || edge.target === id)
      .toArray();
      
    const edgeIds = relatedEdges.map(e => e.id);
    await db.edges.bulkDelete(edgeIds);

    // Cleanup orphaned union nodes
    const allUnionNodes = await db.nodes.filter(n => n.type === 'union').toArray();
    const allEdges = await db.edges.toArray();
    
    const unionNodesToDelete: string[] = [];
    const extraEdgesToDelete: string[] = [];

    allUnionNodes.forEach(union => {
      const connections = allEdges.filter(e => e.source === union.id || e.target === union.id);
      // If a union node has less than 2 connections, it's a dead end and should be removed
      if (connections.length < 2) {
        unionNodesToDelete.push(union.id);
        connections.forEach(c => extraEdgesToDelete.push(c.id));
      }
    });

    if (unionNodesToDelete.length > 0) {
      await db.nodes.bulkDelete(unionNodesToDelete);
    }
    if (extraEdgesToDelete.length > 0) {
      await db.edges.bulkDelete(extraEdgesToDelete);
    }
  };

  return (
    <>
      <div className="relative flex items-center gap-3 px-4 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl w-[220px] h-[90px] text-white overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-indigo-400 border-2 border-indigo-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
        />
        
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/20 rounded-full shrink-0 border border-indigo-500/30">
          <User className="w-6 h-6 text-indigo-300" />
        </div>
        
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-lg truncate text-slate-100">{data.label}</span>
          <span className="text-xs text-slate-400 font-medium">Anggota Keluarga</span>
        </div>

        <button 
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-1.5 bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all z-20"
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-indigo-400 border-2 border-indigo-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
        />

        {/* Hidden center handle for marriage lines */}
        <Handle 
          type="source" 
          position={Position.Right} 
          id="union-source"
          className="opacity-0 pointer-events-none" 
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {showConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Hapus Kerabat?</h3>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-white">{data.label}</strong> dari silsilah keluarga? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={cancelDelete} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all active:scale-95"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg shadow-red-500/25 transition-all active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
