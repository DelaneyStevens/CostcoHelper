// Simple localStorage-backed persistence for trips.
const DB = (() => {
  const TRIPS_KEY = "costcohelper.liveTrips"; // array of trips currently in progress
  const HISTORY_KEY = "costcohelper.tripHistory"; // array of ended trips
  const LEGACY_ACTIVE_KEY = "costcohelper.activeTrip"; // pre-multi-trip single active trip

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getLiveTrips() {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function getLiveTrip(tripId) {
    return getLiveTrips().find((t) => t.id === tripId) || null;
  }

  // Returns true on success, false if the write failed (e.g. storage quota
  // exceeded) — localStorage.setItem throws rather than failing silently, so
  // every caller that mutates persisted state needs to check this instead of
  // assuming the save always took effect.
  function saveLiveTrips(trips) {
    try {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
      return true;
    } catch (err) {
      console.error("Failed to save live trips:", err);
      return false;
    }
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

  // One-time upgrade from the old single-active-trip model: if a trip is
  // sitting under the legacy key, fold it into the new live-trips list so
  // nobody's in-progress trip disappears when this version ships.
  (function migrateLegacyActiveTrip() {
    const raw = localStorage.getItem(LEGACY_ACTIVE_KEY);
    if (!raw) return;
    try {
      const legacyTrip = JSON.parse(raw);
      if (legacyTrip && typeof legacyTrip === "object") {
        const trips = getLiveTrips();
        trips.push(legacyTrip);
        saveLiveTrips(trips);
      }
    } catch (err) {
      console.error("Failed to migrate legacy active trip:", err);
    } finally {
      localStorage.removeItem(LEGACY_ACTIVE_KEY);
    }
  })();

  // Looks up a live trip, hands it to `mutate` to change in place, then
  // persists the whole list. Returns the updated trip on success, or null
  // if the trip doesn't exist or the write failed.
  function updateLiveTrip(tripId, mutate) {
    const trips = getLiveTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return null;
    mutate(trip);
    return saveLiveTrips(trips) ? trip : null;
  }

  // Returns the new trip on success, or null if it couldn't be persisted.
  function createTrip(peopleNames, tripName) {
    const trips = getLiveTrips();
    const trip = {
      id: uid(),
      name: tripName ? tripName.trim() : "",
      createdAt: Date.now(),
      people: peopleNames.map((name) => ({ id: uid(), name })),
      items: [],
      payments: [],
    };
    trips.push(trip);
    return saveLiveTrips(trips) ? trip : null;
  }

  function renameTrip(tripId, newName) {
    return updateLiveTrip(tripId, (trip) => {
      trip.name = newName ? newName.trim() : "";
    });
  }

  function addPersonToTrip(tripId, name) {
    return updateLiveTrip(tripId, (trip) => {
      trip.people.push({ id: uid(), name });
    });
  }

  function renamePerson(tripId, personId, newName) {
    return updateLiveTrip(tripId, (trip) => {
      const person = trip.people.find((p) => p.id === personId);
      if (person) person.name = newName;
    });
  }

  function removePersonFromTrip(tripId, personId) {
    return updateLiveTrip(tripId, (trip) => {
      trip.people = trip.people.filter((p) => p.id !== personId);
    });
  }

  function addItem(tripId, item) {
    return updateLiveTrip(tripId, (trip) => {
      trip.items.unshift({ id: uid(), createdAt: Date.now(), ...item });
    });
  }

  function updateItem(tripId, itemId, patch) {
    return updateLiveTrip(tripId, (trip) => {
      const item = trip.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, patch);
    });
  }

  function deleteItem(tripId, itemId) {
    return updateLiveTrip(tripId, (trip) => {
      trip.items = trip.items.filter((i) => i.id !== itemId);
    });
  }

  // Payments are logged at the trip level (a lump sum someone paid, e.g.
  // "Morgan paid $100 for the Costco receipt"), separate from items — they
  // don't need to correspond to any single item, so settling up works the
  // same whether one person covers the whole cart or several people chip in
  // at different points during (or after) the trip.
  function addPayment(tripId, payment) {
    return updateLiveTrip(tripId, (trip) => {
      if (!trip.payments) trip.payments = [];
      trip.payments.unshift({ id: uid(), createdAt: Date.now(), ...payment });
    });
  }

  function deletePayment(tripId, paymentId) {
    return updateLiveTrip(tripId, (trip) => {
      trip.payments = (trip.payments || []).filter((p) => p.id !== paymentId);
    });
  }

  // Removes a trip that's still in progress — abandoning it, not ending it,
  // so it does NOT get archived to history. Returns true on success.
  function deleteLiveTrip(tripId) {
    const trips = getLiveTrips().filter((t) => t.id !== tripId);
    return saveLiveTrips(trips);
  }

  function getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  // Returns true on success, false if the write failed.
  function deleteHistoryTrip(tripId) {
    const history = getHistory().filter((t) => t.id !== tripId);
    return saveHistory(history);
  }

  // Moves a trip from the live list to history. Returns true on success,
  // false if the write failed (the trip is left in the live list if
  // archiving it doesn't fit in storage, so it isn't lost).
  function endTrip(tripId) {
    const trips = getLiveTrips();
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) return false;
    const trip = trips[idx];
    trip.endedAt = Date.now();
    const history = getHistory();
    history.unshift(trip);
    if (!saveHistory(history)) return false;
    trips.splice(idx, 1);
    return saveLiveTrips(trips);
  }

  return {
    uid,
    getLiveTrips,
    getLiveTrip,
    createTrip,
    renameTrip,
    addPersonToTrip,
    renamePerson,
    removePersonFromTrip,
    addItem,
    updateItem,
    deleteItem,
    addPayment,
    deletePayment,
    deleteLiveTrip,
    getHistory,
    deleteHistoryTrip,
    endTrip,
  };
})();
