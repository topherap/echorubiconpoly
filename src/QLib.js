const QLibInterface = require('./QLibInterface');

const qlib = new QLibInterface();

module.exports = {
  extractFacts: (...args) => qlib.extractFacts(...args),
  analyzeMemory: (...args) => qlib.analyzeMemory(...args),
  getSummary: (...args) => qlib.getSummary(...args)
};
