import type { Pool, PoolClient, QueryResult } from 'pg'

type RunMeta = { changes: number; last_row_id: null }
type RunResult = { success: true; meta: RunMeta; results: Record<string, unknown>[] }

export function postgresSql(sql: string): string {
  const tableInfo = sql.match(/^\s*PRAGMA\s+table_info\(\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*\)\s*;?\s*$/i)
  if (tableInfo) {
    return `SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${tableInfo[1]}' ORDER BY ordinal_position`
  }

  const insertOrIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(sql)
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

  output = output
    .replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ')
    // SQLite's implicit rowid was only used as a deterministic tie-breaker.
    // Every affected application table has a text primary key named `id`.
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*\.)?rowid\b/gi, (_match, alias = '') => `${alias}id`)

  if (insertOrIgnore && !/\bON\s+CONFLICT\b/i.test(output)) {
    const hasSemicolon = /;\s*$/.test(output)
    output = output.replace(/;\s*$/, '') + ' ON CONFLICT DO NOTHING' + (hasSemicolon ? ';' : '')
  }

  return output
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
    return queryable.query(postgresSql(this.sourceSql), this.values)
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
  constructor(private readonly pool: Pool | PoolClient, private readonly inTransaction = false) {}

  prepare(sql: string) {
    return new PreparedStatement(this.pool, sql)
  }

  async exec(sql: string) {
    await this.pool.query(postgresSql(sql))
    return { count: 1, duration: 0 }
  }

  async transaction<T>(work: (db: PostgresD1Adapter) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this)
    const client = await (this.pool as Pool).connect()
    try {
      await client.query('BEGIN')
      const result = await work(new PostgresD1Adapter(client, true))
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async batch(statements: PreparedStatement[]) {
    return this.transaction(async (db) => {
      const results = []
      for (const statement of statements) {
        const result = await statement.executeWith(db.pool)
        results.push({
          success: true as const,
          results: result.rows,
          meta: { changes: result.rowCount ?? 0, last_row_id: null },
        })
      }
      return results
    })
  }
}
