import { Children, type ReactNode } from "react";
import { RichText } from "./RichText";

export function RichParagraph({ children }: { children: ReactNode }) {
  if (typeof children === "string") {
    return <p><RichText>{children}</RichText></p>;
  }

  const items = Children.toArray(children);
  const hasStrings = items.some((child) => typeof child === "string");

  if (!hasStrings) return <p>{children}</p>;

  return (
    <p>
      {items.map((child, i) =>
        typeof child === "string"
          ? <RichText key={i}>{child}</RichText>
          : child
      )}
    </p>
  );
}
