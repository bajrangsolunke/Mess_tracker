import { SvgIcon, type SvgIconProps } from "@mui/material";

/* Custom स्वाद icon set — 2px rounded strokes, 24px grid, food-themed metaphors. */

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PlateCheckIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" strokeOpacity=".45" />
        <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
      </g>
    </SvgIcon>
  );
}

export function WalletRupeeIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5z" />
        <path d="M3.5 8.5V6.8A1.8 1.8 0 0 1 5.3 5H16" />
        <path d="M9.5 10.5h5M9.5 13h5M9.5 10.5c2.2 0 2.9 1.2 2.9 2.2S11.7 15 9.5 15l3.4 3" />
      </g>
    </SvgIcon>
  );
}

export function ThaliIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <circle cx="12" cy="12" r="9.5" />
        <circle cx="9" cy="9.5" r="2.2" />
        <circle cx="15" cy="9.5" r="2.2" />
        <circle cx="9" cy="15" r="2.2" />
        <path d="M13.2 15h3.6" />
      </g>
    </SvgIcon>
  );
}

export function FamilyIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <circle cx="8" cy="8" r="2.6" />
        <circle cx="16.5" cy="8.5" r="2.2" />
        <path d="M3 19.5c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M13.5 15.3c.8-.5 1.8-.8 3-.8 2.6 0 4.5 1.8 4.5 4.5" />
      </g>
    </SvgIcon>
  );
}

export function NotebookIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
        <path d="M8.5 3.5v17M12 8.5h4M12 12h4M12 15.5h2.5" />
      </g>
    </SvgIcon>
  );
}

export function BellSpoonIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
        <path d="M10 21h4" />
        <path d="M12 5V3" />
      </g>
    </SvgIcon>
  );
}

export function HomeIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <path d="M3.5 11.5 12 4l8.5 7.5" />
        <path d="M6 10v9.5h12V10" />
        <path d="M10 19.5v-5h4v5" />
      </g>
    </SvgIcon>
  );
}

export function MoreIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </g>
    </SvgIcon>
  );
}

export function ProfileIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </g>
    </SvgIcon>
  );
}

export function LeafIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g {...base}>
        <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
        <path d="M5 19c3-4 6-7 10-10" />
      </g>
    </SvgIcon>
  );
}
