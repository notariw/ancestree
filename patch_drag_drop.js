const fs = require('fs');
const path = require('path');

const treePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let treeContent = fs.readFileSync(treePath, 'utf8');

// 1. Add grip icon
treeContent = treeContent.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  "import { $1, GripHorizontal } from 'lucide-react';"
);

// 2. Add state and functions
const dragFunctions = `
  const [draggedChildId, setDraggedChildId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (role === 'guest') {
      e.preventDefault();
      return;
    }
    setDraggedChildId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to prevent the dragged element from disappearing immediately in some browsers
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedChildId(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedChildId || draggedChildId === targetId) {
      setDraggedChildId(null);
      return;
    }

    const draggedIdx = profileChildren.findIndex(c => c.id === draggedChildId);
    const targetIdx = profileChildren.findIndex(c => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newArr = [...profileChildren];
    const [draggedItem] = newArr.splice(draggedIdx, 1);
    newArr.splice(targetIdx, 0, draggedItem);

    setProfileChildren(newArr);
    setDraggedChildId(null);

    const updates = newArr.map((child, index) => 
      supabase.from('nodes').update({ order_index: index }).eq('id', child.id)
    );
    await Promise.all(updates);
    loadAndLayout();
  };
`;

treeContent = treeContent.replace(
  "const handleMoveChild = async (childId: string, direction: -1 | 1) => {",
  dragFunctions + "\n\n  const handleMoveChild = async (childId: string, direction: -1 | 1) => {"
);

// 3. Update the UI
const newUi = `
            {profileChildren.length > 0 && !isInlineEditing && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in duration-500 delay-500">
                <p className="text-xs font-medium text-slate-500 mb-2">Urutan Anak (Geser & Lepas):</p>
                <div className="flex flex-wrap gap-2">
                  {profileChildren.map((child, idx) => (
                    <div 
                      key={child.id} 
                      draggable={role !== 'guest'}
                      onDragStart={(e) => handleDragStart(e, child.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, child.id)}
                      className={\`flex items-center bg-white border \${draggedChildId === child.id ? 'border-indigo-400 border-dashed' : 'border-slate-200'} rounded-full shadow-sm px-3 py-1.5 cursor-grab active:cursor-grabbing transition-all hover:border-indigo-300\`}
                    >
                      <GripHorizontal className="w-3.5 h-3.5 text-slate-400 mr-2" />
                      <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">{child.data.label as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
`;

treeContent = treeContent.replace(
  /\{\s*profileChildren\.length > 0 && !isInlineEditing && \([\s\S]*?\}\s*\)/,
  newUi.trim()
);

fs.writeFileSync(treePath, treeContent, 'utf8');
console.log('Drag Drop patch applied');
