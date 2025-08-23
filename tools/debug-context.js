const { memorySystem } = require('../src/memory');
(async () => {
  const context = await memorySystem.buildContextForInput("who are my clients?");
  console.log('\n--- Injected Context ---\n');
  console.log(context.context || context);
})();
