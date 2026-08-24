import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/db";
import { env } from "../src/config/env";

async function main() {
  if (env.adminEmail && env.adminPassword) {
    const passwordHash = await bcrypt.hash(env.adminPassword, 10);
    await prisma.user.upsert({
      where: { email: env.adminEmail },
      update: { passwordHash },
      create: {
        name: "Nkurunziza Jabo",
        email: env.adminEmail,
        passwordHash,
        role: "admin",
      },
    });
    console.log(`Admin ready: ${env.adminEmail}`);
  } else {
    console.log("Skipping admin seed (set ADMIN_EMAIL/ADMIN_PASSWORD in .env)");
  }

  const services = [
    {
      nameEn: "Wedding & Event Photography",
      nameRw: "Gufata Amafoto mu Bukwe n'Ibirori",
      descriptionEn: "Full-day coverage of weddings, ceremonies, and celebrations with professional editing.",
      descriptionRw: "Kwandika ibirori byuzuye harimo amafoto y'ubukwe, ibirori n'umunsi mwiza wose.",
      priceEn: "From 150,000 RWF",
      priceRw: "Uhereye kuri 150,000 RWF",
      category: "Photography",
      icon: "camera",
    },
    {
      nameEn: "Corporate & Documentary Videography",
      nameRw: "Amashusho y'Ikigo n'Inyandiko",
      descriptionEn: "High-quality video production for companies, NGOs, and government institutions.",
      descriptionRw: "Gukora amashusho meza kubigo, NGO n'inzego za leta.",
      priceEn: "From 250,000 RWF",
      priceRw: "Uhereye kuri 250,000 RWF",
      category: "Videography",
      icon: "video",
    },
    {
      nameEn: "Livestreaming & Event Coverage",
      nameRw: "Kwerekana Ibirori mu Mubare Mubanza",
      descriptionEn: "Professional live streaming of events with multi-camera setups, for local and international audiences.",
      descriptionRw: "Kwerekana ibirori ku mubare mubanza hamwe namacamera menshi, kuri ba nyiri umurimo bo mu gihugu no hanze.",
      priceEn: "From 300,000 RWF",
      priceRw: "Uhereye kuri 300,000 RWF",
      category: "Livestreaming",
      icon: "broadcast",
    },
    {
      nameEn: "Aerial / Drone Photography",
      nameRw: "Amafoto y'Igisore (Drone)",
      descriptionEn: "Stunning aerial views for real estate, agriculture (FAO projects), and landscapes.",
      descriptionRw: "Amafoto meza yo mu kirere kubutaka, ubuhinzi (imishinga ya FAO) n'ibidukikije.",
      priceEn: "From 120,000 RWF",
      priceRw: "Uhereye kuri 120,000 RWF",
      category: "Photography",
      icon: "drone",
    },
    {
      nameEn: "Photo & Video Editing",
      nameRw: "Guhindura Amafoto n'Amashusho",
      descriptionEn: "Professional post-production: color grading, editing, and delivery in any format.",
      descriptionRw: "Guhindura amafoto n'amashusho: gukosora amabara, gukata amashusho no kuyatanga mu buryo ubwo ari bwo bwose.",
      priceEn: "From 80,000 RWF",
      priceRw: "Uhereye kuri 80,000 RWF",
      category: "Post-production",
      icon: "edit",
    },
    {
      nameEn: "Documentary Production",
      nameRw: "Gukora Amashusho ya Documentaire",
      descriptionEn: "End-to-end documentary production: research, scripting, interviews, and archival footage for development agencies, media, and institutions.",
      descriptionRw: "Gukora documentaire zuzuye: ubushakashatsi, kwandika script, gufata interviu no gukoresha amashusho y'amateka, ku miryango mpuzamahanga, ibitangazamakuru n'inzego za leta.",
      priceEn: "From 600,000 RWF",
      priceRw: "Uhereye kuri 600,000 RWF",
      category: "Production",
      icon: "video",
    },
    {
      nameEn: "Corporate & Institutional Pictures & Videos",
      nameRw: "Amafoto n'Amashusho by'Ibigo n'Inzego",
      descriptionEn: "Brand films, event coverage, portraits, and impact stories for companies, NGOs, and government offices.",
      descriptionRw: "Amashusho y'ikirango, gufata ibirori, amafoto y'abantu n'inkuru z'ingaruka z'imirimo ku bigo, NGO n'inzego za leta.",
      priceEn: "From 250,000 RWF",
      priceRw: "Uhereye kuri 250,000 RWF",
      category: "Production",
      icon: "camera",
    },
    {
      nameEn: "Commercial & Advertising Production",
      nameRw: "Gukora Amashusho yo Kwamamaza",
      descriptionEn: "TV commercials, social media ads, and product launch films — from concept to final cut.",
      descriptionRw: "Amashusho yo kwamamaza kuri TV no ku mbuga nkoranyambaga, hamwe n'amafirime yo gutangiza ibicuruzwa — kuva ku gitekerezo kugeza ku shusho yanyuma.",
      priceEn: "From 400,000 RWF",
      priceRw: "Uhereye kuri 400,000 RWF",
      category: "Production",
      icon: "ad",
    },
    {
      nameEn: "Music Videos & Creative Productions",
      nameRw: "Amashusho y'Indirimbo n'Ibikorwa by'Ihangano",
      descriptionEn: "Music videos, artist content, and bold creative projects — concept, direction, and editing included.",
      descriptionRw: "Amashusho y'indirimbo, ibikorwa by'abahanzi n'imishinga ikomeye y'ubuvanganzo — harimo igitekerezo, uburyo bwo gufata amashusho no gukosora.",
      priceEn: "From 350,000 RWF",
      priceRw: "Uhereye kuri 350,000 RWF",
      category: "Production",
      icon: "video",
    },
    {
      nameEn: "Location Scouting & Fixer Services",
      nameRw: "Gushaka Ahantu ho Gufata Amashusho n'Imirimo ya Fixer",
      descriptionEn: "Find the perfect Rwandan locations, with permits, logistics, and local crews arranged for local and international productions.",
      descriptionRw: "Kubona ahantu heza ho gufata amashusho mu Rwanda, hamwe no gufasha kubona ibyangombwa, ibikoresho n'abakozi baho — ku bikorwa byo mu gihugu no byo hanze.",
      priceEn: "From 150,000 RWF",
      priceRw: "Uhereye kuri 150,000 RWF",
      category: "Production",
      icon: "photo",
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { nameEn: s.nameEn } });
    if (!existing) {
      await prisma.service.create({ data: s });
    }
  }
  console.log(`Services ready: ${services.length}`);

  const settings: Array<{ key: string; locale: string; value: string }> = [
    { key: "hero_title", locale: "en", value: "Capturing Rwanda's stories through photography & film" },
    { key: "hero_title", locale: "rw", value: "Kwandika amateka y'u Rwanda mu mafoto n'amashusho" },
    { key: "about_story", locale: "en", value: "Founded by video journalist Nkurunziza Jabo, Creative Sound Studio grew from sonorization in its early days to full photography and videography production in 2015. Today we work with media houses, government institutions, and international organizations including FAO, The New Times, and Kigali Today." },
    { key: "about_story", locale: "rw", value: "Yatangiye na Nkurunziza Jabo, umunyamakuru w'amashusho, Creative Sound Studio yakuriye kuva mu mirimo y'ijwi kugeza ku mafoto n'amashusho byuzuye mu 2015. Uyu munsi dufatanya n'ibitangazamakuru, inzego za leta n'imiryango mpuzamahanga harimo FAO, The New Times na Kigali Today." },
    { key: "contact_email", locale: "en", value: "hello@creativesoundstudio.rw" },
    { key: "contact_phone", locale: "en", value: "+250 700 000 000" },
    { key: "contact_location", locale: "en", value: "Kigali, Rwanda" },
    { key: "contact_location", locale: "rw", value: "Kigali, u Rwanda" },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key_locale: { key: s.key, locale: s.locale } },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`Settings ready: ${settings.length}`);

  const logos = [
    { name: "FAO", sortOrder: 1 },
    { name: "The New Times", sortOrder: 2 },
    { name: "Kigali Today", sortOrder: 3 },
    { name: "Radio 10", sortOrder: 4 },
  ];
  for (const l of logos) {
    const existing = await prisma.clientLogo.findFirst({ where: { name: l.name } });
    if (!existing) {
      await prisma.clientLogo.create({ data: l });
    }
  }
  console.log(`Client logos ready: ${logos.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
