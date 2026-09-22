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
      descriptionEn: "Full-day wedding and gusaba photography in Kigali, covering ceremonies, celebrations, and every important moment with professional editing.",
      descriptionRw: "Kwandika ibirori byuzuye harimo amafoto y'ubukwe, ibirori n'umunsi mwiza wose.",
      priceEn: "From 150,000 RWF",
      priceRw: "Uhereye kuri 150,000 RWF",
      category: "Photography",
      icon: "camera",
    },
    {
      nameEn: "Corporate & Documentary Videography",
      nameRw: "Amashusho y'Ikigo n'Inyandiko",
      descriptionEn: "Corporate video and documentary production in Kigali for companies, NGOs, and government institutions.",
      descriptionRw: "Gukora amashusho meza kubigo, NGO n'inzego za leta.",
      priceEn: "From 250,000 RWF",
      priceRw: "Uhereye kuri 250,000 RWF",
      category: "Videography",
      icon: "video",
    },
    {
      nameEn: "Livestreaming & Event Coverage",
      nameRw: "Kwerekana Ibirori mu Mubare Mubanza",
      descriptionEn: "Professional event livestreaming in Kigali with multi-camera setups for conferences, ceremonies, and live events — broadcast in real time to local and international audiences.",
      descriptionRw: "Kwerekana ibirori ku mubare mubanza hamwe namacamera menshi, kuri ba nyiri umurimo bo mu gihugu no hanze.",
      priceEn: "From 300,000 RWF",
      priceRw: "Uhereye kuri 300,000 RWF",
      category: "Livestreaming",
      icon: "broadcast",
    },
    {
      nameEn: "Aerial / Drone Photography",
      nameRw: "Amafoto y'Igisore (Drone)",
      descriptionEn: "Drone and aerial photography in Kigali and across Rwanda for real estate, agriculture (FAO projects), and landscapes — with RCAA-compliant permitting arranged.",
      descriptionRw: "Amafoto meza yo mu kirere kubutaka, ubuhinzi (imishinga ya FAO) n'ibidukikije.",
      priceEn: "From 120,000 RWF",
      priceRw: "Uhereye kuri 120,000 RWF",
      category: "Photography",
      icon: "drone",
    },
    {
      nameEn: "Photo & Video Editing",
      nameRw: "Guhindura Amafoto n'Amashusho",
      descriptionEn: "Professional photo and video editing and post-production in Kigali — color grading, editing, and delivery in any format.",
      descriptionRw: "Guhindura amafoto n'amashusho: gukosora amabara, gukata amashusho no kuyatanga mu buryo ubwo ari bwo bwose.",
      priceEn: "From 80,000 RWF",
      priceRw: "Uhereye kuri 80,000 RWF",
      category: "Post-production",
      icon: "edit",
    },
    {
      nameEn: "Documentary Production",
      nameRw: "Gukora Amashusho ya Documentaire",
      descriptionEn: "End-to-end documentary production in Kigali and across Rwanda: research, scripting, interviews, and archival footage for development agencies, media, and institutions.",
      descriptionRw: "Gukora documentaire zuzuye: ubushakashatsi, kwandika script, gufata interviu no gukoresha amashusho y'amateka, ku miryango mpuzamahanga, ibitangazamakuru n'inzego za leta.",
      priceEn: "From 600,000 RWF",
      priceRw: "Uhereye kuri 600,000 RWF",
      category: "Production",
      icon: "video",
    },
    {
      nameEn: "Corporate & Institutional Pictures & Videos",
      nameRw: "Amafoto n'Amashusho by'Ibigo n'Inzego",
      descriptionEn: "Corporate video production in Kigali — brand films, event coverage, portraits, and impact stories for companies, NGOs, and government offices.",
      descriptionRw: "Amashusho y'ikirango, gufata ibirori, amafoto y'abantu n'inkuru z'ingaruka z'imirimo ku bigo, NGO n'inzego za leta.",
      priceEn: "From 250,000 RWF",
      priceRw: "Uhereye kuri 250,000 RWF",
      category: "Production",
      icon: "camera",
    },
    {
      nameEn: "Commercial & Advertising Production",
      nameRw: "Gukora Amashusho yo Kwamamaza",
      descriptionEn: "Commercial and advertising production in Kigali, Rwanda — TV commercials, social media ads, and product launch films, from concept to final cut.",
      descriptionRw: "Amashusho yo kwamamaza kuri TV no ku mbuga nkoranyambaga, hamwe n'amafirime yo gutangiza ibicuruzwa — kuva ku gitekerezo kugeza ku shusho yanyuma.",
      priceEn: "From 400,000 RWF",
      priceRw: "Uhereye kuri 400,000 RWF",
      category: "Production",
      icon: "ad",
    },
    {
      nameEn: "Music Videos & Creative Productions",
      nameRw: "Amashusho y'Indirimbo n'Ibikorwa by'Ihangano",
      descriptionEn: "Music video production in Kigali, Rwanda — artist content and bold creative projects, with concept, direction, and editing included.",
      descriptionRw: "Amashusho y'indirimbo, ibikorwa by'abahanzi n'imishinga ikomeye y'ubuvanganzo — harimo igitekerezo, uburyo bwo gufata amashusho no gukosora.",
      priceEn: "From 350,000 RWF",
      priceRw: "Uhereye kuri 350,000 RWF",
      category: "Production",
      icon: "video",
    },
    {
      nameEn: "Location Scouting & Fixer Services",
      nameRw: "Gushaka Ahantu ho Gufata Amashusho n'Imirimo ya Fixer",
      descriptionEn: "Rwanda location scouting and fixer services for film and video productions — filming permits, logistics, and local crews arranged for local and international shoots.",
      descriptionRw: "Kubona ahantu heza ho gufata amashusho mu Rwanda, hamwe no gufasha kubona ibyangombwa, ibikoresho n'abakozi baho — ku bikorwa byo mu gihugu no byo hanze.",
      priceEn: "From 150,000 RWF",
      priceRw: "Uhereye kuri 150,000 RWF",
      category: "Production",
      icon: "photo",
    },
  ];

  // Idempotent create-or-update keyed on nameEn (the canonical stable key,
  // unchanged by Phase 8). The original loop was create-only, which silently
  // kept OLD descriptionEn strings whenever the seed re-ran against an existing
  // DB; updating by nameEn makes re-seeds converge on the canonical copy for
  // BOTH a fresh seed and the live dev DB (handoff-notes §4).
  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { nameEn: s.nameEn } });
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: s });
    } else {
      await prisma.service.create({ data: s });
    }
  }
  console.log(`Services ready: ${services.length}`);

  // ---------------------------------------------------------------------------
  // SEO Phase 8 — service ⇄ permit-guide links (only when currently unlinked, so
  // a pre-existing admin-set link is never overridden). See handoff-notes §5.
  // Guard matches BOTH NULL (fresh-seed rows) and "" — the admin UI persists
  // an empty string for "no linked post", so the live dev DB rows carry "".
  // ---------------------------------------------------------------------------
  const servicePostLinks: Array<{ nameEn: string; linkedPostSlug: string }> = [
    { nameEn: "Location Scouting & Fixer Services", linkedPostSlug: "rwanda-filming-permit-guide" },
    { nameEn: "Aerial / Drone Photography", linkedPostSlug: "rwanda-drone-permit-guide" },
  ];
  for (const link of servicePostLinks) {
    const res = await prisma.service.updateMany({
      where: { nameEn: link.nameEn, OR: [{ linkedPostSlug: null }, { linkedPostSlug: "" }] },
      data: { linkedPostSlug: link.linkedPostSlug },
    });
    console.log(
      `Service link ${link.nameEn} -> ${link.linkedPostSlug}: ${res.count === 1 ? "linked" : "skipped (not found or already linked)"}`
    );
  }

  // ---------------------------------------------------------------------------
  // SEO Phase 8 — Rwanda permit guides (educational blog posts). Content comes
  // verbatim from docs/seo/phase8/permit-filming.md + permit-drone.md. Model
  // contract (handoff-notes §1): BlogPost has NO tags, NO linkedPostSlug —
  // slug is the unique idempotency key; titleRw/contentRw carry the drafts'
  // short honest Kinyarwanda summaries (the guides are written in English),
  // mirroring how existing seeded posts fill RW fields (summit: 19-char
  // contentRw) — §2. publishedAt is stamped at seed time so the blog feed and
  // sitemap (newest-first, null treated as oldest) surface the guides — §3.
  // ---------------------------------------------------------------------------
  const guidePosts = [
    {
      slug: "rwanda-filming-permit-guide",
      titleEn: "How to Get a Rwanda Filming Permit: A Practical Guide for Shooting in Kigali",
      titleRw: "Ibyangombwa byo Gufata Amashusho mu Rwanda: Uko Ubisaba kuri Irembo",
      excerptEn:
        "Getting a Rwanda filming permit: who issues it, how to apply, and what to prepare for a smooth shoot in Kigali — from a local production crew.",
      excerptRw:
        "Uko mubasha kubona ibyangombwa byo gufata amashusho mu Rwanda, bisabwe kuri Irembo — umwongozo wuzuye uri mu Cyongereza.",
      contentRw:
        "Mu Rwanda, gufata amashusho by'umwuga bisaba ibyangombwa (filming permit) bisabwe kuri Irembo, hamwe n'ubufasha bwa Rwanda Film Office. Uyu mwongozo wuzuye wanditswe mu Cyongereza; iyi ni incamake nto y'iby'ingenzi birimo. Soma inyandiko y'Icyongereza kugira ngo umenye byose.",
      contentEn: `Every production that films in Rwanda — a conference livestream at the Kigali Convention Centre, a corporate brand film, or a wedding in Nyarutarama — needs to understand the filming rules before the cameras roll. This guide explains the Rwanda filming permit: who issues it, how to apply, and how to plan a smooth shoot in Kigali and across the country.

## Why filming in Rwanda is growing fast

Kigali has become one of Africa's busiest meeting and event cities. According to the Rwanda Development Board (RDB), Rwanda's MICE sector — meetings, incentives, conferences, and exhibitions — generated USD 94.7 million in 2025 across 165 international and regional events. Global gatherings such as Mobile World Congress Kigali, the Basketball Africa League, and the Africa Food Systems Forum bring film and video crews from around the world. With that growth comes a clear permitting system — and productions that plan ahead get the smoothest shoots.

## Do you need a filming permit?

For most professional shoots, yes. The Rwandan government issues what the Irembo services portal describes as a photography and video shooting permit, covering filming in public for documentaries, fiction, news, and commercial productions — for both Rwandan crews and international teams.

Casual personal photography does not need a permit. But as soon as a shoot is professional or commercial — or takes place in a public space with a crew and production equipment — the filming permit applies. One important note: a filming permit covers cameras and crew, not drones. Aerial filming needs separate approval (see our [guide to the Rwanda drone permit](/blog/rwanda-drone-permit-guide)).

## Who issues it, and where to apply

The [Rwanda Film Office](http://rfo.rw) (RFO), an entity of the Rwanda Development Board, is the single point of contact for audiovisual productions. It helps local and international crews with locations, logistics, and navigating the process. The permit application itself is submitted online through Irembo (irembo.gov.rw) under the Media category.

Rwandan applicants apply with their national ID; international crew members use their passport details. Alongside the application, prepare:

- a short description of the production — the type, synopsis, or treatment;
- the locations you plan to film;
- your planned shooting dates;
- the crew list and equipment list;
- passports or IDs of the crew members.

Having these ready before you start the application makes the process noticeably faster.

## How long does it take?

Processing times vary, so always check current requirements. Irembo guidance for the photography and video shooting permit cites a processing time of around four working days for a standard application. For anything complex — sensitive locations, national parks, or large crews — plan four to six weeks ahead. The Rwanda Film Office advises applying early; a permit is part of your production schedule, not an afterthought.

## Fees: what to expect

Permit fees are set by the responsible authorities and can change, so confirm the current rate when you apply. As a reference point, the Rwanda Film Office has listed around USD 30 for a 15-day permit and USD 50 for a 30-day permit. Payment is handled through the Irembo platform when you submit. Keep a copy of the approved permit on set — local authorities may ask to see the formalities on site.

## Filming in special locations

Some places require extra coordination:

- **National parks** — Volcanoes, Akagera, and Nyungwe are highly protected. Coordinate through RDB's tourism and conservation teams; filming gorillas has particularly strict rules.
- **Genocide memorials** — filming requires approval from the National Commission for the Fight Against Genocide (CNLG), and the content must treat these sites with respect.
- **Government and military buildings, and sites near security installations** — do not photograph without explicit permission, and never film sensitive or restricted areas. When in doubt about an official-looking building, ask first.

## What a Kigali crew knows

We are a Kigali-based production studio, and we arrange permits for most of our own shoots — from the events that fill Kigali's conference calendar to documentaries in the countryside. A few things we have learned:

- For events and conferences, check the venue's own media procedures in addition to the national permit; organizers often run their own accreditation process.
- If you are importing equipment, plan the customs paperwork well in advance — Rwanda is a non-carnet country.
- Build permit time into the schedule before confirming dates with clients.

Filming legally in Rwanda does not slow a good production down. It makes everything predictable: authorities are welcoming, communities are respected, and the footage is safely yours to use. If you are planning a shoot and would rather focus on the story, talk to us — we arrange filming permits and local logistics for crews working in Kigali and across Rwanda.`,
    },
    {
      slug: "rwanda-drone-permit-guide",
      titleEn: "The Rwanda Drone Permit: How to Fly a Drone Legally in Kigali",
      titleRw: "Ibyangombwa by'Igisore (Drone) mu Rwanda: Ibyo Kumenya Mbere yo Kuguruka",
      excerptEn:
        "How to get a Rwanda drone permit before filming in Kigali: RCAA activity approval, drone registration, insurance, and the no-fly rules to respect.",
      excerptRw:
        "Ibyangombwa by'igisore mu Rwanda: kwiyandikisha kuri RCAA, uruhusha, ubwishingizi n'ahantu hatemewe kuguruka. Inyandiko yuzuye iri mu Cyongereza.",
      contentRw:
        "Igisore (drone) mu Rwanda kigenzurwa na RCAA, kandi bisaba kwiyandikisha, uruhusha rw'akazi (activity permit), ubwishingizi n'ubumenyi bw'ahantu hatemewe kuguruka. Inyandiko yuzuye yanditswe mu Cyongereza; iyi ni incamake nto yayo. Soma inyandiko y'Icyongereza kugira ngo umenye urukurikirane rw'ibisabwa byose.",
      contentEn: `Drones are changing how stories are told in Rwanda — from sweeping shots of the Kigali skyline to aerial coverage of weddings, events, and farmland. But a drone is not a travel accessory you unpack and fly. Every drone operation in Rwanda is regulated by the Rwanda Civil Aviation Authority (RCAA), and flying without approval can ground a shoot before it starts. This guide walks through the Rwanda drone permit: the approvals you need, the steps to get them, and the no-fly rules every crew must respect.

## Who regulates drones in Rwanda

The RCAA regulates all unmanned aircraft systems under the Rwanda Civil Aviation Regulations, Part 27. For a production, three approvals matter most:

1. **UAS registration** — every drone operated in Rwanda must be registered with the RCAA.
2. **A UAS activity permit** — the authorization to operate the drone for a specific purpose and area.
3. **A remote pilot certificate** — for the person actually flying the aircraft.

Commercial and higher-risk operations can additionally require an Unmanned Operator Certificate (UOC), issued together with an operational risk assessment.

## Step by step: getting the Rwanda drone permit

RCAA's published service guidance runs through the authority's Drone Portal:

1. **Register the aircraft.** The operator sends a formal letter describing the intended use and attaches the RCAA application form. The authority responds with the procedure to create a Drone Portal account and register the drone.
2. **Apply for a UAS activity permit.** Through the portal, the operator submits the application with a Concept of Operations (CONOPS) form describing where, when, and how the drone will be used.
3. **Certify the pilot.** The person flying must hold a Rwandan remote pilot certificate; the RCAA outlines the application procedure through the same portal.
4. **Commercial operations.** If the RCAA requires it, apply for an Unmanned Operator Certificate, including a risk assessment of the planned operation.

Start early. RCAA's process is application-based and approvals take time, so plan for weeks, not days — international productions typically allow four to six weeks before the shoot.

## Insurance and responsibility

The drone regulations set insurance and record-keeping duties for drone operators in Rwanda. Before any commercial flight, confirm with the RCAA which insurance coverage applies to your operation and keep the documentation with the aircraft. The operator is responsible for every flight — who flies, where, and under what conditions.

## No-fly awareness: where you cannot fly

Rwanda's standard operating conditions for drones are strict. Under those conditions a drone must be flown:

- within visual line of sight, by day;
- at or below 120 m (about 400 ft) above ground level;
- at least 30 m away from people not involved in the operation;
- never over populated areas or crowds;
- outside prohibited and restricted areas;
- clear of aerodromes — roughly 10 nautical miles around Kigali International Airport and about 5 nautical miles around domestic aerodromes;
- never over police, fire, or other emergency operations without approval.

Beyond these, treat government and security sites — and any area where authorities have restricted the airspace — as off-limits unless the permit explicitly covers them. A city-center shoot in Kigali needs a flight plan that respects these constraints before arrival, not on the day.

## Practical notes for crews importing drones

If you are bringing a drone into Rwanda, declare it to the Rwanda National Police at the point of entry — the regulations require it, and failing to do so carries penalties. Because registration ties the operator and aircraft to a local presence, international productions typically fly with a local registered operator. That is also the safest way to keep the shoot on schedule.

## Drone coverage done right

Done properly, aerial filming in Rwanda is spectacular and straightforward. Permits protect the public and Rwanda's airspace, and crews that respect them are welcomed back. As Kigali's event calendar grows — RDB figures put MICE revenue at USD 94.7 million across 165 events in 2025 — organizers, hotels, and developers increasingly want aerial coverage, and they want it lawful.

From drone-permit filing to flight planning, we handle aerial coverage for real estate, events, and agriculture in Kigali and across Rwanda, with RCAA-compliant permitting arranged for every shoot. If you have a drone production in mind, tell us about it — we will take care of the approvals.`,
    },
  ];

  let guidePostsSeeded = 0;
  for (const post of guidePosts) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      console.log(`Guide already exists: ${post.slug} — skipped`);
      continue;
    }
    await prisma.blogPost.create({
      data: {
        slug: post.slug,
        titleEn: post.titleEn,
        titleRw: post.titleRw,
        excerptEn: post.excerptEn,
        excerptRw: post.excerptRw,
        contentEn: post.contentEn,
        contentRw: post.contentRw,
        contentType: "EDUCATIONAL",
        coverImageUrl: null,
        published: true,
        publishedAt: new Date(),
      },
    });
    guidePostsSeeded++;
    console.log(`Guide created: ${post.slug} (publishedAt stamped at seed time)`);
  }
  console.log(`Permit guides ready: ${guidePostsSeeded}`);

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
