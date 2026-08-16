import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Emerald & Co. — Tailwind theme
 * Port of DESIGN_SYSTEM.md v1 (multi-event e-invitation platform).
 *
 * Rules carried over from the spec:
 *  - Emerald is always the primary action color; event accents never replace it.
 *  - Event types are data-driven: adding a type = one entry in `eventAccents`
 *    below + the matching `data-event` variant. No component forking.
 *  - Light mode only in v1. Do not add dark tokens yet.
 */

/** Adding an event type? Add it here and nowhere else. */
const eventAccents = {
  wedding: {
    accent: "#C9A24B",
    accentDark: "#8A6A1E",
    support1: "#E8C4C0", // blush
    support2: "#F7F0E4", // cream
  },
  baptism: {
    accent: "#7FA0B0",
    accentDark: "#5F8194",
    support1: "#F9D68C", // candlelight
    support2: "#E7EFF2", // mist
  },
  birthday: {
    accent: "#F2996F",
    accentDark: "#E07A52",
    support1: "#F4C95D", // sunny
    support2: "#7BC4A4", // mint
  },
} as const;

type EventType = keyof typeof eventAccents;
const eventTypes = Object.keys(eventAccents) as EventType[];

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx,html}", "./app/**/*.{ts,tsx,mdx}"],
  darkMode: ["class"], // reserved; v1 ships no dark tokens
  theme: {
    extend: {
      colors: {
        /* §1.1 Brand & neutrals */
        emerald: {
          DEFAULT: "#0E5240",
          light: "#146A51",
          dark: "#0A3A2C",
        },
        ink: "#12211B",
        slate: "#5C665F",
        muted: "#8A938C",
        hint: "#A89A80",
        cream: "#F7F0E4",
        bg: {
          warm: "#FBFAF6",
          cool: "#F4F6F3",
        },
        surface: "#FFFFFF",
        line: {
          DEFAULT: "rgb(14 82 64 / 0.10)",
          strong: "rgb(14 82 64 / 0.20)",
        },

        /* §1.2 Event accents — prefer the `accent` alias + data-event variants */
        wedding: eventAccents.wedding,
        baptism: eventAccents.baptism,
        birthday: eventAccents.birthday,

        /**
         * Runtime accent. Set `--accent` / `--accent-dark` on the event root
         * (see the `eventAccentVars` plugin) and use `text-accent`,
         * `bg-accent/12`, `border-accent`, etc. anywhere below it.
         */
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          dark: "rgb(var(--accent-dark) / <alpha-value>)",
          s1: "rgb(var(--accent-s1) / <alpha-value>)",
          s2: "rgb(var(--accent-s2) / <alpha-value>)",
        },

        /* §1.3 Semantic / status */
        status: {
          going: "#0E5240",
          "going-fill": "rgb(14 82 64 / 0.10)",
          pending: "#C07A4A",
          "pending-fill": "rgb(192 122 74 / 0.12)",
          declined: "#A5573F",
          "declined-fill": "rgb(165 87 63 / 0.10)",
          draft: "#8A938C",
          "draft-fill": "rgb(14 50 40 / 0.06)",
        },
        premium: {
          DEFAULT: "#8A6A1E",
          fill: "rgb(201 162 75 / 0.16)",
          on: "#2A2110", // text on the gold gradient
        },
      },

      backgroundImage: {
        "gradient-gold": "linear-gradient(180deg, #C9A24B 0%, #B8912F 100%)",
        "gradient-emerald": "linear-gradient(180deg, #146A51 0%, #0A3A2C 100%)",
        "scrim-cover":
          "linear-gradient(180deg, rgb(14 82 64 / 0) 40%, rgb(10 58 44 / 0.78) 100%)",
        "veil-lock":
          "linear-gradient(180deg, rgb(247 244 238 / 0.72) 0%, rgb(247 244 238 / 0.92) 100%)",
      },

      /* §2 Typography */
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        "display-xl": ["40px", { lineHeight: "1", fontWeight: "600" }],
        "display-l": ["30px", { lineHeight: "1.1", fontWeight: "600" }],
        "heading-m": ["24px", { lineHeight: "1.2", fontWeight: "600" }],
        "heading-s": ["19px", { lineHeight: "1.2", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-strong": ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        label: ["13px", { lineHeight: "1.3", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "1.3", fontWeight: "500" }],
        caption: ["11px", { lineHeight: "1.6", fontWeight: "400" }],
        overline: [
          "11px",
          { lineHeight: "1.3", letterSpacing: "0.16em", fontWeight: "600" },
        ],
      },

      /* §3 Spacing, radius, elevation */
      spacing: {
        gutter: "22px",
        "card-p": "15px",
        section: "32px",
        11: "44px", // min tap target
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "15px",
        lg: "18px",
        pill: "30px",
        "pill-sm": "20px",
      },
      boxShadow: {
        card: "0 2px 8px rgb(14 50 40 / 0.05)",
        raised: "0 3px 12px rgb(14 50 40 / 0.06)",
        overlay: "0 34px 60px -22px rgb(14 50 40 / 0.4)",
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },

      /* §4 Motion */
      transitionDuration: {
        micro: "180ms",
        enter: "400ms",
        spring: "550ms",
      },
      transitionTimingFunction: {
        micro: "cubic-bezier(0, 0, 0.2, 1)",
        enter: "cubic-bezier(0.2, 0.85, 0.25, 1)",
        spring: "cubic-bezier(0.2, 1.3, 0.4, 1)",
        ambient: "cubic-bezier(0.4, 0, 0.6, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.86)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        flicker: {
          "0%, 100%": { opacity: "0.82", transform: "scaleY(1)" },
          "50%": { opacity: "1", transform: "scaleY(1.06)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        rise: "rise 400ms cubic-bezier(0.2,0.85,0.25,1) both",
        pop: "pop 550ms cubic-bezier(0.2,1.3,0.4,1) both",
        flicker: "flicker 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        glow: "glow 3s cubic-bezier(0.4,0,0.6,1) infinite",
        bob: "bob 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [
    /** Per-event accent variables + `event-<type>:` variants. */
    plugin(({ addBase, addVariant }) => {
      const rgb = (hex: string) =>
        `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;

      const base: Record<string, Record<string, string>> = {
        // wedding is the default so `accent` always resolves
        ":root": {
          "--accent": rgb(eventAccents.wedding.accent),
          "--accent-dark": rgb(eventAccents.wedding.accentDark),
          "--accent-s1": rgb(eventAccents.wedding.support1),
          "--accent-s2": rgb(eventAccents.wedding.support2),
        },
      };
      for (const type of eventTypes) {
        const a = eventAccents[type];
        base[`[data-event="${type}"]`] = {
          "--accent": rgb(a.accent),
          "--accent-dark": rgb(a.accentDark),
          "--accent-s1": rgb(a.support1),
          "--accent-s2": rgb(a.support2),
        };
        addVariant(`event-${type}`, `[data-event="${type}"] &`);
      }
      addBase(base);

      /* §9 reduced motion: ambient loops off, reveals fall back to static */
      addBase({
        "@media (prefers-reduced-motion: reduce)": {
          ".animate-flicker, .animate-glow, .animate-bob": {
            animation: "none",
          },
        },
      });

      /* Plan gating (§10) — entitlement-driven, not component forks */
      addVariant("locked", '[data-entitlement="locked"] &');
      addVariant("plan-plus", '[data-plan="plus"] &, [data-plan="premium"] &');
      addVariant("plan-premium", '[data-plan="premium"] &');
    }),

    /** Type-scale + section-overline shorthands (§2). */
    plugin(({ addComponents, theme }) => {
      const t = (k: string) => theme(`fontSize.${k}`) as [string, Record<string, string>];
      const style = (k: string, family: string) => {
        const [size, rest] = t(k);
        return { fontFamily: theme(`fontFamily.${family}`), fontSize: size, ...rest };
      };
      addComponents({
        ".type-display-xl": style("display-xl", "display"),
        ".type-display-l": style("display-l", "display"),
        ".type-heading-m": style("heading-m", "display"),
        ".type-heading-s": style("heading-s", "display"),
        ".type-body": style("body", "sans"),
        ".type-body-strong": style("body-strong", "sans"),
        ".type-label": style("label", "sans"),
        ".type-caption": style("caption", "sans"),
        ".type-overline": { ...style("overline", "mono"), textTransform: "uppercase" },
      });
    }),
  ],
};

export default config;
