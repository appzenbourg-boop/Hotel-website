const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDirs = ['app', 'components', 'lib'];

targetDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath, (filePath) => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace $ with ₹ but NOT if $ is followed by { (template literal)
        // Also avoid replacing inside comments if possible, but user asked for everywhere.
        // Re-check: user says "everywhere rupee is mentioned in the dolar I want it inrupee only"
        
        // Regex to match literal $ not followed by {
        // Use negative lookahead
        let newContent = content.replace(/\$(?!\{)/g, '₹');
        
        if (content !== newContent) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Updated: ${filePath}`);
        }
      }
    });
  }
});
