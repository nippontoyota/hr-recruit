const fs = require('fs');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('e:/Projects/NipponToyota/RecruitmentPortal/frontend/src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Remove digitsOnly and alphanumericOnly imports
    content = content.replace(/,\s*digitsOnly/g, "");
    content = content.replace(/digitsOnly,\s*/g, "");
    content = content.replace(/digitsOnly/g, ""); // if it's the only import, we might have empty {}, we'll fix below
    
    content = content.replace(/,\s*alphanumericOnly/g, "");
    content = content.replace(/alphanumericOnly,\s*/g, "");
    content = content.replace(/alphanumericOnly/g, "");
    
    // Fix empty imports (e.g. import {  } from '../lib/validation')
    content = content.replace(/import\s*{\s*}\s*from\s*['"].*validation['"];?\n?/g, "");

    // Inline usages: digitsOnly(val) -> val.replace(/\D/g, '')
    // alphanumericOnly(val) -> val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    content = content.replace(/digitsOnly\(([^)]+)\)/g, "$1.replace(/\\D/g, '')");
    content = content.replace(/alphanumericOnly\(([^)]+)\)/g, "$1.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()");

    fs.writeFileSync(f, content);
});
