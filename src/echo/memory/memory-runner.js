// memory-runner.mjs - ESM process for memory system
import { SessionMesh } from './core/SessionMesh.js';
import { QLib, JSCluster, QLibChaosSummarize } from './some-path/QLib.js'; // adjust import to your actual location

console.log('[Memory Process] Starting...');

// Compression state + trigger logic
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

// Inline Q2 orchestrator
const Q2 = {};

Q2.runCompression = async function() {
    console.log('[Q2] Starting compression...');

    try {
        const notes = await QLib.getAllNotes();
        console.log(`[Q2] Retrieved ${notes.length} notes for clustering.`);

        const clusters = JSCluster(notes);
        console.log(`[Q2] Created ${clusters.length} clusters.`);

        const metaCapsules = [];
        for (const cluster of clusters) {
            const summary = await QLibChaosSummarize(cluster);
            if (summary && typeof summary === 'string') {
  metaCapsules.push(summary);
} else {
  console.warn('[Q2] Skipped invalid summary during compression:', summary);
}

        }
        console.log(`[Q2] Created ${metaCapsules.length} meta-capsules.`);

        await QLib.writeMetaCapsules(metaCapsules);

        state.lastCompressionRun = Date.now();
        state.notesSinceLastCompression = 0;

        console.log('[Q2] Compression completed successfully.');
    } catch (err) {
        console.error('[Q2] Compression failed:', err);
    }
};

// Keep process alive and listen for IPC messages
process.on('message', async (msg) => {
    console.log('[Memory Process] Received:', msg.type);

    if (msg.type === 'ping') {
        process.send({ type: 'pong', timestamp: Date.now() });
    }

    // Example: if main process explicitly tells memory process to compress
    if (msg.type === 'runCompression') {
        await Q2.runCompression();
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Memory Process] Shutting down...');
    process.exit(0);
});

console.log('[Memory Process] Ready');

