#!/usr/bin/env node
// scripts/exportLists.js - Export clean lists from Echo capsules

const fs = require('fs').promises;
const path = require('path');
const { retrieveRelevantCapsules } = require('../src/echo/memory/capsuleRetriever');

async function exportList(query, filename, options = {}) {
  console.log(`Exporting: ${query}`);
  
  const results = await retrieveRelevantCapsules(query, {
    limit: options.limit || 100,
    ...options
  });
  
  let markdown = `# ${options.title || query}\n\n`;
  markdown += `*Generated: ${new Date().toLocaleString()}*\n\n`;
  markdown += `Found ${results.length} items\n\n---\n\n`;
  
  // Group by tags if specified
  if (options.groupByTag) {
    const grouped = {};
    results.forEach(item => {
      const tag = item.metadata?.tags?.includes(options.groupByTag) 
        ? options.groupByTag 
        : 'other';
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push(item);
    });
    
    for (const [tag, items] of Object.entries(grouped)) {
      markdown += `## ${tag.toUpperCase()}\n\n`;
      items.forEach(item => {
        markdown += formatItem(item, options.type) + '\n';
      });
    }
  } else {
    // Simple list
    results.forEach(item => {
      markdown += formatItem(item, options.type) + '\n';
    });
  }
  
  // Save to file
  const outputPath = path.join('exports', filename);
  await fs.mkdir('exports', { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf8');
  
  console.log(`✓ Exported to: ${outputPath}`);
  return outputPath;
}

function formatItem(item, type) {
  const name = item.metadata?.fileName || item.id;
  const tags = item.metadata?.tags || [];
  
  switch(type) {
    case 'client':
      return formatClient(item, name, tags);
    case 'recipe':
      return formatRecipe(item, name, tags);
    case 'book':
      return formatBook(item, name, tags);
    case 'project':
      return formatProject(item, name, tags);
    case 'contact':
      return formatContact(item, name, tags);
    case 'meeting':
      return formatMeeting(item, name, tags);
    case 'task':
      return formatTask(item, name, tags);
    case 'workout':
      return formatWorkout(item, name, tags);
    case 'investment':
      return formatInvestment(item, name, tags);
    case 'travel':
      return formatTravel(item, name, tags);
    case 'code':
      return formatCode(item, name, tags);
    case 'student':
      return formatStudent(item, name, tags);
    default:
      return formatGeneric(item, name, tags);
  }
}

function formatClient(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const email = content.match(/Email:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const phone = content.match(/Phone:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const status = tags.includes('sold') ? '**SOLD**' : 
                 tags.includes('pitched') ? 'Pitched' :
                 tags.includes('dead-deal') ? 'Dead Deal' : 'Active';
  
  output += `- **Status**: ${status}\n`;
  if (phone) output += `- **Phone**: ${phone}\n`;
  if (email) output += `- **Email**: ${email}\n`;
  
  const relevantTags = tags.filter(t => 
    !['client', 'business', 'customer', 'sales'].includes(t)
  );
  if (relevantTags.length) {
    output += `- **Tags**: ${relevantTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatRecipe(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const servings = content.match(/Serves?:\*?\*?\s*(\d+)/i)?.[1] || '';
  const time = content.match(/Time:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  if (servings) output += `- **Servings**: ${servings}\n`;
  if (time) output += `- **Time**: ${time}\n`;
  
  const foodTags = tags.filter(t => 
    !['recipe', 'cooking', 'food'].includes(t)
  );
  if (foodTags.length) {
    output += `- **Tags**: ${foodTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatBook(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const author = content.match(/Author:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const status = tags.includes('read') ? 'Read' : 
                 tags.includes('reading') ? 'Currently Reading' :
                 tags.includes('to-read') ? 'To Read' : '';
  
  if (author) output += `- **Author**: ${author}\n`;
  if (status) output += `- **Status**: ${status}\n`;
  
  const bookTags = tags.filter(t => 
    !['book', 'reading', 'library'].includes(t)
  );
  if (bookTags.length) {
    output += `- **Tags**: ${bookTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatProject(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const status = tags.includes('completed') ? 'Completed' : 
                 tags.includes('in-progress') ? 'In Progress' :
                 tags.includes('on-hold') ? 'On Hold' : 'Not Started';
  const deadline = content.match(/Deadline:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  output += `- **Status**: ${status}\n`;
  if (deadline) output += `- **Deadline**: ${deadline}\n`;
  
  const projectTags = tags.filter(t => 
    !['project', 'work', 'task'].includes(t)
  );
  if (projectTags.length) {
    output += `- **Tags**: ${projectTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatContact(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const email = content.match(/Email:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const phone = content.match(/Phone:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const company = content.match(/Company:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  if (phone) output += `- **Phone**: ${phone}\n`;
  if (email) output += `- **Email**: ${email}\n`;
  if (company) output += `- **Company**: ${company}\n`;
  
  const contactTags = tags.filter(t => 
    !['contact', 'person', 'professional'].includes(t)
  );
  if (contactTags.length) {
    output += `- **Tags**: ${contactTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatMeeting(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const date = content.match(/Date:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const participants = content.match(/Participants:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  if (date) output += `- **Date**: ${date}\n`;
  if (participants) output += `- **Participants**: ${participants}\n`;
  
  const meetingTags = tags.filter(t => 
    !['meeting', 'event', 'appointment'].includes(t)
  );
  if (meetingTags.length) {
    output += `- **Tags**: ${meetingTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatTask(item, name, tags) {
  let output = `### ${name}\n`;
  
  const status = tags.includes('completed') ? 'Completed' : 
                 tags.includes('in-progress') ? 'In Progress' :
                 'Not Started';
  const priority = tags.includes('high') ? 'High' : 
                   tags.includes('medium') ? 'Medium' :
                   tags.includes('low') ? 'Low' : '';
  
  output += `- **Status**: ${status}\n`;
  if (priority) output += `- **Priority**: ${priority}\n`;
  
  const taskTags = tags.filter(t => 
    !['task', 'todo', 'action'].includes(t)
  );
  if (taskTags.length) {
    output += `- **Tags**: ${taskTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatWorkout(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const duration = content.match(/Duration:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const type = tags.includes('cardio') ? 'Cardio' : 
               tags.includes('strength') ? 'Strength' :
               tags.includes('hiit') ? 'HIIT' : '';
  
  if (duration) output += `- **Duration**: ${duration}\n`;
  if (type) output += `- **Type**: ${type}\n`;
  
  const workoutTags = tags.filter(t => 
    !['workout', 'exercise', 'fitness'].includes(t)
  );
  if (workoutTags.length) {
    output += `- **Tags**: ${workoutTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatInvestment(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const amount = content.match(/Amount:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const roi = content.match(/ROI:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  const status = tags.includes('active') ? 'Active' : 
                 tags.includes('sold') ? 'Sold' :
                 tags.includes('loss') ? 'Loss' : '';
  
  if (amount) output += `- **Amount**: ${amount}\n`;
  if (roi) output += `- **ROI**: ${roi}\n`;
  if (status) output += `- **Status**: ${status}\n`;
  
  const investmentTags = tags.filter(t => 
    !['investment', 'stock', 'asset'].includes(t)
  );
  if (investmentTags.length) {
    output += `- **Tags**: ${investmentTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatTravel(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const dates = content.match(/Dates:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const location = content.match(/Location:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  const status = tags.includes('planned') ? 'Planned' : 
                 tags.includes('completed') ? 'Completed' :
                 tags.includes('cancelled') ? 'Cancelled' : '';
  
  if (dates) output += `- **Dates**: ${dates}\n`;
  if (location) output += `- **Location**: ${location}\n`;
  if (status) output += `- **Status**: ${status}\n`;
  
  const travelTags = tags.filter(t => 
    !['travel', 'trip', 'vacation'].includes(t)
  );
  if (travelTags.length) {
    output += `- **Tags**: ${travelTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatCode(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const language = content.match(/Language:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || 
                  tags.find(t => ['javascript', 'python', 'java', 'c++', 'go', 'rust'].includes(t.toLowerCase())) || '';
  const status = tags.includes('completed') ? 'Completed' : 
                 tags.includes('in-progress') ? 'In Progress' :
                 tags.includes('bug') ? 'Needs Fixing' : 'Planning';
  
  if (language) output += `- **Language**: ${language}\n`;
  output += `- **Status**: ${status}\n`;
  
  const repoLink = content.match(/(https?:\/\/github\.com\/[^\s]+)/i)?.[0] || '';
  if (repoLink) output += `- **Repository**: [View](${repoLink})\n`;
  
  const codeTags = tags.filter(t => 
    !['code', 'programming', 'development', language.toLowerCase()].includes(t.toLowerCase())
  );
  if (codeTags.length) {
    output += `- **Tags**: ${codeTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatStudent(item, name, tags) {
  let output = `### ${name}\n`;
  
  const content = item.content || '';
  const course = content.match(/Course:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const deadline = content.match(/Deadline:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  const grade = content.match(/Grade:\*?\*?\s*([^\n]+)/i)?.[1]?.trim() || '';
  
  const status = tags.includes('completed') ? 'Completed' : 
                 tags.includes('in-progress') ? 'In Progress' :
                 tags.includes('pending') ? 'Pending' : 'Not Started';
  
  if (course) output += `- **Course**: ${course}\n`;
  if (deadline) output += `- **Deadline**: ${deadline}\n`;
  output += `- **Status**: ${status}\n`;
  if (grade) output += `- **Grade**: ${grade}\n`;
  
  const studentTags = tags.filter(t => 
    !['student', 'study', 'academic', 'homework', 'assignment'].includes(t.toLowerCase())
  );
  if (studentTags.length) {
    output += `- **Tags**: ${studentTags.join(', ')}\n`;
  }
  
  return output + '\n';
}

function formatGeneric(item, name, tags) {
  return `### ${name}\n- **Type**: ${item.type}\n- **Tags**: ${tags.slice(0, 5).join(', ')}\n\n`;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Echo List Exporter

Usage:
  node scripts/exportLists.js clients
  node scripts/exportLists.js recipes  
  node scripts/exportLists.js "my #sold clients"
  node scripts/exportLists.js --all

Options:
  --all         Export all common lists
  --help        Show this help
    `);
    return;
  }
  
  if (args.includes('--all')) {
    // Export all common lists
    await exportList('list my clients', 'clients.md', { 
      title: 'All Clients',
      type: 'client',
      groupByTag: 'sold'
    });
    
    await exportList('list my recipes', 'recipes.md', {
      title: 'All Recipes',
      type: 'recipe'
    });
    
    await exportList('list my books', 'books.md', {
      title: 'Book Library',
      type: 'book'
    });
    
    await exportList('list my projects', 'projects.md', {
      title: 'Projects',
      type: 'project'
    });
    
    await exportList('list my contacts', 'contacts.md', {
      title: 'Contacts',
      type: 'contact'
    });
    
    await exportList('list my meetings', 'meetings.md', {
      title: 'Meetings',
      type: 'meeting'
    });
    
    await exportList('list my tasks', 'tasks.md', {
      title: 'Tasks',
      type: 'task'
    });
    
    await exportList('list my workouts', 'workouts.md', {
      title: 'Workout Log',
      type: 'workout'
    });
    
    await exportList('list my investments', 'investments.md', {
      title: 'Investments',
      type: 'investment'
    });
    
    await exportList('list my travel plans', 'travel.md', {
      title: 'Travel Plans',
      type: 'travel'
    });
    
    await exportList('list my code projects', 'code.md', {
      title: 'Code Projects',
      type: 'code'
    });
    
    await exportList('list my study materials', 'study.md', {
      title: 'Study Materials',
      type: 'student'
    });
    
    console.log('\n✓ All lists exported to /exports/');
  } else {
    // Export specific query
    const query = args.join(' ');
    const filename = query.replace(/[#\s]+/g, '_') + '.md';
    await exportList(query, filename);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { exportList };