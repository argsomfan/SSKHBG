import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const factKind = v.union(
  v.literal("diagnosis"),
  v.literal("pm"),
  v.literal("nursing"),
  v.literal("medication"),
  v.literal("card"),
  v.literal("other"),
);

const factStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const listKind = v.union(
  factKind,
  v.literal("all"),
);

const saveFactArgs = {
  id: v.optional(v.id("facts")),
  kind: factKind,
  status: factStatus,
  title: v.string(),
  category: v.string(),
  summary: v.string(),
  body: v.string(),
  source: v.string(),
};

const importFactArgs = {
  importKey: v.string(),
  kind: factKind,
  status: factStatus,
  title: v.string(),
  category: v.string(),
  summary: v.string(),
  body: v.string(),
  source: v.string(),
};

function clampLimit(limit: number | undefined, fallback: number, max: number) {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(Math.floor(limit), max));
}

function clean(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function searchText(args: {
  kind: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  source: string;
}) {
  return [
    args.kind,
    args.title,
    args.category,
    args.summary,
    args.body,
    args.source,
  ].join("\n");
}

function buildFact(args: {
  kind: Doc<"facts">["kind"];
  status: Doc<"facts">["status"];
  title: string;
  category: string;
  summary: string;
  body: string;
  source: string;
}, now: number) {
  const title = clean(args.title, 160);
  const body = clean(args.body, 12_000);

  if (!title) {
    throw new Error("Titel saknas.");
  }

  if (!body) {
    throw new Error(`Faktatext saknas för ${title}.`);
  }

  const category = clean(args.category, 120);
  const summary = clean(args.summary, 600);
  const source = clean(args.source, 300);

  return {
    kind: args.kind,
    status: args.status,
    title,
    category,
    summary,
    body,
    source,
    searchText: searchText({
      kind: args.kind,
      title,
      category,
      summary,
      body,
      source,
    }),
    updatedAt: now,
    publishedAt: args.status === "published" ? now : null,
  };
}

export const listAdmin = query({
  args: {
    kind: v.optional(listKind),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 100, 200);
    const kind = args.kind;

    if (kind && kind !== "all") {
      return await ctx.db
        .query("facts")
        .withIndex("by_kind_and_updatedAt", (q) => q.eq("kind", kind))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("facts")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);
  },
});

export const listPublished = query({
  args: {
    kind: v.optional(listKind),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 100, 200);
    const kind = args.kind;

    if (kind && kind !== "all") {
      return await ctx.db
        .query("facts")
        .withIndex("by_status_and_kind_and_updatedAt", (q) =>
          q.eq("status", "published").eq("kind", kind),
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("facts")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit);
  },
});

export const searchForAgent = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 6, 12);
    const text = args.query.trim();

    if (!text) {
      return await ctx.db
        .query("facts")
        .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "published"))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("facts")
      .withSearchIndex("search_text", (q) =>
        q.search("searchText", text).eq("status", "published"),
      )
      .take(limit);
  },
});

export const get = query({
  args: {
    id: v.id("facts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const save = mutation({
  args: saveFactArgs,
  handler: async (ctx, args): Promise<Id<"facts">> => {
    const now = Date.now();
    const fact = buildFact(args, now);

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) {
        throw new Error("Faktaposten finns inte.");
      }

      await ctx.db.patch(args.id, {
        ...fact,
        publishedAt:
          args.status === "published"
            ? existing.publishedAt ?? now
            : existing.publishedAt,
      });
      return args.id;
    }

    return await ctx.db.insert("facts", {
      ...fact,
      createdAt: now,
    });
  },
});

export const bulkUpsert = mutation({
  args: {
    facts: v.array(v.object(importFactArgs)),
  },
  handler: async (ctx, args) => {
    if (args.facts.length > 50) {
      throw new Error("Importera max 50 faktaposter per batch.");
    }

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const item of args.facts) {
      const importKey = clean(item.importKey, 240);
      if (!importKey) {
        throw new Error(`Importnyckel saknas för ${item.title}.`);
      }

      const existing = await ctx.db
        .query("facts")
        .withIndex("by_importKey", (q) => q.eq("importKey", importKey))
        .take(2);

      if (existing.length > 1) {
        throw new Error(`Flera faktaposter har importnyckel ${importKey}.`);
      }

      const fact = {
        ...buildFact(item, now),
        importKey,
        importedAt: now,
      };

      if (existing[0]) {
        await ctx.db.patch(existing[0]._id, {
          ...fact,
          publishedAt:
            item.status === "published"
              ? existing[0].publishedAt ?? now
              : existing[0].publishedAt,
        });
        updated += 1;
      } else {
        await ctx.db.insert("facts", {
          ...fact,
          createdAt: now,
        });
        inserted += 1;
      }
    }

    return {
      inserted,
      updated,
      total: args.facts.length,
    };
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("facts"),
    status: factStatus,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Faktaposten finns inte.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: now,
      publishedAt:
        args.status === "published"
          ? existing.publishedAt ?? now
          : existing.publishedAt,
    });
  },
});
