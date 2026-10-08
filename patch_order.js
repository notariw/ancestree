const fs = require('fs');
const path = require('path');

// 1. Update AppNode definition
const dbPath = path.join(__dirname, 'src/lib/db.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');
dbContent = dbContent.replace(
  /address\?: string \| null;/g,
  "address?: string | null;\n  orderIndex?: number;"
);
fs.writeFileSync(dbPath, dbContent, 'utf8');

// 2. Update TreeCanvas.tsx
const treePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let treeContent = fs.readFileSync(treePath, 'utf8');

// Add icons to imports if needed (ChevronLeft, ChevronRight)
treeContent = treeContent.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  "import { $1, ChevronLeft, ChevronRight } from 'lucide-react';"
);

// Add state for moving children UI
const moveChildUiStates = `
  // Move child states
  const [profileChildren, setProfileChildren] = useState<AppNode[]>([]);

  useEffect(() => {
    if (selectedProfile && dbNodes && dbEdges) {
      // Cari union di mana selectedProfile menjadi parent
      const unions = dbEdges.filter(e => e.source === selectedProfile.id && dbNodes.find(n => n.id === e.target)?.type === 'union').map(e => e.target);
      // Cari anak dari union tersebut
      let children = dbEdges.filter(e => unions.includes(e.source)).map(e => dbNodes.find(n => n.id === e.target)).filter(Boolean) as AppNode[];
      // Urutkan
      children = children.sort((a, b) => ((a.data.orderIndex as number) || 0) - ((b.data.orderIndex as number) || 0));
      setProfileChildren(children);
    } else {
      setProfileChildren([]);
    }
  }, [selectedProfile, dbNodes, dbEdges]);

  const handleMoveChild = async (childId: string, direction: -1 | 1) => {
    const currentIndex = profileChildren.findIndex(c => c.id === childId);
    const swapIndex = currentIndex + direction;
    if (swapIndex < 0 || swapIndex >= profileChildren.length) return;

    const newArr = [...profileChildren];
    [newArr[currentIndex], newArr[swapIndex]] = [newArr[swapIndex], newArr[currentIndex]];

    // Optimistic UI update
    setProfileChildren(newArr);

    // Save to DB
    const updates = newArr.map((child, index) => 
      supabase.from('nodes').update({ order_index: index }).eq('id', child.id)
    );
    await Promise.all(updates);

    loadAndLayout();
  };
`;
treeContent = treeContent.replace(
  "const [inlineEditAddress, setInlineEditAddress] = useState('');",
  "const [inlineEditAddress, setInlineEditAddress] = useState('');\n" + moveChildUiStates
);

// Update loadAndLayout fetch
treeContent = treeContent.replace(
  "address: n.address || null",
  "address: n.address || null, orderIndex: n.order_index || 0"
);
treeContent = treeContent.replace(
  "const fetchedEdges: AppEdge[] = (rawEdges || []).map((e) => ({",
  "fetchedNodes.sort((a, b) => (a.data.orderIndex as number) - (b.data.orderIndex as number));\n\n    const fetchedEdges: AppEdge[] = (rawEdges || []).map((e) => ({"
);

// Add the UI inside the Profile Modal
const profileChildrenUi = `
            </div>

            {profileChildren.length > 0 && !isInlineEditing && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in duration-500 delay-500">
                <p className="text-xs font-medium text-slate-500 mb-2">Urutan Anak (Kiri ke Kanan):</p>
                <div className="flex flex-wrap gap-2">
                  {profileChildren.map((child, idx) => (
                    <div key={child.id} className="flex items-center bg-white border border-slate-200 rounded-full shadow-sm px-1 py-1">
                      <button 
                        onClick={() => handleMoveChild(child.id, -1)}
                        disabled={idx === 0 || role === 'guest'}
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors rounded-full hover:bg-slate-50"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold text-slate-700 px-2 max-w-[80px] truncate">{child.data.label as string}</span>
                      <button 
                        onClick={() => handleMoveChild(child.id, 1)}
                        disabled={idx === profileChildren.length - 1 || role === 'guest'}
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors rounded-full hover:bg-slate-50"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isInlineEditing ? (
`;
treeContent = treeContent.replace(
  /<\/div>\s*\{isInlineEditing \? \(/,
  profileChildrenUi
);

fs.writeFileSync(treePath, treeContent, 'utf8');
console.log('Order patch applied successfully.');
