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

  function saveActiveTrip(trip) {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(trip));
  }

  function clearActiveTrip() {
    localStorage.removeItem(ACTIVE_KEY);
  }

  function createTrip(peopleNames, tripName) {
    if (getActiveTrip()) {
      endActiveTrip();
    }
    const trip = {
      id: uid(),
      name: tripName ? tripName.trim() : "",
      createdAt: Date.now(),
      people: peopleNames.map((name) => ({ id: uid(), name })),
      items: [],
    };
    saveActiveTrip(trip);
    return trip;
  }

  function addPersonToActiveTrip(name) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.people.push({ id: uid(), name });
    saveActiveTrip(trip);
    return trip;
  }

  function addItem(item) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.items.unshift({ id: uid(), createdAt: Date.now(), ...item });
    saveActiveTrip(trip);
    return trip;
  }

  function updateItem(itemId, patch) {
    const trip = getActiveTrip();
    if (!trip) return null;
    const item = trip.items.find((i) => i.id === itemId);
    if (!item) return trip;
    Object.assign(item, patch);
    saveActiveTrip(trip);
    return trip;
  }

  function deleteItem(itemId) {
    const trip = getActiveTrip();
    if (!trip) return null;
    trip.items = trip.items.filter((i) => i.id !== itemId);
    saveActiveTrip(trip);
    return trip;
  }

  function getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function endActiveTrip() {
    const trip = getActiveTrip();
    if (!trip) return;
    trip.endedAt = Date.now();
    const history = getHistory();
    history.unshift(trip);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    clearActiveTrip();
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
    endActiveTrip,
  };
})();
