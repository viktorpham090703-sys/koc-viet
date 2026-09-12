// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

const WINDOWS_1252_BYTES = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85],
  ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a],
  ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92],
  ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97],
  ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c],
  ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function normalizeEmailText(value) {
  return String(value ?? '').normalize('NFC');
}

// Repair values such as "KOC Viá»‡t" that were decoded as Windows-1252
// before being copied into a deployment environment variable.
function repairUtf8Mojibake(value) {
  const text = normalizeEmailText(value);
  if (!/(?:Ã|Â|â|á[»º])/.test(text)) return text;

  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (WINDOWS_1252_BYTES.has(char)) {
      bytes.push(WINDOWS_1252_BYTES.get(char));
    } else {
      return text;
    }
  }

  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(new Uint8Array(bytes))
      .normalize('NFC');
  } catch {
    return text;
  }
}

function ensureUtf8Html(htmlContent) {
  const html = normalizeEmailText(htmlContent);
  if (/<meta\s+[^>]*charset=/i.test(html)) return html;
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}<meta charset="utf-8">`);
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

function requiredEnv(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Thiếu cấu hình ${name}`);
  return value;
}

function mailConfig(env) {
  const apiKey = requiredEnv(env, 'BREVO_API_KEY');
  const senderEmail = requiredEnv(env, 'EMAIL_FROM_ADDRESS');
  const senderName = repairUtf8Mojibake(
    String(env.EMAIL_FROM_NAME || 'KOC Việt').trim()
  );
  return { apiKey, senderEmail, senderName };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

export async function sendTransactionalEmail(env, {
  to,
  subject,
  htmlContent,
  textContent,
  tags = [],
}) {
  const { apiKey, senderEmail, senderName } = mailConfig(env);
  const recipient = String(to || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Địa chỉ email người nhận không hợp lệ');
  }

  let response;
  try {
    response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json; charset=utf-8',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipient }],
        subject: normalizeEmailText(subject),
        htmlContent: ensureUtf8Html(htmlContent),
        textContent: normalizeEmailText(textContent),
        tags,
      }),
    });
  } catch (error) {
    const reason = error?.name === 'TimeoutError'
      ? 'Brevo không phản hồi sau 10 giây'
      : error?.message || 'lỗi kết nối';
    throw new Error(`Không kết nối được Brevo: ${reason}`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = result.message || result.code || `HTTP ${response.status}`;
    throw new Error(`Brevo từ chối email: ${reason}`);
  }

  return { messageId: result.messageId || null };
}

export async function sendOtpEmail(env, _request, to, code) {
  const subject = 'Xác thực địa chỉ email | KOC Việt';
  const safeCode = escapeHtml(code);
  const htmlContent = `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#18231f">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Mã xác thực email KOC Việt của bạn có hiệu lực trong 5 phút.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f7f5">
          <tr>
            <td align="center" style="padding:24px 12px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e3eae6;border-radius:14px">
                <tr>
                  <td style="padding:34px 36px 32px">
                    <div style="margin:0 0 18px;color:#087a58;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase">
                      KOC VIỆT
                    </div>
                    <h1 style="margin:0 0 18px;color:#18231f;font-size:25px;line-height:1.3;font-weight:700">
                      Xác thực địa chỉ email
                    </h1>
                    <p style="margin:0 0 22px;color:#33413b;font-size:15px;line-height:1.65">
                      Nhập mã dưới đây để xác thực địa chỉ email của bạn:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
                      <tr>
                        <td align="center" style="padding:21px 12px;background:#f1f5f3;border:1px solid #d5dfda;border-radius:7px;color:#18231f;font-size:31px;line-height:1;font-weight:700;letter-spacing:10px">
                          ${safeCode}
                        </td>
                      </tr>
                    </table>
                    <p style="margin:22px 0 0;color:#33413b;font-size:14px;line-height:1.65">
                      Mã có hiệu lực trong <strong>5 phút</strong> và chỉ sử dụng được một lần.
                    </p>
                    <p style="margin:16px 0 0;color:#7a8781;font-size:12px;line-height:1.6">
                      Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã với bất kỳ ai.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;color:#8a9690;font-size:11px;line-height:1.5">
                Email tự động từ KOC Việt. Vui lòng không trả lời email này.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  const textContent = [
    'KOC VIỆT',
    '',
    'Xác thực địa chỉ email',
    '',
    'Nhập mã dưới đây để xác thực địa chỉ email của bạn:',
    code,
    '',
    'Mã có hiệu lực trong 5 phút và chỉ sử dụng được một lần.',
    'Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã với bất kỳ ai.',
  ].join('\n');
  return sendTransactionalEmail(env, {
    to, subject, htmlContent, textContent, tags: ['otp'],
  });
}

export async function sendAccountReviewEmail(env, to, account) {
  const approved = account.status === 'active';
  const roleLabel = account.role === 'business' ? 'doanh nghiệp' : 'KOC';
  const subject = approved
    ? `Hồ sơ ${roleLabel} đã được duyệt | KOC Việt`
    : `Kết quả xét duyệt hồ sơ ${roleLabel} | KOC Việt`;
  const heading = approved ? 'Hồ sơ của bạn đã được duyệt' : 'Hồ sơ của bạn chưa được duyệt';
  const message = approved
    ? `Tài khoản ${roleLabel} của bạn đã được kích hoạt. Bạn có thể đăng nhập và sử dụng các tính năng dành cho ${roleLabel} trên KOC Việt.`
    : `Hồ sơ ${roleLabel} của bạn chưa đáp ứng yêu cầu xét duyệt ở thời điểm hiện tại.`;
  const reason = !approved && account.reason
    ? `<div style="margin:18px 0;padding:14px 16px;border-radius:8px;background:#fff4ef;color:#7a2e18"><strong>Lý do:</strong> ${escapeHtml(account.reason)}</div>`
    : '';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.65;color:#172033;max-width:600px">
      <p style="margin:0 0 8px;color:#f45132;font-size:12px;font-weight:700;letter-spacing:.5px">KOC VIỆT</p>
      <h2 style="margin:0 0 14px">${heading}</h2>
      <p>Xin chào ${escapeHtml(account.name || (account.role === 'business' ? 'Quý doanh nghiệp' : 'bạn'))},</p>
      <p>${message}</p>
      ${reason}
      <p style="margin-top:22px;color:#667085;font-size:13px">Đây là email tự động từ KOC Việt. Vui lòng không trả lời email này.</p>
    </div>`;
  const textContent = [
    'KOC VIỆT',
    heading,
    `Xin chào ${account.name || (account.role === 'business' ? 'Quý doanh nghiệp' : 'bạn')},`,
    message,
    !approved && account.reason ? `Lý do: ${account.reason}` : '',
  ].filter(Boolean).join('\n\n');
  return sendTransactionalEmail(env, {
    to,
    subject,
    htmlContent,
    textContent,
    tags: ['account-review', roleLabel, approved ? 'approved' : 'rejected'],
  });
}

export async function sendPartnerAccountCreatedEmail(env, to, account) {
  const subject = 'Tài khoản đối tác KOC Việt đã được tạo';
  const safeName = escapeHtml(account.name || 'Quý đối tác');
  const safeEmail = escapeHtml(account.email || '');
  const safePassword = escapeHtml(account.tempPassword || '');
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.65;color:#172033;max-width:600px">
      <p style="margin:0 0 8px;color:#f45132;font-size:12px;font-weight:700;letter-spacing:.5px">KOC VIỆT</p>
      <h2 style="margin:0 0 14px">Tài khoản đối tác đã được tạo</h2>
      <p>Xin chào ${safeName},</p>
      <p>Admin KOC Việt vừa tạo tài khoản đăng nhập cổng đối tác cho bạn. Thông tin đăng nhập:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:16px 0">
        <tr><td style="padding:10px 14px;background:#f1f5f3;border:1px solid #d5dfda;border-radius:7px 7px 0 0"><b>Email:</b> ${safeEmail}</td></tr>
        <tr><td style="padding:10px 14px;background:#f1f5f3;border:1px solid #d5dfda;border-top:none;border-radius:0 0 7px 7px"><b>Mật khẩu tạm thời:</b> <span style="font-family:monospace;font-size:15px;letter-spacing:1px">${safePassword}</span></td></tr>
      </table>
      <p>Vì lý do bảo mật, bạn sẽ được yêu cầu <strong>đổi mật khẩu ngay trong lần đăng nhập đầu tiên</strong>.</p>
      <p style="margin-top:22px;color:#667085;font-size:13px">Đây là email tự động từ KOC Việt. Vui lòng không chia sẻ mật khẩu này với bất kỳ ai. Nếu bạn không yêu cầu tài khoản này, hãy liên hệ ngay với KOC Việt.</p>
    </div>`;
  const textContent = [
    'KOC VIỆT',
    'Tài khoản đối tác đã được tạo',
    `Xin chào ${account.name || 'Quý đối tác'},`,
    'Admin KOC Việt vừa tạo tài khoản đăng nhập cổng đối tác cho bạn.',
    `Email: ${account.email || ''}`,
    `Mật khẩu tạm thời: ${account.tempPassword || ''}`,
    'Bạn sẽ được yêu cầu đổi mật khẩu ngay trong lần đăng nhập đầu tiên.',
  ].join('\n');
  return sendTransactionalEmail(env, {
    to, subject, htmlContent, textContent, tags: ['partner-account'],
  });
}

export async function sendBookingCreatedEmail(env, to, booking) {
  const typeLabel = {
    review: 'Review',
    advertising: 'Quảng cáo',
    affiliate: 'Affiliate',
    combo: 'Combo',
    aiclone: 'AI Clone Avatar',
  }[booking.type] || 'Booking';
  const actionText = booking.type === 'aiclone'
    ? 'Vui lòng đăng nhập KOC Việt để xem yêu cầu và tiến độ sản xuất AI Clone Avatar.'
    : 'Vui lòng đăng nhập KOC Việt để xem yêu cầu và xác nhận hoặc từ chối booking.';
  const priceLine = Number(booking.price || 0) > 0
    ? `<tr><td style="padding:6px 12px 6px 0;color:#667085">Phí booking</td><td style="padding:6px 0;font-weight:700">${formatMoney(booking.price)}</td></tr>`
    : '';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px">
      <h2 style="margin:0 0 8px">Bạn có booking mới</h2>
      <p>Xin chào ${escapeHtml(booking.kocName || 'KOC')}, một doanh nghiệp vừa gửi booking mới cho bạn.</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Mã booking</td><td style="padding:6px 0;font-weight:700">${escapeHtml(booking.code)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Doanh nghiệp</td><td style="padding:6px 0">${escapeHtml(booking.businessName || 'Đối tác')}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Hình thức</td><td style="padding:6px 0">${escapeHtml(typeLabel)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Ngành hàng</td><td style="padding:6px 0">${escapeHtml(booking.category)}</td></tr>
        ${priceLine}
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Thời hạn</td><td style="padding:6px 0">${escapeHtml(booking.deadline || 'Chưa xác định')}</td></tr>
      </table>
      <p>${actionText}</p>
    </div>`;
  const textContent = [
    'Bạn có booking mới',
    `Mã booking: ${booking.code}`,
    `Doanh nghiệp: ${booking.businessName || 'Đối tác'}`,
    `Hình thức: ${typeLabel}`,
    `Ngành hàng: ${booking.category || ''}`,
    Number(booking.price || 0) > 0 ? `Phí booking: ${formatMoney(booking.price)}` : '',
    `Thời hạn: ${booking.deadline || 'Chưa xác định'}`,
    actionText,
  ].filter(Boolean).join('\n');
  return sendTransactionalEmail(env, {
    to,
    subject: `[KOC Việt] Booking mới ${booking.code}`,
    htmlContent,
    textContent,
    tags: ['booking'],
  });
}

export async function sendPaymentSuccessEmail(env, to, payment) {
  const amount = formatMoney(payment.amount);
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px">
      <h2 style="margin:0 0 8px">Thanh toán thành công</h2>
      <p>Xin chào ${escapeHtml(payment.kocName || 'KOC')}, khoản thu nhập của bạn đã được ghi nhận.</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Giao dịch</td><td style="padding:6px 0;font-weight:700">${escapeHtml(payment.reference || 'Thanh toán KOC')}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Số tiền</td><td style="padding:6px 0;font-size:20px;font-weight:700;color:#079455">${amount}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#667085">Trạng thái</td><td style="padding:6px 0">Đã ghi nhận vào ví KOC Việt</td></tr>
      </table>
      <p>${escapeHtml(payment.note || 'Bạn có thể kiểm tra chi tiết trong mục Ví.')}</p>
    </div>`;
  const textContent = [
    'Thanh toán thành công',
    `Giao dịch: ${payment.reference || 'Thanh toán KOC'}`,
    `Số tiền: ${amount}`,
    'Trạng thái: Đã ghi nhận vào ví KOC Việt',
    payment.note || 'Bạn có thể kiểm tra chi tiết trong mục Ví.',
  ].join('\n');
  return sendTransactionalEmail(env, {
    to,
    subject: `[KOC Việt] Thanh toán thành công · ${payment.reference || amount}`,
    htmlContent,
    textContent,
    tags: ['payment'],
  });
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
