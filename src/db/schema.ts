import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// workspace table
export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

// secret table
export const secret = pgTable("secret", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
}, (table) => ({
  uniqueWorkspaceValue: { columns: [table.workspaceId, table.value], type: "unique" },
}));

// write_key table
export const writeKey = pgTable("write_key", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  secretId: uuid("secret_id").notNull().references(() => secret.id, { onDelete: "cascade" }),
}, (table) => ({
  uniqueWorkspaceSecret: { columns: [table.workspaceId, table.secretId], type: "unique" },
}));

// segments table
export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  definition: jsonb("definition").notNull(), // e.g., {"event": "Made Purchase", "count": ">1"}
  status: text("status").default("Running").notNull(), // 'NotStarted', 'Running', 'Paused'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  uniqueWorkspaceName: { columns: [table.workspaceId, table.name], type: "unique" },
}));

// segment_assignments table
export const segmentAssignments = pgTable("segment_assignments", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  segmentId: uuid("segment_id").notNull().references(() => segments.id, { onDelete: "cascade" }),
  inSegment: boolean("in_segment").notNull(),
}, (table) => ({
  uniqueKey: { columns: [table.workspaceId, table.userId, table.segmentId], type: "unique" },
}));

// journeys table
export const journeys = pgTable("journeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").default("NotStarted").notNull(), // 'NotStarted', 'Running', 'Paused'
  definition: jsonb("definition"), // e.g., {"steps": [{"type": "email", "trigger": "Made Purchase"}]}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  uniqueWorkspaceName: { columns: [table.workspaceId, table.name], type: "unique" },
}));

// Relations (optional, for future querying)
export const workspaceRelations = relations(workspace, ({ many }) => ({
  secrets: many(secret),
  writeKeys: many(writeKey),
  segments: many(segments),
  segmentAssignments: many(segmentAssignments),
  journeys: many(journeys),
}));

export const secretRelations = relations(secret, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [secret.workspaceId],
    references: [workspace.id],
  }),
  writeKeys: many(writeKey),
}));

export const writeKeyRelations = relations(writeKey, ({ one }) => ({
  workspace: one(workspace, {
    fields: [writeKey.workspaceId],
    references: [workspace.id],
  }),
  secret: one(secret, {
    fields: [writeKey.secretId],
    references: [secret.id],
  }),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [segments.workspaceId],
    references: [workspace.id],
  }),
  segmentAssignments: many(segmentAssignments),
}));

export const segmentAssignmentsRelations = relations(segmentAssignments, ({ one }) => ({
  workspace: one(workspace, {
    fields: [segmentAssignments.workspaceId],
    references: [workspace.id],
  }),
  segment: one(segments, {
    fields: [segmentAssignments.segmentId],
    references: [segments.id],
  }),
}));

export const journeysRelations = relations(journeys, ({ one }) => ({
  workspace: one(workspace, {
    fields: [journeys.workspaceId],
    references: [workspace.id],
  }),
}));