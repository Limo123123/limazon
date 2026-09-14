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
    # Regex für limo-global.js
    global_pattern = re.compile(
        r'\s*<script[^>]*src=["\'][^"\']*limo-global\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>\s*',
        re.IGNORECASE | re.DOTALL
    )
    # Regex für eventuell bereits vorhandene Favicon-Links
    favicon_pattern = re.compile(
        r'\s*<link[^>]*rel=["\'](?:shortcut )?icon["\'][^>]*>\s*',
        re.IGNORECASE | re.DOTALL
    )

    # FIX: Das \s* am Ende fängt alle alten Leerzeichen/Zeilenumbrüche direkt NACH dem <head> ab
    head_pattern = re.compile(
        r"<head([^>]*)>\s*",
        re.IGNORECASE
    )

    updated = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith(".html"):
                continue

            path = os.path.join(root, file)
            page_name = os.path.splitext(file)[0]

            # Die Skripte (ohne einen unsauberen Umbruch am ganz am Ende)
            head_injections = (
                f'<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n    '
                f'<script src="/themes/js/config.js?v={current_time}"></script>\n    '
                f'<script src="/themes/js/security.js?v={current_time}"></script>\n    '
                f'<script src="/themes/js/limo-global.js?v={current_time}" data-page="{page_name}"></script>'
            )

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            original = content

            # Alte Versionen löschen
            content = config_pattern.sub("", content)
            content = security_pattern.sub("", content)
            content = global_pattern.sub("", content)
            content = favicon_pattern.sub("", content)

            # FIX: Hier wird nach den eingefügten Skripten \n und 4 Leerzeichen gesetzt, 
            # damit das darauffolgende <meta>-Tag perfekt eingerückt auf der neuen Zeile startet.
            def insert(match):
                return f"<head{match.group(1)}>\n    {head_injections}\n    "

            content = head_pattern.sub(insert, content, count=1)

            # Überschüssige leere Zeilen aufräumen
            content = re.sub(r"\n{3,}", "\n\n", content)

            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

                print(f"[PATCHED] {path} (data-page=\"{page_name}\")")
                updated += 1

    print("-" * 50)
    print(f"Fertig! {updated} HTML-Dateien mit perfekt eingerücktem Head aktualisiert.")

if __name__ == "__main__":
    patch_html_files()