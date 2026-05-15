import type { Monaco } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { VESPER_THEME_DATA, VESPER_THEME_NAME, VESPER_LIGHT_THEME_DATA, VESPER_LIGHT_THEME_NAME } from "./monaco-vesper";

export function useMonacoTheme() {
  const [themeName, setThemeName] = useState(VESPER_THEME_NAME);
  useEffect(() => {
    const read = () => {
      const val = document.documentElement.getAttribute("data-theme");
      setThemeName(val === "light" ? VESPER_LIGHT_THEME_NAME : VESPER_THEME_NAME);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return themeName;
}

export function setupMonaco(monaco: Monaco): void {
  monaco.editor.defineTheme(VESPER_THEME_NAME, VESPER_THEME_DATA);
  monaco.editor.defineTheme(VESPER_LIGHT_THEME_NAME, VESPER_LIGHT_THEME_DATA);

  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2017,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    strict: true,
    allowJs: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    skipLibCheck: true,
    allowNonTsExtensions: true,
  };

  const diagnosticsOptions = {
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  };

  for (const defaults of [
    monaco.languages.typescript.typescriptDefaults,
    monaco.languages.typescript.javascriptDefaults,
  ]) {
    defaults.setCompilerOptions(compilerOptions);
    defaults.setEagerModelSync(true);
    defaults.setDiagnosticsOptions(diagnosticsOptions);
  }
}
