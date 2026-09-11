import { now, uid } from '../db.js';
import { payoutBankBinError } from './bankDestination.js';
import { verifyEmailOtp } from './emailOtp.js';
import { transferWalletFunds, walletAccount, walletBalance } from './wallet.js';

export const MIN_PARTNER_WITHDRAW = 10_000;
export class PartnerPayoutError extends Error {}

export async function createPartnerPayout(env: any, me: any, body: any, request: Request) {
  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < MIN_PARTNER_WITHDRAW)
    throw new PartnerPayoutError('Ngưỡng rút tối thiểu 10.000đ, số tiền phải là số nguyên');
  return env.DB.transaction(async (DB: any) => {
    const scoped = { ...env, DB };
    const partner = await DB.prepare('SELECT * FROM partners WHERE id=? FOR UPDATE').bind(me.partner_id).first();
    if (!partner || partner.status !== 'active') throw new PartnerPayoutError('Đối tác chưa được kích hoạt');
    if (!partner.bank_name || !partner.bank_owner || !/^\d{6}$/.test(partner.bank_bin || '') || !/^\d{6,30}$/.test(partner.bank_account || ''))
      throw new PartnerPayoutError('Vui lòng cập nhật đầy đủ ngân hàng nhận tiền trong Hồ sơ trước khi rút');
    const bankError = payoutBankBinError(partner.bank_name, partner.bank_bin);
    if (bankError) throw new PartnerPayoutError(bankError);
    await walletBalance(scoped, 'partner', partner.id, 'revenue');
    const source = walletAccount('partner', partner.id, 'revenue');
    const account = await DB.prepare('SELECT balance FROM wallet_accounts WHERE id=? FOR UPDATE').bind(source.id).first();
    if (amount > Number(account.balance)) throw new PartnerPayoutError('Số dư khả dụng không đủ');
    // Serialize OTP consumption too, including concurrent requests from the same user.
    const email = String(me.email || '').trim().toLowerCase();
    await DB.prepare("SELECT id FROM email_otp WHERE email=? AND purpose='partner_withdraw' AND verified=0 FOR UPDATE").bind(email).all();
    const otp = await verifyEmailOtp(scoped, email, body.otp, 'partner_withdraw', request as any);
    // Return failed verification so attempts are committed rather than rolled back.
    if (!otp.ok) return { error: otp.error || 'OTP không đúng' };
    const id = `PWD${uid()}`;
    const note = `Rút tiền về ${partner.bank_name} (${partner.bank_account})`;
    await DB.prepare(`INSERT INTO partner_payout_tickets
      (id,partner_id,user_id,amount,status,bank_name,bank_bin,bank_account,bank_owner,note,created_at,updated_at)
      VALUES (?,?,?,?,'pending_review',?,?,?,?,?,?,?)`).bind(
      id, partner.id, me.id, amount, partner.bank_name, partner.bank_bin,
      partner.bank_account, partner.bank_owner, note, now(), now(),
    ).run();
    await transferWalletFunds(scoped, {
      idempotencyKey: `partner-hold:${id}`, eventType: 'partner_payout_hold',
      referenceType: 'partner_payout', referenceId: id, note,
      source, destinations: [{ account: walletAccount('partner', partner.id, 'payout_pending'), amount }],
    });
    return { id, amount };
  });
}

export async function resolvePartnerPayout(env: any, id: string, approve: boolean, detail: string) {
  return env.DB.transaction(async (DB: any) => {
    const ticket = await DB.prepare('SELECT * FROM partner_payout_tickets WHERE id=? FOR UPDATE').bind(id).first();
    if (!ticket) throw new PartnerPayoutError('Không tìm thấy yêu cầu rút tiền');
    if (ticket.status !== 'pending_review') throw new PartnerPayoutError('Yêu cầu rút tiền đã được xử lý');
    await DB.prepare('SELECT id FROM partners WHERE id=? FOR UPDATE').bind(ticket.partner_id).first();
    const source = walletAccount('partner', ticket.partner_id, 'payout_pending');
    await DB.prepare('SELECT id FROM wallet_accounts WHERE id=? FOR UPDATE').bind(source.id).first();
    const note = `${ticket.note} [${approve ? 'Đã chuyển khoản' : 'Từ chối'}: ${detail}]`;
    await transferWalletFunds({ ...env, DB }, {
      idempotencyKey: `partner-resolve:${id}`, eventType: approve ? 'partner_payout_paid' : 'partner_payout_rejected',
      referenceType: 'partner_payout', referenceId: id, note, source,
      destinations: [{ account: approve ? walletAccount('system', 'manual', 'cash_clearing') : walletAccount('partner', ticket.partner_id, 'revenue'), amount: Number(ticket.amount) }],
    });
    await DB.prepare('UPDATE partner_payout_tickets SET status=?,note=?,updated_at=? WHERE id=?')
      .bind(approve ? 'settled' : 'rejected', note, now(), id).run();
    return ticket;
  });
}

// Same shape as KOC tickets so filters, pagination and VietQR stay shared.
export const PAYOUT_TICKET_SOURCE = `(
  SELECT wt.id,wt.koc_id,NULL::text partner_id,'koc' owner_type,wt.type,wt.amount,wt.status,wt.note,wt.created_at,
    k.name koc_name,k.email koc_email,k.phone koc_phone,k.avatar koc_avatar,k.bank_name,k.bank_account,k.bank_owner,k.bank_bin
  FROM wallet_tx wt LEFT JOIN kocs k ON k.id=wt.koc_id
  UNION ALL
  SELECT t.id,NULL::text,t.partner_id,'partner','withdraw',t.amount,t.status,t.note,t.created_at,
    p.name,u.email,NULL::text,p.avatar,t.bank_name,t.bank_account,t.bank_owner,t.bank_bin
  FROM partner_payout_tickets t JOIN partners p ON p.id=t.partner_id JOIN users u ON u.id=t.user_id
)`;
