// tokenizer.js

function getTokenType(token) {
    if (/^(function|class|const|let|var|import|export|if|for|while|try|catch)$/.test(token)) {
        return 'keyword';
    }
    if (/^[{}()\[\]]$/.test(token)) {
        return 'bracket';
    }
    if (/^[;,]$/.test(token)) {
        return 'punctuation';
    }
    if (/^\/\/|^\/\*/.test(token)) {
        return 'comment';
    }
    if (/^["'`]/.test(token)) {
        return 'string';
    }
    if (/^\w+$/.test(token)) {
        return 'identifier';
    }
    return 'operator';
}

function tokenize(code) {
    const tokenRegex = /(\bfunction\b|\bclass\b|\bconst\b|\blet\b|\bvar\b|\bimport\b|\bexport\b|\bif\b|\bfor\b|\bwhile\b|\btry\b|\bcatch\b|\{|\}|\(|\)|\[|\]|;|,|=>|\/\/.*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\w+)/g;

    let match;
    const tokens = [];
    let line = 1;
    let col = 1;

    while ((match = tokenRegex.exec(code)) !== null) {
        const token = match[0];
        const newlines = code.slice(col, match.index).split('\n').length - 1;
        line += newlines;
        col = newlines > 0 ? match.index - code.lastIndexOf('\n', match.index) : col + (match.index - col);

        tokens.push({
            type: getTokenType(token),
            value: token,
            line,
            col,
            index: match.index
        });
    }

    return tokens;
}

module.exports = { tokenize, getTokenType };
