import {
  CheckCircle2,
  AlertTriangle,
  Pill,
  TrendingUp,
  Footprints,
  User,
  Sparkles,
} from "lucide-react";

// Maps whatever icon string the backend sends to a component. Treated as an
// open set — anything unrecognized falls back to Sparkles rather than
// crashing or rendering nothing.
const ICON_MAP = {
  green: CheckCircle2,
  alert: AlertTriangle,
  pill: Pill,
  activity: TrendingUp,
  trend: TrendingUp,
  chart: TrendingUp,
  walk: Footprints,
  profile: User,
};

export function iconForInsight(icon) {
  return ICON_MAP[icon] || Sparkles;
}

const TONE_MAP = {
  green: "text-good",
  alert: "text-alert",
  pill: "text-accent",
  activity: "text-accent",
  trend: "text-accent",
  chart: "text-accent",
  walk: "text-accent",
  profile: "text-warn",
};

export function toneForInsight(icon) {
  return TONE_MAP[icon] || "text-text-muted";
}
