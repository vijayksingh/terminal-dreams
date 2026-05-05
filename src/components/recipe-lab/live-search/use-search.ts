import { useState } from "react";

export function useSearch(items: string[]) {
  const [query, setQuery] = useState("");
  const results = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );
  return { query, setQuery, results };
}
