import { Check, Copy, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";

export function trackingUrl(code: string): string {
  return `${window.location.origin}/seguimiento/${code}`;
}

async function copyText(text: string, fallbackInput: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // El portapapeles moderno solo funciona en https o localhost.
    fallbackInput?.select();
    return document.execCommand("copy");
  }
}

/** Enlace que se le envía al cliente para que vea el estado de su pedido. */
export function TrackingLink({ code }: { code: string }) {
  const url = trackingUrl(code);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await copyText(url, inputRef.current)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        readOnly
        value={url}
        aria-label="Enlace de seguimiento"
        className="input bg-slate-50 text-xs text-slate-600"
        onFocus={(e) => e.target.select()}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1 px-3 py-1.5" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5" title="Abrir como lo ve el cliente">
          <ExternalLink className="size-4" />
          <span className="sr-only">Abrir</span>
        </a>
      </div>
    </div>
  );
}
