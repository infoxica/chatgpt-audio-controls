import type { SVGProps } from "react";

interface ChatGPTAudioIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function ChatGPTAudioIcon({ size = 20, ...props }: ChatGPTAudioIconProps) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={props["aria-label"] ? undefined : true}
      focusable="false"
    >
      <g
        transform="translate(12,12) scale(0.35)"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(60)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(120)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(180)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(240)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(300)" />
        <circle cx="0" cy="0" r="10" fill="var(--accent)" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="-2,-4 5,0 -2,4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
