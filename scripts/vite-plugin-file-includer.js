import fs from 'fs';
import path from 'path';

export default function multiFileIncluderPlugin() {
  return {
    name: 'multi-file-includer-plugin',
    transform(code, id) {
      // Only process JavaScript files, adjust pattern as needed
      if (!id.endsWith('.tmpl')) return;

      // Regex to find each `// STARTFILE: filename` and `// ENDFILE: filename` block
      const fileIncludeRegex = /\/\/ STARTFILE: (.+?)\n([\s\S]*?)\/\/ ENDFILE: \1/g;

      // Replace each matched block with the content of the specified file
      const updatedCode = code.replace(fileIncludeRegex, (match, filename) => {
        try {
          // Resolve the file path relative to the directory of the structure file
          const filePath = path.resolve(path.dirname(id), filename.trim());
          
          // Read the content of the specified file
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Insert file content, preserving the STARTFILE and ENDFILE markers
          return `// STARTFILE: ${filename}\n${fileContent}\n// ENDFILE: ${filename}`;
        } catch (err) {
          // Log any error (e.g., file not found) and leave the section as-is
          console.warn(`Warning: Could not read file "${filename}". Skipping inclusion.`);
          return match;
        }
      });

      // Return the modified code to Vite for further processing
      return {
        code: updatedCode,
        map: null, // No need for source maps in this case
      };
    },
  };
}