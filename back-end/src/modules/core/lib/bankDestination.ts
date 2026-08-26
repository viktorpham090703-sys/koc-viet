// @ts-nocheck -- shared validation and public payout-bank catalogue.
// Keep this catalogue local so payout setup does not depend on a third-party API at runtime.
const BANK_DEFINITIONS: Array<[string, string, string[]]> = [
  ['970425', 'ABBank', ['abb', 'ngan hang an binh']],
  ['970416', 'ACB', ['ngan hang a chau']],
  ['970405', 'Agribank', ['vba', 'ngan hang nong nghiep va phat trien nong thon viet nam']],
  ['970409', 'Bac A Bank', ['baca bank', 'bab']],
  ['970438', 'BaoViet Bank', ['baovietbank', 'bvb']],
  ['970418', 'BIDV', ['ngan hang dau tu va phat trien viet nam']],
  ['546034', 'CAKE by VPBank', ['cake']],
  ['422589', 'CIMB Bank', ['cimb']],
  ['970446', 'Co-opBank', ['coopbank', 'ngan hang hop tac xa viet nam']],
  ['970431', 'Eximbank', ['eib', 'ngan hang xuat nhap khau viet nam']],
  ['970437', 'HDBank', ['hdb']],
  ['668888', 'KBank', ['kasikornbank']],
  ['970452', 'KienlongBank', ['kien long bank', 'klb']],
  ['970449', 'LPBank', ['lpb', 'lienvietpostbank', 'ngan hang loc phat viet nam']],
  ['970422', 'MB Bank', ['mbbank', 'mb', 'ngan hang quan doi']],
  ['970414', 'MBV', ['oceanbank', 'ngan hang hien dai viet nam']],
  ['970426', 'MSB', ['maritimebank', 'ngan hang hang hai viet nam']],
  ['970428', 'Nam A Bank', ['namabank', 'nab']],
  ['970419', 'NCB', ['quoc dan', 'ngan hang quoc dan']],
  ['970448', 'OCB', ['ngan hang phuong dong']],
  ['970430', 'PGBank', ['pg bank', 'xang dau petrolimex']],
  ['970412', 'PVcomBank', ['pvcb', 'ngan hang dai chung viet nam']],
  ['970403', 'Sacombank', ['stb', 'ngan hang sai gon thuong tin']],
  ['970400', 'SaigonBank', ['sgb', 'ngan hang sai gon cong thuong']],
  ['970440', 'SeABank', ['seab', 'ngan hang dong nam a']],
  ['970429', 'SCB', ['ngan hang sai gon']],
  ['970443', 'SHB', ['ngan hang sai gon ha noi']],
  ['970424', 'Shinhan Bank', ['shinhanbank']],
  ['963388', 'Timo by BVBank', ['timo']],
  ['970407', 'Techcombank', ['tcb', 'ngan hang ky thuong viet nam']],
  ['970423', 'TPBank', ['tpb', 'ngan hang tien phong']],
  ['546035', 'Ubank by VPBank', ['ubank']],
  ['970427', 'VietABank', ['viet a bank', 'vab']],
  ['970433', 'VietBank', ['viet bank']],
  ['970415', 'VietinBank', ['vietin bank', 'icb', 'ngan hang cong thuong viet nam']],
  ['970436', 'Vietcombank', ['vcb', 'ngan hang ngoai thuong viet nam']],
  ['970432', 'VPBank', ['vpb', 'ngan hang viet nam thinh vuong']],
  ['970441', 'VIB', ['ngan hang quoc te viet nam']],
  ['970457', 'Woori Bank', ['wooribank']],
];

export const PAYOUT_BANKS: ReadonlyArray<{ name: string; bin: string }> = Object.freeze(
  BANK_DEFINITIONS.map(([bin, name]) => Object.freeze({ name, bin })),
);

function normalizedBankName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\b(ngan hang|thuong mai|tmcp|tnhh|mtv)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const BANK_BIN_BY_NAME = new Map(
  BANK_DEFINITIONS.flatMap(([bin, name, aliases]) =>
    [name, ...aliases].map(alias => [normalizedBankName(alias), bin]),
  ),
);

export function expectedPayoutBankBin(bankName) {
  return BANK_BIN_BY_NAME.get(normalizedBankName(bankName)) || '';
}

export function payoutBankBinError(bankName, bankBin) {
  const expected = expectedPayoutBankBin(bankName);
  if (!expected || expected === String(bankBin || '').trim()) return '';
  return `Thông tin ngân hàng ${String(bankName || '').trim()} không khớp danh mục hiện tại`;
}
