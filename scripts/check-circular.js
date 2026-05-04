const fs = require('fs');
const path = require('path');

const root = process.argv[2] || '.';
const visited = new Set();
const circular = [];

function checkFile(filePath, stack = []) {
    if (stack.includes(filePath)) {
        circular.push([...stack, filePath]);
        return;
    }
    if (visited.has(filePath)) return;
    visited.add(filePath);

    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = content.match(/from ['"](@\/.*|(\.\.?\/.*))['"]/g) || [];

    for (const imp of imports) {
        let relPath = imp.match(/['"](.*)['"]/)[1];
        if (relPath.startsWith('@/')) {
            relPath = relPath.replace('@/', './');
            relPath = path.join(root, relPath);
        } else {
            relPath = path.join(path.dirname(filePath), relPath);
        }

        const possiblePaths = [
            relPath + '.ts',
            relPath + '.tsx',
            path.join(relPath, 'index.ts'),
            path.join(relPath, 'index.tsx')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                checkFile(p, [...stack, filePath]);
                break;
            }
        }
    }
}

// Start scanning from app/staff/page.tsx
checkFile(path.join(root, 'app/staff/page.tsx'));
checkFile(path.join(root, 'app/layout.tsx'));

if (circular.length > 0) {
    console.log('Circular dependencies found:');
    circular.forEach(c => console.log(c.join(' -> ')));
} else {
    console.log('No circular dependencies found starting from staff page.');
}
