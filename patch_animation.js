const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace backdrop animations
content = content.replace(/animate-in fade-in duration-\d+/g, 'animate-fade-in');
content = content.replace(/animate-in fade-in slide-in-from-top-full duration-\d+ delay-\d+ fill-mode-both/g, 'animate-fade-in');

// Replace modal box animations
content = content.replace(/animate-in zoom-in-\d+ duration-\d+/g, 'animate-bounce-in');
content = content.replace(/animate-in fade-in zoom-in-\[\d\.\d+\] slide-in-from-bottom-\d+ duration-\d+ ease-out/g, 'animate-bounce-in');

// Replace inner profile animations that relied on tailwindcss-animate
content = content.replace(/animate-in zoom-in-50 duration-500 delay-200 fill-mode-both/g, '');
content = content.replace(/animate-in slide-in-from-right-8 fade-in duration-500 delay-300 fill-mode-both /g, '');
content = content.replace(/animate-in slide-in-from-right-8 fade-in duration-500 delay-500 fill-mode-both /g, '');
content = content.replace(/animate-in fade-in duration-500 delay-700 fill-mode-both/g, '');


fs.writeFileSync(filePath, content, 'utf8');
console.log('TreeCanvas.tsx animations updated successfully.');
