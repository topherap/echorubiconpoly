const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class ChatOrchestrator {
 constructor(promptBuilder) {
   this.promptBuilder = promptBuilder;
 }

 buildPrompt(input, memories, rules, context) {
   return this.promptBuilder.buildPrompt(input, memories, rules, context);
 }

 async sendToModel(model, messages) {
   const timestamp = new Date().toISOString();
   console.log(`[${timestamp}] Attempting to send to model: ${model}`);

   try {
     const installedModels = await this.getInstalledModels();
     const fallbackModels = this.getFallbackModels(model, installedModels);
     
     console.log(`[${timestamp}] Fallback chain: ${fallbackModels.join(' -> ')}`);

     for (const currentModel of fallbackModels) {
       if (currentModel === 'granite') {
         console.log(`[${timestamp}] Skipping granite model`);
         continue;
       }

       try {
         const response = await fetch('http://localhost:11434/api/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             model: currentModel,
             messages,
             stream: false,
             options: {
               temperature: 0.7,
               num_predict: 1000
             }
           })
         });

         if (!response.ok) {
           const errorText = await response.text();
           throw new Error(`Model ${currentModel} returned ${response.status}: ${errorText}`);
         }

         const data = await response.json();
         const successTimestamp = new Date().toISOString();
         console.log(`[${successTimestamp}] Success with model: ${currentModel}`);
         
         return {
           content: data?.message?.content || 'No response from model',
           model: currentModel,
           success: true
         };
       } catch (modelError) {
         const errorTimestamp = new Date().toISOString();
         console.log(`[${errorTimestamp}] Failed with ${currentModel}: ${modelError.message}`);
       }
     }

     throw new Error('All models failed');
   } catch (error) {
     const errorTimestamp = new Date().toISOString();
     console.error(`[${errorTimestamp}] ChatOrchestrator error:`, error);
     return {
       content: `Error: ${error.message}`,
       model,
       success: false
     };
   }
 }

 async getInstalledModels() {
   try {
     const response = await fetch('http://localhost:11434/api/tags');
     if (!response.ok) {
       throw new Error('Failed to fetch installed models');
     }
     
     const data = await response.json();
     const models = data.models
       .map(m => m.name)
       .filter(name => name !== 'granite');
     
     return models;
   } catch (error) {
     console.error('Error fetching installed models:', error);
     return [];
   }
 }

 getFallbackModels(primaryModel, modelList) {
   const filteredList = modelList.filter(m => m !== 'granite');
   const primaryIndex = filteredList.indexOf(primaryModel);
   
   if (primaryIndex === -1) {
     return filteredList;
   }
   
   const reordered = [
     primaryModel,
     ...filteredList.slice(primaryIndex + 1),
     ...filteredList.slice(0, primaryIndex)
   ];
   
   return reordered;
 }
}

module.exports = ChatOrchestrator;