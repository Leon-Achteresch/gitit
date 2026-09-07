import { describe, expect, it, vi } from "vitest";
import { createCoalescedRefresh } from "./coalesced-refresh";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

describe("coalesced repository refresh", () => {
  it("coalesces a burst and follows changes received during a slow read", async () => {
    const first = deferred();
    let source = "before";
    let displayed = "";
    const read = vi.fn(async () => {
      const snapshot = source;
      if (read.mock.calls.length === 1) await first.promise;
      displayed = snapshot;
    });
    const queue = createCoalescedRefresh(read);
    const pending = queue.request();
    await Promise.resolve();
    source = "after";
    for (let i = 0; i < 100; i++) expect(queue.request()).toBe(pending);
    expect(read).toHaveBeenCalledTimes(1);
    first.resolve();
    await pending;
    expect(displayed).toBe("after");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not block a new repository or reload the old one after disposal", async () => {
    const blocked = deferred();
    const oldRead = vi.fn(() => blocked.promise);
    const oldQueue = createCoalescedRefresh(oldRead);
    const pending = oldQueue.request();
    await Promise.resolve();
    void oldQueue.request();
    oldQueue.dispose();
    const newRead = vi.fn(async () => {});
    await createCoalescedRefresh(newRead).request();
    expect(newRead).toHaveBeenCalledTimes(1);
    blocked.resolve();
    await pending;
    await oldQueue.request();
    expect(oldRead).toHaveBeenCalledTimes(1);
  });

  it("allows retry after a rejected read", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const queue = createCoalescedRefresh(read);
    await expect(queue.request()).rejects.toThrow("offline");
    await queue.request();
    expect(read).toHaveBeenCalledTimes(2);
  });
});
