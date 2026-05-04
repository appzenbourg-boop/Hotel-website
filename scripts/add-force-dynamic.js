// Script to add `export const dynamic = 'force-dynamic'` to all API route files
const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, '..', 'app', 'api')

function getAllRouteFiles(dir) {
    let results = []
    const items = fs.readdirSync(dir)
    for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            results = results.concat(getAllRouteFiles(fullPath))
        } else if (item === 'route.ts' || item === 'route.js') {
            results.push(fullPath)
        }
    }
    return results
}

const files = getAllRouteFiles(apiDir)
let patched = 0

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')

    // Skip if already has force-dynamic
    if (content.includes('force-dynamic')) {
        console.log(`⏭️  SKIP: ${path.relative(process.cwd(), file)}`)
        continue
    }

    // Find the last import line and insert after it
    const lines = content.split('\n')
    let lastImportIndex = -1
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('const ')) {
            lastImportIndex = i
        } else if (lastImportIndex >= 0 && lines[i].trim() === '' && i > lastImportIndex + 1) {
            break
        }
    }

    if (lastImportIndex === -1) {
        // Just prepend to file
        const newContent = `\nexport const dynamic = 'force-dynamic'\n\n` + content
        fs.writeFileSync(file, newContent, 'utf8')
    } else {
        // Insert after last import block
        lines.splice(lastImportIndex + 1, 0, `\nexport const dynamic = 'force-dynamic'`)
        fs.writeFileSync(file, lines.join('\n'), 'utf8')
    }

    console.log(`✅ PATCHED: ${path.relative(process.cwd(), file)}`)
    patched++
}

console.log(`\n🎉 Done! Patched ${patched} files.`)
