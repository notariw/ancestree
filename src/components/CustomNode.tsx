import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User } from 'lucide-react';

export default function CustomNode({ id, data }: { id: string, data: { label: string; avatarUrl?: string | null } }) {
  const [imgError, setImgError] = useState(false);

  const hasAvatar = data.avatarUrl && !imgError;

  const name = data.label || '';
  const longestWord = name.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const len = name.length;
  const sizeByLen = len <= 12 ? 24 : len <= 20 ? 18 : len <= 30 ? 15 : len <= 45 ? 12 : 10;
  // 124px usable width; avg char width ≈ 0.58em
  const sizeByWord = Math.floor(124 / (Math.max(longestWord, 1) * 0.58));
  const fontSize = Math.max(9, Math.min(sizeByLen, sizeByWord));

  return (
    <>
      <div className="relative flex flex-col items-center justify-start gap-2 px-2 py-3 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-xl w-[140px] h-[220px] text-slate-800 overflow-hidden group hover:border-indigo-400/50 hover:bg-slate-50/80 transition-all duration-300">
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-indigo-400 border-2 border-indigo-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        />

        {/* Avatar */}
        <div className="flex items-center justify-center w-full aspect-square rounded-xl shrink-0 border-2 border-indigo-400/40 overflow-hidden bg-indigo-50 shadow-inner">
          {hasAvatar ? (
            <img
              src={data.avatarUrl!}
              alt={data.label}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <User className="w-12 h-12 text-indigo-400" />
          )}
        </div>

        <div className="flex flex-col items-center justify-center overflow-hidden w-full h-full text-center px-1">
          <span className="font-semibold break-words w-full text-slate-800 leading-tight tracking-tight" style={{ fontSize: `${fontSize}px` }} title={data.label}>{data.label}</span>
        </div>

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

        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </>
  );
}
