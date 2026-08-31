import os
import re
import time

def patch_html_files(directory="."):
    current_time = int(time.time())

    # Regex für config.js
    config_pattern = re.compile(
        r'\s*<script[^>]*src=["\'][^"\']*config\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>\s*',
        re.IGNORECASE | re.DOTALL
    )
    # Regex für security.js
    security_pattern = re.compile(
        r'\s*<script[^>]*src=["\'][^"\']*security\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>\s*',
        re.IGNORECASE | re.DOTALL
    )
    # Regex für limo-global.js (alt & neu, egal wo es stand)
    global_pattern = re.compile(
        r'\s*<script[^>]*src=["\'][^"\']*limo-global\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>\s*',
        re.IGNORECASE | re.DOTALL
    )

    head_pattern = re.compile(
        r"<head([^>]*)>",
        re.IGNORECASE
    )

    updated = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith(".html"):
                continue

            path = os.path.join(root, file)
            
            # 1. Den reinen Dateinamen ohne ".html" extrahieren (z.B. "jobs" aus "jobs.html")
            page_name = os.path.splitext(file)[0]

            # 2. Die 3 Skripte für DIESE spezifische Datei generieren
            script_tags = (
                f'<script src="/themes/js/config.js?v={current_time}"></script>\n    '
                f'<script src="/themes/js/security.js?v={current_time}"></script>\n    '
                f'<script src="/themes/js/limo-global.js?v={current_time}" data-page="{page_name}"></script>\n    '
            )

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            original = content

            # 3. Alle alten Versionen der drei Skripte löschen (inkl. Leerzeichen/Umbrüche)
            content = config_pattern.sub("", content)
            content = security_pattern.sub("", content)
            content = global_pattern.sub("", content)

            # 4. Die 3 Skripte sauber oben in den <head> einfügen
            def insert(match):
                return f"<head{match.group(1)}>\n    {script_tags}"

            content = head_pattern.sub(insert, content, count=1)

            # Überschüssige leere Zeilen aufräumen
            content = re.sub(r"\n{3,}", "\n\n", content)

            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

                # Zeigt im Terminal direkt an, welches data-page Tag gesetzt wurde
                print(f"[PATCHED] {path} (data-page=\"{page_name}\")")
                updated += 1

    print("-" * 50)
    print(f"Fertig! {updated} HTML-Dateien mit allen 3 Skripten aktualisiert.")

if __name__ == "__main__":
    patch_html_files()