export type Role = 'koc' | 'business' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  koc_id?: string
  business_id?: string
}

export interface AppConfig {
  tiers: Array<{ name: string; min: number; max: number; minF: number; maxF: number; fee: number }>
  categories: string[]
  provinces: string[]
  payoutBanks: Array<{ name: string; bin: string }>
}

export interface Koc {
  id: string; name: string; tier: string; province?: string; avatar?: string
  bio?: string; followers: number; rating: number
  categories: string[]; prices?: Array<{ category: string; price: number; description?: string }>
}

export interface Booking {
  id: string; code: string; category?: string; status: string; price: number
  created_at: number; deadline?: string; kocname?: string; bizname?: string
  booking_type?: string; content_type?: string
}

export type UnknownRecord = Record<string, unknown>
