const fs = require('fs').promises;
const path = require('path');

async function collectJsonFilesRecursively(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await collectJsonFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function auditCapsulePipeline(capsuleDir) {
  const issues = [];
  const results = [];
  const idMap = new Set();
  const jsonFiles = await collectJsonFilesRecursively(capsuleDir);

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
