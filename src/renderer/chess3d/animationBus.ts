type AnimCompletePayload = {
  pieceId: string;
  to: { x: number; y: number };
  moveId?: string;
};

type Subscriber = (p: AnimCompletePayload) => void;

const subscribers: Set<Subscriber> = new Set();

// registry of expected moves: key -> moveId
const expectedMoves = new Map<string, string>();

function keyFor(pieceId: string, to: { x: number; y: number }) {
  return `${pieceId}:${to.x},${to.y}`;
}

export function registerExpectedMove(moveId: string, pieceId: string, to: { x: number; y: number }) {
  try {
    expectedMoves.set(keyFor(pieceId, to), moveId);
  } catch (e) {
    // ignore
  }
}

export function subscribeAnimationComplete(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function emitAnimationComplete(payload: { pieceId: string; to: { x: number; y: number } }) {
  // attach moveId if registered
  const k = keyFor(payload.pieceId, payload.to);
  const moveId = expectedMoves.get(k);
  if (moveId) {
    // clear mapping once consumed
    expectedMoves.delete(k);
  }

  const full: AnimCompletePayload = { ...payload, moveId };

  for (const s of Array.from(subscribers)) {
    try {
      s(full);
    } catch (e) {
      console.error("[animationBus] subscriber error", e);
    }
  }
}

export function waitForAnimationComplete(filter: (p: AnimCompletePayload) => boolean, timeoutMs = 2000): Promise<AnimCompletePayload> {
  return new Promise((resolve, reject) => {
    const unsub = subscribeAnimationComplete((p) => {
      try {
        if (filter(p)) {
          unsub();
          clearTimeout(timer);
          resolve(p);
        }
      } catch (e) {
        // ignore
      }
    });

    const timer = setTimeout(() => {
      try {
        unsub();
      } catch (e) {}
      reject(new Error("waitForAnimationComplete: timeout"));
    }, timeoutMs);
  });
}

export type { AnimCompletePayload };
