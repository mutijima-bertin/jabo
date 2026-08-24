"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "rw";

const en = {
  nav_home: "Home",
  nav_services: "Services",
  nav_portfolio: "Portfolio",
  nav_about: "About",
  nav_book: "Book a shoot",
  nav_blog: "Blog",
  nav_menu_open: "Open menu",
  nav_menu_close: "Close menu",
  hero_badge: "Photography · Videography · Livestreaming — Kigali, Rwanda",
  hero_cta_book: "Book a production",
  hero_cta_portfolio: "View our work",
  services_title: "Services & pricing",
  services_sub: "Transparent prices. No surprise costs. Book in minutes.",
  book_now: "Book now",
  from: "From",
  portfolio_title: "Featured work",
  portfolio_sub: "A selection of recent productions for media houses, institutions, and events.",
  portfolio_filter_all: "All",
  portfolio_filter_weddings: "Weddings",
  portfolio_filter_events: "Events",
  portfolio_filter_corporate: "Corporate",
  portfolio_filter_concerts: "Concerts",
  portfolio_filter_documentaries: "Documentaries",
  portfolio_filter_portraits: "Portraits",
  about_title: "About the studio",
  clients_title: "Trusted by",
  testimonials_title: "What clients say",
  trust_statement: "Since 2015, Creative Sound Studio has been telling Rwanda's stories — from weddings and documentaries to live events and aerial coverage.",
  trust_since_label: "Since",
  trust_years_label: "Years of experience",
  trust_clients_label: "Media houses & institutions",
  book_title: "Book a production",
  book_sub: "Fill in the form — you'll receive a tracking link by email and WhatsApp.",
  book_service: "Service",
  book_name: "Your name",
  book_email: "Email",
  book_phone: "WhatsApp number (international format)",
  book_phone_hint: "e.g. +2507xxxxxxxx",
  book_date: "Preferred date",
  book_location: "Location",
  book_budget: "Budget range",
  book_details: "Tell us about your production",
  book_submit: "Send booking request",
  book_processing: "Sending...",
  book_success_title: "Booking received!",
  book_success_body: "Check your email and WhatsApp — your tracking link is on its way.",
  book_reference: "Reference",
  book_error: "Something went wrong. Please try again.",
  track_title: "My production",
  track_ref: "Reference",
  track_status: "Status",
  track_timeline: "Timeline",
  track_link_expired: "This tracking link is invalid or expired.",
  track_request_new: "Contact us to request a new link.",
  track_received: "Booking received",
  track_confirm: "Confirmed",
  track_in_production: "In production",
  track_delivered: "Delivered",
  track_completed: "Completed",
  track_cancelled: "Cancelled",
  admin_login: "Admin login",
  admin_email: "Email",
  admin_password: "Password",
  admin_signin: "Sign in",
  admin_dashboard: "Dashboard",
  admin_bookings: "Bookings",
  admin_services: "Services",
  admin_portfolio: "Portfolio",
  admin_settings: "Settings",
  admin_logout: "Log out",
  client_login_title: "Client login",
  client_login_sub: "Enter the email you used to book, and we'll send you a magic link.",
  client_login_email: "Email",
  client_login_email_invalid: "Please enter a valid email address.",
  client_login_submit: "Send magic link",
  client_login_sending: "Sending...",
  client_login_success_title: "Check your email",
  client_login_success_body: "Your magic link is on its way. Open it to sign in to your account.",
  client_login_back_home: "Back to home",
  client_login_link_invalid: "This login link is invalid or expired.",
  client_login_link_invalid_hint: "Request a new link below.",
  client_account_title: "My account",
  client_account_greeting: "Welcome back,",
  client_account_profile: "Your details",
  client_account_name: "Name",
  client_account_email: "Email",
  client_account_phone: "Phone",
  client_account_bookings: "My bookings",
  client_account_no_bookings: "No bookings yet.",
  client_account_no_bookings_hint: "Book a production and it will appear here.",
  client_account_logout: "Log out",
  client_account_error: "Something went wrong loading your account. Please try again.",
  client_account_date: "Event date",
  whatsapp_aria: "Chat on WhatsApp",
  social_whatsapp: "WhatsApp",
  social_instagram_studio: "Creative Sound Studio on Instagram",
  social_instagram_jabo: "Jabo Nkurunziza on Instagram",
  social_youtube: "Creative Sound Studio on YouTube",
  blog_title: "Stories from the studio",
  blog_subtitle: "Notes, highlights and client stories from behind the lens.",
  blog_body: "Stories are on the way. In the meantime, explore our portfolio or book your shoot.",
  blog_cta: "Book a shoot",
  blog_type_recap: "Project recap",
  blog_type_story: "Client story",
  blog_type_guide: "Guide",
  blog_type_news: "Studio news",
  blog_views: "Views",
  blog_likes: "Likes",
  blog_like: "Like",
  blog_back: "Back to blog",
  blog_like_error: "Could not save your like — try again.",
  blog_empty_title: "No stories yet",
  blog_unreachable_title: "Server unreachable",
  blog_unreachable_body: "We couldn't load the stories right now. Check back in a moment.",
  blog_cta_title: "Ready to capture your story?",
  blog_cta_body: "Book a shoot or message us on WhatsApp — we reply fast.",
  footer_rights: "All rights reserved.",
};

const rw: Record<keyof typeof en, string> = {
  nav_home: "Ahabanza",
  nav_services: "Serivisi",
  nav_portfolio: "Amafoto",
  nav_about: "Abo turi bo",
  nav_book: "Andikisha amafoto",
  nav_blog: "Blog",
  nav_menu_open: "Fungura imenyu",
  nav_menu_close: "Funga imenyu",
  hero_badge: "Amafoto · Amashusho · Kwerekana mu mubare mubanza — Kigali, u Rwanda",
  hero_cta_book: "Andikisha umurimo",
  hero_cta_portfolio: "Reba imirimo yacu",
  services_title: "Serivisi n'ibiciro",
  services_sub: "Ibiciro bisobanutse. Nta gushidikanya. Andikisha mu minota.",
  book_now: "Andikisha",
  from: "Uhereye kuri",
  portfolio_title: "Imirimo y'ibanze",
  portfolio_sub: "Imirimo y'ibanze yakorewe ibitangazamakuru, inzego, n'ibirori.",
  portfolio_filter_all: "Byose",
  portfolio_filter_weddings: "Ubukwe",
  portfolio_filter_events: "Ibirori",
  portfolio_filter_corporate: "Ibigo",
  portfolio_filter_concerts: "Ibitaramo",
  portfolio_filter_documentaries: "Documentaire",
  portfolio_filter_portraits: "Amafoto y'abantu",
  about_title: "Abo turi bo",
  clients_title: "Dufatanyije na",
  testimonials_title: "Ibyo abakiriya bavuga",
  trust_statement: "Kuva 2015, twandika amateka y'u Rwanda — kuva mu bukwe kugeza ku documentaire, ibirori biriho kugeza ku mashusho y'igisore.",
  trust_since_label: "Kuva",
  trust_years_label: "Imyaka y'uburambe",
  trust_clients_label: "Ibitangazamakuru n'inzego",
  book_title: "Andikisha umurimo",
  book_sub: "Uzuza ifishi — uzaherwa urugero rwo gukurikirana ukoresheje imeri na WhatsApp.",
  book_service: "Serivisi",
  book_name: "Amazina yawe",
  book_email: "Imeyili",
  book_phone: "Nomero ya WhatsApp (mu mubare mpuzamahanga)",
  book_phone_hint: "urugero: +2507xxxxxxxx",
  book_date: "Itariki wifuza",
  book_location: "Aho bizabera",
  book_budget: "Amafaranga",
  book_details: "Tubwire ibijyanye n'umurimo wawe",
  book_submit: "Ohereza icyifuzo",
  book_processing: "Biri koherezwa...",
  book_success_title: "Icyifuzo cyahawe!",
  book_success_body: "Reba imeyili na WhatsApp — urugero rwawe ruraza.",
  book_reference: "Umubare",
  book_error: "Hari ikibazo cyabaye. Gerageza nanone.",
  track_title: "Umurimo wanjye",
  track_ref: "Umubare",
  track_status: "Icyegeranyo",
  track_timeline: "Ibyabaye",
  track_link_expired: "Urugero ntabwo rukora cyangwa rwarangiye.",
  track_request_new: "Twandikire kugira ngo duhere urugero rushya.",
  track_received: "Icyifuzo cyahawe",
  track_confirm: "Byemejwe",
  track_in_production: "Biri gukorwa",
  track_delivered: "Byatanzwe",
  track_completed: "Byarangiye",
  track_cancelled: "Byahagaritswe",
  admin_login: "Kwinjira kwa admin",
  admin_email: "Imeyili",
  admin_password: "Ijambobanga",
  admin_signin: "Injira",
  admin_dashboard: "Ahabanza",
  admin_bookings: "Ubutumwa",
  admin_services: "Serivisi",
  admin_portfolio: "Amafoto",
  admin_settings: "Igenamiterere",
  admin_logout: "Sohoka",
  client_login_title: "Kwinjira kwa umukiriya",
  client_login_sub: "Andika imeyili wakoresheje, tuzohereze urugero rwo kwinjira.",
  client_login_email: "Imeyili",
  client_login_email_invalid: "Andika imeyili ikoreshwa.",
  client_login_submit: "Ohereza urugero",
  client_login_sending: "Biri koherezwa...",
  client_login_success_title: "Reba imeyili yawe",
  client_login_success_body: "Urugero rwawe ruraza. Ufungure kugira ngo winjire kuri konte yawe.",
  client_login_back_home: "Subira ahabanza",
  client_login_link_invalid: "Urugero ntabwo rukora cyangwa rwarangiye.",
  client_login_link_invalid_hint: "Saba urugero rushya hano hepfo.",
  client_account_title: "Konte yanjye",
  client_account_greeting: "Murakaza neza,",
  client_account_profile: "Amakuru yawe",
  client_account_name: "Amazina",
  client_account_email: "Imeyili",
  client_account_phone: "Telefoni",
  client_account_bookings: "Ibyifuzo byanjye",
  client_account_no_bookings: "Nta byifuzo biracyariho.",
  client_account_no_bookings_hint: "Andikisha umurimo, uzaherebwa hano.",
  client_account_logout: "Sohoka",
  client_account_error: "Hari ikibazo cyabaye mu gushyiramo konte yawe. Gerageza nanone.",
  client_account_date: "Itariki y'ibirori",
  whatsapp_aria: "Twandikire kuri WhatsApp",
  social_whatsapp: "WhatsApp",
  social_instagram_studio: "Creative Sound Studio kuri Instagram",
  social_instagram_jabo: "Jabo Nkurunziza kuri Instagram",
  social_youtube: "Creative Sound Studio kuri YouTube",
  blog_title: "Inkuru ziva mu studio",
  blog_subtitle: "Inyandiko, iby'ingenzi n'inkuru z'abakiriya bivuye inyuma y'akamera.",
  blog_body: "Inkuru ziraza. Mu gihe cyo gutegereza, reba imirimo yacu cyangwa wandikishe.",
  blog_cta: "Andikisha amafoto",
  blog_type_recap: "Inkuru z'umushinga",
  blog_type_story: "Inkuru z'abakiriya",
  blog_type_guide: "Inyigisho",
  blog_type_news: "Amakuru ya studio",
  blog_views: "Reba",
  blog_likes: "Gushimwa",
  blog_like: "Shima",
  blog_back: "Subira ku blog",
  blog_like_error: "Ntibishobotse kubika ishimwe ryawe — Ongera ugerageze.",
  blog_empty_title: "Nta nkuru biracyariho",
  blog_unreachable_title: "Seriveri ntiboneka",
  blog_unreachable_body: "Ntitwashoboye gutanga inkuru ubu. Garuka mu gihe gito.",
  blog_cta_title: "Ufite inkuru yo kwandika?",
  blog_cta_body: "Andikisha cyangwa wandikire kuri WhatsApp — dusubiza ubwira.",
  footer_rights: "Uburenganzira bwose burakingiwe.",
};

const dicts: Record<Locale, Record<keyof typeof en, string>> = { en, rw };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof en) => string;
}

const Ctx = createContext<I18nCtx>({ locale: "en", setLocale: () => {}, t: (k) => en[k] });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("css_locale") as Locale | null;
    if (saved === "en" || saved === "rw") setLocale(saved);
  }, []);

  const value: I18nCtx = {
    locale,
    setLocale: (l) => {
      setLocale(l);
      localStorage.setItem("css_locale", l);
    },
    t: (k) => dicts[locale][k],
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

export const STATUS_ORDER = ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

export function statusKey(status: string): keyof typeof en {
  switch (status) {
    case "PENDING":
      return "track_received";
    case "CONFIRMED":
      return "track_confirm";
    case "IN_PRODUCTION":
      return "track_in_production";
    case "DELIVERED":
      return "track_delivered";
    case "COMPLETED":
      return "track_completed";
    case "CANCELLED":
      return "track_cancelled";
    default:
      return "track_received";
  }
}

export function postTypeKey(contentType: string): keyof typeof en {
  switch (contentType) {
    case "CLIENT_STORY":
      return "blog_type_story";
    case "EDUCATIONAL":
      return "blog_type_guide";
    case "STUDIO_NEWS":
      return "blog_type_news";
    case "PROJECT_RECAP":
    default:
      return "blog_type_recap";
  }
}
