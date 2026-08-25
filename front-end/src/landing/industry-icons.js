const ICON_PATHS = {
  beauty: '<path d="M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z"/><path d="M18.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/><path d="M6 14l.9 2.4 2.4.9-2.4.9L6 20.5l-.9-2.3-2.4-.9 2.4-.9L6 14Z"/>',
  baby: '<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/><path d="M9.5 11.5c.8.8 4.2.8 5 0"/>',
  food: '<path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18M17 3c3 2 3 7 0 9"/>',
  fashion: '<path d="M9 7a3 3 0 1 1 4.7 2.5L21 15H3l7.2-5.4"/><path d="M3 15h18"/>',
  tech: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h4M7 11h7"/>',
  health: '<path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z"/><path d="M9 12h6M12 9v6"/>',
  travel: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  finance: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7l13-4v4M16 13h5"/><circle cx="16" cy="13" r="1"/>',
  education: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23V5.5Z"/>',
  ecommerce: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.5"/>',
  other: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
};

const LABEL_ICON_KEYS = new Map([
  ["Mỹ phẩm & Làm đẹp", "beauty"],
  ["Làm đẹp", "beauty"],
  ["Mẹ & Bé", "baby"],
  ["Ẩm thực & F&B", "food"],
  ["F&B", "food"],
  ["Thực phẩm", "food"],
  ["Thời trang", "fashion"],
  ["Điện tử gia dụng", "tech"],
  ["Điện tử", "tech"],
  ["Công nghệ", "tech"],
  ["Sức khỏe", "health"],
  ["Du lịch địa phương", "travel"],
  ["Du lịch", "travel"],
  ["Tài chính cá nhân", "finance"],
  ["Giáo dục", "education"],
  ["Thương mại điện tử", "ecommerce"],
]);

export const INDUSTRY_ITEMS = [
  { label: "Mẹ & Bé", filterCategory: "Mẹ & Bé", description: "Sản phẩm chất lượng cho mẹ và bé", x: 50, y: 13 },
  { label: "F&B", filterCategory: "Ẩm thực", description: "Tinh hoa ẩm thực, kết nối mọi người", x: 68, y: 25.5 },
  { label: "Thời trang", filterCategory: "Thời trang", description: "Phong cách riêng, dẫn đầu xu hướng", x: 86, y: 38 },
  { label: "Sức khỏe", filterCategory: "Sức khỏe", description: "Sống khỏe mỗi ngày, tương lai bền vững", x: 86, y: 66 },
  { label: "Thương mại điện tử", filterCategory: "Thương mại điện tử", description: "Mua sắm thông minh, tiện lợi và đáng tin cậy", x: 68, y: 78 },
  { label: "Giáo dục", filterCategory: "Giáo dục", description: "Học tập hôm nay, dẫn lối ngày mai", x: 50, y: 90 },
  { label: "Tài chính cá nhân", filterCategory: "Tài chính cá nhân", description: "Quản lý thông minh, tương lai vững vàng", x: 32, y: 78 },
  { label: "Du lịch địa phương", filterCategory: "Du lịch", description: "Khám phá Việt Nam, trải nghiệm khác biệt", x: 14, y: 66 },
  { label: "Điện tử", filterCategory: "Công nghệ", description: "Công nghệ nâng tầm cuộc sống", x: 14, y: 38 },
  { label: "Làm đẹp", filterCategory: "Mỹ phẩm", description: "Tự tin tỏa sáng mỗi ngày", x: 32, y: 25.5 },
];

export const ACTIVITY_CATEGORY_CYCLE = [
  { label: "Ẩm thực & F&B", tone: "green" },
  { label: "Thời trang", tone: "red" },
  { label: "Làm đẹp", tone: "orange" },
  { label: "Mẹ & Bé", tone: "green" },
  { label: "Công nghệ", tone: "blue" },
  { label: "Du lịch", tone: "orange" },
  { label: "Sức khỏe", tone: "green" },
];

export function industryIconSvg(label, className = "") {
  const iconKey = LABEL_ICON_KEYS.get(String(label || "")) || "other";
  const safeClass = String(className).replace(/[^a-zA-Z0-9_-]/g, "");
  return `<svg${safeClass ? ` class="${safeClass}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[iconKey]}</svg>`;
}
