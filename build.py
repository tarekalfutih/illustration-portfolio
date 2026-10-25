#!/usr/bin/env python3
"""Static build for the illustration portfolio. Needs Python 3.8+ and Pillow.

    python3 build.py            # build into dist/
    python3 build.py --serve    # build, then serve dist/ on http://localhost:8000

src/ is the site and works as-is (open it with any static server). The build copies it to dist/
and adds WebP versions of every <img> in index.html as a srcset (640/1280/1920 px wide, never
larger than the original). The original file stays as `src`, so the lightbox still opens it at
full size. WebP files are cached in .cache/ and only regenerated when the source changes.
"""
import http.server
import os
import re
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
CACHE = os.path.join(ROOT, '.cache', 'webp')
WIDTHS = (640, 1280, 1920)


def webp_variants(rel):
    """Return [(published path, width)] for one image, generating any missing WebP files."""
    src = os.path.join(SRC, rel)
    with Image.open(src) as im:
        w0, h0 = im.size
        out = []
        base = os.path.splitext(os.path.basename(rel))[0]
        for w in [w for w in WIDTHS if w < w0] + [w0]:
            name = '%s-%d.webp' % (base, w)
            cached = os.path.join(CACHE, name)
            if not os.path.exists(cached) or os.path.getmtime(cached) < os.path.getmtime(src):
                os.makedirs(CACHE, exist_ok=True)
                frame = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
                if w != w0:
                    frame = frame.resize((w, round(h0 * w / w0)), Image.LANCZOS)
                frame.save(cached, 'WEBP', quality=82, method=6)
            dest = os.path.join(DIST, 'images', 'w', name)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(cached, dest)
            out.append(('images/w/' + name, w))
        return out


def add_srcset(html):
    def repl(m):
        tag = m.group(0)
        if 'srcset=' in tag:
            return tag
        m_src = re.search(r'\ssrc="([^"]+)"', tag)
        rel = m_src.group(1) if m_src else ''
        if not re.match(r'images/[^/]+\.(jpe?g|png)$', rel):
            return tag
        srcset = ', '.join('%s %dw' % v for v in webp_variants(rel))
        extra = ' srcset="%s"' % srcset
        if 'sizes=' not in tag:
            extra += ' sizes="100vw"'
        return tag[:-1] + extra + '>'
    return re.sub(r'<img\b[^>]*>', repl, html)


def build():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(SRC, DIST)
    path = os.path.join(DIST, 'index.html')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    with open(path, 'w', encoding='utf-8') as f:
        f.write(add_srcset(html))
    print('Built dist/ (%d WebP files)' % len(os.listdir(os.path.join(DIST, 'images', 'w'))))


if __name__ == '__main__':
    build()
    if '--serve' in sys.argv:
        os.chdir(DIST)
        port = int(os.environ.get('PORT', 8000))
        print('Serving http://localhost:%d' % port)
        http.server.ThreadingHTTPServer(('', port), http.server.SimpleHTTPRequestHandler).serve_forever()
