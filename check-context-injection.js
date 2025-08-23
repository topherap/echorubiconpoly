// check-context-injection.js
// Diagnose why folder/file clicks don't inject context

const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING CONTEXT INJECTION MECHANISMS\n');
console.log('=' .repeat(50));

// 1. Check ProjectSidebar handlers
console.log('\n📁 [1] PROJECT SIDEBAR HANDLERS:\n');

const sidebarHandlerPath = path.join(__dirname, 'components/ProjectSidebar/projectSidebarHandlers.js');
if (fs.existsSync(sidebarHandlerPath)) {
    const sidebarContent = fs.readFileSync(sidebarHandlerPath, 'utf8');
    
    // Check for folder click handler
    if (sidebarContent.includes('folder:click') || sidebarContent.includes('folderClick')) {
        console.log('✅ Folder click handler exists');
        
        // Check what it does
        const setContextMatch = sidebarContent.match(/setContext|updateContext|injectContext/gi);
        if (setContextMatch) {
            console.log('✅ Folder handler sets context');
        } else {
            console.log('❌ Folder handler does NOT set context');
        }
    } else {
        console.log('❌ No folder click handler found');
    }
    
    // Check for file click handler
    if (sidebarContent.includes('file:click') || sidebarContent.includes('fileClick')) {
        console.log('✅ File click handler exists');
    } else {
        console.log('❌ No file click handler found');
    }
} else {
    console.log('❌ ProjectSidebar handlers file not found');
}

// 2. Check IPC handlers for context management
console.log('\n📡 [2] IPC CONTEXT HANDLERS:\n');

const ipcPath = path.join(__dirname, 'main/ipc-handlers.js');
const ipcContent = fs.readFileSync(ipcPath, 'utf8');

const contextHandlers = [
    'project:set-current',
    'project:get-current',
    'context:set-file',
    'context:set-folder',
    'file:load-content',
    'folder:load-contents'
];

contextHandlers.forEach(handler => {
    if (ipcContent.includes(`'${handler}'`)) {
        console.log(`✅ ${handler} handler exists`);
        
        // Check if it updates global context
        const handlerMatch = ipcContent.match(new RegExp(`safeHandle\\('${handler}'[\\s\\S]*?\\}\\);`, 'm'));
        if (handlerMatch && handlerMatch[0].includes('global.')) {
            console.log(`   → Updates global state`);
        }
    } else {
        console.log(`❌ ${handler} handler missing`);
    }
});

// 3. Check global context state
console.log('\n🌍 [3] GLOBAL CONTEXT VARIABLES:\n');

const globalVars = [
    'global.currentProject',
    'global.currentFile',
    'global.currentFolder',
    'global.fileContext',
    'global.folderContext'
];

globalVars.forEach(varName => {
    const regex = new RegExp(varName.replace('.', '\\.'), 'g');
    const matches = ipcContent.match(regex);
    if (matches) {
        console.log(`✅ ${varName} used ${matches.length} times`);
    } else {
        console.log(`❌ ${varName} not found`);
    }
});

// 4. Check chat-completion handler for context usage
console.log('\n💬 [4] CHAT HANDLER CONTEXT USAGE:\n');

const chatHandlerStart = ipcContent.indexOf("safeHandle('chat-completion'");
if (chatHandlerStart > 0) {
    const chatHandlerEnd = ipcContent.indexOf("});", chatHandlerStart);
    const chatHandler = ipcContent.substring(chatHandlerStart, chatHandlerEnd);
    
    // Check if it reads any context
    const contextChecks = [
        { pattern: /global\.currentProject/g, name: 'Project context' },
        { pattern: /global\.currentFile/g, name: 'File context' },
        { pattern: /global\.currentFolder/g, name: 'Folder context' },
        { pattern: /global\.fileContext/g, name: 'File content' },
        { pattern: /options\.project/g, name: 'Options.project' }
    ];
    
    contextChecks.forEach(check => {
        if (chatHandler.match(check.pattern)) {
            console.log(`✅ Uses ${check.name}`);
        } else {
            console.log(`❌ Does NOT use ${check.name}`);
        }
    });
}

// 5. Check if context would be injected IF it existed
console.log('\n💉 [5] CONTEXT INJECTION POINTS:\n');

// Look for where context WOULD be added to messages
const injectionPatterns = [
    /if \(.*?fileContext.*?\)/,
    /if \(.*?folderContext.*?\)/,
    /if \(.*?currentProject.*?\)/,
    /messages\.push.*?fileContext/,
    /messages\[.*?\]\.content.*?\+=/
];

let foundInjectionPoint = false;
injectionPatterns.forEach(pattern => {
    if (ipcContent.match(pattern)) {
        foundInjectionPoint = true;
        const match = ipcContent.match(pattern);
        console.log(`✅ Found injection pattern: ${match[0].substring(0, 50)}...`);
    }
});

if (!foundInjectionPoint) {
    console.log('❌ No context injection patterns found');
    console.log('   Even if context is set, it won\'t be added to prompts!');
}

// 6. Recommendations
console.log('\n💡 [6] RECOMMENDATIONS:\n');

console.log('For folder context injection:');
console.log('1. Add folder click handler in ProjectSidebar');
console.log('2. Create IPC handler "context:set-folder"');
console.log('3. Store folder contents in global.folderContext');
console.log('4. Inject folder context in chat-completion handler');

console.log('\nFor consistent Q-lib injection:');
console.log('1. Ensure project context is passed to Q-lib search');
console.log('2. Always inject Q-lib results when found');
console.log('3. Don\'t rely on vault keywords alone - check for Q-lib results');