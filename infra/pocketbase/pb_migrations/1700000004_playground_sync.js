/// <reference path="../pb_data/types.d.ts" />

// Per-user playground workspace + recipe sync.
//
// The localStorage layer in src/components/playground/storage.ts stays the
// authoritative source while signed out. When signed in, the Next sync route
// pulls/pushes the JSON blob to PB so the user sees the same workspace on
// other devices.
//
// `user` references PB's built-in `users` auth collection (created on first
// boot). We don't ship a custom auth collection -- PB's defaults are fine
// for now; later we can layer Logto SSO via a custom OAuth2 provider.
migrate(
    (app) => {
        const users = app.findCollectionByNameOrId("users");

        const workspaces = new Collection({
            type: "base",
            name: "playground_workspaces",
            // Auth-only: a user can only see their own row.
            listRule:   "user = @request.auth.id",
            viewRule:   "user = @request.auth.id",
            createRule: "user = @request.auth.id",
            updateRule: "user = @request.auth.id",
            deleteRule: "user = @request.auth.id",
            fields: [
                {
                    name: "user",
                    type: "relation",
                    required: true,
                    collectionId: users.id,
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                // Workspace JSON blob -- shape matches PlaygroundWorkspace from
                // src/components/playground/types. Stored opaquely; the app
                // re-validates on hydrate via existing coerce* functions.
                { name: "workspace", type: "json",     required: true, maxSize: 2000000 },
                { name: "created",   type: "autodate", onCreate: true },
                { name: "updated",   type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_playground_workspaces_user ON playground_workspaces (user)",
            ],
        });
        app.save(workspaces);

        const recipes = new Collection({
            type: "base",
            name: "playground_recipes",
            listRule:   "user = @request.auth.id",
            viewRule:   "user = @request.auth.id",
            createRule: "user = @request.auth.id",
            updateRule: "user = @request.auth.id",
            deleteRule: "user = @request.auth.id",
            fields: [
                {
                    name: "user",
                    type: "relation",
                    required: true,
                    collectionId: users.id,
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                { name: "recipe_id", type: "text",     required: true, min: 1, max: 80 },
                { name: "recipe",    type: "json",     required: true, maxSize: 2000000 },
                { name: "created",   type: "autodate", onCreate: true },
                { name: "updated",   type: "autodate", onCreate: true, onUpdate: true },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_playground_recipes_user_recipe ON playground_recipes (user, recipe_id)",
            ],
        });
        app.save(recipes);
    },
    (app) => {
        app.delete(app.findCollectionByNameOrId("playground_recipes"));
        app.delete(app.findCollectionByNameOrId("playground_workspaces"));
    }
);
