<!-- Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 -->
# Design — KOC Việt

Hệ thống thiết kế được khóa theo frontend chuẩn tại
`C:\Users\ADMIN\Documents\nexrall-koc-viet`. Các lần chỉnh UI sau phải giữ
nguyên ngôn ngữ hình ảnh, icon và nhịp bố cục này.

## Genre

Editorial utilitarian: giấy ấm, chữ navy/ink, coral làm điểm nhấn, thông tin dày
nhưng rõ tầng bậc.

## Macrostructure family

- Marketing: landing nhiều section, hero lệch trái, media/video thật và CTA rõ.
- App: Workbench với sidebar cố định, topbar và vùng nội dung theo tác vụ.
- Content: Long Document với card, bảng và form theo luồng nghiệp vụ.

## Theme

- `--color-paper`: `oklch(98% 0.008 40)`
- `--color-paper-2`: `oklch(95.5% 0.012 40)`
- `--color-ink`: `oklch(22% 0.015 40)`
- `--color-ink-2`: `oklch(42% 0.012 40)`
- `--color-rule`: `oklch(82% 0.01 40)`
- `--color-accent`: `oklch(62% 0.19 35)`
- `--color-focus`: `oklch(58% 0.22 35)`

## Typography

- Display: Lora, weight 400–700, normal.
- Body: Be Vietnam Pro, weight 400–800.
- Display tracking: theo stylesheet chuẩn; không dùng italic cho heading.
- Type scale anchor: `--text-display: clamp(2.75rem, 5vw + 1rem, 5.25rem)`.

## Spacing

Thang khoảng cách có tên từ `--space-3xs` đến `--space-4xl` trong
`front-end/tokens.css`. UI mới phải tái sử dụng token hiện hữu.

## Motion

- Easing: `--ease-out`, `--ease-in`, `--ease-in-out`.
- Chỉ animate transform/opacity; reduced motion tối đa 150 ms.
- Dùng các primitive trong `front-end/src/animations.js`.

## Microinteractions stance

- Phản hồi thành công ngắn gọn, không dùng hiệu ứng ăn mừng.
- Focus ring luôn nhìn thấy; trạng thái loading/disabled không làm dịch layout.
- Hành vi portal và landing lấy từ frontend chuẩn, không tự phát minh lại.

## CTA voice

- Primary: nút coral/navy theo class chuẩn (`btn primary`, `btn grad`).
- Secondary: `btn ghost` hoặc text link; copy hành động trực tiếp.

## Per-page allowances

- Marketing được dùng video thật trong `front-end/public/videos`.
- Portal không thêm hình trang trí; chức năng là trọng tâm.
- Content dùng typography, card, table và form chuẩn.

## What pages MUST share

- Wordmark KOC Việt và favicon Cloudinary chuẩn.
- Bộ icon ảnh trong `front-end/src/icons.js`; không thay bằng emoji hoặc SVG khác.
- Bảng màu, font, CTA, radius và nhịp section trong `front-end/tokens.css`.

## What pages MAY differ on

- Bố cục chi tiết theo vai trò KOC, doanh nghiệp và admin.
- Video/media theo nội dung của từng landing.

## Exports

### tokens.css

Nguồn chuẩn: `front-end/tokens.css`.

```css
:root {
  --color-paper: oklch(98% 0.008 40);
  --color-paper-2: oklch(95.5% 0.012 40);
  --color-paper-3: oklch(93% 0.015 40);
  --color-ink: oklch(22% 0.015 40);
  --color-ink-2: oklch(42% 0.012 40);
  --color-rule: oklch(82% 0.01 40);
  --color-accent: oklch(62% 0.19 35);
  --color-accent-ink: oklch(96% 0.02 35);
  --color-focus: oklch(58% 0.22 35);
  --font-display: "Lora", ui-serif, serif;
  --font-body: "Be Vietnam Pro", ui-sans-serif, sans-serif;
  --space-md: 1rem;
  --text-md: 1.125rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-card: 0.25rem;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98% 0.008 40);
  --color-ink: oklch(22% 0.015 40);
  --color-accent: oklch(62% 0.19 35);
  --font-display: "Lora", ui-serif, serif;
  --font-body: "Be Vietnam Pro", ui-sans-serif, sans-serif;
  --spacing-md: 1rem;
  --text-md: 1.125rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98% 0.008 40)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.015 40)", "$type": "color" },
    "accent": { "$value": "oklch(62% 0.19 35)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Lora, ui-serif, serif", "$type": "fontFamily" },
    "body": { "$value": "Be Vietnam Pro, ui-sans-serif, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98% 0.008 40;
  --foreground: 22% 0.015 40;
  --card: 95.5% 0.012 40;
  --card-foreground: 22% 0.015 40;
  --primary: 62% 0.19 35;
  --primary-foreground: 96% 0.02 35;
  --muted: 82% 0.01 40;
  --muted-foreground: 42% 0.012 40;
  --border: 82% 0.01 40;
  --input: 82% 0.01 40;
  --ring: 58% 0.22 35;
  --radius: 0.25rem;
}
```
