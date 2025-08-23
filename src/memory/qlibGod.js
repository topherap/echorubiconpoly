let instance = null;

class QLIBGod {
    constructor() {
        if (instance) return instance;
        
        const { getQlibInstance } = require('./QLibInterface');
        this.qlib = null; // Will be set via getQlibInstance
        instance = this;
        
        console.log('[QLIB GOD] Initialized as SOLE vault authority');
    }
    
    // Ensure we're using the singleton QLib instance
    async ensureQLib() {
        if (!this.qlib) {
            const { getQlibInstance } = require('./QLibInterface');
            this.qlib = await getQlibInstance();
        }
        return this.qlib;
    }
    
    // FORCE RESPONSE: Intercept queries and provide direct answers
    async forceResponse(query, vaultData) {
        const lowerQuery = query.toLowerCase();
        console.log('[QLIB GOD] forceResponse called with:', {
            query: query,
            lowerQuery: lowerQuery,
            hasVaultData: !!vaultData,
            vaultDataKeys: vaultData ? Object.keys(vaultData) : 'null'
        });
        
        // Handle client listing queries directly
        if (lowerQuery.includes('list') && lowerQuery.includes('client')) {
            console.log('[QLIB GOD] FORCING client list response');
            console.log('[QLIB GOD DEBUG] Client vault data:', {
                hasResults: !!vaultData?.results,
                resultsLength: vaultData?.results?.length || 0
            });
            return this.buildClientListResponse(vaultData);
        }
        
        // Handle recipe queries directly  
        if (lowerQuery.includes('recipe') || 
            lowerQuery.includes('food') || 
            lowerQuery.includes('foods') ||
            lowerQuery.includes('foods\\') ||
            lowerQuery.includes('foods/') ||
            /foods[\\\/]/.test(lowerQuery)) {
            console.log('[QLIB GOD] FORCING recipe list response');
            console.log('[QLIB GOD DEBUG] Recipe vault data:', {
                hasResults: !!vaultData?.results,
                resultsLength: vaultData?.results?.length || 0,
                vaultDataStructure: vaultData ? JSON.stringify(vaultData, null, 2).substring(0, 500) : 'null'
            });
            
            // Handle verbatim/exact requests OR specific file requests - read the actual file content
            if (lowerQuery.includes('verbatim') || lowerQuery.includes('exact') || lowerQuery.includes('full content') || lowerQuery.includes('tell me about') || lowerQuery.includes('item #')) {
                return this.buildVerbatimRecipeResponse(query, vaultData);
            }
            
            // Try fallback search if main vault data is empty
            if (!vaultData?.results?.length) {
                console.log('[QLIB GOD] Primary vault data empty, trying fallback search...');
                try {
                    const fallbackData = await this.getVaultData(query);
                    if (fallbackData?.results?.length) {
                        console.log('[QLIB GOD] Fallback search found data:', fallbackData.results.length, 'items');
                        return this.buildRecipeListResponse(fallbackData);
                    } else {
                        console.log('[QLIB GOD] Fallback search also returned empty');
                    }
                } catch (err) {
                    console.log('[QLIB GOD] Fallback search failed:', err.message);
                }
            }
            
            return this.buildRecipeListResponse(vaultData);
        }
        
        console.log('[QLIB GOD] No forced response triggered for query:', query);
        return null; // No forced response needed
    }
    
    buildClientListResponse(vaultData) {
        if (!vaultData?.results?.length) {
            return "I don't see any clients in your vault.";
        }
        
        const clients = vaultData.results
            .filter(item => item.folder === 'clients' || item.category === 'client')
            .map((client, idx) => {
                const title = client.title || client.relativePath?.split('/').pop()?.replace('.md', '') || `Client ${idx + 1}`;
                return `${idx + 1}. **${title}**`;
            });
            
        if (clients.length === 0) {
            return "I found vault items but no specific client data.";
        }
        
        return `Here are your clients (${clients.length} found):\n\n${clients.join('\n\n')}`;
    }
    
    buildRecipeListResponse(vaultData) {
        console.log('[QLIB GOD] buildRecipeListResponse called with:', {
            hasVaultData: !!vaultData,
            hasResults: !!vaultData?.results,
            resultsLength: vaultData?.results?.length || 0,
            firstResult: vaultData?.results?.[0] ? {
                folder: vaultData.results[0].folder,
                category: vaultData.results[0].category,
                title: vaultData.results[0].title,
                relativePath: vaultData.results[0].relativePath
            } : 'none'
        });
        
        if (!vaultData?.results?.length) {
            console.log('[QLIB GOD] No results found, returning default message');
            return "I don't see any recipes in your vault.";
        }
        
        const recipes = vaultData.results
            .filter(item => item.folder === 'Foods' || item.folder === 'foods' || item.category === 'recipe')
            .map((recipe, idx) => {
                const title = recipe.title || recipe.relativePath?.split('/').pop()?.replace('.md', '') || `Recipe ${idx + 1}`;
                return `${idx + 1}. ${title}`;
            });
            
        console.log('[QLIB GOD] Filtered recipes:', {
            totalResults: vaultData.results.length,
            filteredRecipes: recipes.length,
            recipeList: recipes
        });
            
        if (recipes.length === 0) {
            console.log('[QLIB GOD] Found vault items but no recipes after filtering');
            return "I found vault items but no specific recipe data.";
        }
        
        console.log('[QLIB GOD] Returning recipe list with', recipes.length, 'items');
        return `Here are your recipes (${recipes.length} found):\n\n${recipes.join('\n')}`;
    }
    
    async buildVerbatimRecipeResponse(query, vaultData) {
        console.log('[QLIB GOD] Building verbatim recipe response for:', query);
        
        // Try to find which specific recipe is being requested
        const lowerQuery = query.toLowerCase();
        let targetRecipe = null;
        
        // Look for recipe references in the query
        if (vaultData?.results?.length) {
            for (const item of vaultData.results) {
                const fileName = (item.title || item.relativePath?.split('/').pop()?.replace('.md', '') || '').toLowerCase();
                const folderPath = item.folder || '';
                
                // Check for exact file name matches
                if (lowerQuery.includes(fileName) || 
                    lowerQuery.includes(fileName.replace(/ /g, '')) ||
                    lowerQuery.includes(`${folderPath}\\${fileName}`) ||
                    lowerQuery.includes(`${folderPath}/${fileName}`) ||
                    fileName.includes(lowerQuery.split(' ').find(word => word.length > 3))) {
                    targetRecipe = item;
                    break;
                }
                
                // Special case for "carnivore ice cream"
                if (lowerQuery.includes('carnivore ice cream') && fileName.includes('carnivore ice cream')) {
                    targetRecipe = item;
                    break;
                }
            }
        }
        
        // If no specific recipe found, check if it's a follow-up from recent context
        if (!targetRecipe && global.lastFileContent) {
            targetRecipe = { relativePath: global.lastFileContent.path };
        }
        
        if (targetRecipe) {
            try {
                console.log('[QLIB GOD] Reading full content for recipe:', targetRecipe.relativePath);
                const content = await this.readFile(targetRecipe.relativePath || targetRecipe.file);
                return `Here is the complete recipe content:\n\n${content}`;
            } catch (err) {
                console.log('[QLIB GOD] Failed to read recipe file:', err.message);
                return `I found the recipe but couldn't read the file: ${err.message}`;
            }
        }
        
        return "Please specify which recipe you'd like to see verbatim. You can say 'recipe 1', 'recipe 2', etc., or use the recipe name.";
    }
    
    async getVaultData(query, options = {}) {
        console.log(`[QLIB GOD] All vault access goes through me: ${query}`);
        console.log(`[QLIB GOD DEBUG] Options:`, options);
        const qlib = await this.ensureQLib();
        console.log(`[QLIB GOD DEBUG] QLib instance exists:`, !!qlib);
        
        const results = await qlib.searchVault(query, options);
        console.log(`[QLIB GOD DEBUG] Search results:`, {
            hasResults: !!results,
            resultsLength: results?.results?.length || 0,
            resultsType: typeof results,
            resultKeys: results ? Object.keys(results) : 'null'
        });
        
        return results;
    }
    
    async readFile(path) {
        console.log(`[QLIB GOD] File read goes through me: ${path}`);
        const qlib = await this.ensureQLib();
        return qlib.readVaultFile(path);
    }
    
    static getInstance() {
        if (!instance) {
            instance = new QLIBGod();
        }
        return instance;
    }
}

module.exports = { QLIBGod };