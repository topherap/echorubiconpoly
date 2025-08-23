const React = require('react');
const h = React.createElement;

function DevPanel() {
  return h('div', { className: 'dev-panel' }, [
    h('h2', null, 'Developer Panel'),
    h('p', null, 'This is the debug/dev section.'),
    // Placeholder buttons — wire to actual diagnostic functions later
    h('button', {
      onClick: () => {
        console.log('[DEV-PANEL] Memory pipeline check triggered');
        if (window.memoryPipeline?.getMemoryStats) {
          window.memoryPipeline.getMemoryStats().then(stats => {
            console.log('[DEV-PANEL] Memory stats:', stats);
          }).catch(err => {
            console.error('[DEV-PANEL] Failed to get memory stats:', err);
          });
        }
      }
    }, 'Check Memory Stats')
  ]);
}

module.exports = DevPanel;

