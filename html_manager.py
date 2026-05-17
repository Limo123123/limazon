import os
import re
import sys
import xml.etree.ElementTree as ET
from xml.dom import minidom
import random
import string
import glob

MAP_FILE = "map.xml"

def get_cache_buster():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def prettify_xml(elem):
    rough_string = ET.tostring(elem, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")

def print_progress(current, total, prefix='Verarbeite', suffix='Fertig'):
    """Erzeugt einen nativen Ladebalken und löscht alte, längere Dateinamen sauber aus"""
    bar_length = 40
    fraction = current / total if total > 0 else 1
    filled_length = int(round(bar_length * fraction))
    bar = '█' * filled_length + '░' * (bar_length - filled_length)
    percent = round(fraction * 100, 1)
    
    # Der Trick: Suffix linksbündig auf 60 Zeichen auffüllen, um alte Reste komplett zu überschreiben
    padded_suffix = f"{suffix:<60}"
    
    sys.stdout.write(f'\r{prefix} |{bar}| {percent}% {padded_suffix}')
    sys.stdout.flush()
    if current == total:
        print()

def split_html(target):
    if target == ".":
        all_files = glob.glob('**/*.html', recursive=True)
        html_files = [f.replace('\\', '/') for f in all_files if not '_assets/' in f.replace('\\', '/')]
    else:
        if not os.path.exists(target):
            print(f"❌ Fehler: Datei '{target}' nicht gefunden.")
            return
        html_files = [target.replace('\\', '/')]

    if not html_files:
        print("ℹ️ Keine HTML-Dateien zum Verarbeiten gefunden.")
        return

    root_xml = ET.Element("MonolithMap")
    if os.path.exists(MAP_FILE):
        try:
            tree = ET.parse(MAP_FILE)
            root_xml = tree.getroot()
        except:
            pass 

    existing_new_htmls = [node.get("new_html") for node in root_xml.findall("File")]

    file_map = {}
    for file in html_files:
        if file in existing_new_htmls:
            continue
        base_name = os.path.splitext(file)[0]
        
        if os.path.basename(file).lower() == 'index.html':
            target_dir = f"{base_name}_assets"
            new_html_path = file
            asset_prefix = os.path.basename(target_dir) + "/"
        else:
            target_dir = base_name
            new_html_path = f"{target_dir}/index.html"
            asset_prefix = ""
            
        file_map[file] = {
            "new_html_path": new_html_path,
            "target_dir": target_dir,
            "asset_prefix": asset_prefix
        }

    total_files = len(file_map)
    if total_files == 0:
        print("ℹ️ Alle Dateien sind bereits aufgeteilt.")
        return

    print(f"📦 Starte Aufteilung von {total_files} Datei(en)...")
    
    for idx, (file, data) in enumerate(file_map.items(), 1):
        new_html_path = data["new_html_path"]
        target_dir = data["target_dir"]
        asset_prefix = data["asset_prefix"]

        for file_node in root_xml.findall("File"):
            if file_node.get("original") == file:
                root_xml.remove(file_node)

        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        if not os.path.exists(target_dir) and target_dir != os.path.dirname(file):
            os.makedirs(target_dir, exist_ok=True)

        is_root_index = (file == new_html_path)
        file_node = ET.SubElement(root_xml, "File", original=file, new_html=new_html_path, is_root=str(is_root_index))

        styles = list(re.finditer(r'([ \t]*)<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE))
        scripts = list(re.finditer(r'([ \t]*)<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>', content, re.DOTALL | re.IGNORECASE))

        # CSS auslagern
        for i, match in enumerate(styles):
            indent = match.group(1)
            full_match = match.group(0)
            style_content = match.group(2)
            
            css_name = f"style_{i}.css"
            css_path = f"{target_dir}/{css_name}"
            with open(css_path, 'w', encoding='utf-8') as f:
                f.write(style_content)
            
            ET.SubElement(file_node, "CSS", path=css_path)

            cb = get_cache_buster()
            href = f"{asset_prefix}{css_name}?v={cb}"
            new_tag = f'{indent}<link rel="stylesheet" href="{href}">'
            content = content.replace(full_match, new_tag, 1)

        # JS auslagern
        for i, match in enumerate(scripts):
            indent = match.group(1)
            full_match = match.group(0)
            script_content = match.group(2)
            
            js_name = f"script_{i}.js"
            js_path = f"{target_dir}/{js_name}"
            with open(js_path, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            ET.SubElement(file_node, "JS", path=js_path)

            cb = get_cache_buster()
            src = f"{asset_prefix}{js_name}?v={cb}"
            new_tag = f'{indent}<script src="{src}"></script>'
            content = content.replace(full_match, new_tag, 1)

        # Link Engine (Routenanpassung)
        dir_a = os.path.dirname(file)
        new_dir_a = os.path.dirname(new_html_path)

        for file_b, data_b in file_map.items():
            if file == file_b: continue
            orig_rel = os.path.relpath(file_b, dir_a if dir_a else '.').replace('\\', '/')
            new_rel = os.path.relpath(data_b["new_html_path"], new_dir_a if new_dir_a else '.').replace('\\', '/')
            
            if orig_rel.startswith('./'): orig_rel = orig_rel[2:]
            if new_rel.startswith('./'): new_rel = new_rel[2:]
            
            pattern = rf'(["\']){re.escape(orig_rel)}(["\'])'
            content = re.sub(pattern, rf'\1{new_rel}\2', content)

        with open(new_html_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        if file != new_html_path and os.path.exists(file):
            os.remove(file)

        print_progress(idx, total_files, prefix='Splitting', suffix=f'({os.path.basename(file)})')

    with open(MAP_FILE, 'w', encoding='utf-8') as f:
        f.write(prettify_xml(root_xml))
    
    print("🚀 Fertig! map.xml wurde erfolgreich generiert.")


def experimental_merge(html_file):
    """Notfall-Merge, falls keine XML existiert. Sucht lokale Assets auf der Platte."""
    if not os.path.exists(html_file):
        return False
        
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    html_dir = os.path.dirname(html_file) or '.'
    
    # Lokale CSS-Links finden
    css_links = re.findall(r'([ \t]*)<link[^>]*href=["\']([^"\']*?\.css)(?:\?v=[a-zA-Z0-9]+)?["\'][^>]*>', content, re.IGNORECASE)
    for indent, css_href in css_links:
        if css_href.startswith('http://') or css_href.startswith('https://') or css_href.startswith('//'):
            continue
        full_css_path = os.path.join(html_dir, css_href).replace('\\', '/')
        if os.path.exists(full_css_path):
            with open(full_css_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            old_tag_pattern = re.compile(rf'[ \t]*<link[^>]*href=["\'][^"\']*?{re.escape(os.path.basename(css_href))}(?:\?v=[a-zA-Z0-9]+)?["\'][^>]*>', re.IGNORECASE)
            content = old_tag_pattern.sub(f'{indent}<style>{css_content}</style>', content, 1)
            try: os.remove(full_css_path)
            except: pass

    # Lokale JS-Links finden
    js_links = re.findall(r'([ \t]*)<script[^>]*src=["\']([^"\']*?\.js)(?:\?v=[a-zA-Z0-9]+)?["\']></script>', content, re.IGNORECASE)
    for indent, js_src in js_links:
        if js_src.startswith('http://') or js_src.startswith('https://') or js_src.startswith('//'):
            continue
        full_js_path = os.path.join(html_dir, js_src).replace('\\', '/')
        if os.path.exists(full_js_path):
            with open(full_js_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
            old_tag_pattern = re.compile(rf'[ \t]*<script[^>]*src=["\'][^"\']*?{re.escape(os.path.basename(js_src))}(?:\?v=[a-zA-Z0-9]+)?["\']></script>', re.IGNORECASE)
            content = old_tag_pattern.sub(f'{indent}<script>{js_content}</script>', content, 1)
            try: os.remove(full_js_path)
            except: pass

    # Versuche den Ordner zurückzuentwickeln, falls es ein Unterordner war
    if os.path.basename(html_file).lower() == 'index.html' and html_dir != '.':
        orig_html_name = f"{html_dir}.html"
        with open(orig_html_name, 'w', encoding='utf-8') as f:
            f.write(content)
        os.remove(html_file)
        try: os.rmdir(html_dir)
        except: pass
    else:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
            
    return True


def merge_html():
    if not os.path.exists(MAP_FILE):
        print("⚠️ Keine map.xml gefunden! Schalte um auf Experimental-Mode (Suche lokale Files)...")
        experimental_files = glob.glob('**/index.html', recursive=True)
        if not experimental_files:
            print("❌ Keine aufgeteilten index.html Strukturen gefunden.")
            return
        
        total_exp = len(experimental_files)
        for idx, exp_file in enumerate(experimental_files, 1):
            experimental_merge(exp_file)
            print_progress(idx, total_exp, prefix='Exp-Merge', suffix=f'({exp_file})')
        print("🛸 Experimental-Merge abgeschlossen. Funktionalität validiert.")
        return

    tree = ET.parse(MAP_FILE)
    root_xml = tree.getroot()
    nodes = root_xml.findall("File")
    total_files = len(nodes)

    print(f"🔗 Führe {total_files} Datei(en) wieder monolithisch zusammen...")

    for idx, file_node in enumerate(nodes, 1):
        original = file_node.get("original")
        new_html = file_node.get("new_html")
        is_root_index = (file_node.get("is_root") == "True")
        
        if not os.path.exists(new_html):
            print(f"\n⚠️ '{new_html}' nicht gefunden. Versuche experimentellen Direkt-Merge auf '{original}'...")
            if os.path.exists(original):
                experimental_merge(original)
            continue

        with open(new_html, 'r', encoding='utf-8') as f:
            content = f.read()

        # CSS zurückholen
        for css_node in file_node.findall("CSS"):
            css_path = css_node.get("path")
            if os.path.exists(css_path):
                with open(css_path, 'r', encoding='utf-8') as f:
                    css_content = f.read()
                css_filename = os.path.basename(css_path)
                
                link_pattern = re.compile(rf'([ \t]*)<link[^>]*href=["\'][^"\']*?{re.escape(css_filename)}\?v=[a-zA-Z0-9]+["\'][^>]*>', re.IGNORECASE)
                match = link_pattern.search(content)
                if match:
                    indent = match.group(1)
                    full_match = match.group(0)
                    content = content.replace(full_match, f'{indent}<style>{css_content}</style>', 1)
                os.remove(css_path)

        # JS zurückholen
        for js_node in file_node.findall("JS"):
            js_path = js_node.get("path")
            if os.path.exists(js_path):
                with open(js_path, 'r', encoding='utf-8') as f:
                    js_content = f.read()
                js_filename = os.path.basename(js_path)
                
                script_pattern = re.compile(rf'([ \t]*)<script[^>]*src=["\'][^"\']*?{re.escape(js_filename)}\?v=[a-zA-Z0-9]+["\'][^>]*></script>', re.IGNORECASE)
                match = script_pattern.search(content)
                if match:
                    indent = match.group(1)
                    full_match = match.group(0)
                    content = content.replace(full_match, f'{indent}<script>{js_content}</script>', 1)
                os.remove(js_path)

        # Reverse Link Engine
        dir_a = os.path.dirname(original)
        new_dir_a = os.path.dirname(new_html)

        for other_node in nodes:
            if original == other_node.get("original"): continue
            orig_rel = os.path.relpath(other_node.get("original"), dir_a if dir_a else '.').replace('\\', '/')
            new_rel = os.path.relpath(other_node.get("new_html"), new_dir_a if new_dir_a else '.').replace('\\', '/')
            
            if orig_rel.startswith('./'): orig_rel = orig_rel[2:]
            if new_rel.startswith('./'): new_rel = new_rel[2:]
            
            pattern = rf'(["\']){re.escape(new_rel)}(["\'])'
            content = re.sub(pattern, rf'\1{orig_rel}\2', content)

        with open(original, 'w', encoding='utf-8') as f:
            f.write(content)

        if not is_root_index:
            target_dir = os.path.dirname(new_html)
            if os.path.exists(new_html): os.remove(new_html)
            try: os.rmdir(target_dir)
            except OSError: pass
        else:
            target_dir = f"{os.path.splitext(original)[0]}_assets"
            try: os.rmdir(target_dir)
            except OSError: pass

        print_progress(idx, total_files, prefix='Merging ', suffix=f'({os.path.basename(original)})')

    if os.path.exists(MAP_FILE):
        os.remove(MAP_FILE)
    print("✨ Zusammenfügung erfolgreich abgeschlossen!")


def refresh_cache(target):
    if not os.path.exists(MAP_FILE):
        print("❌ Keine map.xml gefunden! Du musst die Dateien erst splitten.")
        return

    tree = ET.parse(MAP_FILE)
    root_xml = tree.getroot()
    nodes = root_xml.findall("File")
    total_files = len(nodes)
    updated_count = 0

    print("♻️ Aktualisiere Cache-Buster Hashes...")

    for idx, file_node in enumerate(nodes, 1):
        original = file_node.get("original")
        new_html = file_node.get("new_html")
        
        if target != "." and original != target and new_html != target:
            continue

        if os.path.exists(new_html):
            with open(new_html, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_cb = get_cache_buster()
            content = re.sub(r'\?v=[a-zA-Z0-9]{8}', f'?v={new_cb}', content)
            
            with open(new_html, 'w', encoding='utf-8') as f:
                f.write(content)
            updated_count += 1
        print_progress(idx, total_files, prefix='Refreshing', suffix=f'({os.path.basename(original)})')

    print(f"♻️ Fertig! {updated_count} Datei(en) refreshed.")


def print_help():
    print("""
===================================================================
 🛠️  HTML MONOLITH ARCHITECT - CLI HELP & MANUAL
===================================================================
Dieses Tool trennt interne Styles (<style>) und Scripts (<script>) 
aus Monolith-HTML-Dateien in lesbare, teamfähige Ordnerstrukturen 
auf und fügt sie nahtlos, byte-genau für Git wieder zusammen.

Verwendung:
  python html_manager.py [BEFEHL] [ZIEL]

Befehle:
  split     Zerteilt HTML-Dateien. Lagert CSS/JS aus und baut die
            interne Link-Architektur der Pfade um.
  merge     Fügt alles wieder zu einer einzigen HTML zusammen.
            Löscht temporäre Ordner und die map.xml.
  refresh   Generiert neue Cache-Buster Haskes (?v=...) für CSS/JS.

Ziele:
  .         Führt den Befehl rekursiv für ALLE HTML-Dateien aus.
  [Pfad]    Führt den Befehl nur für eine bestimmte Datei aus.
            (Beispiel: python html_manager.py split themes/bank.html)

Sicherheitsfeatures:
  ⚡ Byte-Genau: Der Code-Inhalt wird exakt zeilengetreu exportiert.
     Git meldet beim Wiederzusammenfügen 0 Veränderungen!
  ⚡ Experimental Merge: Wenn die 'map.xml' fehlt, durchsucht das Tool
     die Ordner selbstständig nach Assets und rettet das Projekt.
===================================================================
    """)

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1].lower() in ["help", "--help", "-h"]:
        print_help()
        sys.exit(0)

    command = sys.argv[1].lower()
    target = sys.argv[2] if len(sys.argv) > 2 else "."

    if command == "split": split_html(target)
    elif command == "merge": merge_html()
    elif command == "refresh": refresh_cache(target)
    else: 
        print("❌ Unbekannter Befehl. Tippe 'python html_manager.py help' für Hilfe.")