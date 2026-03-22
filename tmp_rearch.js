const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/Wellington Luiz/Documents/Jarvis';

// Create directories
['src/core', 'src/infra/main', 'src/infra/ipc', 'src/ui', 'src/ai', 'src/modules/audio', 'src/automation'].forEach(d => {
  fs.mkdirSync(path.join(ROOT, d), { recursive: true });
});

// Full mapping
const fileMap = {
  // Core
  'src/backend/utils/logger.ts': 'src/core/logger.ts',
  'src/backend/utils/config.ts': 'src/core/config.ts',
  'src/backend/core/intentParser.ts': 'src/core/intentParser.ts',
  'src/backend/core/fastPathRouter.ts': 'src/core/fastPathRouter.ts',

  // Infra
  'src/main/main.ts': 'src/infra/main/main.ts',
  'src/main/preload.ts': 'src/infra/ipc/preload.ts',

  // AI
  'src/backend/services/llmService.ts': 'src/ai/llmService.ts',
  'src/backend/services/whisperService.ts': 'src/ai/whisperService.ts',
  'src/backend/services/ttsService.ts': 'src/ai/ttsService.ts',
  'src/backend/services/ragService.ts': 'src/ai/ragService.ts',
  'src/backend/services/synapseService.ts': 'src/ai/synapseService.ts',

  // Modules
  'src/backend/services/memoryService.ts': 'src/modules/memoryService.ts',
  'src/backend/services/learningService.ts': 'src/modules/learningService.ts',
  'src/backend/audio/voiceListener.ts': 'src/modules/audio/voiceListener.ts',
  'src/backend/audio/hotwordService.ts': 'src/modules/audio/hotwordService.ts',
  'src/backend/audio/clapDetector.ts': 'src/modules/audio/clapDetector.ts',

  // Automation / Features (Temporary home for Command Executor before SPLIT)
  'src/backend/core/commandExecutor.ts': 'src/automation/commandExecutor.ts'
};

// UI files (dynamic)
const rendererDir = path.join(ROOT, 'src/renderer');
function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else { 
        results.push(file);
      }
    });
  } catch(e){}
  return results;
}

if (fs.existsSync(rendererDir)) {
  walk(rendererDir).forEach(f => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const newRel = rel.replace(/^src\/renderer\//, 'src/ui/');
    fileMap[rel] = newRel;
    const newDir = path.dirname(path.join(ROOT, newRel));
    fs.mkdirSync(newDir, { recursive: true });
  });
}

// Map old absolute path (without extension) -> new absolute path (without extension)
const resolutionMap = {};
for (const [oldPath, newPath] of Object.entries(fileMap)) {
  const oldKey = path.join(ROOT, oldPath).replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
  const newKey = path.join(ROOT, newPath).replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
  resolutionMap[oldKey] = newKey;
}

// Actually move the files
for (const [oldPath, newPath] of Object.entries(fileMap)) {
  const absOld = path.join(ROOT, oldPath);
  const absNew = path.join(ROOT, newPath);
  if (fs.existsSync(absOld)) {
     fs.copyFileSync(absOld, absNew);
  } else {
     console.log('Skipping missing source (already moved?): ' + absOld);
  }
}

// Update imports
const allNewFiles = Object.values(fileMap).map(p => path.join(ROOT, p));
// Database files not moved but still need import updates
const dbFiles = [
  path.join(ROOT, 'src/database/db.ts'),
  path.join(ROOT, 'src/database/schema.sql')
];
const filesToProcess = [...allNewFiles, ...dbFiles];

filesToProcess.forEach(file => {
  if (!fs.existsSync(file)) return;
  if (!file.endsWith('.ts') && !file.endsWith('.html')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (file.endsWith('.ts')) {
     const importRegex = /(from\s+['"]|import\s*\(\s*['"]|require\s*\(\s*['"])([^'"]+)(['"])/g;
     content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
       if (importPath.startsWith('.')) {
         // Determine original path of the current file
         const relFile = path.relative(ROOT, file).replace(/\\/g, '/');
         const oldRelFile = Object.keys(fileMap).find(k => fileMap[k] === relFile) || relFile;
         const oldDir = path.dirname(path.join(ROOT, oldRelFile));
         
         const oldImportAbs = path.resolve(oldDir, importPath).replace(/\\/g, '/');
         
         if (resolutionMap[oldImportAbs]) {
             const newFileDir = path.dirname(file);
             let newRelImport = path.relative(newFileDir, resolutionMap[oldImportAbs]).replace(/\\/g, '/');
             if (!newRelImport.startsWith('.')) newRelImport = './' + newRelImport;
             return `${prefix}${newRelImport}${suffix}`;
         }
       }
       return match;
     });
  }
  
  if (file.endsWith('.html')) {
     content = content.replace(/renderer\//g, 'ui/');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

// Clean up old directories
const toDel = [
  'src/backend', 'src/main', 'src/renderer'
];
toDel.forEach(d => {
  const p = path.join(ROOT, d);
  try { if(fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); } catch(e){}
});

// Update package.json
const pkgPath = path.join(ROOT, 'package.json');
let pkg = fs.readFileSync(pkgPath, 'utf8');
pkg = pkg.replace(/"main": "dist\/main\/main.js"/, '"main": "dist/infra/main/main.js"');
pkg = pkg.replace(/"src\/renderer\/\*\*\/\*"/, '"src/ui/**/*"');
fs.writeFileSync(pkgPath, pkg, 'utf8');

console.log("Architecture migration complete!");
