import { esc } from "./ui.js";

function normalizedBankName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function validBanks(banks) {
  return (Array.isArray(banks) ? banks : []).filter(
    bank => bank && bank.name && /^\d{6}$/.test(String(bank.bin || "")),
  );
}

export function resolvePayoutBank(banks, selectedName = "", selectedBin = "") {
  const list = validBanks(banks);
  const normalizedName = normalizedBankName(selectedName);
  const byName = normalizedName
    ? list.find(bank => normalizedBankName(bank.name) === normalizedName)
    : null;
  const byBin = list.find(bank => bank.bin === String(selectedBin || "").trim());
  return byName || byBin || (selectedName || selectedBin
    ? { name: String(selectedName || "Ngân hàng hiện tại").trim(), bin: String(selectedBin || "").trim(), legacy: true }
    : null);
}

export function payoutBankOptions(banks, selectedName = "", selectedBin = "") {
  const list = validBanks(banks);
  const selected = resolvePayoutBank(list, selectedName, selectedBin);
  const options = selected?.legacy ? [selected, ...list] : list;
  return `<option value="">Chọn ngân hàng</option>${options.map(bank => {
    const isSelected = selected && bank.bin === selected.bin && bank.name === selected.name;
    const label = bank.legacy ? `${bank.name} (hồ sơ hiện tại)` : bank.name;
    return `<option value="${esc(bank.bin)}" data-bank-name="${esc(bank.name)}" ${isSelected ? "selected" : ""}>${esc(label)}</option>`;
  }).join("")}`;
}

export function selectedPayoutBank(select) {
  const option = select?.selectedOptions?.[0];
  const bin = String(select?.value || "").trim();
  return {
    name: bin ? String(option?.dataset.bankName || option?.textContent || "").trim() : "",
    bin,
  };
}

export function syncPayoutBankBin(select, binInput) {
  const bank = selectedPayoutBank(select);
  if (binInput) binInput.value = bank.bin;
  return bank;
}
