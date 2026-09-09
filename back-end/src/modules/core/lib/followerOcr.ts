// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
const MAX_OCR_TEXT_LENGTH = 20_000;

const OCR_FAILURE_MESSAGES = {
  ownershipCode: 'không nhận ra đúng mã xác minh',
  followerCount: 'số người theo dõi trong ảnh không khớp với số đã nhập',
};

export function followerOcrFailureMessage(failedChecks) {
  const details = [...new Set(Array.isArray(failedChecks) ? failedChecks : [])]
    .map((check) => OCR_FAILURE_MESSAGES[check])
    .filter(Boolean);

  if (!details.length) {
    return 'Không thể xác minh ảnh. Vui lòng kiểm tra ảnh và thử lại.';
  }

  return `Ảnh chưa đạt: ${details.join('; ')}. Hãy chụp rõ đúng các mục trên rồi thử lại.`;
}

function foldText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function compactAlphaNumeric(value) {
  return foldText(value).replace(/[^\p{L}\p{N}]/gu, '');
}

function ownershipCodeVisible(text, expectedCode) {
  const compactText = compactAlphaNumeric(text).toUpperCase();
  const expected = compactAlphaNumeric(expectedCode).toUpperCase();
  if (compactText.includes(expected)) return true;

  const expectedSuffix = expected.replace(/^KOCV/, '');
  const candidates = compactText.match(/K[O0]CV[A-Z0-9]{6}/g) || [];
  return candidates.some((candidate) => {
    const suffix = candidate
      .slice(4)
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1')
      .replace(/S/g, '5');
    return suffix === expectedSuffix;
  });
}

function followerCandidates(text) {
  const folded = foldText(text);
  const candidates = [];
  const suffixPattern =
    /(?:^|[^\p{L}\p{N}])(\d+(?:[.,]\d{1,2})?)\s*(k|m|b|n|tr|nghin|trieu|ty)(?=$|[^\p{L}\p{N}])/gu;
  const multipliers = {
    k: 1_000,
    n: 1_000,
    nghin: 1_000,
    m: 1_000_000,
    tr: 1_000_000,
    trieu: 1_000_000,
    b: 1_000_000_000,
    ty: 1_000_000_000,
  };

  for (const match of folded.matchAll(suffixPattern)) {
    const value = Number(match[1].replace(',', '.'));
    const multiplier = multipliers[match[2]];
    if (Number.isFinite(value)) {
      candidates.push({
        value: Math.round(value * multiplier),
        tolerance: Math.max(1, multiplier * 0.051),
      });
    }
  }

  const integerPattern =
    /(?:^|[^\p{L}\p{N}])(\d{1,3}(?:[.,\s]\d{3})+|\d+)(?=$|[^\p{L}\p{N}])/gu;
  for (const match of folded.matchAll(integerPattern)) {
    const digits = match[1].replace(/\D/g, '');
    const value = Number(digits);
    if (Number.isSafeInteger(value)) {
      candidates.push({ value, tolerance: 0 });
    }
  }
  return candidates;
}

function followerCountVisible(text, claimedFollowers) {
  return followerCandidates(text).some(
    ({ value, tolerance }) =>
      Math.abs(value - claimedFollowers) <= tolerance,
  );
}

export function analyzeFollowerOcrEvidence({
  ocrText,
  ocrConfidence,
  ownershipCode,
  claimedFollowers,
}) {
  const text = String(ocrText || '').trim();
  const confidencePercent = Number(ocrConfidence);
  const confidence =
    Number.isFinite(confidencePercent) && confidencePercent >= 0
      ? Math.min(confidencePercent, 100) / 100
      : 0;
  const textValid =
    text.length >= 10 && text.length <= MAX_OCR_TEXT_LENGTH;
  const checks = {
    ownershipCode: textValid && ownershipCodeVisible(text, ownershipCode),
    followerCount:
      textValid && followerCountVisible(text, claimedFollowers),
  };

  return {
    checks,
    confidence,
    failedChecks: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name),
  };
}
