import CraftPlayground from "@/components/playground/CraftPlayground";

export default function PlaygroundPage() {
  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
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
