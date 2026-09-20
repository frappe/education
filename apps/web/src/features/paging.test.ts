import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { pageCount, pageOf, PAGE_SIZE, usePaging } from "./paging";

const numbers = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("pages of ten", () => {
  it("a page is ten rows, and the last page has what is left", () => {
    expect(PAGE_SIZE).toBe(10);
    expect(pageOf(numbers(25), 1)).toEqual(numbers(10));
    expect(pageOf(numbers(25), 2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(pageOf(numbers(25), 3)).toEqual([21, 22, 23, 24, 25]);
    expect(pageOf(numbers(25), 4)).toEqual([]);
  });

  it("counts the pages, and there is always at least one", () => {
    expect([0, 1, 10, 11, 20, 21, 95].map((n) => pageCount(n))).toEqual([1, 1, 1, 2, 2, 3, 10]);
  });
});

describe("usePaging", () => {
  it("shows the rows of the current page and knows the total", () => {
    const items = ref(numbers(23));
    const p = usePaging(items);
    expect(p.total.value).toBe(23);
    expect(p.pages.value).toBe(3);
    expect(p.shown.value).toEqual(numbers(10));
    p.page.value = 3;
    expect(p.shown.value).toEqual([21, 22, 23]);
  });

  it("moves back to the last page that exists when the list gets shorter", async () => {
    const items = ref(numbers(21));
    const p = usePaging(items);
    p.page.value = 3;
    items.value = numbers(15);
    await nextTick();
    expect(p.page.value).toBe(2);
    items.value = [];
    await nextTick();
    expect(p.page.value).toBe(1);
    expect(p.shown.value).toEqual([]);
  });

  it("goes back to page 1 when the thing it depends on changes (like a search)", async () => {
    const search = ref("");
    const p = usePaging(() => numbers(40), { resetOn: search });
    p.page.value = 4;
    search.value = "a";
    await nextTick();
    expect(p.page.value).toBe(1);
  });

  it("reads a getter, so a list that is made from other lists works too", () => {
    const a = ref([1, 2]);
    const b = ref([3, 4, 5]);
    const p = usePaging(() => [...a.value, ...b.value]);
    expect(p.shown.value).toEqual([1, 2, 3, 4, 5]);
  });
});
