#!/usr/bin/env python3
r"""
Echo Rubicon Diagnostic Script
Analyzes the current state of the Echo project to identify breaks and recent changes
Runs from: C:\Users\tophe\Documents\Echo Rubicon\tools
Outputs to: Terminal (summary) and C:\Users\tophe\Documents\Echo Rubicon\logs (full JSON)
"""

import os
import json
import datetime
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class EchoDiagnostic:
    def __init__(self):
        # Set up paths relative to tools directory
        self.tools_dir = Path(r"C:\Users\tophe\Documents\Echo Rubicon\tools")
        self.project_root = Path(r"C:\Users\tophe\Documents\Echo Rubicon")
        self.vault_path = Path(r"D:\Obsidian Vault")
        self.logs_dir = Path(r"C:\Users\tophe\Documents\Echo Rubicon\logs")
        
        # Ensure logs directory exists
        self.logs_dir.mkdir(exist_ok=True)
        
        self.findings = {
            "timestamp": datetime.datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "vault_path": str(self.vault_path),
            "critical": [],
            "warnings": [],
            "info": [],
            "file_states": {},
            "memory_system": {},
            "config_analysis": {},
            "recent_changes": []
        }
    
    def run_full_diagnostic(self):
        """Run complete diagnostic suite"""
        print("🔍 Echo Rubicon Diagnostic Starting...")
        print(f"📁 Project: {self.project_root}")
        print(f"📁 Vault: {self.vault_path}")
        print("="*60 + "\n")
        
        # Check project structure
        self.check_project_structure()
        
        # Check critical files
        self.check_critical_files()
        
        # Analyze memory system
        self.analyze_memory_system()
        
        # Check vault integration
        self.check_vault_integration()
        
        # Check configuration files
        self.check_configurations()
        
        # Analyze recent changes
        self.analyze_recent_changes()
        
        # Generate report
        self.generate_report()
    
    def check_project_structure(self):
        """Verify expected project structure exists"""
        expected_dirs = [
            "src/memory",
            "components/utils",
            "main",
            "src/echo/memory",  # Old path that might be referenced
            ".echo",  # Local config
            "logs",
            "tools"
        ]
        
        print("🔍 Checking project structure...")
        for dir_path in expected_dirs:
            full_path = self.project_root / dir_path
            if full_path.exists():
                self.findings["info"].append(f"✅ Directory exists: {dir_path}")
            else:
                self.findings["warnings"].append(f"⚠️ Missing directory: {dir_path}")
    
    def check_critical_files(self):
        """Check existence and basic validity of critical files"""
        print("🔍 Checking critical files...")
        
        critical_files = {
            "components/utils/VaultPathManager.js": self.verify_vault_path_manager,
            "src/memory/QLibInterface.js": self.verify_qlib_interface,
            "src/memory/MemoryVaultManager.js": self.verify_memory_vault_manager,
            "main/app.js": self.verify_main_app,
            "src/ipc-handlers.js": None,
            "components/MyAI-global.js": self.check_auth_bypass
        }
        
        for file_path, validator in critical_files.items():
            full_path = self.project_root / file_path
            if full_path.exists():
                # Get file stats
                stats = os.stat(full_path)
                mod_time = datetime.datetime.fromtimestamp(stats.st_mtime)
                size = stats.st_size
                
                self.findings["file_states"][file_path] = {
                    "exists": True,
                    "modified": mod_time.isoformat(),
                    "size": size,
                    "hash": self.get_file_hash(full_path)
                }
                
                # Run specific validator if provided
                if validator:
                    validator(full_path)
            else:
                self.findings["critical"].append(f"❌ Missing critical file: {file_path}")
                self.findings["file_states"][file_path] = {"exists": False}
    
    def verify_vault_path_manager(self, file_path: Path):
        """Check VaultPathManager implementation"""
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Check for required exports
        required_exports = ["getVaultPath", "setVaultPath", "vaultExists"]
        for export in required_exports:
            if export in content:
                self.findings["info"].append(f"✅ VaultPathManager exports {export}")
            else:
                self.findings["critical"].append(f"❌ VaultPathManager missing export: {export}")
        
        # Check for lastVaultPath.json reference
        if "lastVaultPath.json" in content:
            self.findings["info"].append("✅ VaultPathManager uses lastVaultPath.json")
    
    def verify_qlib_interface(self, file_path: Path):
        """Check QLibInterface implementation"""
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Check for VaultPathManager import
        if "VaultPathManager" in content:
            # Check import path
            if "../utils/VaultPathManager" in content:
                self.findings["critical"].append("❌ QLibInterface has incorrect import path (../utils/)")
            elif "../../components/utils/VaultPathManager" in content:
                self.findings["info"].append("✅ QLibInterface has correct import path")
        else:
            self.findings["critical"].append("❌ QLibInterface missing VaultPathManager import")
        
        # Check for duplicate declarations
        if content.count("const { getVaultPath") > 1:
            self.findings["critical"].append("❌ Duplicate getVaultPath declaration in QLibInterface")
    
    def verify_memory_vault_manager(self, file_path: Path):
        """Check MemoryVaultManager implementation"""
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Check for vault path fallback
        if "getVaultPath()" in content:
            self.findings["info"].append("✅ MemoryVaultManager uses getVaultPath fallback")
        else:
            self.findings["warnings"].append("⚠️ MemoryVaultManager may not have vault path fallback")
        
        # Check for capsule writing
        if "writeCapsule" in content or "fs.writeFile" in content:
            self.findings["info"].append("✅ MemoryVaultManager appears to have write capability")
        else:
            self.findings["critical"].append("❌ MemoryVaultManager missing capsule write implementation")
    
    def verify_main_app(self, file_path: Path):
        """Check main/app.js implementation"""
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Check for hardcoded paths
        if "D:\\\\Obsidian Vault" in content or 'D:\\Obsidian Vault' in content:
            self.findings["warnings"].append("⚠️ Hardcoded vault path found in main/app.js")
        
        # Check for QLibInterface import
        if "../src/echo/memory/QLibInterface" in content:
            self.findings["critical"].append("❌ main/app.js has incorrect QLibInterface path")
        elif "../src/memory/QLibInterface" in content:
            self.findings["info"].append("✅ main/app.js has correct QLibInterface path")
        
        # Check for circular exports
        if "module.exports" in content and "userVaultPath" in content:
            self.findings["warnings"].append("⚠️ main/app.js may have problematic exports")
    
    def check_auth_bypass(self, file_path: Path):
        """Check for auth bypass in MyAI-global.js"""
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Look for line 928 area
        lines = content.split('\n')
        for i, line in enumerate(lines[920:940], start=921):
            if "shouldShowMain = true" in line:
                self.findings["critical"].append(f"❌ Auth bypass found at line {i}: shouldShowMain = true")
                break
    
    def analyze_memory_system(self):
        """Analyze memory system integration"""
        print("🔍 Analyzing memory system...")
        
        # Check for .echo directory in user home
        echo_dir = Path.home() / ".echo"
        if echo_dir.exists():
            self.findings["info"].append("✅ ~/.echo directory exists")
            
            # Check for lastVaultPath.json
            last_vault = echo_dir / "lastVaultPath.json"
            if last_vault.exists():
                try:
                    with open(last_vault) as f:
                        data = json.load(f)
                        self.findings["memory_system"]["last_vault_path"] = data.get("path", "Unknown")
                except:
                    self.findings["warnings"].append("⚠️ Could not read lastVaultPath.json")
        else:
            self.findings["critical"].append("❌ ~/.echo directory missing")
        
        # Check for .echo in project root
        project_echo = self.project_root / ".echo"
        if project_echo.exists():
            self.findings["info"].append("✅ Project .echo directory exists")
        else:
            self.findings["warnings"].append("⚠️ Project .echo directory missing")
    
    def check_vault_integration(self):
        """Check Obsidian vault integration"""
        print("🔍 Checking vault integration...")
        
        if not self.vault_path.exists():
            self.findings["critical"].append("❌ Vault path does not exist")
            return
        
        # Check for .echo directory in vault
        echo_vault = self.vault_path / ".echo"
        if echo_vault.exists():
            self.findings["info"].append("✅ Vault .echo directory exists")
            
            # Check subdirectories
            expected_subdirs = ["capsules", "entities", "contexts"]
            for subdir in expected_subdirs:
                subdir_path = echo_vault / subdir
                if subdir_path.exists():
                    # Count files
                    file_count = len(list(subdir_path.glob("*.json")))
                    self.findings["memory_system"][f"{subdir}_count"] = file_count
                    if file_count > 0:
                        self.findings["info"].append(f"✅ {subdir} contains {file_count} files")
                    else:
                        self.findings["warnings"].append(f"⚠️ {subdir} is empty")
                else:
                    self.findings["critical"].append(f"❌ Missing vault subdirectory: {subdir}")
            
            # Check for index.json
            if (echo_vault / "index.json").exists():
                self.findings["info"].append("✅ Vault index.json exists")
            else:
                self.findings["critical"].append("❌ Vault index.json missing")
        else:
            self.findings["critical"].append("❌ Vault .echo directory missing")
    
    def check_configurations(self):
        """Check various configuration files"""
        print("🔍 Checking configurations...")
        
        # Check for config.json or config.enc
        config_locations = [
            self.project_root / "config.json",
            self.project_root / "config.enc",
            Path.home() / ".echo" / "config.json",
            Path.home() / ".echo" / "config.enc",
            self.project_root / ".echo" / "config.json"
        ]
        
        config_found = False
        for config_path in config_locations:
            if config_path.exists():
                self.findings["info"].append(f"✅ Config found: {config_path}")
                self.findings["config_analysis"]["config_location"] = str(config_path)
                config_found = True
                break
        
        if not config_found:
            self.findings["critical"].append("❌ No configuration file found - WILL trigger onboarding")
            self.findings["config_analysis"]["config_found"] = False
    
    def analyze_recent_changes(self):
        """Analyze recently modified files"""
        print("🔍 Analyzing recent changes...")
        
        recent_files = []
        now = datetime.datetime.now()
        
        # Walk project directory
        for root, dirs, files in os.walk(self.project_root):
            # Skip node_modules and other large dirs
            if 'node_modules' in root or '.git' in root:
                continue
            
            for file in files:
                if file.endswith(('.js', '.json')):
                    file_path = Path(root) / file
                    try:
                        stats = os.stat(file_path)
                        mod_time = datetime.datetime.fromtimestamp(stats.st_mtime)
                        age = now - mod_time
                        
                        if age.days < 1:  # Modified in last 24 hours
                            recent_files.append({
                                "path": str(file_path.relative_to(self.project_root)),
                                "modified": mod_time.isoformat(),
                                "hours_ago": round(age.total_seconds() / 3600, 1)
                            })
                    except:
                        pass
        
        # Sort by modification time
        recent_files.sort(key=lambda x: x["hours_ago"])
        self.findings["recent_changes"] = recent_files[:20]  # Top 20
    
    def get_file_hash(self, file_path: Path) -> str:
        """Get MD5 hash of file for change detection"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()[:8]
        except:
            return "error"
    
    def generate_report(self):
        """Generate diagnostic report"""
        # Terminal summary
        print("\n" + "="*60)
        print("🧠 ECHO RUBICON DIAGNOSTIC SUMMARY")
        print("="*60)
        
        # Critical issues
        if self.findings["critical"]:
            print(f"\n❌ CRITICAL ISSUES ({len(self.findings['critical'])}):")
            for issue in self.findings["critical"][:5]:  # First 5
                print(f"  {issue}")
            if len(self.findings["critical"]) > 5:
                print(f"  ... and {len(self.findings['critical']) - 5} more")
        else:
            print("\n✅ No critical issues found")
        
        # Warnings
        if self.findings["warnings"]:
            print(f"\n⚠️  WARNINGS ({len(self.findings['warnings'])}):")
            for warning in self.findings["warnings"][:3]:  # First 3
                print(f"  {warning}")
            if len(self.findings["warnings"]) > 3:
                print(f"  ... and {len(self.findings['warnings']) - 3} more")
        
        # Memory system status
        print("\n🧠 MEMORY SYSTEM STATUS:")
        for key, value in self.findings["memory_system"].items():
            print(f"  - {key}: {value}")
        
        # Recent changes
        if self.findings["recent_changes"]:
            print("\n📝 RECENT CHANGES (last 24h):")
            for change in self.findings["recent_changes"][:5]:
                print(f"  - {change['path']} ({change['hours_ago']}h ago)")
        
        # Primary diagnosis
        print("\n🔍 PRIMARY DIAGNOSIS:")
        
        # Check for onboarding trigger
        config_issue = any("No configuration file found" in issue for issue in self.findings["critical"])
        if config_issue:
            print("  ❌ ONBOARDING TRIGGERED: No config file found")
            print("     This explains why identity was lost")
        
        # Check for memory injection
        vault_issue = any("Vault .echo directory missing" in issue for issue in self.findings["critical"])
        if vault_issue:
            print("  ❌ MEMORY BROKEN: Vault .echo directory missing")
            print("     Q-core cannot access any stored memories")
        
        # Check for auth bypass
        auth_issue = any("Auth bypass found" in issue for issue in self.findings["critical"])
        if auth_issue:
            print("  ⚠️  AUTH BYPASSED: Development mode active")
        
        # Check for import issues
        import_issue = any("incorrect import path" in issue for issue in self.findings["critical"])
        if import_issue:
            print("  ❌ MODULE LOADING BROKEN: Import paths incorrect")
        
        print("\n📊 SUMMARY:")
        print(f"  - Critical issues: {len(self.findings['critical'])}")
        print(f"  - Warnings: {len(self.findings['warnings'])}")
        print(f"  - Files checked: {len(self.findings['file_states'])}")
        print(f"  - Recent changes: {len(self.findings['recent_changes'])}")
        
        # Save detailed JSON report
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.logs_dir / f"echo_diagnostic_{timestamp}.json"
        
        with open(report_path, 'w') as f:
            json.dump(self.findings, f, indent=2, default=str)
        
        print(f"\n💾 Full diagnostic saved to:")
        print(f"   {report_path}")
        print("\n" + "="*60)


# Run diagnostic
if __name__ == "__main__":
    try:
        diagnostic = EchoDiagnostic()
        diagnostic.run_full_diagnostic()
    except Exception as e:
        print(f"\n❌ Diagnostic failed with error: {e}")
        import traceback
        traceback.print_exc()