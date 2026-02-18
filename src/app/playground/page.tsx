import { Breadcrumb } from "@/components/retro/Breadcrumb";
import CraftPlayground from "@/components/playground/CraftPlayground";

export default function PlaygroundPage() {
  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <header
        className="shrink-0 flex items-center px-4 h-9"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Breadcrumb items={[{ label: "playground" }]} />
      </header>
      <main className="min-h-0 flex-1">
        <CraftPlayground
          storageKey="global-playground"
          initialPreset="react-ts"
          fillHeight
          fullPageChrome
          className="h-full"
        />
      </main>
    </div>
  );
}
