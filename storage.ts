import { products, type Product, type InsertProduct, type PaginatedProducts, type ProductFilter } from "@shared/schema";
import { db } from "./db";
import { eq, gt, lt, and, desc, asc, gte, lte, like, or } from "drizzle-orm";

export interface IStorage {
  getProducts(params: {
    limit: number;
    cursor?: string;
    filters?: ProductFilter;
  }): Promise<PaginatedProducts>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
}

export class DatabaseStorage implements IStorage {
  async getProducts({ limit, cursor, filters }: {
    limit: number;
    cursor?: string;
    filters?: ProductFilter;
  }): Promise<PaginatedProducts> {
    const conditions = [];

    // Apply Filters
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }

    // Apply Cursor Pagination (CreatedAt Descending)
    // Cursor is base64(createdAt timestamp)
    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64').toString('ascii'));
      conditions.push(lt(products.createdAt, cursorDate));
    }

    const items = await db.select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt)) // Latest first
      .limit(limit + 1); // Fetch one extra to check if there is a next page

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop(); // Remove the extra item
      if (nextItem) {
        nextCursor = Buffer.from(nextItem.createdAt.toISOString()).toString('base64');
      }
    } else if (items.length > 0 && items.length === limit) {
        // Simple optimization: if we got exactly limit, next page might exist. 
        // Ideally we use the last item as cursor. 
        // But strictly checking limit+1 is better.
        // For this simple implementation, if we fetched full page, we give cursor. 
        // But logic above handles limit+1 correctly.
        
        // Wait, logic above pop() reduces items to limit. 
        // Correct.
        
        // Wait, if items.length === limit (and we didn't get +1), we don't know if there is more.
        // But we asked for limit + 1. So if items.length <= limit, there is no more.
    }

    return { items, nextCursor };
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
}

export const storage = new DatabaseStorage();
