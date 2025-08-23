// ==========================
// CONVERSATION PARSER
// ==========================

function getConversationContext(messages, sliceCount = 4) {
  // Take last N messages (default: 4 = last 2 exchanges)
  const recentMessages = messages.slice(-sliceCount);

  // Map into role-prefixed string: "user: text"
  const conversationContext = recentMessages.map(m =>
    `${m.role}: ${m.content}`
  ).join('\n');

  // Debug log
  console.log('[PIPE-CONTEXT] Recent context lines:', recentMessages.length);
  console.log('[PIPE-CONTEXT] Preview:\n', conversationContext.substring(0, 250));

  return conversationContext;
}

module.exports = { getConversationContext };
