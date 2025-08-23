#!/usr/bin/env python3
"""
Echo Rubicon Dual Memory System Scanner
Maps ECHO (frontend) and QLIB (backend) systems separately
Identifies truly dead code vs architectural components
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Configuration
PROJECT_ROOT = r"C:\Users\tophe\Documents\Echo Rubicon"
LOGS_DIR = r"C:\Users\tophe\Documents\Echo Rubicon\logs"

# File extensions to scan
VALID_EXTENSIONS = {'.js', '.jsx', '.css', '.html'}

# Folders to exclude
EXCLUDE_DIRS = {
    'node_modules', 'dist', 'build', '.git', 'coverage', 
    'public', 'static', '.next', '.cache', 'vendor',
    'venv', 'z__archive'  # Explicitly exclude archived code
}

# Architecture patterns
ECHO_PATTERNS = {
    'core': r'src[/\\]echo[/\\]',
    'engines': r'src[/\\]echo[/\\]engines[/\\]',
    'memory': r'src[/\\]echo[/\\]memory[/\\]'
}

QLIB_PATTERNS = {
    'backend': r'backend[/\\]qlib[/\\]',
    'interface': r'QLibInterface',
    'capsules': r'capsule(?:s|Retriever|Writer)?'
}

# Legacy patterns (old architecture)
LEGACY_PATTERNS = {
    'components': r'components[/\\](?!utils)',  # Components except utils
    'old_memory': r'components[/\\].*(?:memory|context|vault)',
    'backup': r'components-backup[/\\]'
}

class DualMemoryScanner:
    def __init__(self):
        self.files_scanned = 0
        self.echo_files = defaultdict(dict)
        self.qlib_files = defaultdict(dict)
        self.bridge_files = defaultdict(dict)
        self.legacy_files = defaultdict(dict)
        self.truly_dead_files = []
        self.active_imports = set()
        self.all_files = set()
        
    def scan_project(self):
        """Main scanning function"""
        print(f"🔍 Scanning Echo Rubicon Dual Memory Architecture")
        print("=" * 80)
        
        # Ensure logs directory exists
        os.makedirs(LOGS_DIR, exist_ok=True)
        
        # First pass: categorize files and collect imports
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Remove excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if any(file.endswith(ext) for ext in VALID_EXTENSIONS):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, PROJECT_ROOT)
                    self.all_files.add(relative_path)
                    self.categorize_file(file_path, relative_path)
                    
        # Second pass: identify truly dead files
        self.identify_dead_files()
        
        # Generate reports
        self.print_summary()
        self.export_diagnostic()
        
    def categorize_file(self, file_path, relative_path):
        """Categorize file into ECHO, QLIB, Bridge, or Legacy"""
        self.files_scanned += 1
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # Extract imports to track active files
            imports = self.extract_all_imports(content, file_path)
            for imp in imports:
                if imp['resolved']:
                    self.active_imports.add(imp['resolved'])
                    
            # Categorize by path and content
            file_info = {
                'path': relative_path,
                'size': len(content),
                'lines': content.count('\n'),
                'imports': imports,
                'exports': self.extract_exports(content),
                'functions': self.extract_memory_functions(content)
            }
            
            # Check if it's a bridge file (imports from both systems)
            imports_echo = any('echo' in str(imp.get('resolved', '')) for imp in imports)
            imports_qlib = any('qlib' in str(imp.get('resolved', '')) or 'QLib' in imp.get('path', '') for imp in imports)
            
            if imports_echo and imports_qlib:
                self.bridge_files[relative_path] = file_info
                self.bridge_files[relative_path]['type'] = 'bridge'
                
            # ECHO system files
            elif any(re.search(pattern, relative_path) for pattern in ECHO_PATTERNS.values()):
                category = self.get_echo_category(relative_path)
                self.echo_files[category][relative_path] = file_info
                
            # QLIB system files
            elif any(re.search(pattern, relative_path) for pattern in QLIB_PATTERNS.values()):
                self.qlib_files['backend'][relative_path] = file_info
                
            # Files that use QLIB
            elif 'QLibInterface' in content or 'qlib' in relative_path.lower():
                self.qlib_files['consumers'][relative_path] = file_info
                
            # Memory-related files in src/memory (could be bridge)
            elif 'src\\memory' in relative_path or 'src/memory' in relative_path:
                # Check if it's part of the active system
                if self.is_memory_file_active(content):
                    self.bridge_files[relative_path] = file_info
                    self.bridge_files[relative_path]['type'] = 'memory_core'
                else:
                    self.legacy_files[relative_path] = file_info
                    
            # Legacy components
            elif any(re.search(pattern, relative_path) for pattern in LEGACY_PATTERNS.values()):
                self.legacy_files[relative_path] = file_info
                
            # Diagnostic/test files
            elif any(keyword in relative_path.lower() for keyword in ['diag', 'test', 'debug', 'audit']):
                # Don't count as dead, these are utilities
                pass
                
        except Exception as e:
            print(f"❌ Error reading {relative_path}: {e}")
            
    def get_echo_category(self, path):
        """Categorize ECHO system files"""
        if 'engines' in path:
            return 'engines'
        elif 'memory' in path:
            return 'memory'
        elif 'core' in path:
            return 'core'
        return 'other'
        
    def is_memory_file_active(self, content):
        """Check if a memory file is part of the active architecture"""
        active_indicators = [
            'MemoryVaultManager',
            'QLibInterface',
            'ChatOrchestrator',
            'PromptBuilder',
            'CapsuleRetriever',
            'exports'  # Has exports means it's meant to be used
        ]
        return any(indicator in content for indicator in active_indicators)
        
    def extract_all_imports(self, content, file_path):
        """Extract all imports with better resolution"""
        imports = []
        
        # CommonJS requires
        require_pattern = r'require\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\s*\)'
        for match in re.finditer(require_pattern, content):
            import_path = match.group(1)
            imports.append({
                'type': 'require',
                'path': import_path,
                'resolved': self.resolve_import_path(import_path, file_path)
            })
            
        # ES6 imports
        import_pattern = r'import\s+.*?\s+from\s+[\'"`]([^\'"`]+)[\'"`]'
        for match in re.finditer(import_pattern, content):
            import_path = match.group(1)
            imports.append({
                'type': 'import',
                'path': import_path,
                'resolved': self.resolve_import_path(import_path, file_path)
            })
            
        return imports
        
    def resolve_import_path(self, import_path, from_file):
        """Resolve relative import paths"""
        if not import_path.startswith('.'):
            return None  # External module
            
        base_dir = os.path.dirname(from_file)
        resolved = os.path.normpath(os.path.join(base_dir, import_path))
        
        # Check with common extensions
        for ext in ['', '.js', '.jsx', '/index.js', '/index.jsx']:
            full_path = resolved + ext
            if os.path.exists(full_path):
                return os.path.relpath(full_path, PROJECT_ROOT)
                
        return None  # Couldn't resolve
        
    def extract_exports(self, content):
        """Extract what the file exports"""
        exports = []
        
        # module.exports
        if 'module.exports' in content:
            exports.append('module.exports')
            
        # Named exports
        export_pattern = r'exports\.(\w+)'
        for match in re.finditer(export_pattern, content):
            exports.append(f'exports.{match.group(1)}')
            
        # ES6 exports
        es6_pattern = r'export\s+(?:default\s+)?(?:const|let|var|function|class)?\s*(\w+)?'
        for match in re.finditer(es6_pattern, content):
            if match.group(1):
                exports.append(match.group(1))
                
        return exports
        
    def extract_memory_functions(self, content):
        """Extract memory-related function names"""
        functions = []
        patterns = [
            r'function\s+(\w*[Mm]emory\w*)',
            r'function\s+(\w*[Cc]apsule\w*)',
            r'function\s+(\w*[Cc]ontext\w*)',
            r'function\s+(\w*[Vv]ault\w*)',
            r'const\s+(\w*[Mm]emory\w*)\s*=.*function',
            r'const\s+(\w*[Cc]apsule\w*)\s*=.*function',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                if match.group(1):
                    functions.append(match.group(1))
                    
        return functions
        
    def identify_dead_files(self):
        """Identify truly dead files"""
        # Entry points that shouldn't be marked as dead
        entry_points = {
            'main.js', 'index.js', 'preload.js',
            'main\\app.js', 'main\\windows.js',
            'src\\index.js', 'src\\app.js'
        }
        
        # Utility files that are okay to not be imported
        utility_patterns = [
            r'test[\\/]',
            r'tools[\\/]',
            r'diag.*\.js$',
            r'debug.*\.js$',
            r'audit.*\.js$',
            r'\.html$',
            r'\.css$'
        ]
        
        for file_path in self.all_files:
            # Skip entry points
            if any(file_path.endswith(ep) for ep in entry_points):
                continue
                
            # Skip utility files
            if any(re.search(pattern, file_path) for pattern in utility_patterns):
                continue
                
            # Skip if it's actively imported
            if file_path in self.active_imports:
                continue
                
            # Skip if it has exports (meant to be used)
            file_exports = []
            for category in [self.echo_files, self.qlib_files, self.bridge_files, self.legacy_files]:
                for subcat in category.values():
                    if isinstance(subcat, dict) and file_path in subcat:
                        file_exports = subcat[file_path].get('exports', [])
                        break
                        
            if file_exports:
                continue
                
            # This file is truly dead
            self.truly_dead_files.append(file_path)
            
    def print_summary(self):
        """Print analysis summary"""
        print("\n📊 DUAL MEMORY ARCHITECTURE ANALYSIS")
        print("=" * 80)
        
        # ECHO System
        print("\n🌟 ECHO SYSTEM (Frontend/User-Facing)")
        echo_total = sum(len(files) for files in self.echo_files.values())
        print(f"Total ECHO files: {echo_total}")
        for category, files in self.echo_files.items():
            print(f"  - {category}: {len(files)} files")
            for file in list(files.keys())[:3]:
                print(f"    • {file}")
                
        # QLIB System
        print("\n📚 QLIB SYSTEM (Backend/Vault-Facing)")
        qlib_total = sum(len(files) for files in self.qlib_files.values())
        print(f"Total QLIB files: {qlib_total}")
        for category, files in self.qlib_files.items():
            print(f"  - {category}: {len(files)} files")
            for file in list(files.keys())[:3]:
                print(f"    • {file}")
                
        # Bridge Files
        print("\n🌉 BRIDGE FILES (Connect ECHO ↔ QLIB)")
        print(f"Total bridge files: {len(self.bridge_files)}")
        for file, info in list(self.bridge_files.items())[:5]:
            print(f"  • {file} ({info.get('type', 'bridge')})")
            
        # Legacy Files
        print("\n🗄️ LEGACY FILES (Old Architecture)")
        print(f"Total legacy files: {len(self.legacy_files)}")
        print("These are candidates for removal after migration")
        
        # Truly Dead Files
        print("\n💀 TRULY DEAD FILES (Safe to Delete)")
        print(f"Total dead files: {len(self.truly_dead_files)}")
        for file in self.truly_dead_files[:10]:
            print(f"  • {file}")
        if len(self.truly_dead_files) > 10:
            print(f"  ... and {len(self.truly_dead_files) - 10} more")
            
        # Key Integration Points
        print("\n🔗 KEY INTEGRATION POINTS")
        self.identify_integration_points()
        
    def identify_integration_points(self):
        """Find where ECHO and QLIB connect"""
        integrations = []
        
        for file, info in self.bridge_files.items():
            imports = info.get('imports', [])
            echo_imports = [i for i in imports if 'echo' in str(i.get('path', ''))]
            qlib_imports = [i for i in imports if 'qlib' in str(i.get('path', '')) or 'QLib' in i.get('path', '')]
            
            if echo_imports and qlib_imports:
                integrations.append({
                    'file': file,
                    'echo_deps': len(echo_imports),
                    'qlib_deps': len(qlib_imports)
                })
                
        for integration in integrations[:5]:
            print(f"  • {integration['file']}")
            print(f"    ECHO dependencies: {integration['echo_deps']}")
            print(f"    QLIB dependencies: {integration['qlib_deps']}")
            
    def export_diagnostic(self):
        """Export detailed diagnostic"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(LOGS_DIR, f"dual_memory_scan_{timestamp}.json")
        
        diagnostic = {
            'scan_timestamp': timestamp,
            'project_root': PROJECT_ROOT,
            'architecture_summary': {
                'echo_files': sum(len(f) for f in self.echo_files.values()),
                'qlib_files': sum(len(f) for f in self.qlib_files.values()),
                'bridge_files': len(self.bridge_files),
                'legacy_files': len(self.legacy_files),
                'truly_dead_files': len(self.truly_dead_files)
            },
            'echo_system': dict(self.echo_files),
            'qlib_system': dict(self.qlib_files),
            'bridge_files': dict(self.bridge_files),
            'legacy_files': dict(self.legacy_files),
            'truly_dead_files': self.truly_dead_files,
            'migration_recommendations': self.generate_migration_plan()
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(diagnostic, f, indent=2)
            
        print(f"\n✅ Full diagnostic exported to: {output_file}")
        
    def generate_migration_plan(self):
        """Generate recommendations for migration"""
        return {
            'keep': {
                'echo_system': 'All files in src/echo/* - this is your user-facing memory',
                'qlib_backend': 'All files in backend/qlib/* - this is your vault interface',
                'bridge_files': 'Files that connect ECHO and QLIB',
                'main_process': 'main/* files - core Electron process'
            },
            'migrate': {
                'components_memory': 'Move memory logic from components/* to appropriate ECHO/QLIB locations',
                'duplicate_functions': 'Consolidate duplicate implementations between old and new systems'
            },
            'delete': {
                'components_backup': 'All files in components-backup/*',
                'z_archive': 'All files in z__archive/*',
                'orphaned_files': 'Files with no imports and no exports',
                'old_diagnostics': 'Old diagnostic and test files from previous attempts'
            }
        }

if __name__ == "__main__":
    scanner = DualMemoryScanner()
    scanner.scan_project()