import type { ReactNode, SVGProps } from "react";

/* Hand-drawn 24×24 stroke icons — 1.9 weight, rounded caps, sticker energy. */

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: P, children: ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconReticle = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="6.25" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  );

export const IconCheck = (p: P) => base(p, <path d="m4.5 12.5 5 5L19.5 7" />);

export const IconCheckCircle = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.6 2.6 4.6-5" />
    </>
  );

export const IconClock = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  );

export const IconTimer = (p: P) =>
  base(
    p,
    <>
      <path d="M10 2.5h4" />
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.4 1.6" />
    </>
  );

export const IconCalendar = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 2.8V6M16 2.8V6" />
    </>
  );

export const IconTarget = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  );

export const IconStar = (p: P) =>
  base(p, <path d="m12 3.6 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7Z" />);

export const IconStarFilled = (p: P) =>
  base(
    { ...p },
    <path
      d="m12 3.6 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7Z"
      fill="currentColor"
    />
  );

export const IconGear = (p: P) =>
  base(
    p,
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  );

export const IconSliders = (p: P) =>
  base(
    p,
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </>
  );

export const IconPlus = (p: P) => base(p, <path d="M12 5v14M5 12h14" />);

export const IconX = (p: P) => base(p, <path d="m6 6 12 12M18 6 6 18" />);

export const IconChevron = (p: P) => base(p, <path d="m9 6 6 6-6 6" />);

export const IconSpark = (p: P) =>
  base(
    p,
    <>
      <path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </>
  );

export const IconBell = (p: P) =>
  base(
    p,
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  );

export const IconSplit = (p: P) =>
  base(
    p,
    <>
      <path d="M4 6h6M4 12h6M4 18h6" />
      <path d="M14 6h6M14 12h6M14 18h4" />
    </>
  );

export const IconPause = (p: P) => base(p, <path d="M9 5.5v13M15 5.5v13" />);

export const IconPlay = (p: P) => base(p, <path d="M8 5.5v13l10-6.5Z" />);

export const IconTrash = (p: P) =>
  base(
    p,
    <>
      <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5 7.5 19.5h9l1-13" />
      <path d="M10 10v6M14 10v6" />
    </>
  );

export const IconInbox = (p: P) =>
  base(
    p,
    <>
      <path d="M3.5 13.5 6 5.5h12l2.5 8" />
      <path d="M3.5 13.5h5l1.2 2.5h4.6l1.2-2.5h5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18Z" />
    </>
  );

export const IconBlock = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6.5 18 17.5" />
    </>
  );

export const IconUndo = (p: P) =>
  base(
    p,
    <>
      <path d="M8 5 4 9l4 4" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  );

export const IconDots = (p: P) =>
  base(
    p,
    <>
      <circle cx="5.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  );

export const IconSend = (p: P) =>
  base(p, <path d="M4 11.5 20 4l-4.5 16-4-6.5ZM11.5 13.5 20 4" />);

export const IconInfo = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  );

export const IconPostpone = (p: P) =>
  base(
    p,
    <>
      <path d="M17 4.5a8.5 8.5 0 1 0 2.5 6" />
      <path d="M19.5 3.5v4h-4" />
      <path d="M12 8v4l2.6 1.8" />
    </>
  );

/* --- new for the sticker era --- */

export const IconFire = (p: P) =>
  base(
    p,
    <path d="M12 21c3.9 0 6.5-2.5 6.5-6 0-2.6-1.6-4.4-3-6-1.3-1.5-2.4-2.9-2.5-5-2.3 1.5-3.2 3.4-3 5.5-.6-.3-1.1-1-1.3-1.9-1.5 1.6-2.7 3.8-2.7 6.4 0 4 2.6 7 6 7Zm0 0c-1.8 0-3-1.4-3-3 0-1.4 1-2.4 1.8-3.4.6-.7 1.2-1.4 1.4-2.4 1.2 1.2 2.8 3.2 2.8 5.4 0 2-1.2 3.4-3 3.4Z" />
  );

export const IconPin = (p: P) =>
  base(
    p,
    <>
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  );

export const IconStar4 = (p: P) =>
  base(p, <path d="M12 2.5c.9 5 2.5 6.6 7.5 7.5-5 .9-6.6 2.5-7.5 7.5-.9-5-2.5-6.6-7.5-7.5 5-.9 6.6-2.5 7.5-7.5Z" />);

export const IconSquiggle = (p: P) =>
  base(p, <path d="M2.5 14c2-4.5 4-4.5 6 0s4 4.5 6 0 4-4.5 6 0" />);

export const IconArrowDoodle = (p: P) =>
  base(
    p,
    <>
      <path d="M5 19c1.5-7 6-11.5 13-13" />
      <path d="M13.5 4.5 18 6l-1.5 4.5" />
    </>
  );
