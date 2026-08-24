import type PocketBase from "pocketbase";
import { bumpLikes, bumpViews, validSlug } from "./post-metrics";

function clientWithRow(row: { id: string; views: number; likes: number }) {
    const update = jest.fn(async (_id: string, change: Record<string, number>) => ({
        ...row,
        views: row.views + (change["views+"] ?? 0),
        likes:
            row.likes +
            (change["likes+"] ?? 0) -
            (change["likes-"] ?? 0),
    }));
    const collection = jest.fn(() => ({
        getFirstListItem: jest.fn(async () => row),
        update,
    }));

    return {
        pb: { collection } as unknown as PocketBase,
        update,
    };
}

describe("post metrics", () => {
    it("accepts post slugs but rejects unsafe input", () => {
        expect(validSlug("blog/atomic-counters")).toBe(true);
        expect(validSlug("../admin")).toBe(false);
        expect(validSlug("blog/<script>")).toBe(false);
    });

    it("increments views with PocketBase's atomic modifier", async () => {
        const { pb, update } = clientWithRow({
            id: "metric-1",
            views: 10,
            likes: 2,
        });

        await expect(bumpViews(pb, "blog/atomic-counters")).resolves.toEqual({
            views: 11,
            likes: 2,
        });
        expect(update).toHaveBeenCalledWith("metric-1", { "views+": 1 });
    });

    it("increments and decrements likes atomically", async () => {
        const first = clientWithRow({
            id: "metric-1",
            views: 10,
            likes: 2,
        });
        const second = clientWithRow({
            id: "metric-1",
            views: 10,
            likes: 2,
        });

        await bumpLikes(first.pb, "blog/atomic-counters", 1);
        await bumpLikes(second.pb, "blog/atomic-counters", -1);

        expect(first.update).toHaveBeenCalledWith("metric-1", { "likes+": 1 });
        expect(second.update).toHaveBeenCalledWith("metric-1", { "likes-": 1 });
    });
});
