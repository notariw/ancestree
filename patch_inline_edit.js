const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add inline editing states
const inlineStates = `
  // Inline Edit State
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditContact, setInlineEditContact] = useState('');
  const [inlineEditAddress, setInlineEditAddress] = useState('');

  const handleInlineSave = async () => {
    if (!selectedProfile) return;
    setIsSubmitting(true);
    await supabase.from('nodes').update({
      label: inlineEditName,
      contact: inlineEditContact,
      address: inlineEditAddress
    }).eq('id', selectedProfile.id);
    
    // Update local state instantly
    setSelectedProfile({
      ...selectedProfile,
      data: {
        ...selectedProfile.data,
        label: inlineEditName,
        contact: inlineEditContact,
        address: inlineEditAddress
      }
    });
    
    setIsInlineEditing(false);
    setIsSubmitting(false);
  };
`;
content = content.replace(
  "const [selectedProfile, setSelectedProfile] = useState<AppNode | null>(null);",
  "const [selectedProfile, setSelectedProfile] = useState<AppNode | null>(null);\n" + inlineStates
);

// 2. Rewrite the entire Profile Modal
// We'll replace everything from "{/* Profile Modal */}" to the end of that modal.
const profileModalRegex = /\{\/\* Profile Modal \*\/\}([\s\S]*?)document\.body\n      \)/;

const newProfileModal = `{/* Profile Modal */}
      {selectedProfile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in p-4" onClick={() => { if(!isInlineEditing) setSelectedProfile(null) }}>
          <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 animate-fade-in" />
            
            {role !== 'guest' && !isInlineEditing && (
              <button 
                onClick={() => {
                  setInlineEditName(selectedProfile.data.label as string);
                  setInlineEditContact((selectedProfile.data.contact as string) || '');
                  setInlineEditAddress((selectedProfile.data.address as string) || '');
                  setIsInlineEditing(true);
                }} 
                className="absolute top-4 left-4 w-9 h-9 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all hover:-rotate-12 z-10 flex items-center justify-center"
                title="Edit Profil Ini"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {!isInlineEditing && (
              <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all hover:rotate-90 z-10">
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="relative mt-8 mb-6 flex flex-col items-center animate-bounce-in delay-200 fill-mode-both">
              <div className="w-32 h-32 bg-white rounded-full p-1.5 shadow-xl mb-4 transition-transform hover:scale-105 duration-300">
                {selectedProfile.data.avatarUrl ? (
                  <img src={selectedProfile.data.avatarUrl as string} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
              
              {isInlineEditing ? (
                <input 
                  type="text" 
                  value={inlineEditName} 
                  onChange={e => setInlineEditName(e.target.value)} 
                  className="text-2xl font-bold text-slate-800 text-center w-full border-b-2 border-indigo-500 bg-transparent focus:outline-none px-2 py-1"
                  placeholder="Nama Lengkap"
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold text-slate-800 text-center leading-tight">{selectedProfile.data.label as string}</h2>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-8 fade-in duration-500 delay-300 fill-mode-both hover:-translate-y-1 transition-transform cursor-default shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Nomor Handphone / WhatsApp</p>
                  {isInlineEditing ? (
                    <input 
                      type="text" 
                      value={inlineEditContact} 
                      onChange={e => setInlineEditContact(e.target.value)} 
                      className="text-sm font-semibold text-slate-800 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Contoh: 08123456789"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedProfile.data.contact ? (
                        <a href={\`https://wa.me/\${(selectedProfile.data.contact as string).replace(/\\D/g, '')}\`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">
                          {selectedProfile.data.contact as string}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-8 fade-in duration-500 delay-500 fill-mode-both hover:-translate-y-1 transition-transform cursor-default shadow-sm hover:shadow-md">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Alamat / Domisili</p>
                  {isInlineEditing ? (
                    <input 
                      type="text" 
                      value={inlineEditAddress} 
                      onChange={e => setInlineEditAddress(e.target.value)} 
                      className="text-sm font-semibold text-slate-800 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      placeholder="Contoh: Jakarta"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedProfile.data.address ? (selectedProfile.data.address as string) : <span className="text-slate-400 font-normal italic">Belum ditambahkan</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {isInlineEditing ? (
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsInlineEditing(false)} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={handleInlineSave} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all active:scale-95 flex justify-center items-center"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Simpan'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectedProfile(null)} 
                className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all active:scale-95 animate-fade-in delay-700 fill-mode-both"
              >
                Tutup
              </button>
            )}
          </div>
        </div>,
        document.body
      )`;

content = content.replace(profileModalRegex, newProfileModal);

// Also reset isInlineEditing when the modal is closed elsewhere or opened
content = content.replace(
  "setSelectedProfile(node as AppNode);",
  "setSelectedProfile(node as AppNode);\n            setIsInlineEditing(false);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Inline editing added to Profile Modal.');
