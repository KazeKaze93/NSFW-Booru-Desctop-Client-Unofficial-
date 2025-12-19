import { eq, count, desc } from "drizzle-orm";
import { getDatabase } from "../db";
import { posts } from "../db/schema";
import type { Post } from "../db/schema";

export type PostUpdateChanges = {
  rating?: string;
  tags?: string;
  title?: string;
  isViewed?: boolean;
  isFavorited?: boolean;
  fileUrl?: string;
  previewUrl?: string;
  sampleUrl?: string;
};

export class PostsService {
  private get db() {
    return getDatabase();
  }

  async getByArtist(params: {
    artistId: number;
    limit: number;
    offset: number;
  }) {
    return this.db.query.posts.findMany({
      where: eq(posts.artistId, params.artistId),
      orderBy: [desc(posts.postId)],
      limit: params.limit,
      offset: params.offset,
    });
  }

  async getCountByArtist(artistId?: number): Promise<number> {
    try {
      let result;
      if (artistId !== undefined) {
        result = await this.db
          .select({ count: count() })
          .from(posts)
          .where(eq(posts.artistId, artistId));
      } else {
        result = await this.db.select({ count: count() }).from(posts);
      }
      return result[0]?.count ?? 0;
    } catch (error) {
      console.error("Failed to get posts count:", error);
      return 0;
    }
  }

  async getPostById(postId: number): Promise<Post | null> {
    const post = await this.db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });
    return (post as Post | undefined) ?? null;
  }

  /**
   * Unified method for updating post fields.
   * All write operations for posts should use this method.
   */
  async updatePost(
    postId: number,
    changes: PostUpdateChanges
  ): Promise<boolean> {
    const updateData: Partial<typeof posts.$inferInsert> = {};
    if (changes.rating !== undefined) updateData.rating = changes.rating;
    if (changes.tags !== undefined) updateData.tags = changes.tags;
    if (changes.title !== undefined) updateData.title = changes.title;
    if (changes.fileUrl !== undefined) updateData.fileUrl = changes.fileUrl;
    if (changes.previewUrl !== undefined)
      updateData.previewUrl = changes.previewUrl;
    if (changes.sampleUrl !== undefined)
      updateData.sampleUrl = changes.sampleUrl;
    if (changes.isViewed !== undefined) updateData.isViewed = changes.isViewed;
    if (changes.isFavorited !== undefined)
      updateData.isFavorited = changes.isFavorited;

    if (Object.keys(updateData).length === 0) {
      return false;
    }

    const result = await this.db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, postId))
      .run();

    return result.changes > 0;
  }

  async markAsViewed(postId: number) {
    return this.updatePost(postId, { isViewed: true });
  }

  async toggleFavorite(postId: number): Promise<boolean> {
    const post = await this.getPostById(postId);
    if (!post) {
      throw new Error(`Post with id ${postId} not found`);
    }

    const isCurrentlyFavorited = post.isFavorited ?? false;
    const newValue = !isCurrentlyFavorited;

    console.log(
      `[PostsService] Toggling favorite for ${postId}: ${isCurrentlyFavorited} -> ${newValue}`
    );

    await this.updatePost(postId, { isFavorited: newValue });
    return newValue;
  }

  async togglePostViewed(postId: number): Promise<boolean> {
    const post = await this.getPostById(postId);
    if (!post) {
      throw new Error(`Post with id ${postId} not found`);
    }

    const isCurrentlyViewed = post.isViewed ?? false;
    const newValue = !isCurrentlyViewed;

    await this.updatePost(postId, { isViewed: newValue });
    return newValue;
  }

  async resetPostCache(postId: number): Promise<boolean> {
    return this.updatePost(postId, { isViewed: false });
  }
}
