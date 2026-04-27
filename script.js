const STORAGE_KEY = "tennis-bookings-app";
const COURTS = ["Court 1", "Court 2"];

const form = document.getElementById("booking-form");
const feedback = document.getElementById("feedback");
const nameInput = document.getElementById("name");
const dateInput = document.getElementById("date");
const startTimeInput = document.getElementById("startTime");
const durationInput = document.getElementById("duration");

const courtContainers = {
  "Court 1": document.getElementById("court-1-list"),
  "Court 2": document.getElementById("court-2-list"),
};

const courtCounters = {
  "Court 1": document.getElementById("court-1-count"),
  "Court 2": document.getElementById("court-2-count"),
};

let reservations = loadReservations();

setDefaultDate();
renderReservations();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const date = dateInput.value;
  const startTime = startTimeInput.value;
  const duration = Number(durationInput.value);

  if (!name || !date || !startTime || !duration) {
    showFeedback("Please complete all fields before reserving a court.", "error");
    return;
  }

  if (duration > 90) {
    showFeedback("Reservation time cannot exceed 90 minutes.", "error");
    return;
  }

  const bookingStart = new Date(`${date}T${startTime}`);
  const bookingEnd = new Date(bookingStart.getTime() + duration * 60 * 1000);

  const assignedCourt = COURTS.find((court) => isCourtAvailable(court, bookingStart, bookingEnd));

  if (!assignedCourt) {
    showFeedback("No courts are available for the selected time.", "error");
    return;
  }

  const reservation = {
    id: crypto.randomUUID(),
    name,
    date,
    startTime,
    duration,
    court: assignedCourt,
    startTimestamp: bookingStart.toISOString(),
    endTimestamp: bookingEnd.toISOString(),
  };

  reservations.push(reservation);
  reservations = sortReservations(reservations);
  saveReservations();
  renderReservations();

  showFeedback(
    `${reservation.name} reserved ${reservation.court} on ${formatDate(
      reservation.date
    )} at ${formatTime(reservation.startTime)} for ${reservation.duration} minutes.`,
    "success"
  );

  form.reset();
  durationInput.value = "60";
  setDefaultDate();
});

function loadReservations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? sortReservations(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

function saveReservations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

function isCourtAvailable(court, start, end) {
  return !reservations
    .filter((reservation) => reservation.court === court)
    .some((reservation) => {
      const existingStart = new Date(reservation.startTimestamp);
      const existingEnd = new Date(reservation.endTimestamp);

      return start < existingEnd && end > existingStart;
    });
}

function renderReservations() {
  COURTS.forEach((court) => {
    const items = reservations.filter((reservation) => reservation.court === court);
    courtCounters[court].textContent = `${items.length} booking${items.length === 1 ? "" : "s"}`;

    if (items.length === 0) {
      courtContainers[court].innerHTML =
        '<div class="empty-state">No reservations for this court yet.</div>';
      return;
    }

    courtContainers[court].innerHTML = items
      .map(
        (reservation) => `
          <article class="reservation-card">
            <h4>${escapeHtml(reservation.name)}</h4>
            <div class="reservation-meta">
              <span>${formatDate(reservation.date)}</span>
              <span>${formatTime(reservation.startTime)} - ${formatEndTime(
                reservation.startTimestamp,
                reservation.duration
              )}</span>
              <span>${reservation.duration} minutes</span>
            </div>
          </article>
        `
      )
      .join("");
  });
}

function sortReservations(items) {
  return [...items].sort(
    (first, second) =>
      new Date(first.startTimestamp).getTime() - new Date(second.startTimestamp).getTime()
  );
}

function showFeedback(message, type) {
  feedback.innerHTML = `<div class="feedback-message ${type}">${escapeHtml(message)}</div>`;
}

function setDefaultDate() {
  if (!dateInput.value) {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    dateInput.value = new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
  }
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatEndTime(startTimestamp, duration) {
  const date = new Date(new Date(startTimestamp).getTime() + duration * 60 * 1000);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
