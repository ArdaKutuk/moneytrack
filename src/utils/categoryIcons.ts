import {
  Briefcase,
  Car,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  MoreHorizontal,
  PlusCircle,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Utensils,
  Wallet,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

/** Category icon field stores a stable string key (not a component) so it
 * survives serialization through SQLite/JSON export. This is the one place
 * that maps it to an actual icon. */
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  film: Film,
  receipt: Receipt,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "more-horizontal": MoreHorizontal,
  wallet: Wallet,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  gift: Gift,
  "plus-circle": PlusCircle,
};

export function getCategoryIcon(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] ?? CircleDollarSign;
}
