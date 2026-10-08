const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add icons to import
content = content.replace(
  "import { Plus, Users, Upload, X, Edit2, Trash2, AlertTriangle, Lock, LogOut } from 'lucide-react';",
  "import { Plus, Users, Upload, X, Edit2, Trash2, AlertTriangle, Lock, LogOut, Phone, MapPin, Info } from 'lucide-react';"
);

// 2. Add Profile Modal State and Contact/Address form state
const stateReplacement = `
  const [newContact, setNewContact] = useState('');
  const [newAddress, setNewAddress] = useState('');
  
  // Edit state additions
  const [editContact, setEditContact] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<AppNode['data'] | null>(null);
`;
content = content.replace(
  "const [newName, setNewName] = useState('');",
  "const [newName, setNewName] = useState('');\n" + stateReplacement
);

// 3. Update useEffect for edit Selected ID
content = content.replace(
  "setEditName(node.data.label as string);",
  "setEditName(node.data.label as string);\n        setEditContact((node.data.contact as string) || '');\n        setEditAddress((node.data.address as string) || '');"
);
content = content.replace(
  "setEditName('');",
  "setEditName('');\n      setEditContact('');\n      setEditAddress('');"
);

// 4. Update loadAndLayout
content = content.replace(
  "data: { label: n.label, avatarUrl: n.avatar_url || null },",
  "data: { label: n.label, avatarUrl: n.avatar_url || null, contact: n.contact || null, address: n.address || null },"
);

// 5. Update handleAddRelative insert query
content = content.replace(
  "label: newName,\n      avatar_url: avatarUrl,",
  "label: newName,\n      avatar_url: avatarUrl,\n      contact: newContact,\n      address: newAddress,"
);

// 6. Reset form
content = content.replace(
  "setNewName('');",
  "setNewName('');\n    setNewContact('');\n    setNewAddress('');"
);

// 7. Update handleEditRelative update query
content = content.replace(
  "label: editName,\n      avatar_url: avatarUrl",
  "label: editName,\n      avatar_url: avatarUrl,\n      contact: editContact,\n      address: editAddress"
);

// 8. Add onNodeClick
content = content.replace(
  "onConnect={onConnect}",
  "onConnect={onConnect}\n        onNodeClick={(_, node) => {\n          if (node.type !== 'union') {\n            setSelectedProfile(node.data);\n          }\n        }}"
);

// 9. Add Contact and Address inputs to Add Form
const addInputs = `
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP / WA (Opsional)</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="misal: 08123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Domisili (Opsional)</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="misal: Jakarta Selatan"
                  />
                </div>
              </div>
`;
content = content.replace(
  /<div className="grid grid-cols-2 gap-3">\s*<div>\s*<label className="block text-sm font-medium text-slate-600 mb-1\.5">Hubungan<\/label>/,
  addInputs + '\n              <div className="grid grid-cols-2 gap-3">\n                <div>\n                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Hubungan</label>'
);

// 10. Add Contact and Address inputs to Edit Form
const editInputs = `
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP / WA (Opsional)</label>
                      <input
                        type="text"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Domisili (Opsional)</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      />
                    </div>
                  </div>
`;
content = content.replace(
  /<div className="pt-4">\s*<button\s*type="submit"\s*disabled=\{isSubmitting\}/,
  editInputs + '\n                  <div className="pt-4">\n                    <button\n                      type="submit"\n                      disabled={isSubmitting}'
);

// 11. Profile Modal UI
const profileModal = `
      {/* Profile Modal */}
      {selectedProfile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4" onClick={() => setSelectedProfile(null)}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300 p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600" />
            <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10">
              <X className="w-5 h-5" />
            </button>
            
            <div className="relative mt-8 mb-6 flex flex-col items-center">
              <div className="w-32 h-32 bg-white rounded-full p-1.5 shadow-xl mb-4">
                {selectedProfile.avatarUrl ? (
                  <img src={selectedProfile.avatarUrl as string} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 text-center leading-tight">{selectedProfile.label as string}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Nomor Handphone / WhatsApp</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedProfile.contact ? (
                      <a href={\`https://wa.me/\${(selectedProfile.contact as string).replace(/\\D/g, '')}\`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">
                        {selectedProfile.contact as string}
                      </a>
                    ) : (
                      <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Alamat / Domisili</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedProfile.address ? (selectedProfile.address as string) : <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>}
                  </p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setSelectedProfile(null)} className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95">
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}
`;

content = content.replace(
  "{/* Modals */}",
  "{/* Modals */}\n" + profileModal
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('TreeCanvas.tsx updated successfully.');
