import clsx from "clsx";
import { Camera } from "lucide-react";

/**
 * Placeholder landscape in the mockups' style, used until licensed
 * photography is added (Location.imageUrl).
 */
const HUES: Record<string, { sky: string; far: string; near: string; sun: string }> = {
  sand: { sky: "#A88A5E", far: "#8E7450", near: "#6F5A3E", sun: "#E9D9B8" },
  leaf: { sky: "#6E8B55", far: "#58744A", near: "#3F5A37", sun: "#DDE6C8" },
  sea: { sky: "#93AEA8", far: "#7C9A92", near: "#5E7E76", sun: "#E6EEEA" },
  saffron: { sky: "#C29045", far: "#A5773A", near: "#7F5A2C", sun: "#F4DEAE" },
};

export function SceneArt({
  hue = "sand",
  label,
  imageUrl,
  className,
}: {
  hue?: string;
  label?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const c = HUES[hue] ?? HUES.sand;
  return (
    <div className={clsx("relative overflow-hidden", className)} style={{ background: c.sky }}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <svg aria-hidden viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
          <ellipse cx="300" cy="70" rx="22" ry="30" fill={c.sun} opacity=".7" />
          <path d="M0 200 L110 70 L190 160 L260 110 L400 210 V260 H0Z" fill={c.far} />
          <path d="M0 240 L140 150 L230 220 L320 170 L400 230 V260 H0Z" fill={c.near} />
        </svg>
      )}
      {label && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur">
          <Camera aria-hidden className="size-3.5" />
          {label}
        </span>
      )}
    </div>
  );
}
