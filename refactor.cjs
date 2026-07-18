const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
        content = content.replace(r.search, r.replace);
    });
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file, ext));
        } else if (file.endsWith(ext) || (ext === '.ts' && file.endsWith('.tsx'))) {
            results.push(file);
        }
    });
    return results;
}

// 1. WorkflowService
const pyFiles = walk('e:/Projects/NipponToyota/RecruitmentPortal/backend/app/api', '.py');
pyFiles.push('e:/Projects/NipponToyota/RecruitmentPortal/backend/app/services/workflow.py');

pyFiles.forEach(f => {
    replaceInFile(f, [
        { search: /from app\.services\.workflow import WorkflowService/g, replace: "from app.services.workflow import transition" },
        { search: /WorkflowService\.transition\(/g, replace: "transition(" },
        { search: /class WorkflowService:\n    @staticmethod\n    def transition\(/g, replace: "def transition(" }
    ]);
});

// 2. validation.ts helpers
const tsFiles = walk('e:/Projects/NipponToyota/RecruitmentPortal/frontend/src', '.ts');

tsFiles.forEach(f => {
    if (f.endsWith('validation.ts')) {
        // Remove exports
        replaceInFile(f, [
            { search: /export const digitsOnly = \(value: string, maxLen\?: number\): string => \{\n  const digits = value\.replace\(\/\\D\/g, ''\);\n  return maxLen !== undefined \? digits\.slice\(0, maxLen\) : digits;\n\};\n\n/g, replace: "" },
            { search: /export const alphanumericOnly = \(value: string, maxLen\?: number\): string => \{\n  const cleaned = value\.replace\(\/\[\^a-zA-Z0-9\]\/g, ''\)\.toUpperCase\(\);\n  return maxLen !== undefined \? cleaned\.slice\(0, maxLen\) : cleaned;\n\};\n\n/g, replace: "" },
            // Inline usages
            { search: /digitsOnly\(([^,]+),\s*([^)]+)\)/g, replace: "$1.replace(/\\D/g, '').slice(0, $2)" },
            { search: /alphanumericOnly\(([^,]+),\s*([^)]+)\)/g, replace: "$1.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, $2)" },
            { search: /digitsOnly\(([^,]+)\)/g, replace: "$1.replace(/\\D/g, '')" },
            { search: /alphanumericOnly\(([^,]+)\)/g, replace: "$1.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()" }
        ]);
    } else {
        replaceInFile(f, [
            // Inline usages FIRST
            { search: /digitsOnly\(([^,]+),\s*([^)]+)\)/g, replace: "$1.replace(/\\D/g, '').slice(0, $2)" },
            { search: /alphanumericOnly\(([^,]+),\s*([^)]+)\)/g, replace: "$1.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, $2)" },
            { search: /digitsOnly\(([^,]+)\)/g, replace: "$1.replace(/\\D/g, '')" },
            { search: /alphanumericOnly\(([^,]+)\)/g, replace: "$1.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()" },
            
            // Remove imports AFTER usages are gone
            { search: /,\s*digitsOnly/g, replace: "" },
            { search: /digitsOnly,\s*/g, replace: "" },
            { search: /digitsOnly/g, replace: "" }, 
            { search: /,\s*alphanumericOnly/g, replace: "" },
            { search: /alphanumericOnly,\s*/g, replace: "" },
            { search: /alphanumericOnly/g, replace: "" },
            { search: /import\s*\{\s*\}\s*from\s*['"].*validation['"];?\n?/g, replace: "" }
        ]);
    }
});

// 3. API client
const apiFiles = walk('e:/Projects/NipponToyota/RecruitmentPortal/frontend/src/api', '.ts');
apiFiles.forEach(f => {
    if (f.endsWith('client.ts')) {
        replaceInFile(f, [
            { search: /async function request/g, replace: "export async function request" },
            { search: /const api = \{\n  get:.*?delete:.*?\};\n\n/s, replace: "" },
            { search: /export default api;\n/g, replace: "" },
            { search: /api\.post\('/g, replace: "request('POST', '" }
        ]);
    } else {
        replaceInFile(f, [
            { search: /import api from '\.\/client';/g, replace: "import { request } from './client';" },
            { search: /api\.get\((.*?)\)/g, replace: "request('GET', $1)" },
            { search: /api\.post\((.*?)\)/g, replace: "request('POST', $1)" },
            { search: /api\.patch\((.*?)\)/g, replace: "request('PATCH', $1)" },
            { search: /api\.put\((.*?)\)/g, replace: "request('PUT', $1)" },
            { search: /api\.delete\((.*?)\)/g, replace: "request('DELETE', $1)" }
        ]);
    }
});
