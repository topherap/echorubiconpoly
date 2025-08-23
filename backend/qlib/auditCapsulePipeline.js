const fs = require('fs').promises;
const path = require('path');

async function getAllJsonFiles(dir) {
  let files = [];
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(await getAllJsonFiles(fullPath));
      } else if (stat.isFile() && fullPath.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error('Failed to read directory:', dir, err.message);
  }
  return files;
}

async function auditCapsulePipeline(capsuleDir) {
  const issues = [];
  const results = [];
  const idMap = new Set();
  const jsonFiles = await getAllJsonFiles(capsuleDir);

  console.log(`Found ${jsonFiles.length} .json files in ${capsuleDir}`);

  for (const filePath of jsonFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const capsule = JSON.parse(raw);

      const id = capsule.id || 'missing-id';
      const summary = capsule.summary || '';
      const input = capsule.input || '';
      const tags = capsule.tags || [];
      const source = capsule.metadata?.sourceFile || 'unknown';
      const overwrites = capsule.metadata?.overwrites || null;

      const record = {
        id,
        source,
        hasInput: !!input.trim(),
        hasSummary: !!summary.trim(),
        tagCount: tags.length,
        overwrites,
        file: filePath
      };

      if (idMap.has(id)) {
        issues.push({ type: 'duplicate-id', id, file: filePath });
      } else {
        idMap.add(id);
      }

      if (!summary && !input) {
        issues.push({ type: 'empty-capsule', id, file: filePath });
      }

      if (!tags.length) {
        issues.push({ type: 'untagged', id, file: filePath });
      }

      if (overwrites && !idMap.has(overwrites)) {
        issues.push({ type: 'broken-overwrite', id, target: overwrites, file: filePath });
      }

      results.push(record);
    } catch (err) {
      issues.push({ type: 'parse-fail', file: filePath, error: err.message });
    }
  }

  return { results, issues };
}

module.exports = { auditCapsulePipeline };
