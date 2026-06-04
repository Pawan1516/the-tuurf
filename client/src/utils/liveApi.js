// src/utils/liveApi.js

/**
 * Simple abstraction for live match updates.
 * Tries to open a WebSocket connection to the live endpoint.
 * If unavailable, falls back to periodic polling of a REST endpoint.
 *
 * The caller provides a matchId and a callback that receives the
 * update payload (JSON). The callback is invoked whenever new data
 * arrives.
 */

const WS_URL = process.env.REACT_APP_LIVE_WS || "wss://api.turf.com/live";
const POLL_URL = process.env.REACT_APP_LIVE_API || "https://api.turf.com/live";
const POLL_INTERVAL_MS = 5000; // 5 seconds

/**
 * Connect to live updates for a specific match.
 * @param {string} matchId – MongoDB‑style match identifier.
 * @param {(data:any) => void} onMessage – Handler for incoming payloads.
 * @returns {{close:()=>void}} – An object with a `close` method to clean up.
 */
export function connectLive(matchId, onMessage) {
  if (!matchId) {
    console.warn("connectLive called without matchId");
    return { close: () => {} };
  }

  // Try WebSocket first
  let ws;
  try {
    ws = new WebSocket(`${WS_URL}/${matchId}`);
    ws.onopen = () => console.log("Live WS connected", matchId);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (_) {
        console.error("Invalid WS payload", e.data);
      }
    };
    ws.onerror = (e) => {
      console.error("Live WS error, falling back to poll", e);
      fallbackPoll();
    };
    ws.onclose = () => console.log("Live WS closed", matchId);
    return { close: () => ws && ws.close() };
  } catch (err) {
    console.warn("WS construction failed, using poll", err);
    // fall through to poll
  }

  // ----------- Fallback polling implementation ------------
  let intervalId = null;
  function fallbackPoll() {
    intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${POLL_URL}/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        onMessage(data);
      } catch (e) {
        console.error("Polling live data failed", e);
      }
    }, POLL_INTERVAL_MS);
  }

  fallbackPoll();
  return { close: () => intervalId && clearInterval(intervalId) };
}
