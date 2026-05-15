import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    const title = clean(args.title, 160);
    const body = clean(args.body, 12_000);

    if (!title) {
      throw new Error("Titel saknas.");
    }

    if (!body) {
      throw new Error("Faktatext saknas.");
    }

    const fact = {
      kind: args.kind,
      status: args.status,
      title,
      category: clean(args.category, 120),
      summary: clean(args.summary, 600),
      body,
      source: clean(args.source, 300),
      searchText: searchText({
        kind: args.kind,
        title,
        category: args.category,
        summary: args.summary,
        body,
        source: args.source,
      }),
      updatedAt: now,
      publishedAt: args.status === "published" ? now : null,
    };

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
