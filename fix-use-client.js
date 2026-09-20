const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('"use client";') || content.includes("'use client';")) {
    if (!content.trim().startsWith('"use client"') && !content.trim().startsWith("'use client'")) {
      console.log('Fixing use client in', file);
      content = content.replace(/"use client";?\n?/g, '');
      content = content.replace(/'use client';?\n?/g, '');
      content = '"use client";\n' + content.trimStart();
      fs.writeFileSync(file, content);
    }
  }
}
