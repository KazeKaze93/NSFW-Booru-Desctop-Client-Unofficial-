import { eq, desc, asc, like } from "drizzle-orm";
import { getDatabase } from "../db";
import { artists } from "../db/schema";
import type { Artist, NewArtist } from "../db/schema";

export class ArtistsService {
  private get db() {
    return getDatabase();
  }

  async getAll(sortBy: "name" | "created_at" = "name"): Promise<Artist[]> {
    return this.db.query.artists.findMany({
      orderBy: sortBy === "name" ? asc(artists.name) : desc(artists.createdAt),
    });
  }

  async getById(id: number): Promise<Artist | undefined> {
    return this.db.query.artists.findFirst({
      where: eq(artists.id, id),
    });
  }

  async searchTags(query: string): Promise<Artist[]> {
    return this.db.query.artists.findMany({
      where: like(artists.tag, `%${query}%`),
      limit: 20,
    });
  }

  async getByTag(tag: string): Promise<Artist | undefined> {
    return this.db.query.artists.findFirst({
      where: eq(artists.tag, tag),
    });
  }

  async add(artistData: NewArtist): Promise<Artist> {
    const [created] = await this.db
      .insert(artists)
      .values(artistData)
      .returning();
    return created;
  }

  async update(id: number, changes: Partial<Artist>): Promise<boolean> {
    const result = await this.db
      .update(artists)
      .set(changes)
      .where(eq(artists.id, id));

    return result.changes > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.delete(artists).where(eq(artists.id, id));
    return result.changes > 0;
  }

  async resetNewPostsCount(id: number): Promise<boolean> {
    const result = await this.db
      .update(artists)
      .set({ newPostsCount: 0 })
      .where(eq(artists.id, id));

    return result.changes > 0;
  }
}
