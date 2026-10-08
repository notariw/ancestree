const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instance of Tailwind-animate classes
// Backdrop
content = content.replace(/animate-in fade-in duration-300/g, 'animate-fade-in');
content = content.replace(/animate-in fade-in duration-200/g, 'animate-fade-in');

// Modal boxes
content = content.replace(/animate-in zoom-in-95 duration-300/g, 'animate-bounce-in');

fs.writeFileSync(filePath, content, 'utf8');
console.log('All modals updated.');
