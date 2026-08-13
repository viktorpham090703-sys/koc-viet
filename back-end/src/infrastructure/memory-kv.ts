type Item = { value: string; expiresAt?: number }

export class MemoryKv {
  private readonly values = new Map<string, Item>()

  async get(key: string) {
    const item = this.values.get(key)
    if (!item) return null
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.values.delete(key)
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
  }

  async delete(key: string) {
    this.values.delete(key)
  }
}
