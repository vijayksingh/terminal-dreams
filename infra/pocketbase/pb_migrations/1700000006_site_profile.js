/// <reference path="../pb_data/types.d.ts" />

// Editable site profile copy. Operator updates rows via the PB admin UI; the
// Next route handler reads them anonymously and exposes a flat key/value map
// to the homepage about card. Add keys here by inserting new rows -- no schema
// change required.
migrate(
    (app) => {
        const collection = new Collection({
            type: "base",
            name: "site_profile",
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "key",     type: "text",     required: true, min: 1, max: 80  },
                { name: "value",   type: "text",     required: false, max: 500 },
                { name: "created", type: "autodate", onCreate: true },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_site_profile_key ON site_profile (key)",
            ],
        });
        app.save(collection);

        // Seed with the strings that were previously hardcoded in
        // RetroAboutCard plus the keys consumed by the /about page widgets.
        const seed = [
            ["name",            "vijay"],
            ["handle",          "~/vijay"],
            ["tagline",         "tinkers with the web, one commit at a time"],
            ["now",             "~/now — building small web tools"],
            ["uses",            "~/uses — editor, theme, dotfiles"],
            ["webring",         "~/webring — prev • random • next"],
            ["readme",          "/colophon"],
            // /about page hooks
            ["bio",             "I build small web things — interactive blog posts, recipe playgrounds, browser-native IDEs. This site is my workshop."],
            ["since_year",      "2025"],
            ["github_username", "vijayksingh"],
            ["github_repo",     "vijayksingh/terminal-dreams"],
        ];
        for (const [key, value] of seed) {
            const record = new Record(collection, { key, value });
            app.save(record);
        }
    },
    (app) => {
        const c = app.findCollectionByNameOrId("site_profile");
        app.delete(c);
    }
);
