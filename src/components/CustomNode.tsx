import { Handle, Position } from '@xyflow/react';
import { User } from 'lucide-react';

export default function CustomNode({ data }: { data: { label: string } }) {
  return (
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
        <span className="text-xs text-slate-400 font-medium">Family Member</span>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-indigo-400 border-2 border-indigo-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
