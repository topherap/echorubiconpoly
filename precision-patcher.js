// precision-patcher.js
// 🎯 Surgical integration patches with line-precise injection (No Babel Needed)

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const PROJECT_ROOT = path.resolve(__dirname);
const PATCH_LOG = path.join(PROJECT_ROOT, 'logs', 'integration-patches.json');

// 🔍 Auto-detect the right target for MyAI file
function detectTargetFiles() {
  const candidates = [
    "components/MyAI-global.js",
    "components/MyAI.js",
    "components/myai-global.js",
    "src/MyAI-global.js"
  ];

  const valid = candidates.find(f => fs.existsSync(path.join(PROJECT_ROOT, f)));
  if (!valid) {
    console.log(chalk.red('❌ Could not locate MyAI target file.'));
    return [];
  }

  const stats = fs.statSync(path.join(PROJECT_ROOT, valid));
  const lines = fs.readFileSync(path.join(PROJECT_ROOT, valid), 'utf8').split('\n').length;

  console.log(chalk.green(`🎯 Detected React target: ${valid}`));
  console.log(chalk.blue(`📊 ${lines} lines, ${(stats.size / 1024).toFixed(1)}KB`));

  return [
    {
      orphan: "components/legacy/DevPanel.jsx",
      targetFile: valid,
      type: "react-component"
    },
    {
      orphan: "components/legacy/ObsidianNotes.jsx",
      targetFile: valid,
      type: "react-component"
    },
    {
      orphan: "components/legacy/SettingsPanel.jsx",
      targetFile: valid,
      type: "react-component"
    },
    {
      orphan: "backend/qlib/threader/threaderEngine.js",
      targetFile: "src/memory/index.js",
      type: "function-call"
    }
  ];
}

class PrecisionPatcher {
  constructor() {
    this.patches = [];
  }

  parseFileStructure(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    return {
      content,
      lines,
      imports: this.findImports(lines),
      exports: this.findExports(lines),
      jsx: this.findJSX(lines),
      functions: this.findFunctions(lines)
    };
  }

  findImports(lines) {
    return lines.flatMap((line, i) => {
      const importMatch = line.match(/^import\s+.*?from\s+['"`](.*?)['"`]/);
      const requireMatch = line.match(/require\s*\(\s*['"`](.*?)['"`]\s*\)/);
      if (importMatch || requireMatch) {
        return [{
          line: i + 1,
          text: line.trim(),
          path: importMatch ? importMatch[1] : requireMatch[1],
          type: importMatch ? 'import' : 'require'
        }];
      }
      return [];
    });
  }

  findExports(lines) {
    return lines.flatMap((line, i) => (
      (/^export\s+|module\.exports/.test(line)) ? [{ line: i + 1, text: line.trim() }] : []
    ));
  }

  findFunctions(lines) {
    return lines.flatMap((line, i) => {
      const match = line.match(/^\s*(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:\s*function)/);
      if (match) {
        return [{ name: match[1] || match[2] || match[3], line: i + 1, text: line.trim() }];
      }
      return [];
    });
  }

  findJSX(lines) {
    const jsx = { returnStart: null, returnEnd: null, components: [] };
    let inReturn = false, parenDepth = 0;

    lines.forEach((line, i) => {
      const num = i + 1;
      if (!inReturn && line.match(/^return\s*\(/)) {
        inReturn = true;
        jsx.returnStart = num;
        parenDepth = 1;
      }
      if (inReturn) {
        parenDepth += (line.match(/\(/g) || []).length;
        parenDepth -= (line.match(/\)/g) || []).length;
        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) jsx.components.push({ name: match[1], line: num, text: line.trim() });
        if (parenDepth === 0) {
          jsx.returnEnd = num;
          inReturn = false;
        }
      }
    });
    return jsx;
  }

  generateReactPatch(orphanPath, targetFile, structure, offset = 0) {
    const name = path.basename(orphanPath, '.jsx');
    const patches = [];
    const importLine = (structure.imports.at(-1)?.line || 1) + 1 + offset;

    patches.push({
      type: 'insert',
      line: importLine,
      code: `import ${name} from './legacy/${name}.jsx';`,
      description: `Import ${name} component`
    });

    const func = structure.functions[0];
    if (func) {
      patches.push({
        type: 'insert',
        line: func.line + 2 + offset,
        code: `  const [show${name}, setShow${name}] = useState(false);`,
        description: `Add state for ${name}`
      });
    }

    const insertLine = (structure.jsx.returnStart || 100) + 50 + (offset * 50);
    patches.push({
      type: 'insert',
      line: insertLine,
      code: `        {show${name} && <${name} />}`,
      description: `Render ${name} in JSX`
    });

    return patches;
  }

  generateFunctionPatch(orphanPath, targetFile, structure) {
    const patches = [];
    const imp = structure.imports.find(i => i.path.includes('threaderEngine'));
    const func = structure.functions[0];

    if (imp && func) {
      patches.push({
        type: 'insert',
        line: func.line + 3,
        code: `  const threader = require('../../backend/qlib/threader/threaderEngine');\n  threader.initialize();`,
        description: `Initialize threader engine`
      });
    }

    return patches;
  }

  generateAllPatches() {
    const targets = detectTargetFiles();
    if (!targets.length) return;

    const grouped = targets.reduce((acc, t) => {
      (acc[t.targetFile] ||= []).push(t);
      return acc;
    }, {});

    for (const [file, orphans] of Object.entries(grouped)) {
      const fullPath = path.join(PROJECT_ROOT, file);
      if (!fs.existsSync(fullPath)) {
        console.log(chalk.red(`❌ File not found: ${file}`));
        continue;
      }

      const structure = this.parseFileStructure(fullPath);
      const all = [];

      orphans.forEach((t, i) => {
        const patches = t.type === 'react-component'
          ? this.generateReactPatch(t.orphan, file, structure, i)
          : this.generateFunctionPatch(t.orphan, file, structure);
        all.push(...patches);
      });

      this.patches.push({
        targetFile: file,
        orphans: orphans.map(o => o.orphan),
        patches: all,
        summary: {
          lines: structure.lines.length,
          imports: structure.imports.length,
          jsx: structure.jsx.components.length,
          funcs: structure.functions.length
        }
      });

      console.log(chalk.green(`✅ Patched ${file} with ${all.length} entries`));
    }
  }

  previewPatches() {
    console.log(chalk.bold('\n📋 Patch Preview:\n'));
    this.patches.forEach((fp, i) => {
      console.log(chalk.cyan(`${i + 1}. ${fp.targetFile}`));
      fp.patches.forEach((p, j) => {
        console.log(`  ${j + 1}. Line ${p.line} – ${p.description}`);
        console.log(chalk.yellow(`     ${p.code.replace(/\n/g, '\\n')}`));
      });
    });
  }

  savePatches() {
    const logDir = path.dirname(PATCH_LOG);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(PATCH_LOG, JSON.stringify({
      generated: new Date().toISOString(),
      total: this.patches.reduce((n, fp) => n + fp.patches.length, 0),
      files: this.patches
    }, null, 2));
    console.log(chalk.green(`💾 Saved to ${PATCH_LOG}`));
  }

  applyPatches() {
    console.log(chalk.bold('\n🔧 Applying Patches...\n'));
    this.patches.forEach(fp => {
      const target = path.join(PROJECT_ROOT, fp.targetFile);
      const backup = `${target}.backup-${Date.now()}`;
      fs.copyFileSync(target, backup);
      console.log(chalk.gray(`📁 Backup: ${backup}`));

      const lines = fs.readFileSync(target, 'utf8').split('\n');
      const sorted = fp.patches.sort((a, b) => b.line - a.line);

      sorted.forEach(p => {
        lines.splice(Math.min(p.line - 1, lines.length), 0, p.code);
        console.log(chalk.green(`  ✅ Inserted: ${p.description} @ line ${p.line}`));
      });

      fs.writeFileSync(target, lines.join('\n'), 'utf8');
      console.log(chalk.bold(`🎯 Updated: ${fp.targetFile}\n`));
    });
  }

  run(apply = false) {
    this.generateAllPatches();
    this.previewPatches();
    this.savePatches();
    if (apply) {
      console.log(chalk.yellow('\n⚠️  Applying changes — backups created.'));
      this.applyPatches();
    } else {
      console.log(chalk.gray('\n💡 Preview only. Use patcher.run(true) to apply.'));
    }
  }
}

// Execute
const patcher = new PrecisionPatcher();
patcher.run(false);  // Run in preview mode first
// To apply: change to `patcher.run(true);`
