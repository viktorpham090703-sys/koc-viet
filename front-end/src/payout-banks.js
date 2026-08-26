import { esc } from "./ui.js";

// VietQR's public bank catalogue is the source of truth for these logo assets.
// Keep BIN values internal: they resolve the correct brand and remain available
// for payout requests, but are never rendered as customer-facing copy.
const BANK_LOGO_URL_BY_BIN = Object.freeze({
  "422589": "https://cdn.vietqr.io/img/CIMB.png",
  "546034": "https://cdn.vietqr.io/img/CAKE.png",
  "546035": "https://cdn.vietqr.io/img/UBANK.png",
  "668888": "https://cdn.vietqr.io/img/KBANK.png",
  "963388": "https://vietqr.net/portal-service/resources/icons/TIMO.png",
  "970400": "https://cdn.vietqr.io/img/SGICB.png",
  "970403": "https://cdn.vietqr.io/img/STB.png",
  "970405": "https://cdn.vietqr.io/img/VBA.png",
  "970407": "https://cdn.vietqr.io/img/TCB.png",
  "970409": "https://cdn.vietqr.io/img/BAB.png",
  "970412": "https://cdn.vietqr.io/img/PVCB.png",
  "970414": "https://cdn.vietqr.io/img/MBV.png",
  "970415": "https://cdn.vietqr.io/img/ICB.png",
  "970416": "https://cdn.vietqr.io/img/ACB.png",
  "970418": "https://cdn.vietqr.io/img/BIDV.png",
  "970419": "https://cdn.vietqr.io/img/NCB.png",
  "970422": "https://cdn.vietqr.io/img/MB.png",
  "970423": "https://cdn.vietqr.io/img/TPB.png",
  "970424": "https://cdn.vietqr.io/img/SHBVN.png",
  "970425": "https://cdn.vietqr.io/img/ABB.png",
  "970426": "https://cdn.vietqr.io/img/MSB.png",
  "970427": "https://cdn.vietqr.io/img/VAB.png",
  "970428": "https://cdn.vietqr.io/img/NAB.png",
  "970429": "https://cdn.vietqr.io/img/SCB.png",
  "970430": "https://cdn.vietqr.io/img/PGB.png",
  "970431": "https://cdn.vietqr.io/img/EIB.png",
  "970432": "https://cdn.vietqr.io/img/VPB.png",
  "970433": "https://cdn.vietqr.io/img/VIETBANK.png",
  "970436": "https://cdn.vietqr.io/img/VCB.png",
  "970437": "https://cdn.vietqr.io/img/HDB.png",
  "970438": "https://cdn.vietqr.io/img/BVB.png",
  "970440": "https://cdn.vietqr.io/img/SEAB.png",
  "970441": "https://cdn.vietqr.io/img/VIB.png",
  "970443": "https://cdn.vietqr.io/img/SHB.png",
  "970446": "https://cdn.vietqr.io/img/COOPBANK.png",
  "970448": "https://cdn.vietqr.io/img/OCB.png",
  "970449": "https://cdn.vietqr.io/img/LPB.png",
  "970452": "https://cdn.vietqr.io/img/KLB.png",
  "970457": "https://cdn.vietqr.io/img/WVN.png",
});

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
    name: option?.dataset.bankName
      ? String(option.dataset.bankName).trim()
      : "",
    bin,
  };
}

export function bankIdentityHtml(
  banks,
  selectedName = "",
  selectedBin = "",
  emptyLabel = "Chưa cập nhật",
) {
  const bank = resolvePayoutBank(banks, selectedName, selectedBin);
  const name = String(bank?.name || selectedName || "").trim();
  if (!name) {
    return `<span class="bank-identity bank-identity-empty">${esc(emptyLabel)}</span>`;
  }
  const logoUrl = BANK_LOGO_URL_BY_BIN[String(bank?.bin || selectedBin || "").trim()] || "";
  const logo = logoUrl
    ? `<span class="bank-logo" aria-hidden="true"><img src="${esc(logoUrl)}" alt="" width="72" height="40" loading="lazy" decoding="async"></span>`
    : "";
  return `<span class="bank-identity">${logo}<span class="bank-name">${esc(name)}</span></span>`;
}

export function bankPickerHtml(
  id,
  banks,
  selectedName = "",
  selectedBin = "",
  describedBy = "",
) {
  const list = validBanks(banks);
  const selected = resolvePayoutBank(list, selectedName, selectedBin);
  const listboxId = `${id}-listbox`;
  const triggerId = `${id}-trigger`;
  const description = String(describedBy || "").trim();
  return `<div class="bank-picker" data-bank-picker="${esc(id)}">
    <select id="${esc(id)}" class="bank-native-select" tabindex="-1" aria-hidden="true">${payoutBankOptions(list, selectedName, selectedBin)}</select>
    <button class="bank-picker-trigger" id="${esc(triggerId)}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${esc(listboxId)}"${description ? ` aria-describedby="${esc(description)}"` : ""}>
      <span class="bank-picker-selection" data-bank-selection>${bankIdentityHtml(list, selected?.name || "", selected?.bin || "", "Chọn ngân hàng")}</span>
      <span class="bank-picker-caret" aria-hidden="true"></span>
    </button>
    <div class="bank-picker-panel" data-bank-panel hidden>
      <div class="bank-picker-search"><input type="search" data-bank-search-input autocomplete="off" placeholder="Tìm theo tên ngân hàng…" aria-label="Tìm ngân hàng"></div>
      <div class="bank-picker-options" id="${esc(listboxId)}" role="listbox" aria-label="Danh sách ngân hàng">
        ${list.map(bank => {
          const isSelected = selected && bank.bin === selected.bin;
          return `<button class="bank-picker-option" type="button" role="option" aria-selected="${isSelected ? "true" : "false"}" data-bank-bin="${esc(bank.bin)}" data-bank-search="${esc(normalizedBankName(bank.name))}">${bankIdentityHtml(list, bank.name, bank.bin)}</button>`;
        }).join("")}
        <p class="bank-picker-empty" data-bank-empty hidden>Không tìm thấy ngân hàng phù hợp.</p>
      </div>
    </div>
  </div>`;
}

export function bindBankPicker(picker, banks) {
  if (!picker) return null;
  const select = picker.querySelector(".bank-native-select");
  const trigger = picker.querySelector(".bank-picker-trigger");
  const selection = picker.querySelector("[data-bank-selection]");
  const panel = picker.querySelector("[data-bank-panel]");
  const searchInput = picker.querySelector("[data-bank-search-input]");
  const emptyState = picker.querySelector("[data-bank-empty]");
  const options = [...picker.querySelectorAll(".bank-picker-option")];

  const visibleOptions = () => options.filter(option => !option.hidden);
  const filterOptions = () => {
    const query = normalizedBankName(searchInput?.value || "");
    options.forEach(option => {
      option.hidden = Boolean(query) && !option.dataset.bankSearch.includes(query);
    });
    if (emptyState) emptyState.hidden = visibleOptions().length > 0;
  };
  const syncSelection = () => {
    const bank = selectedPayoutBank(select);
    if (selection) {
      selection.innerHTML = bankIdentityHtml(
        banks,
        bank.name,
        bank.bin,
        "Chọn ngân hàng",
      );
    }
    options.forEach(option => {
      option.setAttribute("aria-selected", option.dataset.bankBin === bank.bin ? "true" : "false");
    });
    return bank;
  };
  const setOpen = open => {
    picker.classList.toggle("is-open", open);
    trigger?.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) panel.hidden = !open;
    if (open) {
      if (searchInput) searchInput.value = "";
      filterOptions();
      requestAnimationFrame(() => searchInput?.focus());
    }
  };

  trigger?.addEventListener("click", () => setOpen(panel?.hidden !== false));
  trigger?.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setOpen(true);
    requestAnimationFrame(() => {
      const items = visibleOptions();
      (event.key === "ArrowUp" ? items.at(-1) : items[0])?.focus();
    });
  });
  searchInput?.addEventListener("input", filterOptions);
  searchInput?.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      visibleOptions()[0]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger?.focus();
    }
  });
  options.forEach(option => {
    option.addEventListener("click", () => {
      select.value = option.dataset.bankBin;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      setOpen(false);
      trigger?.focus();
    });
    option.addEventListener("keydown", event => {
      const items = visibleOptions();
      const index = items.indexOf(option);
      let target = null;
      if (event.key === "ArrowDown") target = items[index + 1] || items[0];
      if (event.key === "ArrowUp") target = items[index - 1] || items.at(-1);
      if (event.key === "Home") target = items[0];
      if (event.key === "End") target = items.at(-1);
      if (target) {
        event.preventDefault();
        target.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger?.focus();
      }
    });
  });
  select?.addEventListener("change", syncSelection);
  picker.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!picker.contains(document.activeElement)) setOpen(false);
    });
  });
  syncSelection();
  return select;
}
