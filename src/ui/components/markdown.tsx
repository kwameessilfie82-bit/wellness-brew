import Link from "next/link";
import type React from "react";

/**
 * Minimal, safe Markdown → React for owner-written pages and journal posts.
 * Supports: # / ## / ### headings, paragraphs, - / 1. lists, > quotes,
 * **bold**, *italic*, [links](url), ![images](url), --- rules.
 * No raw HTML is ever rendered; links allow only http(s), mailto, tel and /paths.
 */

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // order matters: images before links, bold before italic
  const re = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined) {
      if (SAFE_URL.test(m[2])) {
        // eslint-disable-next-line @next/next/no-img-element
        out.push(<img key={key} src={m[2]} alt={m[1]} loading="lazy" className="my-4 rounded-xl" />);
      }
    } else if (m[4] !== undefined) {
      const href = m[4];
      if (!SAFE_URL.test(href)) out.push(m[3]);
      else if (href.startsWith("/")) {
        out.push(
          <Link key={key} href={href} className="font-medium text-primary underline underline-offset-4">
            {m[3]}
          </Link>,
        );
      } else {
        out.push(
          <a key={key} href={href} className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target={href.startsWith("http") ? "_blank" : undefined}>
            {m[3]}
          </a>,
        );
      }
    } else if (m[5] !== undefined) out.push(<strong key={key}>{m[5]}</strong>);
    else if (m[6] !== undefined) out.push(<em key={key}>{m[6]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { t: "h"; level: 1 | 2 | 3; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "hr" };

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ t: "h", level: h[1].length as 1 | 2 | 3, text: h[2] });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flush();
      blocks.push({ t: "hr" });
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flush();
      const type = ul ? "ul" : "ol";
      const items = [(ul ?? ol)![1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        const n = type === "ul" ? /^[-*]\s+(.*)$/.exec(next) : /^\d+[.)]\s+(.*)$/.exec(next);
        if (!n) break;
        items.push(n[1]);
        i++;
      }
      blocks.push({ t: type, items });
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flush();
      blocks.push({ t: "quote", text: q[1] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** Plain text of Markdown (for excerpts, meta descriptions, reading time). */
export function markdownToText(src: string): string {
  return src
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className ?? "space-y-4 leading-relaxed text-muted-foreground"}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case "h":
            return b.level === 1 ? (
              <h2 key={k} className="pt-4 font-serif text-2xl font-bold text-foreground">{inline(b.text, k)}</h2>
            ) : b.level === 2 ? (
              <h2 key={k} className="pt-4 font-serif text-xl font-semibold text-foreground">{inline(b.text, k)}</h2>
            ) : (
              <h3 key={k} className="pt-2 text-lg font-semibold text-foreground">{inline(b.text, k)}</h3>
            );
          case "ul":
            return (
              <ul key={k} className="list-disc space-y-1 pl-6">
                {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="list-decimal space-y-1 pl-6">
                {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={k} className="border-l-4 border-primary/40 pl-4 italic">
                {inline(b.text, k)}
              </blockquote>
            );
          case "hr":
            return <hr key={k} className="my-6" />;
          default:
            return <p key={k}>{inline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}
