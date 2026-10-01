import { Handle, Position } from '@xyflow/react';
import { Heart } from 'lucide-react';

export default function UnionNode() {
  return (
    <div className="relative flex items-center justify-center w-8 h-8 bg-pink-500/20 backdrop-blur-md border border-pink-500/50 rounded-full shadow-lg group hover:border-pink-400 transition-all duration-300">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="union-target"
        className="opacity-0 pointer-events-none" 
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Heart className="w-4 h-4 text-pink-400" />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="opacity-0" 
      />
    </div>
  );
}
