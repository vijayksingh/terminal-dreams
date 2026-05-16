/// <reference path="../pb_data/types.d.ts" />

// Per-post counters keyed by slug. One row per slug; the Next route handlers
// increment `views`/`likes` atomically through the server SDK.
//
// `slug` is unique -- a single row holds the running totals.
migrate(
    (app) => {
        const collection = new Collection({
            type: "base",
            name: "post_metrics",
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "slug",    type: "text",     required: true, min: 1, max: 200 },
                { name: "views",   type: "number",   required: false, onlyInt: true, min: 0 },
                { name: "likes",   type: "number",   required: false, onlyInt: true, min: 0 },
                { name: "created", type: "autodate", onCreate: true },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_post_metrics_slug ON post_metrics (slug)",
            ],
        });
        app.save(collection);
    },
    (app) => {
        const c = app.findCollectionByNameOrId("post_metrics");
        app.delete(c);
    }
);
