"""Run with Python + Pillow from any directory. Source is never rewritten."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
source=root/'public/animations/cat/eating-v3.png'
im=Image.open(source).convert('RGBA')
assert im.size==(1325,1187)
w,h=im.size
# Visually inspected transparent gaps, since artwork crosses nominal quarter rows.
y_edges=[0,350,615,870,1187]
x_edges=[[0,331,661,990,1325],[0,330,667,996,1325],[0,337,666,982,1325],[0,330,673,995,1325]]
out=root/'public/animations/cat/eating-v3';out.mkdir(exist_ok=True)
manifest=[];frames=[]
scale=1.0
for i in range(16):
 row,col=divmod(i,4)
 nominal=[round(col*w/4),round(row*h/4),round((col+1)*w/4),round((row+1)*h/4)]
 rect=[x_edges[row][col],y_edges[row],x_edges[row][col+1],y_edges[row+1]]
 crop=im.crop(rect)
 # Blue bowl is distinct from cream/white fur. Used only as an anchor, never
 # as a background-removal mask. Preserve every RGBA source pixel in the crop.
 blue=[(x,y) for y in range(crop.height) for x in range(crop.width)
       if (lambda p:p[3]>128 and p[2]>100 and p[2]>p[0]*1.4 and p[2]>p[1]*1.05)(crop.getpixel((x,y)))]
 assert blue
 bowl=((min(x for x,y in blue)+max(x for x,y in blue))/2,max(y for x,y in blue))
 resized=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 offset=(round(280-bowl[0]*scale),round(460-bowl[1]*scale))
 canvas=Image.new('RGBA',(578,518))
 bbox=resized.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
 assert bbox and offset[0]+bbox[0]>=0 and offset[1]+bbox[1]>=0 and offset[0]+bbox[2]<=578 and offset[1]+bbox[3]<=518,(i,bbox,offset)
 canvas.alpha_composite(resized,offset)
 canvas.save(out/f'frame-{i:02}.png');frames.append(canvas)
 manifest.append(dict(frame=i,nominal=nominal,refined=rect,cropSize=list(crop.size),bowl=list(bowl),offset=list(offset),output=[578,518],scale=scale))
(root/'src/components/pets/eating-v3-manifest.json').write_text(json.dumps({'source':[w,h],'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'frames':manifest},indent=2)+'\n')
contact=Image.new('RGB',(1156,1100),'#e9dfcf');draw=ImageDraw.Draw(contact)
for i,frame in enumerate(frames):
 x=(i%4)*289;y=(i//4)*275;thumb=frame.resize((289,259));contact.paste(thumb,(x,y+16),thumb);draw.text((x+8,y+2),str(i),fill='black')
contact.save('/tmp/yini-v3-contact.png')
print(json.dumps(manifest,indent=2))
