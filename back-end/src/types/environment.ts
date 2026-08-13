import type { PostgresD1Adapter } from '../database/d1-adapter.js'
import type { MemoryKv } from '../infrastructure/memory-kv.js'

export interface ApplicationEnvironment {
  [key: string]: unknown
  DB: PostgresD1Adapter
  KV: MemoryKv
  VIDEO_BUCKET?: ObjectStorage
  STORAGE?: ObjectStorage
}

export interface ObjectStorage {
  get(key: string, options?: unknown): Promise<unknown>
  put(key: string, value: unknown, options?: unknown): Promise<unknown>
  delete(key: string): Promise<void>
  createMultipartUpload?(key: string, options?: unknown): Promise<unknown>
  resumeMultipartUpload?(key: string, uploadId: string): unknown
}
