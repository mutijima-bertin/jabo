import "dotenv/config";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../src/config/db";
import { env } from "../src/config/env";

// ---------------------------------------------------------------------------
// Placeholder portfolio covers (synthesized with sharp, no external assets).
// UPLOADS_DIR at runtime resolves from compiled dist/services/storage.js to
// backend/uploads — from seed.ts (backend/prisma/) "../uploads" hits same dir.
// ---------------------------------------------------------------------------

const PLACEHOLDER_COVER_DIR = path.resolve(__dirname, "../uploads/images");
const PLACEHOLDER_WIDTH = 1200;
const PLACEHOLDER_HEIGHT = 800;

type GradientVariant = "vertical" | "horizontal" | "diagonal" | "radial";

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Builds a raw RGBA buffer with a warm gradient (variant picks the direction). */
function makeGradientBuffer(
  width: number,
  height: number,
  fromHex: string,
  toHex: string,
  variant: GradientVariant
): Buffer {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const buffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t: number;
      switch (variant) {
        case "vertical":
          t = y / (height - 1);
          break;
        case "horizontal":
          t = x / (width - 1);
          break;
        case "diagonal":
          t = (x + y) / (width + height - 2);
          break;
        case "radial": {
          const dx = x - width / 2;
          const dy = y - height / 2;
          t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (Math.max(width, height) / 1.7));
          break;
        }
      }
      const offset = (y * width + x) * 4;
      buffer[offset] = lerpChannel(from[0], to[0], t);
      buffer[offset + 1] = lerpChannel(from[1], to[1], t);
      buffer[offset + 2] = lerpChannel(from[2], to[2], t);
      buffer[offset + 3] = 255;
    }
  }
  return buffer;
}

/**
 * Writes a placeholder cover WebP (q82, 1200×800) only when the file is not
 * already on disk (idempotent across seed re-runs). Returns its public URL.
 */
async function ensurePlaceholderCover(
  fileName: string,
  fromHex: string,
  toHex: string,
  variant: GradientVariant
): Promise<string> {
  fs.mkdirSync(PLACEHOLDER_COVER_DIR, { recursive: true });
  const filePath = path.join(PLACEHOLDER_COVER_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    const raw = makeGradientBuffer(PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT, fromHex, toHex, variant);
    await sharp(raw, { raw: { width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_HEIGHT, channels: 4 } })
      .webp({ quality: 82 })
      .toFile(filePath);
    console.log(`Placeholder cover written: ${fileName}`);
  } else {
    console.log(`Placeholder cover already exists: ${fileName}`);
  }
  return `/uploads/images/${fileName}`;
}

// ---------------------------------------------------------------------------
// Portfolio seed manifest — 2 Weddings + 1 Corporate (Corporate stays the
// sparsest canonical category with exactly 1 published row, as the redesign
// e2e spec expects). Canonical categories come from src/config/constants.
// ---------------------------------------------------------------------------

const portfolioSeeds = [
  {
    fileName: "seed-kigali-innovation.webp",
    fromHex: "#1f1d1a",
    toHex: "#b08d57",
    variant: "vertical",
    titleEn: "Kigali Innovation Week",
    titleRw: "Icyumweru cy'Ubugeni muri Kigali",
    clientName: "Kigali Innovation City",
    category: "Corporate",
  },
  {
    fileName: "seed-lake-kivu.webp",
    fromHex: "#1f1d1a",
    toHex: "#b08d57",
    variant: "diagonal",
    titleEn: "Wedding at Lake Kivu",
    titleRw: "Ubukwe bw'umukunzi ku Kiyaga cya Kivu",
    clientName: "Ingabire & Mugisha",
    category: "Weddings",
  },
  {
    fileName: "seed-umuganda.webp",
    fromHex: "#1f1d1a",
    toHex: "#b08d57",
    variant: "radial",
    titleEn: "Sunset Nuptials in Nyarutarama",
    titleRw: "Ubukwe bw'izuba rirenze muri Nyarutarama",
    clientName: "Uwimana & Habimana",
    category: "Weddings",
  },
];

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

  let portfolioSeeded = 0;
  for (let i = 0; i < portfolioSeeds.length; i++) {
    const entry = portfolioSeeds[i];
    // Idempotence: skip any row whose titleEn already exists (covers live on
    // disk already, so re-runs must never rewrite files or duplicate rows).
    const existing = await prisma.portfolioItem.findFirst({ where: { titleEn: entry.titleEn } });
    if (existing) {
      console.log(`Portfolio "${entry.titleEn}" already exists — skipped`);
      continue;
    }
    const coverUrl = await ensurePlaceholderCover(entry.fileName, entry.fromHex, entry.toHex, entry.variant);
    await prisma.portfolioItem.create({
      data: {
        titleEn: entry.titleEn,
        titleRw: entry.titleRw,
        category: entry.category,
        clientName: entry.clientName,
        tags: ["featured"],
        coverUrl,
        mediaUrls: [coverUrl],
        mediaType: "image",
        published: true,
        sortOrder: i,
      },
    });
    portfolioSeeded++;
    console.log(`Portfolio "${entry.titleEn}" created (${entry.category})`);
  }
  console.log(`Portfolio ready: ${portfolioSeeded}`);

  // ---------------------------------------------------------------------------
  // Demo client + booking (admin e2e fixtures). The nightly suites run against a
  // fresh seeded DB and require ≥1 client with an email (admin-features.spec:
  // "clients tab renders directory with search") and ≥1 booking (booking.spec:
  // "admin login works and dashboard loads" needs the Recent-bookings card).
  // The fixed addresses below can never collide with run-unique e2e emails
  // (<random>@test.local / e2e-*), and the booking reference guards idempotency.
  // ---------------------------------------------------------------------------
  const demoClientEmail = "aline.demo@example.co.rw";
  const demoClient = await prisma.client.upsert({
    where: { email: demoClientEmail },
    update: {}, // re-runs must never overwrite a live client's details
    create: {
      name: "Aline Uwase",
      email: demoClientEmail,
      phone: "+250722334455",
    },
  });
  console.log(`Demo client ready: ${demoClient.name} <${demoClient.email}> (${demoClient.id})`);

  const demoBookingReference = "CSS-SEED-001";
  const existingDemoBooking = await prisma.booking.findUnique({
    where: { reference: demoBookingReference },
  });
  if (existingDemoBooking) {
    console.log(`Demo booking already exists: ${demoBookingReference} — skipped`);
  } else {
    const demoService = await prisma.service.findFirst({ orderBy: { sortOrder: "asc" } });
    if (!demoService) {
      throw new Error("Cannot seed demo booking: no service rows exist");
    }
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30); // a FUTURE preferred date
    eventDate.setUTCHours(9, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          reference: demoBookingReference,
          serviceId: demoService.id,
          clientId: demoClient.id,
          contactName: demoClient.name,
          contactEmail: demoClient.email ?? demoClientEmail,
          contactPhone: demoClient.phone,
          eventDate,
          location: "Kigali, Rwanda",
          budgetRange: "300,000 – 600,000 RWF",
          details: "Full-day wedding coverage — photo & film, final edited gallery and highlight film.",
          language: "en",
          status: "CONFIRMED",
        },
      });
      // Keep the audit trail consistent with the row's CONFIRMED status.
      await tx.bookingEvent.create({ data: { bookingId: created.id, status: "PENDING", note: "Booking received" } });
      await tx.bookingEvent.create({ data: { bookingId: created.id, status: "CONFIRMED", note: "Booking confirmed" } });
    });
    console.log(`Demo booking created: ${demoBookingReference}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
