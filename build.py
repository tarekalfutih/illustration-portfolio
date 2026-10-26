#!/usr/bin/env python3
"""Static build for the illustration portfolio. Needs Python 3.8+ and Pillow.

    python3 build.py            # build into dist/
    python3 build.py --serve    # build, then serve dist/ on http://localhost:8000
    python3 build.py --deploy   # build, then publish dist/ to the gh-pages branch (GitHub Pages)

src/ is the site and works as-is (open it with any static server). The build copies it to dist/
and adds WebP versions of every <img> in index.html as a srcset (640/1280/1920 px wide, never
larger than the original). The original file stays as `src`, so the lightbox still opens it at
full size. WebP files are cached in .cache/ and only regenerated when the source changes.
"""
import hashlib
import http.server
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
CACHE = os.path.join(ROOT, '.cache', 'webp')
WIDTHS = (640, 1280, 1920)
DOMAIN = 'tarekalfutih.se'   # custom domain; written to dist/CNAME so GitHub Pages keeps it


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


def bust(html):
    """Add ?v=<content hash> to the CSS/JS links so browsers (notably iOS Safari) fetch new files after a deploy."""
    def repl(m):
        path = os.path.join(DIST, m.group(2))
        with open(path, 'rb') as f:
            v = hashlib.md5(f.read()).hexdigest()[:8]
        return '%s="%s?v=%s"' % (m.group(1), m.group(2), v)
    return re.sub(r'(href|src)="((?:css|js)/[^"?]+\.(?:css|js))"', repl, html)


def build():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(SRC, DIST, ignore=shutil.ignore_patterns('.DS_Store'))
    path = os.path.join(DIST, 'index.html')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    with open(path, 'w', encoding='utf-8') as f:
        f.write(bust(add_srcset(html)))
    with open(os.path.join(DIST, 'CNAME'), 'w') as f:
        f.write(DOMAIN + '\n')
    open(os.path.join(DIST, '.nojekyll'), 'w').close()   # serve files as-is, no Jekyll processing
    print('Built dist/ (%d WebP files)' % len(os.listdir(os.path.join(DIST, 'images', 'w'))))


def deploy():
    """Publish dist/ as the only commit on the gh-pages branch of this repo's origin."""
    git = lambda *a, **k: subprocess.run(['git'] + list(a), check=True, **k)
    origin = subprocess.run(['git', 'remote', 'get-url', 'origin'], cwd=ROOT, check=True,
                            capture_output=True, text=True).stdout.strip()
    rev = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, check=True,
                         capture_output=True, text=True).stdout.strip()
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copytree(DIST, tmp, dirs_exist_ok=True)
        git('init', '-q', '-b', 'gh-pages', cwd=tmp)
        git('add', '-A', cwd=tmp)
        git('commit', '-q', '-m', 'Deploy %s' % rev, cwd=tmp)
        git('push', '-q', '--force', origin, 'gh-pages', cwd=tmp)
    print('Deployed %s to gh-pages' % rev)


if __name__ == '__main__':
    build()
    if '--deploy' in sys.argv:
        deploy()
    if '--serve' in sys.argv:
        os.chdir(DIST)
        port = int(os.environ.get('PORT', 8000))
        print('Serving http://localhost:%d' % port)
        http.server.ThreadingHTTPServer(('', port), http.server.SimpleHTTPRequestHandler).serve_forever()
