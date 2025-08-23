// getRecentMessages.js - Utility for slicing recent conversation context

function getRecentMessages(messages, options = {}) {
  const {
    depth = 5,         // default for long-form or technical chats
    roleFilter = null, // optional: filter by role (e.g., 'user' or 'assistant')
    trimEmpty = true   // remove empty content if enabled
  } = options;

  if (!Array.isArray(messages)) return [];

  let recent = messages.slice(-depth);

  if (trimEmpty) {
    recent = recent.filter(msg => msg?.content?.trim?.().length > 0);
  }

  if (roleFilter) {
    recent = recent.filter(msg => msg.role === roleFilter);
  }

  return recent;
}

module.exports = { getRecentMessages };
