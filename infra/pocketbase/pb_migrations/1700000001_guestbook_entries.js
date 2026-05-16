/// <reference path="../pb_data/types.d.ts" />

// Public guestbook. Anyone can read; writes go through the Next route handler
// (PB list/view rules allow public read, create rule blocks direct browser
// writes -- only the server-side admin token can insert).
migrate(
    (app) => {
        const collection = new Collection({
            type: "base",
            name: "guestbook_entries",
            // Public read (used by the Next page + admin moderation later).
            listRule: "",
            viewRule: "",
            // Blank string in PB rule grammar = "everyone allowed"; null = "no one".
            // We use null here because anon writes go through Next, which auths as
            // a superuser via the server-side SDK.
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "name",     type: "text",     required: true, min: 1, max: 80  },
                { name: "message",  type: "text",     required: true, min: 1, max: 500 },
                // Stored only by the server; not surfaced to anonymous reads
                // by default. Kept for future abuse-tracking.
                { name: "ip_hash",  type: "text",     required: false, max: 64 },
                { name: "approved", type: "bool",     required: false },
                // PB v0.23+ requires autodate fields to be declared explicitly
                // before you can reference them in indexes.
                { name: "created",  type: "autodate", onCreate: true },
                { name: "updated",  type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE INDEX idx_guestbook_created ON guestbook_entries (created)",
            ],
        });
        app.save(collection);
    },
    (app) => {
        const c = app.findCollectionByNameOrId("guestbook_entries");
        app.delete(c);
    }
);
