import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KbEmbeddingsPg } from '../common/entity/kbEmbeddings.entity';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { toSql } from 'pgvector/pg';
import { DataStoreType, TopChunksResponse } from './knowledgebase.schema';

/**
 * Service for interacting with the Postgres vector database.
 */
@Injectable()
export class EmbeddingsDbService {
  constructor(
    @InjectRepository(KbEmbeddingsPg)
    private pgVectorRepository: Repository<KbEmbeddingsPg>,
  ) {}

  /**
   * Inserts embeddings data into the PostgreSQL database.
   * @param data - The embeddings data to be inserted.
   * @returns A Promise that resolves to the result of the insertion operation.
   */
  async insertEmbeddingsToPg(data: KbEmbeddingsPg) {
    const res = await this.pgVectorRepository.insert(data);
    return res;
  }

  /**
   * Retrieves the top N chunks for embedding based on the given query embedding, knowledgebase ID, and limit.
   * @param queryEmbedding - The query embedding as an array of numbers.
   * @param kbId - The knowledgebase ID.
   * @param n - The limit for the number of chunks to retrieve.
   * @returns A Promise that resolves to an array of objects containing the _id and similarity of the chunks.
   */
  async getTopNChunksForEmbedding(
    queryEmbedding: number[],
    kbId: ObjectId,
    n: number,
  ): Promise<TopChunksResponse[]> {
    const result = await this.pgVectorRepository
      .createQueryBuilder()
      .select('_id')
      .addSelect(`(1 - (vector(embeddings) <=> :embeddings))`, 'similarity')
      .where('"knowledgebaseId" = :kbId', { kbId: kbId.toHexString() })
      .orderBy('similarity', 'DESC')
      .limit(n)
      .setParameter('embeddings', toSql(queryEmbedding))
      .getRawMany();

    const topChunks: TopChunksResponse[] = result.map((chunk) => ({
      chunkId: { $oid: chunk._id },
      similarity: chunk.similarity,
    }));
    return topChunks;
  }

  /**
   * Updates the embeddings for a specific chunk.
   * @param chunkId - The ID of the chunk to update.
   * @param embeddings - The new embeddings to set for the chunk.
   */
  async updateEmbeddingsForChunkInPg(chunkId: ObjectId, embeddings: number[]) {
    await this.pgVectorRepository.update(
      { _id: chunkId.toHexString() },
      {
        embeddings: toSql(embeddings),
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Deletes embeddings for a knowledge base in the PostgreSQL database.
   * @param kbId - The ID of the knowledge base.
   * @param type - The type of data store (optional).
   * @returns A promise that resolves when the embeddings are deleted.
   */
  async deleteEmbeddingsForKbInPg(kbId: ObjectId, type?: DataStoreType) {
    const criteria: { knowledgebaseId: string; type?: DataStoreType } = {
      knowledgebaseId: kbId.toHexString(),
    };
    if (type) {
      criteria.type = type;
    }
    await this.pgVectorRepository.delete(criteria);
  }

  /**
   * Deletes embeddings for a chunk in the PostgreSQL database.
   * @param chunkId - The ID of the chunk to delete embeddings for.
   * @returns A promise that resolves when the embeddings are deleted.
   */
  async deleteEmbeddingsForChunkInPg(chunkId: ObjectId) {
    await this.pgVectorRepository.delete({ _id: chunkId.toHexString() });
  }

  /**
   * Deletes embeddings by their IDs in bulk from the PostgreSQL database.
   * @param ids - An array of ObjectIds representing the IDs of the embeddings to be deleted.
   */
  async deleteEmbeddingsByIdBulkInPg(ids: ObjectId[]) {
    await this.pgVectorRepository.delete(ids.map((id) => id.toHexString()));
  }
}
