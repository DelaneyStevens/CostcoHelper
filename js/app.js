// CartShare — shopping trip expense tracker with per-person attribution.

let activeTrip = null;
let pendingPhotoDataUrl = null;
let selectedPeopleIds = new Set();
let attributionMode = "everyone"; // 'everyone' | 'custom' | 'single'
let editingSetupPeople = [];
let expandedItemId = null;
let vatPriceAuto = true;
let editingItemId = null;
let filterPersonId = null;
let viewingHistoryTrip = null;
let historyDetailFilterPersonId = null;
let summaryTrip = null;
let selectedPaymentPayerId = null;

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
  els.editTripBtn = document.getElementById("editTripBtn");
  els.historyBtn = document.getElementById("historyBtn");
  els.shareTripBtn = document.getElementById("shareTripBtn");
  els.endTripBtn = document.getElementById("endTripBtn");

  els.setupScreen = document.getElementById("setupScreen");
  els.backFromSetupBtn = document.getElementById("backFromSetupBtn");
  els.tripNameInput = document.getElementById("tripNameInput");
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

  els.historyDetailScreen = document.getElementById("historyDetailScreen");
  els.backFromHistoryDetail = document.getElementById("backFromHistoryDetail");
  els.historyDetailTitle = document.getElementById("historyDetailTitle");
  els.deleteHistoryTripBtn = document.getElementById("deleteHistoryTripBtn");
  els.historyDetailTotalsBar = document.getElementById("historyDetailTotalsBar");
  els.historyDetailSettlement = document.getElementById("historyDetailSettlement");
  els.historyDetailItemCount = document.getElementById("historyDetailItemCount");
  els.historyDetailItemList = document.getElementById("historyDetailItemList");
  els.shareHistoryTripBtn = document.getElementById("shareHistoryTripBtn");
  els.downloadHistoryReceiptBtn = document.getElementById("downloadHistoryReceiptBtn");

  els.itemModal = document.getElementById("itemModal");
  els.itemModalTitle = document.getElementById("itemModalTitle");
  els.closeModalBtn = document.getElementById("closeModalBtn");
  els.itemPhotoPreview = document.getElementById("itemPhotoPreview");
  els.ocrStatus = document.getElementById("ocrStatus");
  els.itemNameInput = document.getElementById("itemNameInput");
  els.itemPriceLabel = document.getElementById("itemPriceLabel");
  els.itemPriceInput = document.getElementById("itemPriceInput");
  els.discountToggle = document.getElementById("discountToggle");
  els.vatToggle = document.getElementById("vatToggle");
  els.vatPriceRow = document.getElementById("vatPriceRow");
  els.itemVatPriceInput = document.getElementById("itemVatPriceInput");
  els.attributionPeopleList = document.getElementById("attributionPeopleList");
  els.modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
  els.saveItemBtn = document.getElementById("saveItemBtn");

  els.editTripModal = document.getElementById("editTripModal");
  els.closeEditTripBtn = document.getElementById("closeEditTripBtn");
  els.editTripNameInput = document.getElementById("editTripNameInput");
  els.editPeopleList = document.getElementById("editPeopleList");
  els.editPersonNameInput = document.getElementById("editPersonNameInput");
  els.editAddPersonBtn = document.getElementById("editAddPersonBtn");
  els.saveTripEditsBtn = document.getElementById("saveTripEditsBtn");

  els.paymentsBtn = document.getElementById("paymentsBtn");
  els.paymentsModal = document.getElementById("paymentsModal");
  els.closePaymentsBtn = document.getElementById("closePaymentsBtn");
  els.paymentsListEl = document.getElementById("paymentsListEl");
  els.paymentsEmpty = document.getElementById("paymentsEmpty");
  els.paymentPayerList = document.getElementById("paymentPayerList");
  els.paymentAmountInput = document.getElementById("paymentAmountInput");
  els.paymentNoteInput = document.getElementById("paymentNoteInput");
  els.addPaymentBtn = document.getElementById("addPaymentBtn");

  els.summaryModal = document.getElementById("summaryModal");
  els.summaryTitle = document.getElementById("summaryTitle");
  els.closeSummaryBtn = document.getElementById("closeSummaryBtn");
  els.summaryContent = document.getElementById("summaryContent");
  els.summarySettlement = document.getElementById("summarySettlement");
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
    if (activeTrip && !confirm("Start a new trip? This one will move to Past Trips once you start the new one.")) {
      return;
    }
    showSetupScreen();
  });

  els.backFromSetupBtn.addEventListener("click", () => {
    if (activeTrip) showShoppingScreen();
  });

  els.editTripBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    if (!activeTrip) return;
    openEditTripModal();
  });

  els.paymentsBtn.addEventListener("click", () => {
    els.menuPanel.classList.add("hidden");
    if (!activeTrip) return;
    openPaymentsModal();
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

  els.backFromHistoryDetail.addEventListener("click", showHistoryScreen);

  els.deleteHistoryTripBtn.addEventListener("click", () => {
    if (!viewingHistoryTrip) return;
    if (confirm("Delete this trip? This cannot be undone.")) {
      if (!DB.deleteTrip(viewingHistoryTrip.id)) {
        alertStorageFailure();
        return;
      }
      viewingHistoryTrip = null;
      showHistoryScreen();
    }
  });

  els.shareHistoryTripBtn.addEventListener("click", () => shareTrip(viewingHistoryTrip));
  els.downloadHistoryReceiptBtn.addEventListener("click", () => downloadReceipt(viewingHistoryTrip));

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

  // Edit Trip modal
  els.closeEditTripBtn.addEventListener("click", closeEditTripModal);
  els.editAddPersonBtn.addEventListener("click", addEditPerson);
  els.editPersonNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEditPerson();
    }
  });
  els.saveTripEditsBtn.addEventListener("click", saveTripEdits);

  // Payments modal
  els.closePaymentsBtn.addEventListener("click", closePaymentsModal);
  els.addPaymentBtn.addEventListener("click", handleAddPayment);

  els.closeSummaryBtn.addEventListener("click", () => els.summaryModal.classList.add("hidden"));
  els.shareSummaryBtn.addEventListener("click", () => shareTrip(summaryTrip));
  els.downloadReceiptBtn.addEventListener("click", () => downloadReceipt(summaryTrip));
  els.confirmEndTripBtn.addEventListener("click", () => {
    if (confirm("End this trip? It will be moved to Past Trips.")) {
      if (!DB.endActiveTrip()) {
        alertStorageFailure();
        return;
      }
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
  els.historyDetailScreen.classList.add("hidden");
}

function showSetupScreen() {
  hideAllScreens();
  editingSetupPeople = activeTrip ? [...activeTrip.people] : [];
  els.tripNameInput.value = "";
  renderSetupPeopleList();
  els.backFromSetupBtn.classList.toggle("hidden", !activeTrip);
  els.setupScreen.classList.remove("hidden");
  els.tripTitle.textContent = "🛒 CartShare";
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
  refreshShoppingScreen();
}

// Re-reads activeTrip's name/people into the header and re-renders the
// totals bar + item list — used both when first showing the shopping
// screen and after editing the trip's name or shoppers from the menu.
function refreshShoppingScreen() {
  els.tripTitle.textContent = activeTrip.name ? `🛒 ${activeTrip.name}` : "🛒 Shopping Trip";
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
  const trip = DB.createTrip(editingSetupPeople.map((p) => p.name), els.tripNameInput.value);
  if (!trip) {
    alertStorageFailure();
    return;
  }
  activeTrip = trip;
  showShoppingScreen();
}

// ---------- Shopping screen: totals & items ----------

// Split in integer cents (with the odd cent going to the first targets)
// rather than floating-point dollars, so per-person shares always add up
// exactly to the item price — e.g. $10 split 3 ways is $3.34/$3.33/$3.33,
// not three $3.33s that visibly fall a cent short of the $10.00 total.
// Shared by computeTotals (for display) and computeSettlement (which also
// needs exact cents to match "owed" against "paid" with no rounding drift).
function computeOwedCents(trip) {
  const owedCents = {};
  trip.people.forEach((p) => (owedCents[p.id] = 0));
  let grandTotalCents = 0;

  trip.items.forEach((item) => {
    const priceCents = Math.round((Number(item.price) || 0) * 100);
    grandTotalCents += priceCents;
    const targets = item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : trip.people.map((p) => p.id);
    const baseShare = Math.floor(priceCents / targets.length);
    let remainder = priceCents - baseShare * targets.length;
    targets.forEach((personId) => {
      if (owedCents[personId] === undefined) owedCents[personId] = 0;
      let share = baseShare;
      if (remainder > 0) {
        share += 1;
        remainder -= 1;
      }
      owedCents[personId] += share;
    });
  });

  return { owedCents, grandTotalCents };
}

function computeTotals(trip) {
  const { owedCents, grandTotalCents } = computeOwedCents(trip);
  const totals = {};
  Object.keys(owedCents).forEach((id) => {
    totals[id] = owedCents[id] / 100;
  });
  return { totals, grandTotal: grandTotalCents / 100 };
}

// Nets what each person paid against what they owe, then greedily matches
// the biggest creditor with the biggest debtor to produce a short list of
// "who pays whom" transactions — the standard settle-up approach (same idea
// Splitwise and similar apps use), rather than everyone paying everyone a
// little bit.
function computeSettlement(trip) {
  const { owedCents, grandTotalCents } = computeOwedCents(trip);

  const paidCents = {};
  trip.people.forEach((p) => (paidCents[p.id] = 0));
  let totalPaidCents = 0;

  (trip.payments || []).forEach((payment) => {
    const cents = Math.round((Number(payment.amount) || 0) * 100);
    totalPaidCents += cents;
    if (paidCents[payment.payerId] !== undefined) {
      paidCents[payment.payerId] += cents;
    }
  });

  const balanceCents = {};
  trip.people.forEach((p) => {
    balanceCents[p.id] = (paidCents[p.id] || 0) - (owedCents[p.id] || 0);
  });

  return {
    transactions: simplifyDebts(balanceCents, trip.people),
    totalPaidCents,
    totalOwedCents: grandTotalCents,
  };
}

function simplifyDebts(balanceCents, people) {
  const creditors = [];
  const debtors = [];
  people.forEach((p) => {
    const amount = balanceCents[p.id] || 0;
    if (amount > 0) creditors.push({ id: p.id, amount });
    else if (amount < 0) debtors.push({ id: p.id, amount: -amount });
  });
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0) {
      transactions.push({ fromId: debtor.id, toId: creditor.id, amountCents: amount });
    }
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }
  return transactions;
}

// Shared by the Trip Summary modal and the past-trip detail screen.
function renderSettlement(container, trip) {
  const { transactions, totalPaidCents, totalOwedCents } = computeSettlement(trip);
  const peopleById = {};
  trip.people.forEach((p) => (peopleById[p.id] = p.name));

  container.innerHTML = "";

  const heading = document.createElement("h4");
  heading.className = "settlement-heading";
  heading.textContent = "Settle Up";
  container.appendChild(heading);

  if (transactions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint settlement-empty";
    empty.textContent =
      totalPaidCents === 0 ? "Log who paid what in Payments to see who owes who." : "Everyone's all settled up! 🎉";
    container.appendChild(empty);
    return;
  }

  transactions.forEach((t) => {
    const row = document.createElement("div");
    row.className = "settlement-row";
    row.innerHTML = `<span>${escapeHtml(peopleById[t.fromId] || "?")} owes ${escapeHtml(peopleById[t.toId] || "?")}</span><span>${formatMoney(t.amountCents / 100)}</span>`;
    container.appendChild(row);
  });

  // Payments can validly exceed the trip total (someone covered a personal
  // expense too, a tip, rounding, etc.) — that doesn't need a warning, the
  // transactions above already account for it correctly. Only a shortfall
  // means some of the trip's cost hasn't been logged as paid by anyone yet.
  if (totalPaidCents < totalOwedCents) {
    const note = document.createElement("p");
    note.className = "hint settlement-note";
    note.textContent = `Logged payments total ${formatMoney(totalPaidCents / 100)}, but the trip total is ${formatMoney(totalOwedCents / 100)} — add the rest in Payments for a fully accurate settle-up.`;
    container.appendChild(note);
  }
}

// Shared by the shopping screen and the past-trip detail screen, which both
// show a "Trip Total" card plus one selectable card per person.
function renderTotalsBar(container, trip, totals, grandTotal, selectedPersonId, onSelectGrand, onSelectPerson) {
  container.innerHTML = "";

  const grandCard = document.createElement("button");
  grandCard.type = "button";
  grandCard.className = "total-card grand";
  if (selectedPersonId === null) grandCard.classList.add("selected");
  grandCard.innerHTML = `<div class="name">Trip Total</div><div class="amount">${formatMoney(grandTotal)}</div>`;
  grandCard.addEventListener("click", onSelectGrand);
  container.appendChild(grandCard);

  trip.people.forEach((person) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "total-card";
    if (selectedPersonId === person.id) card.classList.add("selected");
    card.innerHTML = `<div class="name">${escapeHtml(person.name)}</div><div class="amount">${formatMoney(totals[person.id] || 0)}</div>`;
    card.addEventListener("click", () => onSelectPerson(person.id));
    container.appendChild(card);
  });
}

function renderTotals() {
  const { totals, grandTotal } = computeTotals(activeTrip);
  renderTotalsBar(
    els.totalsBar,
    activeTrip,
    totals,
    grandTotal,
    filterPersonId,
    () => {
      filterPersonId = null;
      renderTotals();
      renderItemList();
    },
    (personId) => {
      filterPersonId = filterPersonId === personId ? null : personId;
      renderTotals();
      renderItemList();
    }
  );
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

    const attributionLabel = describeAttribution(item);
    const vatNote = item.vatIncluded
      ? `<div class="item-price-note">Inc. VAT — tag showed ${formatMoney(item.priceExclVat)}</div>`
      : "";
    const discountNote = item.price < 0 ? `<div class="item-price-note">🏷️ Discount</div>` : "";

    li.innerHTML = `
      <div class="item-card-row">
        <div class="item-thumb-slot"></div>
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name || defaultItemName(item))}</div>
          <button type="button" class="item-attribution-btn">${escapeHtml(attributionLabel)}</button>
          ${vatNote}${discountNote}
        </div>
        <div class="item-price">${formatMoney(item.price)}</div>
        <button class="item-edit" aria-label="Edit">✏️</button>
        <button class="item-delete" aria-label="Delete">🗑️</button>
      </div>
    `;
    li.querySelector(".item-thumb-slot").replaceWith(buildThumbEl(item));

    li.querySelector(".item-edit").addEventListener("click", () => {
      openItemModal(null, item);
    });

    li.querySelector(".item-delete").addEventListener("click", () => {
      if (confirm("Delete this item?")) {
        if (!DB.deleteItem(item.id)) {
          alertStorageFailure();
          return;
        }
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
      if (!DB.updateItem(item.id, { attributedTo: Array.from(next) })) {
        alertStorageFailure();
        activeTrip = DB.getActiveTrip();
        renderItemList(); // revert the checkbox to the actually-persisted state
        return;
      }
      activeTrip = DB.getActiveTrip();
      renderTotals();
      renderItemList();
    });

    panel.appendChild(row);
  });

  return panel;
}

function buildThumbEl(item) {
  if (!item.photo) {
    const placeholder = document.createElement("div");
    placeholder.className = "item-thumb placeholder";
    placeholder.textContent = "🧾";
    return placeholder;
  }
  const img = document.createElement("img");
  img.className = "item-thumb";
  img.alt = "";
  // Assigned as a property (not parsed as HTML), so this can't break out of
  // an attribute even if item.photo ever came from an untrusted import.
  img.src = item.photo;
  return img;
}

// Shared by the shopping screen and the past-trip detail screen, which both
// need to turn an item's attributedTo list into a human-readable label.
function describeAttributionFor(trip, targets) {
  if (targets.length === trip.people.length) {
    return "Split: everyone";
  }
  const names = targets
    .map((id) => trip.people.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p.name);
  if (names.length === 1) return `For ${names[0]}`;
  return `Split: ${names.join(", ")}`;
}

function describeAttribution(item) {
  return describeAttributionFor(activeTrip, itemTargets(item));
}

// ---------- Edit Trip modal ----------

function openEditTripModal() {
  els.editTripNameInput.value = activeTrip.name || "";
  els.editPersonNameInput.value = "";
  renderEditPeopleList();
  els.editTripModal.classList.remove("hidden");
}

function closeEditTripModal() {
  els.editTripModal.classList.add("hidden");
}

function saveTripEdits() {
  const result = DB.renameTrip(els.editTripNameInput.value);
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;
  closeEditTripModal();
  refreshShoppingScreen();
}

// True if the person is explicitly named in any item's split (either alone
// or as part of a custom subset) — as opposed to only being included via
// the "everyone" fallback, which recomputes automatically against whoever
// is left on the trip and so never blocks removal.
function personHasExplicitItems(trip, personId) {
  return trip.items.some((item) => item.attributedTo && item.attributedTo.length > 0 && item.attributedTo.includes(personId));
}

function renderEditPeopleList() {
  els.editPeopleList.innerHTML = "";

  activeTrip.people.forEach((person) => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = person.name;
    li.appendChild(nameSpan);

    const editBtn = document.createElement("button");
    editBtn.className = "chip-edit";
    editBtn.type = "button";
    editBtn.textContent = "✏️";
    editBtn.setAttribute("aria-label", `Rename ${person.name}`);
    editBtn.addEventListener("click", () => renameEditPerson(person));
    li.appendChild(editBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "chip-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${person.name}`);
    removeBtn.addEventListener("click", () => removeEditPerson(person));
    li.appendChild(removeBtn);

    els.editPeopleList.appendChild(li);
  });
}

function addEditPerson() {
  const name = els.editPersonNameInput.value.trim();
  if (!name) return;
  const result = DB.addPersonToActiveTrip(name);
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;
  els.editPersonNameInput.value = "";
  renderEditPeopleList();
  refreshShoppingScreen();
}

function renameEditPerson(person) {
  const newName = prompt(`Rename ${person.name} to:`, person.name);
  if (newName === null) return; // cancelled
  const trimmed = newName.trim();
  if (!trimmed || trimmed === person.name) return;
  const result = DB.renamePerson(person.id, trimmed);
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;
  renderEditPeopleList();
  refreshShoppingScreen();
}

function removeEditPerson(person) {
  if (activeTrip.people.length <= 1) {
    alert("A trip needs at least one person.");
    return;
  }
  if (personHasExplicitItems(activeTrip, person.id)) {
    alert(`Can't remove ${person.name} — they have items attributed to them. Reassign or delete those items first.`);
    return;
  }
  if (!confirm(`Remove ${person.name} from this trip?`)) return;
  const result = DB.removePersonFromActiveTrip(person.id);
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;
  renderEditPeopleList();
  refreshShoppingScreen();
}

// ---------- Payments modal ----------

function openPaymentsModal() {
  selectedPaymentPayerId = null;
  els.paymentAmountInput.value = "";
  els.paymentNoteInput.value = "";
  renderPaymentPayerList();
  renderPaymentsList();
  els.paymentsModal.classList.remove("hidden");
}

function closePaymentsModal() {
  els.paymentsModal.classList.add("hidden");
}

function renderPaymentPayerList() {
  els.paymentPayerList.innerHTML = "";

  activeTrip.people.forEach((person) => {
    const li = document.createElement("li");
    li.textContent = person.name;
    li.dataset.personId = person.id;
    if (selectedPaymentPayerId === person.id) li.classList.add("selected");

    li.addEventListener("click", () => {
      selectedPaymentPayerId = selectedPaymentPayerId === person.id ? null : person.id;
      renderPaymentPayerList();
    });

    els.paymentPayerList.appendChild(li);
  });
}

function renderPaymentsList() {
  const payments = activeTrip.payments || [];
  els.paymentsListEl.innerHTML = "";
  els.paymentsEmpty.classList.toggle("hidden", payments.length > 0);

  payments.forEach((payment) => {
    const payer = activeTrip.people.find((p) => p.id === payment.payerId);
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "payment-info";
    const payerLine = document.createElement("div");
    payerLine.className = "payment-payer";
    payerLine.textContent = payer ? payer.name : "?";
    info.appendChild(payerLine);
    if (payment.note) {
      const noteLine = document.createElement("div");
      noteLine.className = "payment-note";
      noteLine.textContent = payment.note;
      info.appendChild(noteLine);
    }
    li.appendChild(info);

    const amount = document.createElement("div");
    amount.className = "payment-amount";
    amount.textContent = formatMoney(payment.amount);
    li.appendChild(amount);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "payment-delete";
    deleteBtn.textContent = "🗑️";
    deleteBtn.setAttribute("aria-label", "Delete payment");
    deleteBtn.addEventListener("click", () => handleDeletePayment(payment.id));
    li.appendChild(deleteBtn);

    els.paymentsListEl.appendChild(li);
  });
}

function handleAddPayment() {
  if (!selectedPaymentPayerId) {
    alert("Pick who paid.");
    return;
  }
  const amount = parseFloat(els.paymentAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount.");
    els.paymentAmountInput.focus();
    return;
  }
  const note = els.paymentNoteInput.value.trim();

  const result = DB.addPayment({ payerId: selectedPaymentPayerId, amount, note });
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;

  selectedPaymentPayerId = null;
  els.paymentAmountInput.value = "";
  els.paymentNoteInput.value = "";
  renderPaymentPayerList();
  renderPaymentsList();
}

function handleDeletePayment(paymentId) {
  if (!confirm("Delete this payment?")) return;
  const result = DB.deletePayment(paymentId);
  if (!result) {
    alertStorageFailure();
    return;
  }
  activeTrip = result;
  renderPaymentsList();
}

// ---------- Photo capture ----------

function handlePhotoCapture(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  resizeImageToDataUrl(
    file,
    500,
    (thumbDataUrl) => {
      pendingPhotoDataUrl = thumbDataUrl;
      openItemModal(thumbDataUrl);
      els.cameraInput.value = "";
    },
    () => {
      els.cameraInput.value = "";
      alert("Couldn't read that photo — try again, or add the item without a photo.");
      openItemModal(null);
    }
  );
  // A larger, higher-detail version (not stored) purely for reading the digits.
  resizeImageToDataUrl(
    file,
    1000,
    (ocrDataUrl) => runOcrOnPhoto(ocrDataUrl),
    () => {
      // The 500px thumbnail above already alerted and opened the modal without
      // a photo; just make sure OCR's own status line doesn't look like it's
      // still working if the modal is still around.
      if (els.itemModal.classList.contains("hidden")) return;
      els.ocrStatus.textContent = "Couldn't read a price automatically — enter it below.";
      els.ocrStatus.classList.remove("hidden");
      els.ocrStatus.classList.add("ocr-error");
    }
  );
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

function resizeImageToDataUrl(file, maxDim, onSuccess, onError) {
  const img = new Image();
  const reader = new FileReader();
  reader.onerror = () => onError && onError();
  reader.onload = (e) => {
    img.onerror = () => onError && onError();
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
      onSuccess(canvas.toDataURL("image/jpeg", 0.7));
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
  // Stored as negative for a discount, but the field always shows the
  // positive amount the user actually typed — the checkbox carries the sign.
  els.itemPriceInput.value = existingItem ? Math.abs(vatIncluded ? existingItem.priceExclVat : existingItem.price).toFixed(2) : "";
  els.itemVatPriceInput.value = existingItem && vatIncluded ? Math.abs(existingItem.price).toFixed(2) : "";
  els.discountToggle.checked = !!(existingItem && existingItem.price < 0);
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

  if (els.discountToggle.checked) {
    price = -price;
    if (priceExclVat !== null) priceExclVat = -priceExclVat;
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

  const result = editingItemId ? DB.updateItem(editingItemId, fields) : DB.addItem(fields);
  if (!result) {
    alertStorageFailure();
    return; // keep the modal open so the user's input isn't lost
  }

  activeTrip = DB.getActiveTrip();
  closeItemModal();
  renderTotals();
  renderItemList();
}

// ---------- Summary / end trip ----------

function openSummaryModal() {
  summaryTrip = activeTrip;
  els.summaryTitle.textContent = activeTrip.name ? activeTrip.name : "Trip Summary";
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

  renderSettlement(els.summarySettlement, activeTrip);

  els.summaryModal.classList.remove("hidden");
}

function generateReceiptText(trip) {
  const { totals, grandTotal } = computeTotals(trip);
  const peopleById = {};
  trip.people.forEach((p) => (peopleById[p.id] = p.name));

  const divider = "-".repeat(32);
  const heading = trip.name ? `COSTCO HELPER — ${trip.name.toUpperCase()}` : "COSTCO HELPER — TRIP SUMMARY";
  const lines = [heading, formatDate(trip.createdAt), divider, ""];

  trip.items
    .slice()
    .reverse()
    .forEach((item) => {
      const name = item.name && item.name.trim() ? item.name.trim() : defaultItemName(item);
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

  if (trip.payments && trip.payments.length > 0) {
    lines.push("", divider, "PAYMENTS");
    trip.payments
      .slice()
      .reverse()
      .forEach((payment) => {
        const note = payment.note && payment.note.trim() ? ` (${payment.note.trim()})` : "";
        lines.push(`${peopleById[payment.payerId] || "?"} paid ${formatMoney(payment.amount)}${note}`);
      });
  }

  const { transactions, totalPaidCents, totalOwedCents } = computeSettlement(trip);
  if (transactions.length > 0) {
    lines.push("", divider, "SETTLE UP");
    transactions.forEach((t) => {
      lines.push(`${peopleById[t.fromId] || "?"} owes ${peopleById[t.toId] || "?"} ${formatMoney(t.amountCents / 100)}`);
    });
    if (totalPaidCents < totalOwedCents) {
      lines.push(`(Payments logged: ${formatMoney(totalPaidCents / 100)} — trip total: ${formatMoney(totalOwedCents / 100)})`);
    }
  }

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
  // Revoking immediately can race the download actually starting in some
  // browsers (notably Safari), so give it a beat first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shareTrip(trip) {
  if (!trip) return;
  const text = generateReceiptText(trip);
  const title = trip.name ? trip.name : `Costco Trip — ${formatDate(trip.createdAt)}`;

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
      <div class="history-card-main">
        ${trip.name ? `<div class="hname">${escapeHtml(trip.name)}</div>` : ""}
        <div class="hdate">${formatDate(trip.createdAt)} · ${trip.people.length} people · ${trip.items.length} items</div>
        <div class="htotal">${formatMoney(grandTotal)}</div>
      </div>
      <button type="button" class="history-delete" aria-label="Delete trip">🗑️</button>
    `;
    li.addEventListener("click", () => showHistoryDetailScreen(trip));
    li.querySelector(".history-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this trip? This cannot be undone.")) {
        if (!DB.deleteTrip(trip.id)) {
          alertStorageFailure();
          return;
        }
        renderHistory();
      }
    });
    els.historyList.appendChild(li);
  });
}

function showHistoryDetailScreen(trip) {
  viewingHistoryTrip = trip;
  historyDetailFilterPersonId = null;
  hideAllScreens();
  els.historyDetailScreen.classList.remove("hidden");
  els.tripTitle.textContent = "📜 Past Trips";
  els.tripSubtitle.textContent = "";
  els.historyDetailTitle.textContent = trip.name
    ? trip.name
    : `${formatDate(trip.createdAt)} · ${formatTime(trip.createdAt)}`;
  renderHistoryDetailTotals();
  renderHistoryDetailItemList();
  renderSettlement(els.historyDetailSettlement, trip);
}

function historyDetailItemTargets(item) {
  return item.attributedTo && item.attributedTo.length > 0 ? item.attributedTo : viewingHistoryTrip.people.map((p) => p.id);
}

function renderHistoryDetailTotals() {
  const trip = viewingHistoryTrip;
  const { totals, grandTotal } = computeTotals(trip);
  renderTotalsBar(
    els.historyDetailTotalsBar,
    trip,
    totals,
    grandTotal,
    historyDetailFilterPersonId,
    () => {
      historyDetailFilterPersonId = null;
      renderHistoryDetailTotals();
      renderHistoryDetailItemList();
    },
    (personId) => {
      historyDetailFilterPersonId = historyDetailFilterPersonId === personId ? null : personId;
      renderHistoryDetailTotals();
      renderHistoryDetailItemList();
    }
  );
}

function renderHistoryDetailItemList() {
  const trip = viewingHistoryTrip;
  els.historyDetailItemList.innerHTML = "";

  const filterPerson = historyDetailFilterPersonId ? trip.people.find((p) => p.id === historyDetailFilterPersonId) : null;
  const items = filterPerson ? trip.items.filter((item) => historyDetailItemTargets(item).includes(filterPerson.id)) : trip.items;

  els.historyDetailItemCount.textContent = items.length;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-card";

    const attributionLabel = describeAttributionFor(trip, historyDetailItemTargets(item));
    const vatNote = item.vatIncluded
      ? `<div class="item-price-note">Inc. VAT — tag showed ${formatMoney(item.priceExclVat)}</div>`
      : "";
    const discountNote = item.price < 0 ? `<div class="item-price-note">🏷️ Discount</div>` : "";

    li.innerHTML = `
      <div class="item-card-row">
        <div class="item-thumb-slot"></div>
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name || defaultItemName(item))}</div>
          <div class="item-attribution">${escapeHtml(attributionLabel)}</div>
          ${vatNote}${discountNote}
        </div>
        <div class="item-price">${formatMoney(item.price)}</div>
      </div>
    `;
    li.querySelector(".item-thumb-slot").replaceWith(buildThumbEl(item));

    els.historyDetailItemList.appendChild(li);
  });
}

// ---------- Utils ----------

function formatMoney(n) {
  const num = Number(n) || 0;
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
}

function defaultItemName(item) {
  return item.price < 0 ? "Discount" : "Item";
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function alertStorageFailure() {
  alert("Couldn't save that — your device's storage is full. Try deleting some past trips or photos to free up space, then try again.");
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
