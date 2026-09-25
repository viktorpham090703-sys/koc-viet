import { esc } from './ui.js';

export function priceDescriptionField(category, description, id) {
  return `<label class="required-label" for="${id}">Giá này bao gồm những gì?</label>
    <textarea id="${id}" data-price-description="${esc(category)}" rows="4" required maxlength="2000" aria-describedby="${id}-hint" placeholder="Ví dụ: Livestream 1 giờ trên TikTok, giới thiệu tối đa 3 sản phẩm.">${esc(description || '')}</textarea>
    <p class="hint" id="${id}-hint">Ghi rõ dịch vụ, đơn vị tính và phạm vi: livestream bao nhiêu giờ; video giới thiệu bao nhiêu video, thời lượng, kênh đăng và số lần chỉnh sửa; sử dụng hình ảnh trên kênh nào, trong bao lâu, có bao gồm chạy quảng cáo không. Tối đa 2.000 ký tự.</p>`;
}
