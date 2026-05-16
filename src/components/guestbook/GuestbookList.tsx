export type GuestbookEntry = {
    id: string;
    name: string;
    message: string;
    created: string;
};

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return iso;
    }
}

export function GuestbookList({
    initialEntries,
}: {
    initialEntries: GuestbookEntry[];
}) {
    if (initialEntries.length === 0) {
        return (
            <p className="my-6 text-app-muted">
                {"// no entries yet -- be the first"}
            </p>
        );
    }
    return (
        <ul className="my-6 flex flex-col gap-3">
            {initialEntries.map((entry) => (
                <li
                    key={entry.id}
                    className="rounded border border-app-border bg-surface p-3"
                >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-mono text-app-accent">
                            {entry.name}
                        </span>
                        <span className="text-app-muted">
                            {formatDate(entry.created)}
                        </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-app-text">
                        {entry.message}
                    </p>
                </li>
            ))}
        </ul>
    );
}
