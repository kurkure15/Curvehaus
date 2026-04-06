// Patches DialKit for:
// 1. ColorControl to accept hex codes without # prefix
// 2. SelectControl trigger + options to work on Safari mobile (onTouchEnd)
// 3. ColorControl swatch + hex label to work on Safari mobile
const fs = require('fs');
const path = require('path');

// Patch both ESM and CJS
['index.js', 'index.cjs'].forEach(filename => {
  const file = path.join(__dirname, '..', 'node_modules', 'dialkit', 'dist', filename);
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Hex input patch
  const oldHex = `function handleTextSubmit() {
    setIsEditing(false);
    if (HEX_COLOR_REGEX.test(editValue)) {
      onChange(editValue);
    } else {
      setEditValue(value);
    }
  }`;

  const newHex = `function handleTextSubmit() {
    setIsEditing(false);
    var v = editValue.trim();
    if (/^[0-9A-Fa-f]{3,8}$/.test(v)) v = '#' + v;
    if (HEX_COLOR_REGEX.test(v)) {
      onChange(v);
    } else {
      setEditValue(value);
    }
  }`;

  if (code.includes(oldHex)) {
    code = code.replace(oldHex, newHex);
    changed = true;
    console.log(`✓ [${filename}] Patched hex input`);
  }

  // 2. Select trigger: add onTouchEnd
  const oldTrigger = 'className: "dialkit-select-trigger",\n        onTouchEnd: (e) => { e.preventDefault(); setIsOpen(!isOpen); },\n        onClick: () => setIsOpen(!isOpen),';
  const oldTriggerUnpatched = 'className: "dialkit-select-trigger",\n        onClick: () => setIsOpen(!isOpen),';
  const newTrigger = 'className: "dialkit-select-trigger",\n        onTouchEnd: (e) => { e.preventDefault(); setIsOpen(!isOpen); },\n        onClick: () => setIsOpen(!isOpen),';

  if (code.includes(oldTrigger)) {
    console.log(`- [${filename}] Select trigger already patched`);
  } else if (code.includes(oldTriggerUnpatched)) {
    code = code.replace(oldTriggerUnpatched, newTrigger);
    changed = true;
    console.log(`✓ [${filename}] Patched select trigger touch`);
  }

  // 3. Select options: add onTouchEnd
  const oldOptionPatched = `onTouchEnd: (e) => { e.preventDefault(); onChange(option.value); setIsOpen(false); },
              onClick: () => {`;
  const oldOption = `className: "dialkit-select-option",
              "data-selected": String(option.value === value),
              onClick: () => {
                onChange(option.value);
                setIsOpen(false);
              },`;
  const newOption = `className: "dialkit-select-option",
              "data-selected": String(option.value === value),
              onTouchEnd: (e) => { e.preventDefault(); onChange(option.value); setIsOpen(false); },
              onClick: () => {
                onChange(option.value);
                setIsOpen(false);
              },`;

  if (code.includes(oldOptionPatched)) {
    console.log(`- [${filename}] Select option already patched`);
  } else if (code.includes(oldOption)) {
    code = code.replace(oldOption, newOption);
    changed = true;
    console.log(`✓ [${filename}] Patched select option touch`);
  }

  // 4. Color swatch button: add onTouchEnd
  const oldSwatch = `className: "dialkit-color-swatch",
          style: { backgroundColor: value },
          onClick: () => colorInputRef.current?.click(),`;
  const newSwatch = `className: "dialkit-color-swatch",
          style: { backgroundColor: value },
          onTouchEnd: (e) => { e.preventDefault(); colorInputRef.current?.click(); },
          onClick: () => colorInputRef.current?.click(),`;

  if (code.includes(newSwatch)) {
    console.log(`- [${filename}] Color swatch already patched`);
  } else if (code.includes(oldSwatch)) {
    code = code.replace(oldSwatch, newSwatch);
    changed = true;
    console.log(`✓ [${filename}] Patched color swatch touch`);
  }

  // 5. Color hex label: add onTouchEnd
  const oldHexLabel = `className: "dialkit-color-hex",
          onClick: () => setIsEditing(true),`;
  const newHexLabel = `className: "dialkit-color-hex",
          onTouchEnd: (e) => { e.preventDefault(); setIsEditing(true); },
          onClick: () => setIsEditing(true),`;

  if (code.includes(newHexLabel)) {
    console.log(`- [${filename}] Color hex label already patched`);
  } else if (code.includes(oldHexLabel)) {
    code = code.replace(oldHexLabel, newHexLabel);
    changed = true;
    console.log(`✓ [${filename}] Patched color hex label touch`);
  }

  if (changed) {
    fs.writeFileSync(file, code);
    console.log(`✓ [${filename}] Saved`);
  } else {
    console.log(`- [${filename}] No changes needed`);
  }
});
