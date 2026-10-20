"use client";

import { Check, Copy, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatCode } from "@/lib/data";
import { Sheet } from "./Sheet";

export function ShareSheet({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/g/${code}`);

  useEffect(() => {
    const full = `${window.location.origin}/g/${code}`;
    setUrl(full);
    QRCode.toString(full, { type: "svg", margin: 0, color: { dark: "#12203a", light: "#ffffff" } }).then(setSvg);
  }, [code]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: "Join my volleyball game", url }).catch(() => {});
    else copy();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Bring people in">
      <p className="text-[0.95rem] text-ink-2">Anyone can scan this with their phone camera. It keeps working for every game on this court.</p>
      <div className="mx-auto mt-5 w-full max-w-[260px] rounded-2xl border border-line p-4">
        {svg ? (
          <div className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`QR code for game ${formatCode(code)}`} />
        ) : (
          <div className="aspect-square w-full animate-pulse rounded-lg bg-line-2" />
        )}
      </div>
      <p className="mt-5 text-center text-[0.9rem] text-ink-2">Or type the code into Join game</p>
      <p className="display num mt-1 text-center text-[3.4rem] font-black tracking-[0.04em]">{formatCode(code)}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={copy} className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 border-ink font-semibold">
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? "Link copied" : "Copy link"}
        </button>
        <button onClick={share} className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-ink font-semibold text-white">
          <Share2 size={18} aria-hidden="true" />
          Share invite
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </Sheet>
  );
}
