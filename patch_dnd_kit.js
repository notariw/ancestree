const fs = require('fs');
const path = require('path');

const treePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let treeContent = fs.readFileSync(treePath, 'utf8');

// 1. Add dnd-kit imports
const dndImports = `
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableChild({ child, disabled }: { child: any, disabled: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: child.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={\`flex items-center bg-white border \${isDragging ? 'border-indigo-500 border-dashed bg-indigo-50 shadow-md scale-105 opacity-80' : 'border-slate-200'} rounded-full shadow-sm px-3 py-1.5 \${disabled ? 'cursor-default opacity-50' : 'cursor-grab active:cursor-grabbing'} transition-all hover:border-indigo-300 z-10 relative outline-none touch-none\`}
    >
      <GripHorizontal className="w-3.5 h-3.5 text-slate-400 mr-2 outline-none pointer-events-none" />
      <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate pointer-events-none">{child.data.label as string}</span>
    </div>
  );
}
`;

treeContent = treeContent.replace(
  "import CustomNode from './CustomNode';",
  dndImports.trim() + "\n\nimport CustomNode from './CustomNode';"
);

// 2. Remove old HTML5 drag states and functions
const oldStatesAndFunctions = /const \[draggedChildId[\s\S]*?loadAndLayout\(\);\s*\};/m;
treeContent = treeContent.replace(oldStatesAndFunctions, `
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || role === 'guest') return;
    
    if (active.id !== over.id) {
      const oldIndex = profileChildren.findIndex((item) => item.id === active.id);
      const newIndex = profileChildren.findIndex((item) => item.id === over.id);

      const newArr = arrayMove(profileChildren, oldIndex, newIndex);
      setProfileChildren(newArr);
      
      const updates = newArr.map((child, index) => 
        supabase.from('nodes').update({ order_index: index }).eq('id', child.id)
      );
      await Promise.all(updates);
      loadAndLayout();
    }
  };
`);

// 3. Update the UI rendering part
const oldUi = /<div className="flex flex-wrap gap-2">[\s\S]*?<\/div>\s*<\/div>\s*\)}/;
const newUi = `<div className="flex flex-wrap gap-2">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={profileChildren.map(c => c.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {profileChildren.map((child) => (
                        <SortableChild key={child.id} child={child} disabled={role === 'guest'} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}`;

treeContent = treeContent.replace(oldUi, newUi);

fs.writeFileSync(treePath, treeContent, 'utf8');
console.log('dnd-kit applied');
