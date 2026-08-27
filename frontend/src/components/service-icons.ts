import {
  Camera,
  Video,
  Radio,
  Megaphone,
  Clapperboard,
  Scissors,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

/** Service.icon string → Lucide glyph. Shared by the home bento and /services catalog. */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  camera: Camera,
  video: Video,
  livestream: Radio,
  broadcast: Radio,
  drone: Clapperboard,
  photo: ImageIcon,
  edit: Scissors,
  ad: Megaphone,
};

export function serviceIcon(icon: string | null | undefined): LucideIcon {
  return SERVICE_ICONS[icon ?? "camera"] ?? Camera;
}
