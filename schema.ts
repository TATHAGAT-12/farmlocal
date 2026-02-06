import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // stored in cents
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  categoryIdx: index("category_idx").on(table.category),
}));

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Cursor-based pagination types
export interface PaginatedProducts {
  items: Product[];
  nextCursor?: string; // encoded cursor (e.g. base64 of timestamp)
}

export type ProductFilter = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
};
