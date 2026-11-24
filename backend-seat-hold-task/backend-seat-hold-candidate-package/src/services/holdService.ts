import type { SeatHold, SeatWithAvailability } from "../domain/types.js";
import { store } from "../store/inMemoryStore.js";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export async function listSeats(eventId: string): Promise<SeatWithAvailability[]> {
  const event = await store.getEvent(eventId);

  if (!event) {
    throw new ApiError(404, "EVENT_NOT_FOUND", `Event ${eventId} was not found`);
  }

  const holds = await store.listHoldsForEvent(eventId);

  return event.seats.map((seat) => {
    const activeHold = holds.find(
      (hold) => hold.status === "active" && hold.seatIds.includes(seat.id)
    );

    return {
      ...seat,
      availability: activeHold ? "held" : seat.status,
      activeHoldId: activeHold?.id
    };
  });
}

export async function createSeatHold(input: {
  eventId: string;
  customerId: string;
  seatIds: string[];
  idempotencyKey?: string;
  now?: Date;
}): Promise<SeatHold> {
  const now = input.now ?? new Date();

  if (input.seatIds.length === 0) {
    throw new ApiError(400, "NO_SEATS_REQUESTED", "At least one seat is required");
  }

  if (input.seatIds.length > 8) {
    throw new ApiError(400, "TOO_MANY_SEATS", "A hold can contain at most 8 seats");
  }

  if (input.idempotencyKey) {
    const existingHold = await store.findHoldByIdempotencyKey(input.idempotencyKey);

    if (existingHold) {
      return existingHold;
    }
  }

  const event = await store.getEvent(input.eventId);

  if (!event) {
    throw new ApiError(404, "EVENT_NOT_FOUND", `Event ${input.eventId} was not found`);
  }

  const requestedSeats = input.seatIds.map((seatId) => event.seats.find((seat) => seat.id === seatId));
  const missingSeatIds = input.seatIds.filter((seatId, index) => !requestedSeats[index]);

  if (missingSeatIds.length > 0) {
    throw new ApiError(404, "SEATS_NOT_FOUND", "Some requested seats do not exist", { seatIds: missingSeatIds });
  }

  const unavailableBaseSeats = requestedSeats
    .filter((seat) => seat && seat.status !== "available")
    .map((seat) => seat?.id);

  if (unavailableBaseSeats.length > 0) {
    throw new ApiError(409, "SEATS_UNAVAILABLE", "Some seats are not available", { seatIds: unavailableBaseSeats });
  }

  const blockingHold = await store.findBlockingHold(input.eventId, input.seatIds, now);

  if (blockingHold) {
    throw new ApiError(409, "SEATS_HELD", "Some seats are already held", {
      holdId: blockingHold.id,
      seatIds: blockingHold.seatIds.filter((seatId) => input.seatIds.includes(seatId))
    });
  }

  // Existing implementation performs availability checks above and writes below as separate steps.
  // Consider what happens if two requests reach this point at the same time.
  return store.createHold({
    eventId: input.eventId,
    customerId: input.customerId,
    seatIds: input.seatIds,
    idempotencyKey: input.idempotencyKey,
    now
  });
}

export async function getHold(holdId: string): Promise<SeatHold> {
  const hold = await store.getHold(holdId);

  if (!hold) {
    throw new ApiError(404, "HOLD_NOT_FOUND", `Hold ${holdId} was not found`);
  }

  return hold;
}

export async function cancelHold(holdId: string): Promise<SeatHold> {
  const hold = await store.cancelHold(holdId);

  if (!hold) {
    throw new ApiError(404, "HOLD_NOT_FOUND", `Hold ${holdId} was not found`);
  }

  return hold;
}
