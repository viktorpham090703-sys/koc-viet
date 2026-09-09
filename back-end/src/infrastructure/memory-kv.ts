import fs from 'node:fs'
import path from 'node:path'

type Item = { value: string; expiresAt?: number }

export class MemoryKv {
  private readonly values = new Map<string, Item>()
  private readonly storagePath: string | null = null

  constructor(storagePath?: string) {
    this.storagePath = storagePath || null
    if (this.storagePath) {
      try {
        if (fs.existsSync(this.storagePath)) {
          const raw = fs.readFileSync(this.storagePath, 'utf8')
          const parsed = JSON.parse(raw) as Record<string, Item>
          for (const [k, v] of Object.entries(parsed)) {
            if (!v.expiresAt || v.expiresAt > Date.now()) {
              this.values.set(k, v)
            }
          }
        }
      } catch (_) {}
    }
  }

  private persist() {
    if (!this.storagePath) return
    try {
      const obj: Record<string, Item> = {}
      for (const [k, v] of this.values.entries()) {
        if (!v.expiresAt || v.expiresAt > Date.now()) {
          obj[k] = v
        }
      }
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true })
      fs.writeFileSync(this.storagePath, JSON.stringify(obj), 'utf8')
    } catch (_) {}
  }

  async get(key: string) {
    const item = this.values.get(key)
    if (!item) return null
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.values.delete(key)
      this.persist()
      return null
    }
    return item.value
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    this.values.set(key, {
      value,
      expiresAt: options?.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : undefined,
    })
    this.persist()
  }

  async delete(key: string) {
    this.values.delete(key)
    this.persist()
  }
}
