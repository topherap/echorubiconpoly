// breakpointFinder.js

function findBreakPoints(tokens, chunks) {
    const breakPoints = [];
    const chunkSize = Math.floor(tokens.length / chunks);

    for (let i = 1; i < chunks; i++) {
        let targetIndex = i * chunkSize;
        let bestBreak = targetIndex;
        let minNesting = Infinity;

        const windowStart = Math.max(0, targetIndex - 50);
        const windowEnd = Math.min(tokens.length, targetIndex + 50);

        let nesting = 0;
        for (let j = windowStart; j < windowEnd; j++) {
            const token = tokens[j];

            if (token.type === 'bracket') {
                if (['{', '(', '['].includes(token.value)) {
                    nesting++;
                } else if (['}', ')', ']'].includes(token.value)) {
                    nesting--;
                }
            }

            if (token.value === ';' || token.value === '}') {
                if (nesting < minNesting) {
                    minNesting = nesting;
                    bestBreak = j + 1;
                }
            }
        }

        breakPoints.push(bestBreak);
    }

    return breakPoints;
}

module.exports = { findBreakPoints };
