// Simple localStorage-backed persistence for trips.
const DB = (() => {
  const ACTIVE_KEY = "costcohelper.activeTrip";
  const HISTORY_KEY = "costcohelper.tripHistory";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getActiveTrip() {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  // Returns true on success, false if the write failed (e.g. storage quota
  // exceeded) — localStorage.setItem throws rather than failing silently, so
  // every caller that mutates persisted state needs to check this instead of
  // assuming the save always took effect.
  function saveActiveTrip(trip) {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(trip));
      return true;
    } catch (err) {
      console.error("Failed to save active trip:", err);
      return false;
    }
  }

  function clearActiveTrip() {
    localStorage.removeItem(ACTIVE_KEY);
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    } catch (err) {
      console.error("Failed to save trip history:", err);
      return false;
    }
  }

  // Returns the new trip on success, or null if it couldn't be persisted.
  function createTrip(peopleNames, tripName) {
    if (getActiveTrip()) {
      if (!endActiveTrip()) return null;
    }
    const trip = {
      id: uid(),
      name: tripName ? tripName.trim() : "",
      createdAt: Date.now(),
      people: peopleNames.map((name) => ({ id: uid(), name })),
      items: [],
    };
    return saveActiveTrip(trip) ? trip : null;
  }

  function addPersonToActiveTrip(name) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.people.push({ id: uid(), name });
    return saveActiveTrip(trip) ? trip : null;
  }

  function addItem(item) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.items.unshift({ id: uid(), createdAt: Date.now(), ...item });
    return saveActiveTrip(trip) ? trip : null;
  }

  function updateItem(itemId, patch) {
    const trip = getActiveTrip();
    if (!trip) return null;
    const item = trip.items.find((i) => i.id === itemId);
    if (!item) return trip;
    Object.assign(item, patch);
    return saveActiveTrip(trip) ? trip : null;
  }

  function deleteItem(itemId) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.items = trip.items.filter((i) => i.id !== itemId);
    return saveActiveTrip(trip) ? trip : null;
  }

  function getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  // Returns true on success, false if the write failed.
  function deleteTrip(tripId) {
    const history = getHistory().filter((t) => t.id !== tripId);
    return saveHistory(history);
  }

  // Returns true on success, false if the write failed (the active trip is
  // left in place so it isn't lost if archiving it doesn't fit in storage).
  function endActiveTrip() {
    const trip = getActiveTrip();
    if (!trip) return false;
    trip.endedAt = Date.now();
    const history = getHistory();
    history.unshift(trip);
    if (!saveHistory(history)) return false;
    clearActiveTrip();
    return true;
  }

  return {
    uid,
    getActiveTrip,
    saveActiveTrip,
    clearActiveTrip,
    createTrip,
    addPersonToActiveTrip,
    addItem,
    updateItem,
    deleteItem,
    getHistory,
    deleteTrip,
    endActiveTrip,
  };
})();
