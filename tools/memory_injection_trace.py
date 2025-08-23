#!/usr/bin/env python3
r"""
Memory Injection Flow Tracer for Echo Rubicon
Traces through the codebase to find where memory context should be injected into AI responses
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set

class MemoryInjectionTracer:
    def __init__(self):
        self.project_root = Path(r"C:\Users\tophe\Documents\Echo Rubicon")
        self.findings = {
            "memory_calls": [],
            "ai_calls": [],
            "ipc_handlers": [],
            "context_builders": [],
            "flow_breaks": [],
            "connection_points": []
        }
        
        # Key patterns to search for
        self.patterns = {
            "memory_build": r"buildContextForInput|buildContext|getMemoryContext",
            "memory_system": r"memorySystem\.|MemorySystem\.|memory\.build",
            "ai_generate": r"\.generate\(|\.chat\(|\.sendMessage\(|ollama\.chat",
            "ipc_chat": r"ipcMain\.handle\(['\"]chat:send|handle\(['\"]chat:",
            "context_injection": r"context:|memory:|systemPrompt:|messages\.push",
            "qlib_calls": r"qlib\.|getQlibInstance|forceVaultScan",
            "memory_manager": r"MemoryVaultManager|capsule|getCapsules"
        }
    
    def trace_flow(self):
        """Run complete trace of memory injection flow"""
        print("🔍 Tracing Memory Injection Flow...\n")
        
        # Step 1: Find all chat entry points
        self.find_chat_handlers()
        
        # Step 2: Find memory system calls
        self.find_memory_calls()
        
        # Step 3: Find AI generation calls
        self.find_ai_calls()
        
        # Step 4: Analyze connections
        self.analyze_connections()
        
        # Step 5: Generate report
        self.generate_report()
    
    def find_chat_handlers(self):
        """Find all IPC chat handlers"""
        print("📡 Finding chat handlers...")
        
        # Check main process handlers
        ipc_files = [
            "main/ipc-handlers.js",
            "src/ipc-handlers.js",  # Missing but referenced
            "main/app.js"
        ]
        
        for file_path in ipc_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                content = full_path.read_text(encoding='utf-8', errors='ignore')
                
                # Find chat handlers
                chat_handlers = re.findall(
                    r'ipcMain\.handle\([\'"]([^"\']+)[\'"][^}]+?\{([^}]+?)\}',
                    content,
                    re.DOTALL
                )
                
                for handler_name, handler_body in chat_handlers:
                    if 'chat' in handler_name.lower():
                        self.findings["ipc_handlers"].append({
                            "file": file_path,
                            "handler": handler_name,
                            "has_memory_call": any(pattern in handler_body for pattern in [
                                "buildContext", "memorySystem", "memory."
                            ])
                        })
    
    def find_memory_calls(self):
        """Find all memory system usage"""
        print("🧠 Finding memory system calls...")
        
        # Search key directories
        search_dirs = ["src", "main", "components", "backend"]
        
        for search_dir in search_dirs:
            dir_path = self.project_root / search_dir
            if not dir_path.exists():
                continue
            
            for root, dirs, files in os.walk(dir_path):
                # Skip node_modules
                if 'node_modules' in root:
                    continue
                
                for file in files:
                    if file.endswith('.js'):
                        file_path = Path(root) / file
                        self._scan_file_for_memory(file_path)
    
    def _scan_file_for_memory(self, file_path: Path):
        """Scan a file for memory-related calls"""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            rel_path = file_path.relative_to(self.project_root)
            
            # Check for memory build calls
            if re.search(self.patterns["memory_build"], content):
                # Extract context around the call
                for match in re.finditer(self.patterns["memory_build"], content):
                    start = max(0, match.start() - 200)
                    end = min(len(content), match.end() + 200)
                    context = content[start:end]
                    
                    self.findings["memory_calls"].append({
                        "file": str(rel_path),
                        "function": match.group(0),
                        "context": context.strip(),
                        "connected_to_ai": self._check_ai_connection(content, match.start())
                    })
            
            # Check for context builders
            if re.search(self.patterns["context_injection"], content):
                self.findings["context_builders"].append({
                    "file": str(rel_path),
                    "has_memory": "memory" in content.lower() or "context" in content.lower()
                })
        except:
            pass
    
    def _check_ai_connection(self, content: str, memory_call_pos: int) -> bool:
        """Check if memory call is connected to AI generation"""
        # Look for AI calls within 500 chars after memory call
        search_window = content[memory_call_pos:memory_call_pos + 500]
        return bool(re.search(self.patterns["ai_generate"], search_window))
    
    def find_ai_calls(self):
        """Find all AI generation calls"""
        print("🤖 Finding AI generation calls...")
        
        # Common files with AI calls
        ai_files = [
            "backend/routes/chat.js",
            "src/services/ollama.js",
            "src/services/aiService.js",
            "main/chat-handler.js"
        ]
        
        # Also search common patterns
        for root, dirs, files in os.walk(self.project_root):
            if 'node_modules' in root:
                continue
            
            for file in files:
                if file.endswith('.js') and any(term in file.lower() for term in ['chat', 'ai', 'ollama', 'model']):
                    file_path = Path(root) / file
                    self._scan_file_for_ai(file_path)
    
    def _scan_file_for_ai(self, file_path: Path):
        """Scan file for AI generation calls"""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            rel_path = file_path.relative_to(self.project_root)
            
            if re.search(self.patterns["ai_generate"], content):
                # Check if memory/context is passed
                for match in re.finditer(self.patterns["ai_generate"], content):
                    start = max(0, match.start() - 300)
                    end = min(len(content), match.end() + 300)
                    context = content[start:end]
                    
                    # Look for memory/context parameters
                    has_memory = any(term in context for term in [
                        "memory", "context", "buildContext", "memorySystem"
                    ])
                    
                    self.findings["ai_calls"].append({
                        "file": str(rel_path),
                        "call": match.group(0),
                        "has_memory_param": has_memory,
                        "context_snippet": context.strip()[:200]
                    })
        except:
            pass
    
    def analyze_connections(self):
        """Analyze how components connect"""
        print("🔗 Analyzing connections...")
        
        # Check if memory system is connected to chat flow
        memory_files = {call["file"] for call in self.findings["memory_calls"]}
        ai_files = {call["file"] for call in self.findings["ai_calls"]}
        
        # Find files that have both
        connected_files = memory_files & ai_files
        if connected_files:
            self.findings["connection_points"] = list(connected_files)
        
        # Check for breaks in the flow
        for handler in self.findings["ipc_handlers"]:
            if not handler["has_memory_call"]:
                self.findings["flow_breaks"].append(f"Chat handler '{handler['handler']}' missing memory call")
        
        for ai_call in self.findings["ai_calls"]:
            if not ai_call["has_memory_param"]:
                self.findings["flow_breaks"].append(f"AI call in {ai_call['file']} missing memory context")
    
    def generate_report(self):
        """Generate trace report"""
        print("\n" + "="*60)
        print("🧠 MEMORY INJECTION FLOW ANALYSIS")
        print("="*60)
        
        # IPC Handlers
        print("\n📡 CHAT HANDLERS FOUND:")
        if self.findings["ipc_handlers"]:
            for handler in self.findings["ipc_handlers"]:
                memory_status = "✅ Has memory" if handler["has_memory_call"] else "❌ NO MEMORY"
                print(f"  - {handler['file']}: {handler['handler']} [{memory_status}]")
        else:
            print("  ❌ No chat handlers found!")
        
        # Memory Calls
        print(f"\n🧠 MEMORY SYSTEM CALLS: {len(self.findings['memory_calls'])}")
        for call in self.findings["memory_calls"][:3]:
            ai_status = "✅ Connected to AI" if call["connected_to_ai"] else "❌ Orphaned"
            print(f"  - {call['file']}: {call['function']} [{ai_status}]")
        
        # AI Calls
        print(f"\n🤖 AI GENERATION CALLS: {len(self.findings['ai_calls'])}")
        for call in self.findings["ai_calls"][:3]:
            memory_status = "✅ Has memory" if call["has_memory_param"] else "❌ NO MEMORY"
            print(f"  - {call['file']}: {call['call']} [{memory_status}]")
        
        # Flow Breaks
        if self.findings["flow_breaks"]:
            print("\n❌ FLOW BREAKS DETECTED:")
            for break_point in self.findings["flow_breaks"][:5]:
                print(f"  - {break_point}")
        
        # Connection Analysis
        print("\n🔍 CONNECTION ANALYSIS:")
        if self.findings["connection_points"]:
            print("  ✅ Files with both memory + AI calls:")
            for file in self.findings["connection_points"]:
                print(f"    - {file}")
        else:
            print("  ❌ No files found with both memory and AI calls!")
            print("     This means memory and AI are disconnected!")
        
        # Primary Diagnosis
        print("\n💡 PRIMARY DIAGNOSIS:")
        
        # Check for complete disconnection
        if not self.findings["connection_points"]:
            print("  ❌ MEMORY SYSTEM COMPLETELY DISCONNECTED FROM AI")
            print("     - Memory system exists but isn't called before AI generation")
            print("     - Need to wire buildContextForInput() into chat flow")
        
        # Check for missing handlers
        missing_memory = [h for h in self.findings["ipc_handlers"] if not h["has_memory_call"]]
        if missing_memory:
            print(f"  ❌ {len(missing_memory)} CHAT HANDLERS MISSING MEMORY CALLS")
        
        # Check for AI calls without memory
        ai_without_memory = [c for c in self.findings["ai_calls"] if not c["has_memory_param"]]
        if ai_without_memory:
            print(f"  ❌ {len(ai_without_memory)} AI CALLS WITHOUT MEMORY CONTEXT")
        
        # Save detailed findings
        import json
        from datetime import datetime
        
        report_path = self.project_root / "logs" / f"memory_flow_trace_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path.parent.mkdir(exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.findings, f, indent=2, default=str)
        
        print(f"\n💾 Detailed trace saved to: {report_path}")
        
        # Suggest fix locations
        print("\n🔧 SUGGESTED FIX LOCATIONS:")
        if self.findings["ipc_handlers"]:
            handler = self.findings["ipc_handlers"][0]
            print(f"  1. Add memory call to: {handler['file']} in handler '{handler['handler']}'")
            print("     Before calling AI, add:")
            print("     const memoryContext = await memorySystem.buildContextForInput(message);")
        
        if self.findings["ai_calls"]:
            ai_call = self.findings["ai_calls"][0]
            print(f"\n  2. Modify AI call in: {ai_call['file']}")
            print("     Change AI generation to include memory context")
        
        print("\n" + "="*60)


# Run tracer
if __name__ == "__main__":
    tracer = MemoryInjectionTracer()
    tracer.trace_flow()