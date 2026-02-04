const fs = require('fs');
const path = 'd:\\Madhan_Projects\\naqleen-otm-react\\src\\components\\panels\\actions\\ReserveContainersPanelNew.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

// We want to remove lines 208 to 232 (1-based), which are indices 207 to 231 (0-based).
// Lines to keep: 0 to 206, and 232 to end.
// Verify the lines before proceeding:
console.log('Line 207 (should be closing useEffect):', lines[206]);
console.log('Line 208 (should be bad):', lines[207]);
console.log('Line 232 (should be last bad):', lines[231]);
console.log('Line 233 (should be empty):', lines[232]);

const newLines = [...lines.slice(0, 207), ...lines.slice(232)];
fs.writeFileSync(path, newLines.join('\n'));
console.log('Successfully removed lines 208-232.');
