const fs = require('fs');
const path = require('path');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove <Sparkles ... /> or <Sparkles>...</Sparkles>
    content = content.replace(/<Sparkles[^>]*\/>/g, '');
    content = content.replace(/<Sparkles[^>]*>.*?<\/Sparkles>/g, '');
    
    // Also remove Sparkles from lucide-react imports to avoid unused import errors
    if (content.includes('lucide-react')) {
        content = content.replace(/\bSparkles\s*,?\s*/g, '');
        // Clean up empty braces like import { } from 'lucide-react'
        content = content.replace(/import\s*{\s*}\s*from\s*['"]lucide-react['"];?/g, '');
        // Clean up trailing commas in imports
        content = content.replace(/,\s*}/g, ' }');
    }

    // specific case for arrays like { icon: Sparkles }
    // if we just removed Sparkles from import, it will fail.
    // Replace `icon: Sparkles` with `icon: Star`
    content = content.replace(/icon:\s*Sparkles/g, 'icon: Star');
    // Also `Icon: Sparkles`
    content = content.replace(/Icon:\s*Sparkles/g, 'Icon: Star');
    
    // In settings/page.tsx: PLAN_ICONS: Record<string, any> = { BASE: Star, ..., ENTERPRISE: Sparkles }
    content = content.replace(/ENTERPRISE:\s*Sparkles/g, 'ENTERPRISE: Star');

    // In amenities/page.tsx: { value: 'Sparkles', label: 'Toiletries', icon: Sparkles, category: 'Bathroom' }
    // we'll just leave it or replace it
    content = content.replace(/value:\s*'Sparkles'/g, "value: 'Toiletries'");

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated', file);
    }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
        walk(file);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(file);
    }
  });
}

walk('c:/Users/haris/OneDrive/Desktop/zenbourg/websitefinal/Hotel-website/app');
walk('c:/Users/haris/OneDrive/Desktop/zenbourg/websitefinal/Hotel-website/components');
console.log('Done removing Sparkles.');
