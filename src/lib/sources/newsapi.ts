import type { ArticleQuery, ArticleSearchResult } from "./types";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const NEWSAPI_BASE = "https://newsapi.org/v2";

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

function apiKey(): string {
  const key = process.env.NEWSAPI_API_KEY;
  if (!key) throw new Error("NEWSAPI_API_KEY not configured");
  return key;
}

async function fetchNewsAPI<T>(url: string): Promise<T> {
  const res = await undiciFetch(url, {
    dispatcher,
    headers: { "X-Api-Key": apiKey(), Accept: "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || `NewsAPI ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function searchArticles(query: ArticleQuery): Promise<ArticleSearchResult> {
  const params = new URLSearchParams();
  params.set("q", query.q);
  if (query.language) params.set("language", query.language);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("pageSize", String(query.pageSize ?? 10));
  params.set("page", String(query.page ?? 1));

  const url = `${NEWSAPI_BASE}/everything?${params}`;
  return fetchNewsAPI<ArticleSearchResult>(url);
}
