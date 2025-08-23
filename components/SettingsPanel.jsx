const React = require('react');
const h = React.createElement;

function SettingsPanel() {
  return h('div', { className: 'settings-panel' }, [
    h('h2', null, 'Settings'),
    h('label', null, [
      'Theme: ',
      h('select', {
        onChange: e => {
          const selected = e.target.value;
          localStorage.setItem('selectedTheme', selected);
          document.getElementById('myai-root')?.classList.add(selected);
          console.log('[SETTINGS-PANEL] Theme set to:', selected);
        }
      }, [
        h('option', { value: 'white-rabbit' }, 'White Rabbit'),
        h('option', { value: 'minimalist-winter' }, 'Minimalist Winter'),
        h('option', { value: 'haiku' }, 'Haiku'),
        h('option', { value: 'hemingway' }, 'Hemingway')
      ])
    ]),
    h('button', {
      onClick: () => {
        console.log('[SETTINGS-PANEL] Resetting all preferences');
        localStorage.clear();
        window.location.reload();
      }
    }, 'Reset Preferences')
  ]);
}

module.exports = SettingsPanel;
