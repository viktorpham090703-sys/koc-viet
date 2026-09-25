export function validatePriceDescriptions(categories: string[], input: unknown) {
  const descriptions: Record<string, string> = {};
  for (const category of categories) {
    const value = input && typeof input === 'object' && !Array.isArray(input)
      && Object.hasOwn(input, category) ? (input as Record<string, unknown>)[category] : undefined;
    if (typeof value !== 'string' || !value.trim())
      return { error: `Mô tả giá ngành "${category}": ghi rõ dịch vụ, đơn vị tính và phạm vi công việc.` };
    if (value.trim().length > 2000)
      return { error: `Mô tả giá ngành "${category}" tối đa 2.000 ký tự.` };
    descriptions[category] = value.trim();
  }
  return { descriptions };
}
