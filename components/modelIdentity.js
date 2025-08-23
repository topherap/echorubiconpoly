// ==========================
// MODEL IDENTITY HELPER
// ==========================

function getModelIdentity(selectedModel, modelIdentities) {
  const identity = modelIdentities.current?.[selectedModel] || {
    name: localStorage.getItem('echo_assistant_name') || 'Q',
    systemPrompt: localStorage.getItem('echo_system_prompt') || ''
  };

  const currentUserName = localStorage.getItem('echo_user_name') || 'User';
  const aiName = identity.name || localStorage.getItem('echo_ai_name') || 'Q';

  console.log('[PIPE-IDENTITY] Resolved model identity:', {
    aiName,
    currentUserName,
    systemPrompt: identity.systemPrompt?.substring(0, 100) + '...'
  });

  return {
    aiName,
    currentUserName,
    systemPrompt: identity.systemPrompt
  };
}

module.exports = { getModelIdentity };
