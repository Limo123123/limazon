import os
import re
import time


def patch_html_files(directory="."):
    current_time = int(time.time())

    script_tag = (
        f'<script src="/themes/js/security.js?v={current_time}"></script>'
    )

    security_pattern = re.compile(
        r'<script[^>]*src=["\'][^"\']*security\.js(?:\?v=\d+)?["\'][^>]*>\s*</script>',
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

            # Alle security.js Einbindungen entfernen
            content = security_pattern.sub("", content)

            # Direkt nach <head> einfügen
            def insert(match):
                return f"<head{match.group(1)}>\n    {script_tag}"

            content = head_pattern.sub(insert, content, count=1)

            # Leere Zeilen etwas aufräumen
            content = re.sub(r"\n{3,}", "\n\n", content)

            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

                print(f"[PATCHED] {path}")
                updated += 1

    print("-" * 50)
    print(f"Fertig! {updated} HTML-Dateien aktualisiert.")


if __name__ == "__main__":
    patch_html_files()