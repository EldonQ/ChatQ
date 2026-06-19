// Literature source types for news article search

export interface ArticleQuery {
  q: string;
  language?: string;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  from?: string;
  to?: string;
  pageSize?: number;
  page?: number;
}

export interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { id: string | null; name: string };
  author: string | null;
  content: string;
}

export interface ArticleSearchResult {
  status: "ok" | "error";
  totalResults: number;
  articles: Article[];
  code?: string;
  message?: string;
}
