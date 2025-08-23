// NoteTools.js — Handles note resolution and update appends for Echo memory
const fs = require('fs');
const path = require('path');

/**
 * Resolves or creates the appropriate note file for a person, topic, or concept.
 * @param {string} name - Entity name (e.g., "janice")
 * @param {string} type - Category: 'contact', 'topic', 'project'
 * @param {string} vaultRoot - Base Obsidian vault path
 * @returns {string} - Absolute resolved path
 */
function resolveNoteTarget(name, type = 'contact', vaultRoot = "D:/Obsidian Vault") {
  const targetStem = name.toLowerCase();
  const targetDir = path.join(vaultRoot, 'notes', `${type}s`);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const files = fs.readdirSync(targetDir);
  const match = files.find(f => f.toLowerCase().startsWith(targetStem));

  const resolved = match
    ? path.join(targetDir, match)
    : path.join(targetDir, `${targetStem}.md`);

  return resolved;
}

/**
 * Appends a timestamped entry to the resolved note, creating the file if needed.
 * @param {string} name - Entity or topic name
 * @param {string} content - Text to append (markdown supported)
 * @param {string} type - Type of note (contact, topic, etc.)
 * @param {string} vaultRoot - Obsidian base path
 */
function autoAppendToNote(name, content, type = 'contact', vaultRoot = "D:/Obsidian Vault") {
  const notePath = resolveNoteTarget(name, type, vaultRoot);
  const dateStr = new Date().toISOString().split('T')[0];
  const entry = `\n\n### ${dateStr}\n• ${content}\n<!-- written by Echo on ${dateStr} -->`;

  if (fs.existsSync(notePath)) {
    const existing = fs.readFileSync(notePath, 'utf8');
    fs.writeFileSync(notePath, existing + entry, 'utf8');
  } else {
    const header = `# ${name.charAt(0).toUpperCase() + name.slice(1)}\n`;
    fs.writeFileSync(notePath, header + entry, 'utf8');
  }

  return notePath;
}

module.exports = {
  resolveNoteTarget,
  autoAppendToNote
};
