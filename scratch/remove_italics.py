import os
import re

def remove_italics(directory):
    exclude_dirs = {'.next', 'node_modules', '.git', 'prisma'}
    for root, dirs, files in os.walk(directory):
        # In-place modify dirs to exclude certain directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 1. Remove style: 'italic'
                    new_content = re.sub(r",?\s*style:\s*['\"]italic['\"],?", "", content)
                    # 2. Remove className="... italic ..."
                    new_content = re.sub(r'\bitalic\b', '', new_content)
                    
                    if content != new_content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated: {path}")
                except Exception as e:
                    print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    remove_italics(r"c:\Users\harsh\OneDrive\Desktop\New folder (5)\hotel")
