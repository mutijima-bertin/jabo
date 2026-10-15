/** Local-only integration harness; uses the isolated test database and disables external notifications. */
async function main() {
 Object.assign(process.env, {DATABASE_URL:'postgresql://css:css123@127.0.0.1:5432/creativesoundstudio_test?schema=public',NODE_ENV:'test',JWT_SECRET:'signal-preview-only-secret-0123456789abcdef0123456789',SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',ZAVU_API_KEY:'',ADMIN_EMAILS:'',BLOB_READ_WRITE_TOKEN:'',BLOB_STORE_ID:'',VERCEL:'',APP_URL:'http://127.0.0.1:3011',FRONTEND_URL:'http://127.0.0.1:3011',FRONTEND_ORIGIN:'http://127.0.0.1:3011',API_URL:'http://127.0.0.1:4011'});
 const {prisma}=await import('../src/config/db');const {createApp}=await import('../src/app');
 const services=[['photography','Photography','Amafoto'],['film','Film','Filime'],['events','Events','Ibirori']];
 for(const [key,en,rw] of services){const data={nameEn:en,nameRw:rw,descriptionEn:'Local integration preview — discuss your production with the studio.',descriptionRw:'Igerageza ryo kuri mudasobwa — tuganire ku gikorwa cyawe.',priceEn:'Quote on request',priceRw:'Igiciro gitangwa tumaze kuganira',category:en,published:true,featured:true,sortOrder:services.findIndex(s=>s[0]===key)};await prisma.service.upsert({where:{id:`signal-preview-${key}`},create:{id:`signal-preview-${key}`,...data},update:data});}
 const mediaDirectory = process.env.SIGNAL_PREVIEW_MEDIA_DIR;
 const projects=[['fieldwork','People at work','Abantu ku murimo','Portraits'],['summit','A room full of ideas','Ahantu huzuye ibitekerezo','Events'],['portrait','A point of view','Uburyo bwo kubona inkuru','Portraits']];
 const {mkdir,copyFile}=await import('node:fs/promises');
 await mkdir(new URL('../uploads/images/',import.meta.url),{recursive:true});
 for(const [key,en,rw,category] of projects){
 await copyFile(new URL(`../../frontend/public/studio/${key}-1440.webp`,import.meta.url),new URL(`../uploads/images/signal-preview-${key}.webp`,import.meta.url));
 const data={titleEn:en,titleRw:rw,category,clientName:'Local preview only',tags:['Preview'],coverUrl:`/uploads/images/signal-preview-${key}.webp`,mediaUrls:key==='summit'?['/studio/preview-unavailable.webm']:key==='fieldwork' && mediaDirectory?['/api/preview-media/check.webm','/api/preview-media/check.en.vtt']:[],mediaType:key==='summit'?'video':'image',published:true,sortOrder:projects.findIndex(p=>p[0]===key)};await prisma.portfolioItem.upsert({where:{id:`signal-preview-${key}`},create:{id:`signal-preview-${key}`,...data},update:data});}
 const {default:express}=await import("express"); const app=express();
 if(mediaDirectory){const {resolve}=await import('node:path'); for(const filename of ['check.webm','check.en.vtt']) app.get(`/api/preview-media/${filename}`,(_req,res)=>res.sendFile(resolve(mediaDirectory,filename)));}
 app.use(createApp());
 const server=app.listen(4011,'127.0.0.1',()=>console.log('Signal test API ready at http://127.0.0.1:4011; isolated database; external notifications disabled.'));
 const close=()=>server.close(()=>{void prisma.$disconnect().then(()=>process.exit(0));});process.on('SIGINT',close);process.on('SIGTERM',close);
}
main().catch(()=>{console.error('Could not prepare the isolated Signal preview database.');process.exit(1);});
