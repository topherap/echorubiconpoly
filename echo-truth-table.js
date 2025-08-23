// echo-truth-table.js
// 📊 Echo memory and UI diagnostic

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ROOT = __dirname;
const LOG_PATH = path.join(ROOT, 'logs', 'echo-truth-table.json');

const CHECKS = [
  {
    file: 'components/MyAI-global.js',
    checks: {
      mounted: content => content.includes('ReactDOM.render') || content.includes('return h('),
      devPanelVisible: content => content.includes('showDevPanel') && content.includes('DevPanel'),
      usesVault: content => content.includes('vaultPath') || content.includes('capsule') || content.includes('contextInjection')
    }
  },
  {
    file: 'backend/qlib/QLibInterface.js',
    checks: {
      exists: () => true,
      returnsFacts: content => content.includes('return') && content.includes('facts')
    }
  },
  {
    file: 'MemoryOrchestrator.js',
    checks: {
      injectsCapsules: content => content.includes('injectCapsules') || content.includes('capsuleBuilder'),
      promptConnected: content => content.includes('systemPrompt') || content.includes('finalPrompt')
    }
  },
  {
    file: 'components/SettingsPanel-global.js',
    checks: {
      mounted: content => content.includes('ReactDOM.render') && content.includes('SettingsPanelWrapper'),
      memoryAware: content => content.includes('context') || content.includes('capsule') || content.includes('qlib')
    }
  },
  {
    file: 'components/legacy/DevPanel.jsx',
    checks: {
      present: () => true,
      hookedToMemory: content => content.includes('capsule') || content.includes('context') || content.includes('vaultData'),
      renders: content => content.includes('return') && content.includes('div')
    }
  },
  {
    file: 'components/legacy/ObsidianNotes.jsx',
    checks: {
      present: () => true,
      activelyUsed: content => content.includes('useEffect') || content.includes('loadVault') || content.includes('obsidian'),
      mounted: content => content.includes('ReactDOM.render') || content.includes('<ObsidianNotes')
    }
  }
];

function safeRead(file) {
  try {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return { file, missing: true };
    return {
      file,
      content: fs.readFileSync(full, 'utf8')
    };
  } catch (err) {
    return { file, error: err.message };
  }
}

function runDiagnostics() {
  const report = {};

  CHECKS.forEach(({ file, checks }) => {
    const { content, missing } = safeRead(file);
    const result = {};

    if (missing) {
      Object.keys(checks).forEach(k => result[k] = false);
    } else {
      for (const [label, fn] of Object.entries(checks)) {
        try {
          result[label] = fn(content);
        } catch (e) {
          result[label] = false;
        }
      }
    }

    report[file] = result;
  });

  fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(chalk.bold('\n📊 Echo Truth Table Diagnostic'));
  console.table(Object.entries(report).map(([f, v]) => {
    return {
      File: f,
      ...v
    };
  }));

  console.log(chalk.green(`\n📄 Saved to: logs/echo-truth-table.json`));
}

runDiagnostics();
