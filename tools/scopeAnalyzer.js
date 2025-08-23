// scopeAnalyzer.js

function findFunctionName(tokens, index) {
    for (let i = index + 1; i < tokens.length && i < index + 5; i++) {
        if (tokens[i].type === 'identifier') {
            return tokens[i].value;
        }
        if (tokens[i].value === '(') break;
    }
    return null;
}

function findClassName(tokens, index) {
    for (let i = index + 1; i < tokens.length && i < index + 3; i++) {
        if (tokens[i].type === 'identifier') {
            return tokens[i].value;
        }
    }
    return null;
}

function findVariableNames(tokens, index) {
    const names = [];
    for (let i = index + 1; i < tokens.length; i++) {
        if (tokens[i].type === 'identifier') {
            names.push(tokens[i].value);
        }
        if ([';', '=', '\n'].includes(tokens[i].value)) {
            break;
        }
    }
    return names;
}

function isDeclarationContext(tokens, index) {
    const prevTokens = tokens.slice(Math.max(0, index - 3), index);
    return prevTokens.some(token =>
        ['function', 'class', 'const', 'let', 'var'].includes(token.value)
    );
}

function parseImport(tokens, index, imports) {
    let importStr = '';
    for (let i = index; i < tokens.length; i++) {
        importStr += tokens[i].value + ' ';
        if (tokens[i].value === ';') break;
    }
    imports.push(importStr.trim());
}

function parseExport(tokens, index, exports) {
    let exportStr = '';
    for (let i = index; i < tokens.length; i++) {
        exportStr += tokens[i].value + ' ';
        if (tokens[i].value === ';' || tokens[i].value === '}') break;
    }
    exports.push(exportStr.trim());
}

function analyzeScope(tokens) {
    const scopes = [];
    const scopeStack = [{
        type: 'global',
        start: 0,
        declarations: new Set(),
        references: new Set()
    }];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const currentScope = scopeStack[scopeStack.length - 1];

        if (token.type === 'keyword') {
            switch (token.value) {
                case 'function':
                    const funcName = findFunctionName(tokens, i);
                    if (funcName) currentScope.declarations.add(funcName);
                    break;
                case 'class':
                    const className = findClassName(tokens, i);
                    if (className) currentScope.declarations.add(className);
                    break;
                case 'const':
                case 'let':
                case 'var':
                    const varNames = findVariableNames(tokens, i);
                    varNames.forEach(name => currentScope.declarations.add(name));
                    break;
            }
        }

        if (token.type === 'bracket' && token.value === '{') {
            scopeStack.push({
                type: 'block',
                start: i,
                parent: currentScope,
                declarations: new Set(),
                references: new Set()
            });
        }

        if (token.type === 'bracket' && token.value === '}') {
            const scope = scopeStack.pop();
            if (scope) {
                scope.end = i;
                scopes.push(scope);
            }
        }

        if (token.type === 'identifier' && !isDeclarationContext(tokens, i)) {
            currentScope.references.add(token.value);
        }
    }

    return scopes;
}

module.exports = {
    findFunctionName,
    findClassName,
    findVariableNames,
    isDeclarationContext,
    parseImport,
    parseExport,
    analyzeScope
};
