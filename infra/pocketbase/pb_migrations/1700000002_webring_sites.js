/// <reference path="../pb_data/types.d.ts" />

// Curated webring. Operator manages entries via the PB admin UI; site reads
// them anonymously. Position controls render order.
migrate(
    (app) => {
        const collection = new Collection({
            type: "base",
            name: "webring_sites",
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "label",       type: "text",     required: true, min: 1, max: 80 },
                { name: "url",         type: "url",      required: true },
                { name: "description", type: "text",     required: false, max: 200 },
                { name: "position",    type: "number",   required: false },
                { name: "created",     type: "autodate", onCreate: true },
                { name: "updated",     type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE INDEX idx_webring_position ON webring_sites (position)",
            ],
        });
        app.save(collection);
    },
    (app) => {
        const c = app.findCollectionByNameOrId("webring_sites");
        app.delete(c);
    }
);
