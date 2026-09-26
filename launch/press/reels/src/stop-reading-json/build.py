# Expands index.template into index.html (the typing frames are 34 stacked captures of the real bar).
src = open('index.template').read()
frames = ['<img id="tf0" src="assets/cap/type-00.png" style="top:1750px;width:1080px;height:170px" alt="" />']
for i in range(1, 34):
    frames.append(f'<img id="tf{i}" src="assets/cap/type-{i:02d}.png" style="top:1750px;width:1080px;height:170px;opacity:0" alt="" />')
out = src.replace('<!--TYPE_FRAMES-->', '\n            '.join(frames)).replace('<!-- Source for index.html. Run `python3 build.py` to expand the typing frames. -->\n', '<!-- Generated from index.template by build.py. Edit the source, not this file. -->\n')
open('index.html', 'w').write(out)
