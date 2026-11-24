import { randomUUID } from "node:crypto";
import type { Event, SeatHold } from "../domain/types.js";
import { initialEvents } from "../data/seed.js";
import { addMilliseconds, HOLD_TTL_MS, sleep } from "../utils/time.js";

function cloneEvent(event: Event): Event {
  return {
    ...event,
    seats: event.seats.map((seat) => ({ ...seat }))
  };
}

function cloneHold(hold: SeatHold): SeatHold {
  return {
    ...hold,
    seatIds: [...hold.seatIds]
  };
}

export class InMemoryStore {
  private events = new Map<string, Event>();
  private holds = new Map<string, SeatHold>();

  constructor(events: Event[] = initialEvents) {
    for (const event of events) {
      this.events.set(event.id, cloneEvent(event));
    }
  }

  reset(): void {
    this.events.clear();
    this.holds.clear();

    for (const event of initialEvents) {
      this.events.set(event.id, cloneEvent(event));
    }
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    await sleep(5);
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : undefined;
  }

  async getHold(holdId: string): Promise<SeatHold | undefined> {
    await sleep(5);
    const hold = this.holds.get(holdId);
    return hold ? cloneHold(hold) : undefined;
  }

  async listHoldsForEvent(eventId: string): Promise<SeatHold[]> {
    await sleep(5);
    return [...this.holds.values()]
      .filter((hold) => hold.eventId === eventId)
      .map(cloneHold);
  }

  async findHoldByIdempotencyKey(idempotencyKey: string): Promise<SeatHold | undefined> {
    await sleep(5);

    // NOTE: This inherited implementation intentionally treats idempotency keys as globally unique.
    // That may or may not be a safe assumption for a real API.
    const hold = [...this.holds.values()].find((candidate) => candidate.idempotencyKey === idempotencyKey);
    return hold ? cloneHold(hold) : undefined;
  }

  async findBlockingHold(eventId: string, seatIds: string[], now: Date): Promise<SeatHold | undefined> {
    await sleep(15);

    // NOTE: A background cleanup job marks expired holds as cancelled.
    // This function currently trusts that cleanup has already happened.
    return [...this.holds.values()]
      .filter((hold) => hold.eventId === eventId)
      .filter((hold) => hold.status === "active")
      .find((hold) => hold.seatIds.some((seatId) => seatIds.includes(seatId)));
  }

  async createHold(input: {
    eventId: string;
    customerId: string;
    seatIds: string[];
    idempotencyKey?: string;
    now: Date;
  }): Promise<SeatHold> {
    await sleep(25);

    const hold: SeatHold = {
      id: randomUUID(),
      eventId: input.eventId,
      customerId: input.customerId,
      seatIds: [...input.seatIds],
      status: "active",
      idempotencyKey: input.idempotencyKey,
      createdAt: input.now.toISOString(),
      expiresAt: addMilliseconds(input.now, HOLD_TTL_MS).toISOString()
    };

    this.holds.set(hold.id, hold);
    return cloneHold(hold);
  }

  async cancelHold(holdId: string): Promise<SeatHold | undefined> {
    await sleep(10);
    const hold = this.holds.get(holdId);

    if (!hold) {
      return undefined;
    }

    const cancelled = { ...hold, status: "cancelled" as const };
    this.holds.set(holdId, cancelled);
    return cloneHold(cancelled);
  }

  async cleanupExpiredHolds(now: Date): Promise<number> {
    let cancelledCount = 0;

    for (const hold of this.holds.values()) {
      if (hold.status === "active" && new Date(hold.expiresAt).getTime() <= now.getTime()) {
        this.holds.set(hold.id, { ...hold, status: "cancelled" });
        cancelledCount += 1;
      }
    }

    return cancelledCount;
  }
}

export const store = new InMemoryStore();
