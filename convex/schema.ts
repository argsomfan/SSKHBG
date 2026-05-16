import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  facts: defineTable({
    kind: v.union(
      v.literal("diagnosis"),
      v.literal("pm"),
      v.literal("nursing"),
      v.literal("medication"),
      v.literal("card"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    title: v.string(),
    category: v.string(),
    summary: v.string(),
    body: v.string(),
    source: v.string(),
    searchText: v.string(),
    importKey: v.optional(v.string()),
    importedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.union(v.number(), v.null()),
  })
    .index("by_importKey", ["importKey"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_kind_and_updatedAt", ["kind", "updatedAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_status_and_kind_and_updatedAt", ["status", "kind", "updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status"],
    }),
});
