const path=require('node:path');
const sharp=require('../../../../backend/node_modules/sharp');
(async()=>{
 const root=__dirname;
 for(const name of ['logo-primary','logo-reversed','logo-mono-ink','logo-mono-bone','watermark','watermark-ink'])
   await sharp(path.join(root,name+'.svg')).resize(1140,246).png().toFile(path.join(root,name+'.png'));
 for(const size of [16,32,180])
   await sharp(path.join(root,'favicon.svg')).resize(size,size).png().toFile(path.join(root,`favicon-${size}.png`));
})().catch(e=>{console.error(e);process.exit(1)});
