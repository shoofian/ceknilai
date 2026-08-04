const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const apiFiles = walk('src/app/api');
let modifiedCount = 0;

apiFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Flag to know if we need to add the import
  let needsAuthImport = false;
  let needsSuperadminImport = false;

  // Pattern 1: function checkAuth()
  const checkAuthPattern = /async function checkAuth\(\)\s*\{[\s\S]*?return[^}]+\}/;
  if (checkAuthPattern.test(content)) {
    content = content.replace(checkAuthPattern, '');
    needsAuthImport = true;
  }

  // Pattern 2: function checkSuperadminAuth()
  const checkSuperadminPattern = /async function checkSuperadminAuth\(\)\s*\{[\s\S]*?return[^}]+\}/;
  if (checkSuperadminPattern.test(content)) {
    content = content.replace(checkSuperadminPattern, '');
    needsSuperadminImport = true;
  }
  
  // If we removed local definitions, we must add the import statement
  if (needsAuthImport || needsSuperadminImport) {
    const imports = [];
    if (needsAuthImport) imports.push('checkAuth');
    if (needsSuperadminImport) imports.push('checkSuperadminAuth');
    
    const importStatement = `import { ${imports.join(', ')} } from '@/lib/auth';\n`;
    
    // Add import statement at the top (after other imports)
    if (content.includes('import { NextResponse }')) {
       content = content.replace(/(import { NextResponse } from 'next\/server';\n?)/, `$1${importStatement}`);
    } else {
       content = importStatement + content;
    }
    
    // Also remove any stray `import { cookies } from 'next/headers';` if it's no longer used
    if (!content.includes('cookieStore')) {
      content = content.replace(/import { cookies } from 'next\/headers';\n?/, '');
    }
    
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`Migration complete. Modified ${modifiedCount} files.`);
