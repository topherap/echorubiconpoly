// scripts/dev-auth.js
const express = require('express');
const app     = express();

app.use(express.json());

// one helper for both methods
function sendDevToken(req, res) {
  res.json({
    apiKey: 'dev-' + Date.now(),
    user:   { id: 'local-dev', name: 'Max' }
  });
}

app.get('/validate',  sendDevToken);
app.post('/validate', sendDevToken);

app.listen(49200, () =>
  console.log('[dev-auth] listening on http://localhost:49200/validate')
);
