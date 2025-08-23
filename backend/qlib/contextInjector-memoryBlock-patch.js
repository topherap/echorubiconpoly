// 🧠 Patch: Enhanced buildMemoryContext (Ariadne v2.0)

function buildMemoryContext(capsules = []) {
  const lines = ['### Relevant memories from past conversations:'];

  capsules.forEach((cap, index) => {
    if (!cap || typeof cap !== 'object' || !cap.timestamp) return;

    const timeAgo = getTimeAgo(cap.timestamp);
    const speaker = cap.speaker || 'Unknown';
    const prompt = cap.prompt || cap.input || '[no prompt]';
    const response = cap.response || '[no response]';
    const emotions = cap.meta?.emotions || cap.emotional_markers || [];
    const folder = cap.meta?.folder || '[unknown folder]';
    const threadId = cap.threadId || cap.meta?.threadId || null;
    const summary = cap.summary || cap.meta?.summary || null;

    lines.push(`\\n[Memory ${index + 1} - ${timeAgo}]`);
    lines.push(`Folder: ${folder}`);
    if (threadId) lines.push(`Thread ID: ${threadId}`);
    lines.push(`Speaker: ${speaker}`);
    lines.push(`Prompt: ${prompt}`);
    lines.push(`Response: ${response}`);
    if (summary) lines.push(`Summary: ${summary}`);
    if (Array.isArray(emotions) && emotions.length > 0) {
      lines.push(`Emotional context: ${emotions.join(', ')}`);
    }
  });

  return lines.join('\\n');
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const hours = Math.floor((now - then) / (1000 * 60 * 60));

  if (isNaN(hours)) return 'unknown';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'last week';
  if (weeks < 4) return `${weeks} weeks ago`;

  return 'over a month ago';
}

module.exports = { buildMemoryContext };