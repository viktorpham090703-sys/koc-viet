import type { ReactNode } from 'react'

export function Loading() { return <div className="empty"><div className="spin" /></div> }
export function ErrorState({ error }: { error: unknown }) {
  return <div className="empty"><div className="ico">⚠️</div><div>{error instanceof Error ? error.message : 'Có lỗi xảy ra'}</div></div>
}
export function Empty({ children = 'Chưa có dữ liệu' }: { children?: ReactNode }) {
  return <div className="empty"><div className="ico">📋</div><div>{children}</div></div>
}
