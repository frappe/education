/**
 * Saves what a student is typing a moment after they stop, so nothing is lost. Only one save runs at a
 * time; if the person typed more meanwhile, another save follows. Logic only, no visual parts.
 */
export function createAutosave(options: {
  save: () => Promise<void>;
  delayMs?: number;
  onState?: (state: "idle" | "waiting" | "saving" | "saved" | "error") => void;
}) {
  const delay = options.delayMs ?? 1500;
  const tell = options.onState ?? (() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;

  async function run() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    tell("saving");
    try {
      do {
        again = false;
        await options.save();
      } while (again);
      tell("saved");
    } catch {
      tell("error");
    } finally {
      running = false;
    }
  }

  return {
    /** Call after every change. */
    touch() {
      clearTimeout(timer);
      tell("waiting");
      timer = setTimeout(() => void run(), delay);
    },
    /** Save now (before handing in, or when leaving). */
    async flush() {
      clearTimeout(timer);
      await run();
      // wait for a save that was already running to finish
      while (running) await new Promise((r) => setTimeout(r, 10));
    },
    stop() {
      clearTimeout(timer);
    },
  };
}
