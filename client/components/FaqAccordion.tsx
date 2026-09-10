"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { FaqCategory, Lang } from "@/lib/faqData";

function renderAnswer(text: string): ReactNode[] {
  const linkPattern = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <Link key={key++} href={match[2]} className="text-blue-600 font-bold underline decoration-blue-300 hover:text-blue-800">
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function FaqAccordion({

  categories,


  lang,
  searchPlaceholder,
  noResultsText,
}: {
  categories: FaqCategory[];
  lang: Lang;
  searchPlaceholder: string;
  noResultsText: string;
}) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!query) return categories.find(c => c.id === activeCat)?.items ?? [];
    return categories
      .flatMap(c => c.items)
      .filter(item => item.q[lang].toLowerCase().includes(query) || item.a[lang].toLowerCase().includes(query));
  }, [query, activeCat, categories, lang]);

  return (
    <div>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-800"
        />
      </div>

      {!query && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-colors ${
                activeCat === cat.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label[lang]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">{noResultsText}</p>
        ) : (
          visibleItems.map((item, i) => (
            <details key={i} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all">
              <summary className="p-4 cursor-pointer font-bold flex justify-between items-center gap-3 list-none group-open:bg-slate-50 text-slate-800 text-sm">
                <span>{item.q[lang]}</span>
                <ChevronRight size={18} className="group-open:rotate-90 transition-transform flex-shrink-0 text-slate-400" />
              </summary>
              <div className="p-4 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                <p className="pt-4">{renderAnswer(item.a[lang])}</p>
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
