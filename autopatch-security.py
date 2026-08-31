import os
import re
import time

def patch_html_files(directory="."):
    current_time = int(time.time())

    # BEIDE Skripte bekommen jetzt den Cache-Buster v=...
    script_tags = (
        f'<script src="/themes/js/config.js?v={current_time}"></script>\n    '
        f'<script src="/themes/js/security.js?v={current_time}"></script>'
    )

    # Sucht nach alten Einbindungen der security.js (mit oder ohne v=...)
    security_pattern = re.compile(
        r'<script[^>]*src=["\'][^"\']*security\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>',
        re.IGNORECASE | re.DOTALL
    )
    
    # Sucht nach alten Einbindungen der config.js (mit oder ohne v=...)
    config_pattern = re.compile(
        r'<script[^>]*src=["\'][^"\']*config\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>',
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

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            original = content

            # 1. Wir löschen ALLE alten Versionen (egal wo sie stehen, egal ob mit/ohne v=)
            content = security_pattern.sub("", content)
            content = config_pattern.sub("", content)

            # 2. Wir fügen beide brandneu GANZ OBEN in den <head> ein, in der exakten Reihenfolge
            def insert(match):
                return f"<head{match.group(1)}>\n    {script_tags}"

            content = head_pattern.sub(insert, content, count=1)

            # Leere Zeilen etwas aufräumen
            content = re.sub(r"\n{3,}", "\n\n", content)

            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

                print(f"[PATCHED] {path}")
                updated += 1

    print("-" * 50)
    print(f"Fertig! {updated} HTML-Dateien mit neuesten Zeitstempeln aktualisiert.")

if __name__ == "__main__":
    patch_html_files()