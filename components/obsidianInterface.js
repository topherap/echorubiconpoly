// obsidianInterface.js

const path = require('path');
const fs = require('fs');
const { logToObsidianMaster } = require('./utils/logToObsidianMaster');

// ----------------------------
// Read note from vault
// ----------------------------
async function readNote(filename, {
  isPrivateAuthenticated = true,
  setSelectedObsidianNote,
  setObsidianNoteContent,
  setConversationContext,
  setStatus,
  setIsEditMode,
  setPrivatePendingAction,
  setShowPassphraseModal
}) {
  console.log('[DEBUG-OBSIDIAN-CLICK] Note clicked:', filename);

  if (filename.startsWith('private/') && !isPrivateAuthenticated) {
    setPrivatePendingAction(() => () => readNote(filename));
    setShowPassphraseModal(true);
    setStatus('Private content requires passphrase');
    return;
  }

  setSelectedObsidianNote(filename);
  setIsEditMode(false);
  setObsidianNoteContent('Loading...');

  if (window.electronAPI?.readNote) {
    try {
      const content = await window.electronAPI.readNote(filename);
      console.log('[DEBUG-OBSIDIAN-CLICK] Loaded:', filename, content?.length || 0, 'chars');
      setObsidianNoteContent(content || '');

      if (!filename.startsWith('conversations/')) {
        let noteTitle = filename.split('/').pop().replace('.md', '').replace(/-/g, ' ');
        noteTitle = noteTitle.replace(/\b\w/g, l => l.toUpperCase());
        setConversationContext('Currently viewing: ' + noteTitle);
        setStatus('Context: ' + noteTitle);
      } else {
        setStatus('Viewing: ' + filename.replace('conversations/', ''));
      }
    } catch (err) {
      console.error('[DEBUG-OBSIDIAN-CLICK] Error reading note:', err);
      setObsidianNoteContent('Error loading note: ' + err.message);
      setStatus('Failed to load note');
    }
  } else {
    setObsidianNoteContent('');
    console.warn('[DEBUG-OBSIDIAN-CLICK] Cannot read - bridge not available');
    setStatus('Note reading not available');
  }
}

// ----------------------------
// Write note to vault
// ----------------------------
async function writeNote(filename, content, {
  setStatus,
  setIsSavingNote,
  setIsEditMode
}) {
  console.log('[DEBUG-OBSIDIAN-SAVE] Saving note:', filename);

  if (filename && window.electronAPI?.writeNote) {
    try {
      setIsSavingNote(true);
      setStatus('Saving...');
      await window.electronAPI.writeNote(filename, content);
      console.log('[DEBUG-OBSIDIAN-SAVE] Note saved successfully');
      setStatus('Note saved successfully');
      setIsEditMode(false);
    } catch (err) {
      console.error('[DEBUG-OBSIDIAN-SAVE] Error saving note:', err);
      setStatus('Failed to save note: ' + err.message);
    } finally {
      setIsSavingNote(false);
    }
  }
}

// ----------------------------
// Save a chat conversation as .md note
// ----------------------------
async function saveChatNote(messages) {
  console.log('[DEBUG-SAVE-TO-VAULT] Saving conversation to vault');

  if (!messages || messages.length < 2) return;

  const title = messages[0]?.content.slice(0, 50).replace(/[^\w\s]/g, '') || 'Untitled Conversation';
  const content = messages.map(m => `**${m.role}**: ${m.content}`).join('\n\n');
  const tags = ['conversation', 'echo', new Date().toISOString().split('T')[0]];

  const filename = title.replace(/\s+/g, '-').toLowerCase() + '.md';
  const folder = path.join('obsidian-vault', 'conversations');
  const fullPath = path.join(folder, filename);

  try {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    logToObsidianMaster({
      model: 'system',
      prompt: 'Saved conversation to vault',
      response: fullPath
    });
    console.log('[DEBUG-SAVE-TO-VAULT] Conversation saved:', fullPath);
  } catch (err) {
    console.error('[DEBUG-SAVE-TO-VAULT] Failed:', err);
  }
}

// ----------------------------
// Inject note into AI context
// ----------------------------
function injectNoteAsSystemContext(note, setMessages, showNotification) {
  console.log('[DEBUG-LOAD-NOTE] Loading note into chat:', note?.title);
  if (!note?.content) return;

  const contextMessage = {
    role: 'system',
    content: `Context from vault note "${note.title}":\n\n${note.content}`
  };

  setMessages(prev => [contextMessage, ...prev]);
  if (showNotification) {
    showNotification(`Loaded "${note.title}" into context`, 'info');
  }
}

module.exports = {
  readNote,
  writeNote,
  saveChatNote,
  injectNoteAsSystemContext
};
