import { PROVINCES } from '../seed.js'

const ADDRESS_KIT_PROVINCES_URL = 'https://production.cas.so/address-kit/2025-07-01/provinces'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type AddressKitProvince = {
  code?: unknown
  name?: unknown
  administrativeLevel?: unknown
}

let cachedProvinces: string[] | null = null
let cacheExpiresAt = 0

const PROVINCE_ALIASES: Record<string, string[]> = {
  'Tỉnh Tuyên Quang': ['Hà Giang'],
  'Tỉnh Lào Cai': ['Yên Bái'],
  'Tỉnh Thái Nguyên': ['Bắc Kạn'],
  'Tỉnh Phú Thọ': ['Vĩnh Phúc', 'Hòa Bình'],
  'Tỉnh Bắc Ninh': ['Bắc Giang'],
  'Thành phố Hải Phòng': ['Hải Dương'],
  'Tỉnh Hưng Yên': ['Thái Bình'],
  'Tỉnh Ninh Bình': ['Nam Định', 'Hà Nam'],
  'Tỉnh Quảng Trị': ['Quảng Bình'],
  'Thành phố Huế': ['Huế', 'Thừa Thiên Huế'],
  'Thành phố Đà Nẵng': ['Đà Nẵng', 'Quảng Nam'],
  'Tỉnh Quảng Ngãi': ['Kon Tum'],
  'Tỉnh Gia Lai': ['Bình Định'],
  'Tỉnh Khánh Hòa': ['Ninh Thuận'],
  'Tỉnh Đắk Lắk': ['Phú Yên'],
  'Tỉnh Lâm Đồng': ['Đắk Nông', 'Bình Thuận'],
  'Tỉnh Đồng Nai': ['Bình Phước'],
  'Thành phố Hồ Chí Minh': ['Hồ Chí Minh', 'TP.HCM', 'TP. Hồ Chí Minh', 'Bình Dương', 'Bà Rịa - Vũng Tàu', 'Bà Rịa – Vũng Tàu'],
  'Tỉnh Tây Ninh': ['Long An'],
  'Tỉnh Đồng Tháp': ['Tiền Giang'],
  'Tỉnh Vĩnh Long': ['Bến Tre', 'Trà Vinh'],
  'Tỉnh An Giang': ['Kiên Giang'],
  'Thành phố Cần Thơ': ['Cần Thơ', 'Sóc Trăng', 'Hậu Giang'],
  'Tỉnh Cà Mau': ['Bạc Liêu'],
}

export function provinceFilterAliases(value: string): string[] {
  const officialName = String(value || '').trim()
  if (!officialName) return []
  const shortName = officialName.replace(/^(Tỉnh|Thành phố)\s+/u, '')
  return [...new Set([officialName, shortName, ...(PROVINCE_ALIASES[officialName] || [])])]
}

export function canonicalProvinceName(value: string, officialProvinces: string[] = PROVINCES): string | null {
  const storedName = String(value || '').trim()
  if (!storedName) return null
  return officialProvinces.find(officialName => provinceFilterAliases(officialName).includes(storedName)) || null
}

export async function getAddressKitProvinces(): Promise<string[]> {
  if (cachedProvinces && Date.now() < cacheExpiresAt) return cachedProvinces

  try {
    const response = await fetch(ADDRESS_KIT_PROVINCES_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`Address Kit returned ${response.status}`)

    const payload = await response.json() as { provinces?: AddressKitProvince[] }
    const provinces = (payload.provinces || [])
      .map(item => String(item.name || '').trim())
      .filter(Boolean)

    if (provinces.length < 34) throw new Error('Address Kit returned an incomplete province list')
    cachedProvinces = [...new Set(provinces)]
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return cachedProvinces
  } catch (_) {
    return [...PROVINCES]
  }
}
