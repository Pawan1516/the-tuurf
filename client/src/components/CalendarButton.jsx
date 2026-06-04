// CalendarButton.jsx
// Component that generates an .ics calendar file for a selected slot and triggers a download.
// Props:
//   turfId (string) – optional ID of the turf (used in the event summary).
//   slotInfo (object) – { date: 'YYYY-MM-DD', startTime: 'HH:mm', endTime: 'HH:mm' }
// The button is styled with Tailwind utilities to match the app’s design.

import React from "react";

/** Helper to format a date‑time string into the iCalendar format (UTC). */
function toICSTime(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:mm"
  const [year, month, day] = dateStr.split("-");
  const [hour, minute] = timeStr.split(":");
  // iCalendar expects YYYYMMDDTHHMMSSZ (UTC). We assume local time; to keep it simple we omit Z.
  return `${year}${month}${day}T${hour}${minute}00`;
}

export default function CalendarButton({ turfId = "", slotInfo = {} }) {
  const { date, startTime, endTime } = slotInfo;

  const handleDownload = () => {
    if (!date || !startTime || !endTime) {
      alert("Please select a date and time first.");
      return;
    }
    const uid = `${Date.now()}@the-tuurf.app`;
    const dtStart = toICSTime(date, startTime);
    const dtEnd = toICSTime(date, endTime);
    const summary = turfId ? `Booking @ ${turfId}` : "Turf Booking";
    const description = `Booked slot on ${date} from ${startTime} to ${endTime}`;
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//The Turf//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${uid}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${summary}\nDESCRIPTION:${description}\nEND:VEVENT\nEND:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "booking.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="mt-4 w-full bg-emerald-600 text-white py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all"
    >
      Add to Calendar
    </button>
  );
}
