/**
 * Studio contact details — SINGLE source of truth for the public site and
 * admin flows. Rendered redactions (track page, login, account error state,
 * footer) import from here instead of hard-coding the email/phone inline.
 */
export const CONTACT = {
  phoneDisplay: "+250 783 269 951",
  phoneRaw: "+250783269951",
  phoneE164: "+250783269951",
  /** Ready-made tel: href — the strip-format number is already E.164-ish and
   * WhatsApp + tel clients both accept it verbatim. */
  phoneHref: "tel:+250783269951",
  email: "hello@creativesoundstudio.rw",
  emailHref: "mailto:hello@creativesoundstudio.rw",
  whatsappUrl: "https://wa.me/250783269951",
};
