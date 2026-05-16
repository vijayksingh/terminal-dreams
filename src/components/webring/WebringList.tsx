export type WebringSite = {
    id: string;
    label: string;
    url: string;
    description?: string;
    position?: number;
};

export function WebringList({ sites }: { sites: WebringSite[] }) {
    if (sites.length === 0) {
        return (
            <p className="my-6 text-app-muted">
                {"// no sites in the ring yet"}
            </p>
        );
    }
    return (
        <ul className="my-6 flex flex-col gap-3">
            {sites.map((site) => (
                <li
                    key={site.id}
                    className="rounded border border-app-border bg-surface p-3"
                >
                    <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-app-accent hover:underline"
                    >
                        {site.label}
                    </a>
                    {site.description && (
                        <p className="mt-1 text-sm text-app-muted">
                            {site.description}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}
