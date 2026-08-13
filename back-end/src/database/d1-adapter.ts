import type { Pool, PoolClient, QueryResult } from 'pg'

type RunMeta = { changes: number; last_row_id: null }
type RunResult = { success: true; meta: RunMeta; results: Record<string, unknown>[] }

function postgresSql(sql: string): string {
  let index = 0
  let quote: "'" | '"' | null = null
  let output = ''
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i]
    if (quote) {
      output += char
      if (char === quote) {
        if (sql[i + 1] === quote) output += sql[++i]
        else quote = null
      }
    } else if (char === "'" || char === '"') {
      quote = char
      output += char
    } else if (char === '?') {
      output += `$${++index}`
    } else {
      output += char
    }
  }

  return output
    .replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ')
    .replace(/\s+ON\s+CONFLICT\s+DO\s+NOTHING\s*$/i, ' ON CONFLICT DO NOTHING')
    // SQLite's implicit rowid was only used as a deterministic tie-breaker.
    // Every affected application table has a text primary key named `id`.
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*\.)?rowid\b/gi, (_match, alias = '') => `${alias}id`)
}

class PreparedStatement {
  private values: unknown[] = []

  constructor(
    private readonly queryable: Pool | PoolClient,
    private readonly sourceSql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  executeWith(queryable: Pool | PoolClient): Promise<QueryResult<Record<string, unknown>>> {
    let sql = postgresSql(this.sourceSql)
    if (/^\s*INSERT\s+OR\s+IGNORE\s+/i.test(this.sourceSql) && !/ON\s+CONFLICT/i.test(sql)) {
      sql += ' ON CONFLICT DO NOTHING'
    }
    return queryable.query(sql, this.values)
  }

  private execute() { return this.executeWith(this.queryable) }

  async all() {
    const result = await this.execute()
    return { success: true, results: result.rows, meta: { changes: result.rowCount ?? 0 } }
  }

  async first(column?: string) {
    const result = await this.execute()
    const row = result.rows[0]
    if (!row) return null
    return column ? row[column] ?? null : row
  }

  async run(): Promise<RunResult> {
    const result = await this.execute()
    return {
      success: true,
      results: result.rows,
      meta: { changes: result.rowCount ?? 0, last_row_id: null },
    }
  }
}

export class PostgresD1Adapter {
  constructor(private readonly pool: Pool) {}

  prepare(sql: string) {
    return new PreparedStatement(this.pool, sql)
  }

  async exec(sql: string) {
    await this.pool.query(postgresSql(sql))
    return { count: 1, duration: 0 }
  }

  async batch(statements: PreparedStatement[]) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const results = []
      for (const statement of statements) {
        const result = await statement.executeWith(client)
        results.push({
          success: true,
          results: result.rows,
          meta: { changes: result.rowCount ?? 0, last_row_id: null },
        })
      }
      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
