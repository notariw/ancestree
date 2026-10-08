const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update state definition
content = content.replace(
  "const [selectedProfile, setSelectedProfile] = useState<AppNode['data'] | null>(null);",
  "const [selectedProfile, setSelectedProfile] = useState<AppNode | null>(null);"
);

// Update onNodeClick
content = content.replace(
  "setSelectedProfile(node.data);",
  "setSelectedProfile(node as AppNode);"
);

// Replace selectedProfile.field with selectedProfile.data.field in Profile Modal UI
content = content.replace(/selectedProfile\.avatarUrl/g, 'selectedProfile.data.avatarUrl');
content = content.replace(/selectedProfile\.label/g, 'selectedProfile.data.label');
content = content.replace(/selectedProfile\.contact/g, 'selectedProfile.data.contact');
content = content.replace(/selectedProfile\.address/g, 'selectedProfile.data.address');

// Add the "Edit Profil" button in Profile Modal
// Find the Tutup button and insert Edit Profil before it
const editButton = `            
            {role !== 'guest' && (
              <button 
                onClick={() => {
                  setEditSelectedId(selectedProfile.id);
                  setIsEditFormOpen(true);
                  setSelectedProfile(null);
                }} 
                className="w-full mt-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-xl transition-all active:scale-95 animate-fade-in delay-700 fill-mode-both flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profil
              </button>
            )}
            
            <button onClick={() => setSelectedProfile(null)} className="w-full mt-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95 animate-fade-in delay-700 fill-mode-both">
              Tutup
            </button>
`;

content = content.replace(
  /<button onClick=\{\(\) => setSelectedProfile\(null\)\} className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95 animate-fade-in duration-500 delay-700 fill-mode-both">\s*Tutup\s*<\/button>/,
  editButton
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Profile modal updated for editing.');
