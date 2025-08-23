// reconnect-orphans-safe.js
// 🧠 Bomb Squad Mode: One-by-one reconnect with safe abort

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ORPHAN_LIST = [
  "backend\\qlib\\threader\\threaderEngine.js",
  "components\\legacy\\DevPanel.jsx",
  "components\\legacy\\model-benchmarks.jsx",
  "components\\legacy\\ObsidianNotes.jsx",
  "components\\legacy\\SettingsPanel.jsx"
];

const STAGING_LOG = path.join(__dirname, 'logs', 'reconnect-staging.json');
const RESULTS = [];

function testReconnect(relPath) {
  const absPath = path.resolve(__dirname, relPath);
  try {
    const mod = require(absPath);
    if (!mod) return { status: '⚠️ No Export' };

    const exportType = typeof mod;
    const summary = {
      file: relPath,
      status: '✅ reconnected',
      exportType
    };

    // Optional: Call common testable entry points like init(), run()
    if (exportType === 'function') {
      try {
        const maybePromise = mod(); // if it returns, assume safe
        summary.callResult = 'ran';
      } catch (e) {
        summary.callError = e.message.split('\n')[0];
        summary.status = '❌ failed at call';
        return summary;
      }
    }

    return summary;
  } catch (err) {
    return {
      file: relPath,
      status: '❌ failed to require',
      error: err.message.split('\n')[0]
    };
  }
}

(async function runOneByOne() {
  console.log(chalk.bold('\n🧪 Bomb Squad Orphan Reconnect'));

  for (const file of ORPHAN_LIST) {
    const result = testReconnect(file);
    RESULTS.push(result);

    console.log(
      chalk[result.status.startsWith('✅') ? 'green' : 'red'](
        `> ${file} → ${result.status}`
      )
    );

    if (result.status.startsWith('❌')) {
      fs.writeFileSync(STAGING_LOG, JSON.stringify(RESULTS, null, 2), 'utf8');
      console.log(chalk.red('\n💥 ABORTING — failure detected, review log.'));
      console.log(`📄 Log saved to: ${STAGING_LOG}`);
      process.exit(1);
    }
  }

  fs.writeFileSync(STAGING_LOG, JSON.stringify(RESULTS, null, 2), 'utf8');
  console.log(chalk.green(`\n✅ All reconnects passed`));
  console.log(`📄 Log saved to: ${STAGING_LOG}`);
})();
