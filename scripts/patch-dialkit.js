// Patches DialKit ColorControl to accept hex codes without # prefix
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'dialkit', 'dist', 'index.js');
let code = fs.readFileSync(file, 'utf8');

const old = `function handleTextSubmit() {
    setIsEditing(false);
    if (HEX_COLOR_REGEX.test(editValue)) {
      onChange(editValue);
    } else {
      setEditValue(value);
    }
  }`;

const patched = `function handleTextSubmit() {
    setIsEditing(false);
    var v = editValue.trim();
    if (/^[0-9A-Fa-f]{3,8}$/.test(v)) v = '#' + v;
    if (HEX_COLOR_REGEX.test(v)) {
      onChange(v);
    } else {
      setEditValue(value);
    }
  }`;

if (code.includes(old)) {
  code = code.replace(old, patched);
  fs.writeFileSync(file, code);
  console.log('✓ Patched DialKit hex input');
} else if (code.includes('var v = editValue.trim()')) {
  console.log('✓ DialKit already patched');
} else {
  console.log('⚠ Could not find DialKit patch target');
}
