// Costco Helper — shopping trip expense tracker with per-person attribution.

let activeTrip = null;
let pendingPhotoDataUrl = null;
let selectedPeopleIds = new Set();
let attributionMode = "everyone"; // 'everyone' | 'custom' | 'single'
let editingSetupPeople = [];
let expandedItemId = null;
let vatPriceAuto = true;
let editingItemId = null;
let filterPersonId = null;
let summaryTrip = null;

const VAT_RATE = 0.2;

const els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheEls();
  bindEvents();
  registerServiceWorker();

  activeTrip = DB.getActiveTrip();
  if (activeTrip) {
    showShoppingScreen();
  } else {
    showSetupScreen();
  }
}

function cacheEls() {
  els.tripTitle = document.getElementById("tripTitle");
  els.tripSubtitle = document.getElementById("tripSubtitle");
  els.menuBtn = document.getElementById("menuBtn");
  els.menuPanel = document.getElementById("menuPanel");
  els.newTripBtn = document.getElementById("newTripBtn");
  els.historyBtn = document.getElementById("historyBtn");
  els.shareTripBtn = document.getElementById("shareTripBtn");
  els.endTripBtn = document.getElementById("endTripBtn");

  els.setupScreen = document.getElementById("setupScreen");
  els.personNameInput = document.getElementById("personNameInput");
  els.addPersonBtn = document.getElementById("addPersonBtn");
  els.peopleList = document.getElementById("peopleList");
  els.startTripBtn = document.getElementById("startTripBtn");

  els.shoppingScreen = document.getElementById("shoppingScreen");
  els.totalsBar = document.getElementById("totalsBar");
  els.cameraInput = document.getElementById("cameraInput");
  els.manualAddBtn = document.getElementById("manualAddBtn");
  els.itemList = document.getElementById("itemList");
  els.itemListTitle = document.getElementById("itemListTitle");
  els.itemCount = document.getElementById("itemCount");
  els.emptyState = document.getElementById("emptyState");
  els.clearFilterBtn = document.getElementById("clearFilterBtn");

  els.historyScreen = document.getElementById("historyScreen");
  els.backFromHistory = document.getElementById("backFromHistory");
  els.historyList = document.getElementById("historyList");
  els.historyEmpty = document.getElementById("historyEmpty");

  els.itemModal = document.getElementById("itemModal");
  els.itemModalTitle = document.getElementById("itemModalTitle");
  els.closeModalBtn = document.getElementById("closeModalBtn");
  els.itemPhotoPreview = document.getElementById("itemPhotoPreview");
  els.ocrStatus = document.getElementById("ocrStatus");
  els.itemNameInput = document.getElementById("itemNameInput");
  els.itemPriceLabel = document.getElementById("itemPriceLabel");
  els.itemPriceInput = document.getElementById("itemPriceInput");
  els.vatToggle = document.getElementById("vatToggle");
  els.vatPriceRow = document.getElementById("vatPriceRow");
  els.itemVatPriceInput = document.getElementById("itemVatPriceInput");
  els.attributionPeopleList = document.getElementById("attributionPeopleList");
  els.modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
  els.saveItemBtn = document.getElementById("saveItemBtn");

  els.summaryModal = document.getElementById("summaryModal");
  els.closeSummaryBtn = document.getElementById("closeSummaryBtn");
  els.summaryContent = document.getElementById("summaryContent");
  els.shareSummaryBtn = document.getElementById("shareSummaryBtn");
  els.downloadReceiptBtn = document.getElementById("downloadReceiptBtn");
  els.confirmEndTripBtn = document.getElementById("confirmEndTripBtn");
}

function bindEvents() {
  els.menuBtn.addEventListener("click", () => els.menuPanel.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!els.menuPanel.contains(e.target) && e.target !== els.menuBtn) {
      els.menuPanel.classList.add("hidden");
    }
  });

  els.newTripBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    if (activeTrip && !confirm("Start a new trip? Your current trip will stay saved — you can end it from the menu.")) {
      return;
    }
    showSetupScreen();
  });

  els.historyBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    showHistoryScreen();
  });

  els.shareTripBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    if (!activeTrip) return;
    shareTrip(activeTrip);
  });

  els.endTripBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    if (!activeTrip) return;
    openSummaryModal();
  });

  els.backFromHistory.addEventListener("click", () => {
    if (activeTrip) showShoppingScreen();
    else showSetupScreen();
  });

  // Setup screen
  els.addPersonBtn.addEventListener("click", addPersonFromInput);
  els.personNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPersonFromInput();
    }
  });
  els.startTripBtn.addEventListener("click", startTrip);

  // Shopping screen
  els.cameraInput.addEventListener("change", handlePhotoCapture);
  els.manualAddBtn.addEventListener("click", () => openItemModal(null));

  els.clearFilterBtn.addEventListener("click", () => {
    filterPersonId = null;
    renderTotals();
    renderItemList();
  });
  els.closeModalBtn.addEventListener("click", closeItemModal);

  els.modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setAttributionMode(btn.dataset.mode));
  });

  els.vatToggle.addEventListener("change", () => {
    els.vatPriceRow.classList.toggle("hidden", !els.vatToggle.checked);
    els.itemPriceLabel.textContent = els.vatToggle.checked ? "Price shown on tag (excl. VAT)" : "Price";
    if (els.vatToggle.checked) {
      if (vatPriceAuto) recomputeVatPrice();
      setTimeout(() => els.itemVatPriceInput.focus(), 50);
    }
  });

  els.itemPriceInput.addEventListener("input", () => {
    if (els.vatToggle.checked && vatPriceAuto) recomputeVatPrice();
  });

  els.itemVatPriceInput.addEventListener("input", () => {
    vatPriceAuto = false;
  });

  els.saveItemBtn.addEventListener("click", saveItem);

  els.closeSummaryBtn.addEventListener("click", () => els.summaryModal.classList.add("hidden"));
  els.shareSummaryBtn.addEventListener("click", () => shareTrip(summaryTrip));
  els.downloadReceiptBtn.addEventListener("click", () => downloadReceipt(summaryTrip));
  els.confirmEndTripBtn.addEventListener("click", () => {
    if (confirm("End this trip? It will be moved to Past Trips.")) {
      DB.endActiveTrip();
      activeTrip = null;
      els.summaryModal.classList.add("hidden");
      showSetupScreen();
    }
  });
}

// ---------- Screens ----------

function hideAllScreens() {
  els.setupScreen.classList.add("hidden");
  els.shoppingScreen.classList.add("hidden");
  els.historyScreen.classList.add("hidden");
}

function showSetupScreen() {
  hideAllScreens();
  editingSetupPeople = activeTrip ? [...activeTrip.people] : [];
  renderSetupPeopleList();
  els.setupScreen.classList.remove("hidden");
  els.tripTitle.textContent = "🛒 Costco Helper";
  els.tripSubtitle.textContent = "";
}

function showShoppingScreen() {
  activeTrip = DB.getActiveTrip();
  if (!activeTrip) {
    showSetupScreen();
    return;
  }
  hideAllScreens();
  expandedItemId = null;
  filterPersonId = null;
  els.shoppingScreen.classList.remove("hidden");
  els.tripTitle.textContent = "🛒 Shopping Trip";
  els.tripSubtitle.textContent = `${activeTrip.people.length} people · started ${formatTime(activeTrip.createdAt)}`;
  renderTotals();
  renderItemList();
}

function showHistoryScreen() {
  hideAllScreens();
  els.historyScreen.classList.remove("hidden");
  els.tripTitle.textContent = "📜 Past Trips";
  els.tripSubtitle.textContent = "";
  renderHistory();
}

// ---------- Setup screen ----------

function addPersonFromInput() {
  const name = els.personNameInput.value.trim();
  if (!name) return;
  editingSetupPeople.push({ id: DB.uid(), name });
  els.personNameInput.value = "";
  renderSetupPeopleList();
  els.personNameInput.focus();
}

function renderSetupPeopleList() {
  els.peopleList.innerHTML = "";
  editingSetupPeople.forEach((person) => {
    const li = document.createElement("li");
    li.textContent = person.name;
    const removeBtn = document.createElement("button");
    removeBtn.className = "chip-remove";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      editingSetupPeople = editingSetupPeople.filter((p) => p.id !== person.id);
      renderSetupPeopleList();
    });
    li.appendChild(removeBtn);
    els.peopleList.appendChild(li);
  });
  els.startTripBtn.disabled = editingSetupPeople.length === 0;
}

function startTrip() {
  if (editingSetupPeople.length === 0) return;
  activeTrip = DB.createTrip(editingSetupPeople.map((p) => p.name));
  showShoppingScreen();
}

// ---------- Shopping screen: totals & items ----------

function computeTotals(trip) {
  const totals = {};
  trip.people.forEach((p) => (totals[p.id] = 0));
  let grandTotal = 0;

  trip.items.forEach((item) => {
    const price = Number(item.price) || 0;
    grandTotal += price;
    const targets = item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : trip.people.map((p) => p.id);
    const share = price / targets.length;
    targets.forEach((personId) => {
      if (totals[personId] === undefined) totals[personId] = 0;
      totals[personId] += share;
    });
  });

  return { totals, grandTotal };
}

function renderTotals() {
  const { totals, grandTotal } = computeTotals(activeTrip);
  els.totalsBar.innerHTML = "";

  const grandCard = document.createElement("button");
  grandCard.type = "button";
  grandCard.className = "total-card grand";
  if (filterPersonId === null) grandCard.classList.add("selected");
  grandCard.innerHTML = `<div class="name">Trip Total</div><div class="amount">${formatMoney(grandTotal)}</div>`;
  grandCard.addEventListener("click", () => {
    filterPersonId = null;
    renderTotals();
    renderItemList();
  });
  els.totalsBar.appendChild(grandCard);

  activeTrip.people.forEach((person) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "total-card";
    if (filterPersonId === person.id) card.classList.add("selected");
    card.innerHTML = `<div class="name">${escapeHtml(person.name)}</div><div class="amount">${formatMoney(totals[person.id] || 0)}</div>`;
    card.addEventListener("click", () => {
      filterPersonId = filterPersonId === person.id ? null : person.id;
      renderTotals();
      renderItemList();
    });
    els.totalsBar.appendChild(card);
  });
}

function itemTargets(item) {
  return item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : activeTrip.people.map((p) => p.id);
}

function renderItemList() {
  els.itemList.innerHTML = "";

  const filterPerson = filterPersonId ? activeTrip.people.find((p) => p.id === filterPersonId) : null;
  const items = filterPerson ? activeTrip.items.filter((item) => itemTargets(item).includes(filterPerson.id)) : activeTrip.items;

  els.itemListTitle.textContent = filterPerson ? `${filterPerson.name}'s Items` : "Items";
  els.itemCount.textContent = items.length;
  els.clearFilterBtn.classList.toggle("hidden", !filterPerson);

  els.emptyState.classList.toggle("hidden", items.length > 0);
  els.emptyState.textContent = filterPerson
    ? `No items for ${filterPerson.name} yet.`
    : "No items yet. Snap a photo of a price tag to log your first item.";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-card";

    let thumbHtml;
    if (item.photo) {
      thumbHtml = `<img class="item-thumb" src="${item.photo}" alt="" />`;
    } else {
      thumbHtml = `<div class="item-thumb placeholder">🧾</div>`;
    }

    const attributionLabel = describeAttribution(item);
    const vatNote = item.vatIncluded
      ? `<div class="item-price-note">Inc. VAT — tag showed ${formatMoney(item.priceExclVat)}</div>`
      : "";

    li.innerHTML = `
      <div class="item-card-row">
        ${thumbHtml}
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name || "Item")}</div>
          <button type="button" class="item-attribution-btn">${escapeHtml(attributionLabel)}</button>
          ${vatNote}
        </div>
        <div class="item-price">${formatMoney(item.price)}</div>
        <button class="item-edit" aria-label="Edit">✏️</button>
        <button class="item-delete" aria-label="Delete">🗑️</button>
      </div>
    `;

    li.querySelector(".item-edit").addEventListener("click", () => {
      openItemModal(null, item);
    });

    li.querySelector(".item-delete").addEventListener("click", () => {
      if (confirm("Delete this item?")) {
        DB.deleteItem(item.id);
        activeTrip = DB.getActiveTrip();
        renderTotals();
        renderItemList();
      }
    });

    li.querySelector(".item-attribution-btn").addEventListener("click", () => {
      expandedItemId = expandedItemId === item.id ? null : item.id;
      renderItemList();
    });

    if (expandedItemId === item.id) {
      li.appendChild(buildQuickSplitPanel(item));
    }

    els.itemList.appendChild(li);
  });
}

function buildQuickSplitPanel(item) {
  const panel = document.createElement("div");
  panel.className = "quick-split-panel";

  const hint = document.createElement("p");
  hint.className = "quick-split-hint";
  hint.textContent = "Tick who this item is for — updates instantly.";
  panel.appendChild(hint);

  const currentTargets = new Set(
    item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : activeTrip.people.map((p) => p.id)
  );

  activeTrip.people.forEach((person) => {
    const row = document.createElement("label");
    row.className = "quick-split-row";
    const checked = currentTargets.has(person.id);
    if (checked) row.classList.add("checked");

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} />
      <span class="person-name">${escapeHtml(person.name)}</span>
    `;

    row.querySelector("input").addEventListener("change", (e) => {
      const next = new Set(currentTargets);
      if (e.target.checked) {
        next.add(person.id);
      } else {
        next.delete(person.id);
      }
      if (next.size === 0) {
        alert("Keep at least one person ticked.");
        e.target.checked = true;
        return;
      }
      DB.updateItem(item.id, { attributedTo: Array.from(next) });
      activeTrip = DB.getActiveTrip();
      renderTotals();
      renderItemList();
    });

    panel.appendChild(row);
  });

  return panel;
}

function describeAttribution(item) {
  const targets = itemTargets(item);
  if (targets.length === activeTrip.people.length) {
    return "Split: everyone";
  }
  const names = targets
    .map((id) => activeTrip.people.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p.name);
  if (names.length === 1) return `For ${names[0]}`;
  return `Split: ${names.join(", ")}`;
}

// ---------- Photo capture ----------

function handlePhotoCapture(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  resizeImageToDataUrl(file, 500, (thumbDataUrl) => {
    pendingPhotoDataUrl = thumbDataUrl;
    openItemModal(thumbDataUrl);
    els.cameraInput.value = "";
  });
  // A larger, higher-detail version (not stored) purely for reading the digits.
  resizeImageToDataUrl(file, 1000, (ocrDataUrl) => {
    runOcrOnPhoto(ocrDataUrl);
  });
}

function recomputeVatPrice() {
  const base = parseFloat(els.itemPriceInput.value);
  if (isNaN(base) || base < 0) {
    els.itemVatPriceInput.value = "";
    return;
  }
  els.itemVatPriceInput.value = (Math.round(base * (1 + VAT_RATE) * 100) / 100).toFixed(2);
}

function runOcrOnPhoto(dataUrl) {
  if (typeof Tesseract === "undefined") return;

  els.ocrStatus.textContent = "🔎 Reading price from photo…";
  els.ocrStatus.classList.remove("hidden", "ocr-error");

  Tesseract.recognize(dataUrl, "eng")
    .then(({ data }) => {
      // The modal may have been closed, or the price already typed by hand, before this resolves.
      if (els.itemModal.classList.contains("hidden")) return;

      const prices = extractPricesFromText(data.text);

      if (prices.length === 0) {
        els.ocrStatus.textContent = "Couldn't read a price automatically — enter it below.";
        els.ocrStatus.classList.add("ocr-error");
        return;
      }

      if (els.itemPriceInput.value.trim() !== "") return; // user already typed something

      if (prices.length === 1) {
        els.itemPriceInput.value = prices[0].toFixed(2);
        els.ocrStatus.textContent = `Filled in $${prices[0].toFixed(2)} from the photo — please double-check it.`;
      } else {
        // VAT tags show two numbers; the Inc. VAT amount is always the higher one.
        const shown = Math.min(...prices);
        const incVat = Math.max(...prices);
        els.itemPriceInput.value = shown.toFixed(2);
        els.itemVatPriceInput.value = incVat.toFixed(2);
        vatPriceAuto = false; // we read the real Inc. VAT number, don't let auto-calc overwrite it
        if (!els.vatToggle.checked) {
          els.vatToggle.checked = true;
          els.vatToggle.dispatchEvent(new Event("change"));
        }
        els.ocrStatus.textContent = `Found two prices ($${shown.toFixed(2)} and $${incVat.toFixed(2)} Inc. VAT) — please double-check them.`;
      }
    })
    .catch(() => {
      if (els.itemModal.classList.contains("hidden")) return;
      els.ocrStatus.textContent = "Couldn't read a price automatically — enter it below.";
      els.ocrStatus.classList.add("ocr-error");
    });
}

function extractPricesFromText(text) {
  const matches = text.match(/\d{1,4}[.,]\d{2}/g) || [];
  const values = matches
    .map((m) => parseFloat(m.replace(",", ".")))
    .filter((v) => !isNaN(v) && v > 0 && v < 1000);
  return Array.from(new Set(values));
}

function resizeImageToDataUrl(file, maxDim, callback) {
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (e) => {
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---------- Item modal ----------

function openItemModal(photoDataUrl, existingItem) {
  editingItemId = existingItem ? existingItem.id : null;
  pendingPhotoDataUrl = existingItem ? existingItem.photo || null : photoDataUrl || null;

  els.itemModalTitle.textContent = existingItem ? "Edit Item" : "Add Item";
  els.itemNameInput.value = existingItem ? existingItem.name || "" : "";

  const vatIncluded = !!(existingItem && existingItem.vatIncluded);
  els.itemPriceInput.value = existingItem ? (vatIncluded ? existingItem.priceExclVat : existingItem.price).toFixed(2) : "";
  els.itemVatPriceInput.value = existingItem && vatIncluded ? existingItem.price.toFixed(2) : "";
  els.vatToggle.checked = vatIncluded;
  els.vatPriceRow.classList.toggle("hidden", !vatIncluded);
  els.itemPriceLabel.textContent = vatIncluded ? "Price shown on tag (excl. VAT)" : "Price";
  // Auto-recalc VAT going forward only if this item didn't already have a specific real Inc. VAT number to protect.
  vatPriceAuto = !vatIncluded;

  els.ocrStatus.textContent = "";
  els.ocrStatus.classList.add("hidden");

  if (pendingPhotoDataUrl) {
    els.itemPhotoPreview.src = pendingPhotoDataUrl;
    els.itemPhotoPreview.classList.remove("hidden");
  } else {
    els.itemPhotoPreview.classList.add("hidden");
  }

  const targets =
    existingItem && existingItem.attributedTo && existingItem.attributedTo.length > 0
      ? existingItem.attributedTo
      : activeTrip.people.map((p) => p.id);

  if (targets.length === activeTrip.people.length) {
    attributionMode = "everyone";
    selectedPeopleIds = new Set();
  } else if (targets.length === 1) {
    attributionMode = "single";
    selectedPeopleIds = new Set(targets);
  } else {
    attributionMode = "custom";
    selectedPeopleIds = new Set(targets);
  }
  updateModeButtons();
  renderAttributionPeopleList();

  els.saveItemBtn.textContent = existingItem ? "Save Changes" : "Save Item";

  els.itemModal.classList.remove("hidden");
  setTimeout(() => els.itemPriceInput.focus(), 50);
}

function closeItemModal() {
  els.itemModal.classList.add("hidden");
  pendingPhotoDataUrl = null;
  editingItemId = null;
}

function setAttributionMode(mode) {
  attributionMode = mode;
  selectedPeopleIds = new Set();
  updateModeButtons();
  renderAttributionPeopleList();
}

function updateModeButtons() {
  els.modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === attributionMode);
  });
}

function renderAttributionPeopleList() {
  els.attributionPeopleList.innerHTML = "";

  if (attributionMode === "everyone") {
    els.attributionPeopleList.classList.add("hidden");
    return;
  }
  els.attributionPeopleList.classList.remove("hidden");

  activeTrip.people.forEach((person) => {
    const li = document.createElement("li");
    li.textContent = person.name;
    li.dataset.personId = person.id;
    if (selectedPeopleIds.has(person.id)) li.classList.add("selected");

    li.addEventListener("click", () => {
      if (attributionMode === "single") {
        selectedPeopleIds = new Set([person.id]);
      } else {
        if (selectedPeopleIds.has(person.id)) {
          selectedPeopleIds.delete(person.id);
        } else {
          selectedPeopleIds.add(person.id);
        }
      }
      renderAttributionPeopleList();
    });

    els.attributionPeopleList.appendChild(li);
  });
}

function saveItem() {
  const tagPrice = parseFloat(els.itemPriceInput.value);
  if (isNaN(tagPrice) || tagPrice < 0) {
    alert("Enter a valid price.");
    els.itemPriceInput.focus();
    return;
  }

  const vatIncluded = els.vatToggle.checked;
  let price = tagPrice;
  let priceExclVat = null;

  if (vatIncluded) {
    const vatPrice = parseFloat(els.itemVatPriceInput.value);
    if (isNaN(vatPrice) || vatPrice < 0) {
      alert("Enter the Inc. VAT price (the smaller number on the tag) — that's what you'll actually pay.");
      els.itemVatPriceInput.focus();
      return;
    }
    price = vatPrice;
    priceExclVat = tagPrice;
  }

  let attributedTo;
  if (attributionMode === "everyone") {
    attributedTo = activeTrip.people.map((p) => p.id);
  } else {
    attributedTo = Array.from(selectedPeopleIds);
    if (attributedTo.length === 0) {
      alert(attributionMode === "single" ? "Pick who this is for." : "Pick at least one person to split with.");
      return;
    }
  }

  const name = els.itemNameInput.value.trim();

  const fields = {
    name,
    price,
    vatIncluded,
    priceExclVat,
    photo: pendingPhotoDataUrl,
    attributedTo,
  };

  if (editingItemId) {
    DB.updateItem(editingItemId, fields);
  } else {
    DB.addItem(fields);
  }

  activeTrip = DB.getActiveTrip();
  closeItemModal();
  renderTotals();
  renderItemList();
}

// ---------- Summary / end trip ----------

function openSummaryModal() {
  summaryTrip = activeTrip;
  const { totals, grandTotal } = computeTotals(activeTrip);
  els.summaryContent.innerHTML = "";

  activeTrip.people.forEach((person) => {
    const row = document.createElement("div");
    row.className = "summary-person-row";
    row.innerHTML = `<span>${escapeHtml(person.name)}</span><span>${formatMoney(totals[person.id] || 0)}</span>`;
    els.summaryContent.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `<span>Trip Total</span><span>${formatMoney(grandTotal)}</span>`;
  els.summaryContent.appendChild(totalRow);

  els.summaryModal.classList.remove("hidden");
}

function generateReceiptText(trip) {
  const { totals, grandTotal } = computeTotals(trip);
  const peopleById = {};
  trip.people.forEach((p) => (peopleById[p.id] = p.name));

  const divider = "-".repeat(32);
  const lines = ["COSTCO HELPER — TRIP SUMMARY", formatDate(trip.createdAt), divider, ""];

  trip.items
    .slice()
    .reverse()
    .forEach((item) => {
      const name = item.name && item.name.trim() ? item.name.trim() : "Item";
      const who =
        item.attributedTo && item.attributedTo.length > 0
          ? item.attributedTo.map((id) => peopleById[id] || "?").join(", ")
          : "Everyone";
      lines.push(`${name} — ${formatMoney(item.price)} (${who})`);
    });

  lines.push("", divider);
  trip.people.forEach((person) => {
    lines.push(`${person.name.padEnd(20)} ${formatMoney(totals[person.id] || 0)}`);
  });
  lines.push(divider, `${"TRIP TOTAL".padEnd(20)} ${formatMoney(grandTotal)}`);

  return lines.join("\n");
}

function downloadReceipt(trip) {
  if (!trip) return;
  const text = generateReceiptText(trip);
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date(trip.createdAt).toISOString().slice(0, 10);

  const link = document.createElement("a");
  link.href = url;
  link.download = `costco-receipt-${dateStr}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function shareTrip(trip) {
  if (!trip) return;
  const text = generateReceiptText(trip);
  const title = `Costco Trip — ${formatDate(trip.createdAt)}`;

  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Trip copied to clipboard!"))
      .catch(() => alert(text));
    return;
  }

  alert(text);
}

// ---------- History ----------

function renderHistory() {
  const history = DB.getHistory();
  els.historyList.innerHTML = "";
  els.historyEmpty.classList.toggle("hidden", history.length > 0);

  history.forEach((trip) => {
    const { grandTotal } = computeTotals(trip);
    const li = document.createElement("li");
    li.className = "history-card";
    li.innerHTML = `
      <div class="hdate">${formatDate(trip.createdAt)} · ${trip.people.length} people · ${trip.items.length} items</div>
      <div class="htotal">${formatMoney(grandTotal)}</div>
    `;
    li.addEventListener("click", () => showHistoryTripSummary(trip));
    els.historyList.appendChild(li);
  });
}

function showHistoryTripSummary(trip) {
  summaryTrip = trip;
  const { totals, grandTotal } = computeTotals(trip);
  els.summaryContent.innerHTML = "";

  trip.people.forEach((person) => {
    const row = document.createElement("div");
    row.className = "summary-person-row";
    row.innerHTML = `<span>${escapeHtml(person.name)}</span><span>${formatMoney(totals[person.id] || 0)}</span>`;
    els.summaryContent.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `<span>Trip Total</span><span>${formatMoney(grandTotal)}</span>`;
  els.summaryContent.appendChild(totalRow);

  els.confirmEndTripBtn.classList.add("hidden");
  els.summaryModal.classList.remove("hidden");

  const reset = () => {
    els.confirmEndTripBtn.classList.remove("hidden");
    els.summaryModal.removeEventListener("click", onOverlayClick);
  };
  function onOverlayClick(e) {
    if (e.target === els.summaryModal) reset();
  }
  els.closeSummaryBtn.addEventListener("click", reset, { once: true });
}

// ---------- Utils ----------

function formatMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
