"use client";

import { BellRingingIcon, BellSlashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { POLL_INTERVAL_MS, alertsFor, type Alert, type OrderChanges } from "@/lib/live-orders";

// Each alert is a run of beeps: [frequency in Hz, seconds]. New Orders get a long, loud, rising run.
const SOUNDS: Record<Alert, [number, number][]> = {
  placed: [
    [880, 0.18],
    [1175, 0.18],
    [1568, 0.3],
    [880, 0.18],
    [1175, 0.18],
    [1568, 0.3],
  ],
  cancelled: [
    [660, 0.3],
    [440, 0.45],
  ],
};

/** Plays one alert after any already queued, so several new Orders give several runs of beeps. */
function play(context: AudioContext, alert: Alert, startAt: number): number {
  let at = Math.max(startAt, context.currentTime);
  for (const [frequency, seconds] of SOUNDS[alert]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.value = 1;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + seconds);
    at += seconds + 0.05;
  }
  return at + 0.3;
}

/**
 * Keeps the Orders page live: polls for changes, refreshes the list when any Order changed, and, once a
 * Staff Member taps "Start alerts" (browsers block sound until a tap), beeps for new and cancelled Orders.
 */
export function LiveOrders() {
  const router = useRouter();
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let cursor: number | null = null;
    let queuedUntil = 0;
    let queuedOn: AudioContext | null = null;
    let polling = false;
    let stopped = false;

    async function poll() {
      // A slow request must finish first, or two polls from the same cursor would beep twice.
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(`/api/admin/orders/changes${cursor === null ? "" : `?after=${cursor}`}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (stopped) return;
        // Logged out elsewhere or the session expired: alerts can't work, so say so by going to log in.
        if (response.status === 401) return router.push("/admin/login");
        if (!response.ok) return;
        const changes: OrderChanges = await response.json();
        cursor = changes.cursor;
        if (changes.updated.length) router.refresh();
        const context = audioRef.current;
        if (!context) return;
        // Each AudioContext has its own clock, so a fresh one (alerts turned off and on) starts a fresh queue.
        if (context !== queuedOn) [queuedOn, queuedUntil] = [context, 0];
        // Phones suspend audio after sleeping or switching tabs.
        if (context.state === "suspended") await context.resume();
        for (const alert of alertsFor(changes)) queuedUntil = play(context, alert, queuedUntil);
      } catch {
        // Offline for a moment: the next poll catches up from the same cursor.
      } finally {
        polling = false;
      }
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router]);

  useEffect(() => () => void audio?.close(), [audio]);

  function toggle() {
    if (audio) {
      audioRef.current = null;
      setAudio(null);
      return;
    }
    // Created inside the tap, so the browser lets it play; a short beep confirms the sound works.
    const context = new AudioContext();
    play(context, "cancelled", 0);
    audioRef.current = context;
    setAudio(context);
  }

  return (
    <Button variant={audio ? "outline" : "default"} onClick={toggle} aria-pressed={audio !== null}>
      {audio ? <BellRingingIcon aria-hidden /> : <BellSlashIcon aria-hidden />}
      {audio ? "Alerts on" : "Start alerts"}
    </Button>
  );
}
