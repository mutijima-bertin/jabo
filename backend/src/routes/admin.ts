import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import * as adminBookings from "../controllers/adminBookings.controller";
import * as adminCatalog from "../controllers/adminCatalog.controller";
import * as adminPosts from "../controllers/adminPosts.controller";
import * as adminClients from "../controllers/adminClients.controller";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// ---------- Dashboard ----------
adminRouter.get("/admin/dashboard", adminBookings.dashboard);

// ---------- Bookings ----------
adminRouter.get("/admin/bookings", adminBookings.listBookings);
adminRouter.get("/admin/bookings/:id", adminBookings.getBooking);
adminRouter.patch("/admin/bookings/:id/status", adminBookings.patchBookingStatus);
adminRouter.post("/admin/bookings/:id/revoke-token", adminBookings.revokeToken);

// ---------- Services ----------
adminRouter.get("/admin/services", adminCatalog.listServices);
adminRouter.post("/admin/services", adminCatalog.createService);
adminRouter.put("/admin/services/:id", adminCatalog.updateService);
adminRouter.delete("/admin/services/:id", adminCatalog.deleteService);

// ---------- Portfolio ----------
adminRouter.get("/admin/portfolio", adminCatalog.listPortfolio);
adminRouter.post("/admin/portfolio", adminCatalog.createPortfolioItem);
adminRouter.put("/admin/portfolio/:id", adminCatalog.updatePortfolioItem);
adminRouter.delete("/admin/portfolio/:id", adminCatalog.deletePortfolioItem);

// ---------- Uploads (drag-and-drop) ----------
adminRouter.post("/admin/uploads", adminCatalog.upload);

// ---------- Client logos ----------
adminRouter.get("/admin/logos", adminCatalog.listLogos);
adminRouter.post("/admin/logos", adminCatalog.createLogo);
adminRouter.delete("/admin/logos/:id", adminCatalog.deleteLogo);

// ---------- Testimonials ----------
adminRouter.get("/admin/testimonials", adminCatalog.listTestimonials);
adminRouter.post("/admin/testimonials", adminCatalog.createTestimonial);
adminRouter.delete("/admin/testimonials/:id", adminCatalog.deleteTestimonial);

// ---------- Site settings ----------
adminRouter.get("/admin/settings", adminCatalog.listSettings);
adminRouter.put("/admin/settings", adminCatalog.replaceSettings);

// ---------- Clients ----------
adminRouter.get("/admin/clients", adminClients.listClients);

// ---------- Blog ----------
adminRouter.get("/admin/posts", adminPosts.listPosts);
adminRouter.get("/admin/posts/:id", adminPosts.getPost);
adminRouter.post("/admin/posts", adminPosts.createPost);
adminRouter.patch("/admin/posts/:id", adminPosts.patchPost);
adminRouter.delete("/admin/posts/:id", adminPosts.deletePost);
