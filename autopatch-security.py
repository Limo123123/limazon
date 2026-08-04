import os
import re
import time

def patch_html_files(directory='.'):
    # Aktuelle Zeit in Sekunden für Cache-Busting
    current_time = int(time.time())
    
    # Der Tag, den wir einfügen/updaten wollen
    script_tag = f'<script type="module" src="/themes/js/security.js?v={current_time}"></script>'

    # Regex, um das existierende Script zu finden (erkennt Pfade, die auf security.js enden, mit/ohne v=123)
    script_pattern = re.compile(r'<script[^>]*src=["\'][^"\']*security\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>', re.IGNORECASE)
    
    # Regex, um den schließenden Head-Tag zu finden
    head_pattern = re.compile(r'</head>', re.IGNORECASE)

    files_patched = 0
    files_added = 0

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                
                # Prüfen, ob das Script schon drin ist
                if script_pattern.search(content):
                    # Ersetzen mit dem neuen Zeitstempel
                    new_content = script_pattern.sub(script_tag, content)
                    if new_content != content:
                        print(f"[UPDATED]  {filepath}")
                        files_patched += 1
                else:
                    # Hinzufügen vor dem </head> Tag
                    if head_pattern.search(content):
                        new_content = head_pattern.sub(f'    {script_tag}\n</head>', content)
                        print(f"[ADDED]    {filepath}")
                        files_added += 1
                    else:
                        print(f"[WARNING] Kein <head> Tag in {filepath} gefunden. Datei übersprungen.")
                
                # Nur schreiben, wenn sich etwas geändert hat
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)

    print("-" * 40)
    print("Patch-Vorgang abgeschlossen!")
    print(f"Dateien aktualisiert (Zeitstempel neu): {files_patched}")
    print(f"Dateien gepatcht (Skript neu eingefügt): {files_added}")

if __name__ == "__main__":
    # Startet die Suche im aktuellen Verzeichnis
    patch_html_files()