export function logToObsidianMaster({ model = 'unknown', prompt = '', response = '' }) {
  if (!window.myai?.saveObsidianNote) {
    console.warn('🛑 Obsidian bridge not available.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${today} - master-sync-log.md`;

  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const logBlock = `### ${model}\n🕒 ${time}\n\n**Prompt:** ${prompt.trim()}\n\n**Response:**\n${response.trim()}\n\n---\n`;

  const previous = window.myai.readObsidianNote?.(filename) || '';
  const updated = previous + '\n' + logBlock;

  const success = window.myai.saveObsidianNote(filename, updated);
  if (success) {
    console.log(`✅ Synced log to ${filename}`);
  } else {
    console.error(`❌ Failed to sync to ${filename}`);
  }
}
