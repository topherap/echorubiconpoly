// main/lib/deps.js
// Central dependency management - redirects fs through QLib

const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Use the fsReplacement module for all fs operations
const fs = require('../../src/memory/fsReplacement');

module.exports = {
  fs,
  path,
  os,
  crypto
};
