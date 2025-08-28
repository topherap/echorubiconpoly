// 🧠 Epoch Classifier — Ariadne Layer (FIXED)

function assignEpochAndWeight(capsule) {
  // Use lastReferenced OR fall back to creation timestamp
  const referenceDate = capsule.lastReferenced || capsule.timestamp || capsule.createdAt;
  
  if (!referenceDate) {
    console.log(`⚠️ Capsule ${capsule.id} has no timestamp - defaulting to longterm`);
    return { epoch: 'longterm', weight: 0.2 };
  }
  
  const daysSince = (Date.now() - new Date(referenceDate)) / (1000 * 60 * 60 * 24);

  if (daysSince <= 30) {
    return { epoch: 'recent', weight: 1.0 };
  } else if (daysSince <= 60) {
    return { epoch: 'fading', weight: 0.7 };
  } else if (daysSince <= 180) {
    return { epoch: 'midterm', weight: 0.4 };
  } else {
    return { epoch: 'longterm', weight: 0.2 };
  }
}

module.exports = { assignEpochAndWeight };