// Costco Helper — shopping trip expense tracker with per-person attribution.

let activeTrip = null;
let pendingPhotoDataUrl = null;
let selectedPeopleIds = new Set();
let editingSetupPeople = [];

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
  els.itemCount = document.getElementById("itemCount");
  els.emptyState = document.getElementById("emptyState");

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
  els.selectAllPeopleBtn = document.getElementById("selectAllPeopleBtn");
  els.saveItemBtn = document.getElementById("saveItemBtn");

  els.summaryModal = document.getElementById("summaryModal");
  els.closeSummaryBtn = document.getElementById("closeSummaryBtn");
  els.summaryContent = document.getElementById("summaryContent");
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
  els.closeModalBtn.addEventListener("click", closeItemModal);

  els.selectAllPeopleBtn.addEventListener("click", () => {
    selectedPeopleIds = new Set(activeTrip.people.map((p) => p.id));
    renderAttributionPeopleList();
  });

  els.vatToggle.addEventListener("change", () => {
    els.vatPriceRow.classList.toggle("hidden", !els.vatToggle.checked);
    els.itemPriceLabel.textContent = els.vatToggle.checked ? "Price shown on tag (excl. VAT)" : "Price";
    if (els.vatToggle.checked) {
      setTimeout(() => els.itemVatPriceInput.focus(), 50);
    }
  });

  els.saveItemBtn.addEventListener("click", saveItem);

  els.closeSummaryBtn.addEventListener("click", () => els.summaryModal.classList.add("hidden"));
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

  const grandCard = document.createElement("div");
  grandCard.className = "total-card grand";
  grandCard.innerHTML = `<div class="name">Trip Total</div><div class="amount">${formatMoney(grandTotal)}</div>`;
  els.totalsBar.appendChild(grandCard);

  activeTrip.people.forEach((person) => {
    const card = document.createElement("div");
    card.className = "total-card";
    card.innerHTML = `<div class="name">${escapeHtml(person.name)}</div><div class="amount">${formatMoney(totals[person.id] || 0)}</div>`;
    els.totalsBar.appendChild(card);
  });
}

function renderItemList() {
  els.itemList.innerHTML = "";
  els.itemCount.textContent = activeTrip.items.length;
  els.emptyState.classList.toggle("hidden", activeTrip.items.length > 0);

  activeTrip.items.forEach((item) => {
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
      ${thumbHtml}
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name || "Item")}</div>
        <div class="item-attribution">${escapeHtml(attributionLabel)}</div>
        ${vatNote}
      </div>
      <div class="item-price">${formatMoney(item.price)}</div>
      <button class="item-delete" aria-label="Delete">🗑️</button>
    `;

    li.querySelector(".item-delete").addEventListener("click", () => {
      if (confirm("Delete this item?")) {
        DB.deleteItem(item.id);
        activeTrip = DB.getActiveTrip();
        renderTotals();
        renderItemList();
      }
    });

    els.itemList.appendChild(li);
  });
}

function describeAttribution(item) {
  const targets = item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : activeTrip.people.map((p) => p.id);
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

function openItemModal(photoDataUrl) {
  pendingPhotoDataUrl = photoDataUrl || null;
  els.itemModalTitle.textContent = "Add Item";
  els.itemNameInput.value = "";
  els.itemPriceInput.value = "";
  els.itemVatPriceInput.value = "";
  els.vatToggle.checked = false;
  els.vatPriceRow.classList.add("hidden");
  els.itemPriceLabel.textContent = "Price";

  els.ocrStatus.textContent = "";
  els.ocrStatus.classList.add("hidden");

  if (pendingPhotoDataUrl) {
    els.itemPhotoPreview.src = pendingPhotoDataUrl;
    els.itemPhotoPreview.classList.remove("hidden");
  } else {
    els.itemPhotoPreview.classList.add("hidden");
  }

  // Default: everyone ticked (split evenly across the whole group).
  selectedPeopleIds = new Set(activeTrip.people.map((p) => p.id));
  renderAttributionPeopleList();

  els.itemModal.classList.remove("hidden");
  setTimeout(() => els.itemPriceInput.focus(), 50);
}

function closeItemModal() {
  els.itemModal.classList.add("hidden");
  pendingPhotoDataUrl = null;
}

function renderAttributionPeopleList() {
  els.attributionPeopleList.innerHTML = "";

  activeTrip.people.forEach((person) => {
    const li = document.createElement("li");
    li.className = "people-check-row";
    const checked = selectedPeopleIds.has(person.id);
    if (checked) li.classList.add("checked");

    const checkboxId = `personCheck_${person.id}`;
    li.innerHTML = `
      <input type="checkbox" id="${checkboxId}" ${checked ? "checked" : ""} />
      <label class="person-name" for="${checkboxId}">${escapeHtml(person.name)}</label>
    `;

    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedPeopleIds.add(person.id);
      } else {
        selectedPeopleIds.delete(person.id);
      }
      li.classList.toggle("checked", checkbox.checked);
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

  const attributedTo = Array.from(selectedPeopleIds);
  if (attributedTo.length === 0) {
    alert("Tick at least one person this item is for.");
    return;
  }

  const name = els.itemNameInput.value.trim();

  DB.addItem({
    name,
    price,
    vatIncluded,
    priceExclVat,
    photo: pendingPhotoDataUrl,
    attributedTo,
  });

  activeTrip = DB.getActiveTrip();
  closeItemModal();
  renderTotals();
  renderItemList();
}

// ---------- Summary / end trip ----------

function openSummaryModal() {
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
