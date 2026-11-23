#!/usr/bin/env python3
"""Builds the game into one self-contained index.html: every src/0*.js file in name order, the stylesheet and the three pixel fonts, all inlined."""
import base64, glob, os
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
fonts = [('Silkscreen', 400, 'silkscreen-latin-400-normal.woff2'), ('Silkscreen', 700, 'silkscreen-latin-700-normal.woff2'), ('VT323', 400, 'vt323-latin-400-normal.woff2')]
fcss = ''
for fam, wt, name in fonts:
    b = base64.b64encode(open(os.path.join(root, 'fonts', name), 'rb').read()).decode()
    fcss += "@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}\n" % (fam, wt, b)
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(src, '0*.js'))))
html = open(os.path.join(src, 'index.html')).read()
html = html.replace('/*FONTS*/', fcss).replace('/*CSS*/', open(os.path.join(src, 'style.css')).read()).replace('/*JS*/', js.replace('</script', '<\\/script'))
open(os.path.join(root, 'index.html'), 'w').write(html)
print('built index.html,', len(html) // 1024, 'KB')
