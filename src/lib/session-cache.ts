import type { GbifOccurrence } from "./gbif";

export interface SpeciesEntry {
  scientificName: string;
  csv: string;
  records: GbifOccurrence[];
  count: number;
  center: [number, number];
  fetchedAt: number;
}

export interface SessionEntry {
  conversationId: string;
  createdAt: number;
  accessedAt: number;
  species: Map<string, SpeciesEntry>;
}

interface CacheOptions {
  maxSessions?: number;
  ttlMs?: number;
}

/**
 * Server-side cache for raw occurrence records.
 * The LLM never sees raw records — only summary metadata and small samples.
 */
export class SessionCache {
  private sessions = new Map<string, SessionEntry>();

  constructor(private options: CacheOptions = {}) {
    this.options = {
      maxSessions: 256,
      ttlMs: 1000 * 60 * 60 * 4, // 4 hours
      ...options,
    };
  }

  private evictIfNeeded(): void {
    const { maxSessions, ttlMs } = this.options;
    const now = Date.now();

    // Evict expired sessions
    for (const [key, entry] of this.sessions) {
      if (now - entry.accessedAt > ttlMs!) {
        this.sessions.delete(key);
      }
    }

    // Evict oldest if still over limit
    if (this.sessions.size >= maxSessions!) {
      const oldest = Array.from(this.sessions.entries()).sort(
        (a, b) => a[1].accessedAt - b[1].accessedAt,
      )[0];
      if (oldest) {
        this.sessions.delete(oldest[0]);
      }
    }
  }

  getOrCreate(conversationId: string): SessionEntry {
    this.evictIfNeeded();

    const existing = this.sessions.get(conversationId);
    if (existing) {
      existing.accessedAt = Date.now();
      return existing;
    }

    const entry: SessionEntry = {
      conversationId,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      species: new Map(),
    };
    this.sessions.set(conversationId, entry);
    return entry;
  }

  getSpecies(conversationId: string, speciesKey: string): SpeciesEntry | undefined {
    const session = this.sessions.get(conversationId);
    if (!session) return undefined;
    session.accessedAt = Date.now();
    return session.species.get(speciesKey);
  }

  setSpecies(
    conversationId: string,
    speciesKey: string,
    entry: Omit<SpeciesEntry, "fetchedAt">,
  ): SpeciesEntry {
    const session = this.getOrCreate(conversationId);
    const fullEntry: SpeciesEntry = { ...entry, fetchedAt: Date.now() };
    session.species.set(speciesKey, fullEntry);
    return fullEntry;
  }

  getAllSpecies(conversationId: string): SpeciesEntry[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    session.accessedAt = Date.now();
    return Array.from(session.species.values());
  }

  clear(conversationId?: string): void {
    if (conversationId) {
      this.sessions.delete(conversationId);
    } else {
      this.sessions.clear();
    }
  }

  stats(): { sessions: number; species: number } {
    return {
      sessions: this.sessions.size,
      species: Array.from(this.sessions.values()).reduce(
        (acc, s) => acc + s.species.size,
        0,
      ),
    };
  }
}

export const sessionCache = new SessionCache();
