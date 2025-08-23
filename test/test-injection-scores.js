// ✅ Injection Score Benchmark — Ariadne v1.1

const assert = require('assert');
const { blendedInjectionScore, generateSearchText } = require('../backend/qlib/injectionScorer');

function mockCapsule({ title = '', content = '', tags = [], epoch = 'midterm', promoted = false, pinned = false, type = 'note' }) {
  const capsule = { title, content, tags, epoch, promoted, pinned, type };
  capsule._searchText = generateSearchText(capsule);
  return capsule;
}

// 🧪 Query
const query = ['project'];

// 🧠 Test Capsules
const oldPromoted = mockCapsule({
  title: 'Old Project X',
  epoch: 'longterm',
  promoted: true
});

const recentRelevant = mockCapsule({
  title: 'Project X Details',
  epoch: 'recent'
});

const irrelevantChat = mockCapsule({
  title: 'Random Chatter',
  epoch: 'recent',
  type: 'chat'
});

// 🚦 Score Results
const s1 = blendedInjectionScore(oldPromoted, query);
const s2 = blendedInjectionScore(recentRelevant, query);
const s3 = blendedInjectionScore(irrelevantChat, query);

console.log('[Score] Old promoted:', s1);
console.log('[Score] Recent relevant:', s2);
console.log('[Score] Irrelevant chat:', s3);

// ✅ Assertions
assert(s2 > s1, 'Recent relevant should outscore old promoted');
assert(s3 < 0, 'Irrelevant chat should be penalized');

console.log('✅ Injection score tests passed.');