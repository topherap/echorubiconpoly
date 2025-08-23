@echo off
:: Drive Mapper and Tagger Script
:: This batch file embeds and runs Python code to map drives and export to markdown

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

:: Create temporary Python script
set "TEMP_PY=%TEMP%\drive_mapper_%RANDOM%.py"

:: Write Python code to temporary file
(
echo import os
echo import json
echo import subprocess
echo import datetime
echo import win32api
echo import win32file
echo from pathlib import Path
echo.
echo # Configuration
echo MAPPED_FILE = r"C:\Users\tophe\Documents\Echo Rubicon\drive_map.json"
echo EXPORT_PATH = r"D:\Obsidian Vault\drive_map.md"
echo.
echo def get_drive_info():
echo     """Get information about all available drives"""
echo     drives = []
echo     drive_bits = win32api.GetLogicalDrives()
echo     
echo     for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
echo         mask = 1 ^<^< (ord(letter) - ord('A'))
echo         if drive_bits ^& mask:
echo             drive_path = f"{letter}:\\"
echo             try:
echo                 drive_type = win32file.GetDriveType(drive_path)
echo                 volume_info = win32api.GetVolumeInformation(drive_path)
echo                 
echo                 # Get drive space info
echo                 try:
echo                     total, used, free = win32api.GetDiskFreeSpaceEx(drive_path)
echo                     total_gb = total / (1024**3)
echo                     used_gb = used / (1024**3)
echo                     free_gb = free / (1024**3)
echo                 except:
echo                     total_gb = used_gb = free_gb = 0
echo                 
echo                 drive_types = {
echo                     0: "Unknown",
echo                     1: "No Root Directory",
echo                     2: "Removable",
echo                     3: "Fixed",
echo                     4: "Remote/Network",
echo                     5: "CD-ROM",
echo                     6: "RAM Disk"
echo                 }
echo                 
echo                 drives.append({
echo                     'letter': letter,
echo                     'path': drive_path,
echo                     'label': volume_info[0] or "No Label",
echo                     'type': drive_types.get(drive_type, "Unknown"),
echo                     'file_system': volume_info[4],
echo                     'serial': f"{volume_info[1]:X}",
echo                     'total_gb': round(total_gb, 2),
echo                     'used_gb': round(used_gb, 2),
echo                     'free_gb': round(free_gb, 2),
echo                     'tags': []
echo                 })
echo             except Exception as e:
echo                 # Drive might be disconnected or unreadable
echo                 pass
echo     
echo     return drives
echo.
echo def load_existing_tags():
echo     """Load existing drive tags from mapped file"""
echo     try:
echo         if os.path.exists(MAPPED_FILE):
echo             with open(MAPPED_FILE, 'r') as f:
echo                 data = json.load(f)
echo                 return {d['letter']: d.get('tags', []) for d in data if 'letter' in d}
echo     except:
echo         pass
echo     return {}
echo.
echo def save_drive_map(drives):
echo     """Save drive mapping to JSON file"""
echo     os.makedirs(os.path.dirname(MAPPED_FILE), exist_ok=True)
echo     with open(MAPPED_FILE, 'w') as f:
echo         json.dump(drives, f, indent=2)
echo.
echo def export_to_markdown(drives):
echo     """Export drive information to markdown file"""
echo     os.makedirs(os.path.dirname(EXPORT_PATH), exist_ok=True)
echo     
echo     with open(EXPORT_PATH, 'w') as f:
echo         f.write(f"# Drive Map\n")
echo         f.write(f"*Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
echo         
echo         # Summary table
echo         f.write("## Summary\n\n")
echo         f.write("| Drive | Label | Type | File System | Total (GB) | Free (GB) | Tags |\n")
echo         f.write("|-------|-------|------|-------------|------------|-----------|------|\n")
echo         
echo         for drive in drives:
echo             tags_str = ', '.join(drive['tags']) if drive['tags'] else '-'
echo             f.write(f"| {drive['letter']}: | {drive['label']} | {drive['type']} | "
echo                     f"{drive['file_system']} | {drive['total_gb']} | {drive['free_gb']} | "
echo                     f"{tags_str} |\n")
echo         
echo         # Detailed information
echo         f.write("\n## Detailed Information\n\n")
echo         for drive in drives:
echo             f.write(f"### {drive['letter']}: - {drive['label']}\n\n")
echo             f.write(f"- **Type**: {drive['type']}\n")
echo             f.write(f"- **File System**: {drive['file_system']}\n")
echo             f.write(f"- **Serial Number**: {drive['serial']}\n")
echo             f.write(f"- **Total Space**: {drive['total_gb']} GB\n")
echo             f.write(f"- **Used Space**: {drive['used_gb']} GB\n")
echo             f.write(f"- **Free Space**: {drive['free_gb']} GB\n")
echo             f.write(f"- **Usage**: {round((drive['used_gb']/drive['total_gb'])*100, 1)}%%\n")
echo             if drive['tags']:
echo                 f.write(f"- **Tags**: {', '.join(drive['tags'])}\n")
echo             f.write("\n")
echo.
echo def tag_drives(drives):
echo     """Interactive tagging of drives"""
echo     print("\n=== Drive Tagging ===")
echo     print("Enter tags for each drive (comma-separated, press Enter to skip)\n")
echo     
echo     for drive in drives:
echo         current_tags = ', '.join(drive['tags']) if drive['tags'] else 'none'
echo         print(f"\n{drive['letter']}: - {drive['label']} ({drive['type']})")
echo         print(f"Current tags: {current_tags}")
echo         
echo         new_tags = input("New tags (leave empty to keep current): ").strip()
echo         if new_tags:
echo             drive['tags'] = [tag.strip() for tag in new_tags.split(',') if tag.strip()]
echo.
echo def main():
echo     print("Drive Mapper and Tagger")
echo     print("=======================\n")
echo     
echo     # Get drive information
echo     print("Scanning drives...")
echo     drives = get_drive_info()
echo     
echo     # Load existing tags
echo     existing_tags = load_existing_tags()
echo     for drive in drives:
echo         if drive['letter'] in existing_tags:
echo             drive['tags'] = existing_tags[drive['letter']]
echo     
echo     # Display current drives
echo     print(f"\nFound {len(drives)} drives:")
echo     for drive in drives:
echo         tags_str = f" [{', '.join(drive['tags'])}]" if drive['tags'] else ""
echo         print(f"  {drive['letter']}: - {drive['label']} ({drive['type']}, "
echo               f"{drive['free_gb']}/{drive['total_gb']} GB free){tags_str}")
echo     
echo     # Ask if user wants to tag drives
echo     if input("\nDo you want to tag/retag drives? (y/n): ").lower() == 'y':
echo         tag_drives(drives)
echo     
echo     # Save and export
echo     print("\nSaving drive map...")
echo     save_drive_map(drives)
echo     
echo     print("Exporting to markdown...")
echo     export_to_markdown(drives)
echo     
echo     print(f"\nDone! Files saved to:")
echo     print(f"  - Map: {MAPPED_FILE}")
echo     print(f"  - Export: {EXPORT_PATH}")
echo.
echo if __name__ == "__main__":
echo     try:
echo         main()
echo     except Exception as e:
echo         print(f"\nError: {e}")
echo         import traceback
echo         traceback.print_exc()
echo     
echo     input("\nPress Enter to exit...")
) > "%TEMP_PY%"

:: Install required package if not present
pip show pywin32 >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing required package: pywin32
    pip install pywin32
)

:: Run the Python script
python "%TEMP_PY%"

:: Clean up
del "%TEMP_PY%"

:: End
exit /b %errorlevel%