import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted transition hover:bg-card-hover hover:text-fg"
      title="نسخ"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          تم النسخ
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          نسخ
        </>
      )}
    </button>
  );
}
