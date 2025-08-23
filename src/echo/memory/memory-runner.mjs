#!/usr/bin/env node
// memory-runner.mjs - ESM process for memory system

// Suppress the module type warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'MODULE_TYPELESS_PACKAGE_JSON') return;
  console.warn(warning);
});

console.log('[Memory Process] Starting...');

// Import the memory system
import SessionMesh from '../core/SessionMesh.js';
const { SessionMesh: SessionMeshClass } = SessionMesh.default || SessionMesh;

let sessionMesh = null;

// 🔥 Compression state + simple trigger logic
const state = {
    lastCompressionRun: Date.now(),
    notesSinceLastCompression: 0
};

function shouldRunCompression() {
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    return (
        (now - state.lastCompressionRun) >= fourteenDays ||
        state.notesSinceLastCompression >= 1000
    );
}

// 🔥 Simple JS clustering based on repeated words
function JSCluster(notes) {
    const clusters = [];
    const used = new Set();

    for (let i = 0; i < notes.length; i++) {
        if (used.has(notes[i].id)) continue;

        const cluster = [notes[i]];
        used.add(notes[i].id);

        const wordsA = new Set(notes[i].content.toLowerCase().split(/\W+/));

        for (let j = i + 1; j < notes.length; j++) {
            if (used.has(notes[j].id)) continue;

            const wordsB = new Set(notes[j].content.toLowerCase().split(/\W+/));
            const overlap = [...wordsA].filter(w => wordsB.has(w)).length;

            if (overlap >= 3) { // adjust threshold as needed
                cluster.push(notes[j]);
                used.add(notes[j].id);
            }
        }

        clusters.push(cluster);
    }

    return clusters;
}

// 🔥 Q2 orchestrator
const Q2 = {};

Q2.runCompression = async function() {
    console.log('[Q2] Starting compression...');

    try {
        const notes = await sessionMesh.getAllNotes();
        console.log(`[Q2] Retrieved ${notes.length} notes for clustering.`);

        const clusters = JSCluster(notes);
        console.log(`[Q2] Created ${clusters.length} clusters.`);

        const metaCapsules = [];
        for (const cluster of clusters) {
            const summary = await sessionMesh.summarizeCluster(cluster);
            if (summary && typeof summary === 'string') {
  metaCapsules.push(summary);
} else {
  console.warn('[Q2] Skipped invalid summary during compression:', summary);
}

        }
        console.log(`[Q2] Created ${metaCapsules.length} meta-capsules.`);

        await sessionMesh.writeMetaCapsules(metaCapsules);

        state.lastCompressionRun = Date.now();
        state.notesSinceLastCompression = 0;

        console.log('[Q2] Compression completed successfully.');
    } catch (err) {
        console.error('[Q2] Compression failed:', err);
    }
};

async function initialize() {
    try {
        console.log('[Memory Process] Initializing SessionMesh...');
        sessionMesh = new SessionMesh();
        console.log('[Memory Process] SessionMesh initialized');
    } catch (error) {
        console.error('[Memory Process] Failed to initialize:', error);
        // Don't exit on initialization errors
    }
}

// Handle messages from parent
process.on('message', async (msg) => {
    console.log('[Memory Process] Received:', msg.type);

    if (msg.type === 'ping') {
        process.send({ type: 'pong', timestamp: Date.now() });
    }

    if (msg.type === 'process-input' && sessionMesh) {
        try {
            const response = await sessionMesh.handleInput(msg.payload);
            process.send({ type: 'response', payload: response });

            // Increment note count for compression check
            state.notesSinceLastCompression++;
            if (shouldRunCompression()) {
                await Q2.runCompression();
            }
        } catch (error) {
            process.send({ type: 'error', error: error.message });
        }
    }

    if (msg.type === 'runCompression') {
        await Q2.runCompression();
    }

    if (msg.type === 'searchMemory' && sessionMesh) {
        try {
            const auditResults = await sessionMesh.countByConcept(msg.payload);
            console.log(`[Memory Process] Forensic report for "${msg.payload}":`, auditResults);
            process.send({ type: 'searchMemoryResult', payload: auditResults });
        } catch (error) {
            process.send({ type: 'error', error: `Search failed: ${error.message}` });
        }
    }
});


// Keep process alive when spawned
if (process.send) {
    setInterval(() => {}, 1000);
    console.log('[Memory Process] Running as child process');
}

// Initialize after setting up handlers
initialize().catch(console.error);

console.log('[Memory Process] Ready');

