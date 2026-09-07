/// <reference path="../pb_data/types.d.ts" />

// Site-wide counters keyed by name (e.g. "visitors"). One row per counter; the
// Next route handlers increment `value` atomically through the server SDK,
// mirroring the post_metrics pattern but without per-slug granularity.
migrate(
    (app) => {
        const collection = new Collection({
            type: "base",
            name: "site_metrics",
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "key",     type: "text",     required: true, min: 1, max: 80 },
                { name: "value",   type: "number",   required: false, onlyInt: true, min: 0 },
                { name: "created", type: "autodate", onCreate: true },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_site_metrics_key ON site_metrics (key)",
            ],
        });
        app.save(collection);
    },
    (app) => {
        const c = app.findCollectionByNameOrId("site_metrics");
        app.delete(c);
    }
);
