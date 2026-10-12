"""Run with FontTools available (PYTHONPATH=/tmp/css-brand-fonttools locally)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
p=Path(__file__).resolve().parent
font=TTFont(p/'fonts/Montserrat-SemiBold.otf');glyphs=font.getGlyphSet();cmap=font.getBestCmap();scale=25/font['head'].unitsPerEm
mark='<path d="M44 10H25C6 10 6 54 25 54h19V42H27c-8 0-8-20 0-20h17z"/><path d="M51 10h9v44h-9z"/>'
def line(text,y):
    x=82; paths=[]
    for c in text:
        name=cmap[ord(c)];pen=SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,x,y)))
        if pen.getCommands(): paths.append('<path d="'+pen.getCommands()+'"/>')
        x+=glyphs[name].width*scale+.2
    assert x<376,(text,x)
    return ''.join(paths)
wordmark=line('CREATIVE SOUND',35)+line('STUDIO',65)
for name,ink,accent in [('primary','#151817','#e67c52'),('reversed','#efece4','#e67c52'),('mono-ink','#151817','#151817'),('mono-bone','#efece4','#efece4')]:
    (p/f'logo-{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 82" role="img" aria-label="Creative Sound Studio"><title>Creative Sound Studio</title><g transform="translate(1 9)" fill="{accent}">{mark}</g><g fill="{ink}">{wordmark}</g></svg>')
(p/'watermark.svg').write_text((p/'logo-mono-bone.svg').read_text())
(p/'watermark-ink.svg').write_text((p/'logo-mono-ink.svg').read_text())
print('Outlined SVGs generated; no font dependency remains in logo files.')
