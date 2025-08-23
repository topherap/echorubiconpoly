// trace-message-flow.js
const { ipcRenderer } = require('electron');

console.log("=== MESSAGE FLOW TRACER ===\n");

// Hook into IPC calls
const originalInvoke = ipcRenderer.invoke;
let callCount = 0;

ipcRenderer.invoke = async function(...args) {
    callCount++;
    console.log(`[IPC-${callCount}] Called:`, args[0]);
    
    if (args[0] === 'chat-completion') {
        console.log('[IPC] Chat completion with:', {
            messageCount: args[1]?.messages?.length,
            systemPromptPreview: args[1]?.systemPrompt?.substring(0, 100)
        });
    }
    
    if (args[0] === 'searchMemories') {
        console.log('[IPC] Search memories for:', args[1]);
    }
    
    if (args[0] === 'invoke' && args[1] === 'qlib-extract') {
        console.log('[IPC] Q-LIB CALLED with:', args[2]);
    }
    
    const result = await originalInvoke.apply(this, args);
    
    if (args[0] === 'invoke' && args[1] === 'qlib-extract') {
        console.log('[IPC] Q-LIB RETURNED:', result);
    }
    
    return result;
};

console.log("Tracer installed. Now send a message to Q and watch the IPC calls.\n");

// Also check if sendVoiceCommand exists
setTimeout(() => {
    console.log("\n=== CHECKING MESSAGE HANDLERS ===");
    console.log("sendVoiceCommand exists?", typeof window.sendVoiceCommand);
    console.log("searchVaultForContext exists?", typeof window.searchVaultForContext);
    console.log("electronAPI.searchMemories exists?", typeof window.electronAPI?.searchMemories);
    console.log("electronAPI.invoke exists?", typeof window.electronAPI?.invoke);
}, 1000);