import type { ThemeId } from "../types";

/** Metadata for the three vibes — picker swatches, confetti, meta color. */
export const THEME_IDS: ThemeId[] = ["sticker", "y2k", "night"];

export const THEMES: Record<
  ThemeId,
  {
    label: string;
    tag: string;
    swatches: string[];
    meta: string;
    confetti: string[];
    ambient: string; // ambient background utility class
  }
> = {
  sticker: {
    label: "Sticker Pop",
    tag: "butter yellow · ink outlines",
    swatches: ["#FFE45E", "#1A1712", "#FF4B3A", "#2E4CFF", "#0BBF6F"],
    meta: "#FFE45E",
    confetti: ["#FFE45E", "#FF4B3A", "#2E4CFF", "#0BBF6F", "#9C6BFF", "#FFFDF6"],
    ambient: "bg-dots",
  },
  y2k: {
    label: "Y2K Cyber",
    tag: "ice blue · chrome gloss",
    swatches: ["#D8ECFF", "#1B2A6B", "#FF4FA8", "#2E63FF", "#12B3D8"],
    meta: "#D8ECFF",
    confetti: ["#FF4FA8", "#2E63FF", "#12B3D8", "#8F7BFF", "#FFFFFF", "#FF9E2C"],
    ambient: "bg-y2k-grid",
  },
  night: {
    label: "Night Shift",
    tag: "deep plum · neon pastels",
    swatches: ["#151027", "#C0A6FF", "#FF5C8A", "#4FE3A3", "#45D8E8"],
    meta: "#151027",
    confetti: ["#C0A6FF", "#FF5C8A", "#4FE3A3", "#45D8E8", "#FFC65C", "#6BA6FF"],
    ambient: "bg-night-stars",
  },
};
