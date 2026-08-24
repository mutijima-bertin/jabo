import type { Request, Response } from "express";
import * as serviceModel from "../models/service.model";
import * as portfolioModel from "../models/portfolioItem.model";
import * as clientLogoModel from "../models/clientLogo.model";
import * as testimonialModel from "../models/testimonial.model";
import * as siteSettingModel from "../models/siteSetting.model";

/** Public, unauthenticated catalog reads (published rows only where applicable). */

export async function listServices(_req: Request, res: Response): Promise<void> {
  const services = await serviceModel.listPublished();
  res.json(services);
}

export async function listPortfolio(_req: Request, res: Response): Promise<void> {
  const items = await portfolioModel.listPublished();
  res.json(items);
}

export async function listLogos(_req: Request, res: Response): Promise<void> {
  const logos = await clientLogoModel.listAll();
  res.json(logos);
}

export async function listTestimonials(_req: Request, res: Response): Promise<void> {
  const items = await testimonialModel.listPublished();
  res.json(items);
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await siteSettingModel.listAll();
  res.json(settings);
}
