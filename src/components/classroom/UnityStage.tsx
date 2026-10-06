import { useEffect, useRef, useState, type ReactNode } from "react";

type UnityInstance = { Quit: () => Promise<void> };
declare global {
  interface Window {
    createUnityInstance?: (canvas: HTMLCanvasElement, config: Record<string, unknown>, onProgress?: (p: number) => void) => Promise<UnityInstance>;
  }
}

/** Plays a learner-supplied Unity WebGL build (uncompressed) from local files; falls back to the built-in 3D classroom. */
export function UnityStage({ fallback }: { fallback: ReactNode }) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!files || !canvasRef.current) return;
    const find = (suffix: string) => files.find(f => f.name.endsWith(suffix));
    const loader = find(".loader.js"), data = find(".data"), framework = find(".framework.js"), wasm = find(".wasm");
    if (!loader || !data || !framework || !wasm) {
      setStatus("Missing files. Choose the Build folder's .loader.js, .data, .framework.js and .wasm (export with Compression Format: Disabled).");
      return;
    }
    const urls = [loader, data, framework, wasm].map(f => URL.createObjectURL(f));
    let instance: UnityInstance | undefined; let cancelled = false;
    const script = document.createElement("script");
    script.src = urls[0]!;
    script.onload = () => {
      if (cancelled || !window.createUnityInstance) return;
      setStatus("Loading scene… 0%");
      window.createUnityInstance(canvasRef.current!, { dataUrl: urls[1], frameworkUrl: urls[2], codeUrl: urls[3], companyName: "AI KYRO", productName: "Classroom" },
        p => setStatus(`Loading scene… ${Math.round(p * 100)}%`))
        .then(i => { instance = i; setStatus(""); })
        .catch(e => setStatus(`Could not start this Unity build: ${String(e)}`));
    };
    script.onerror = () => setStatus("Could not read the loader file.");
    document.body.appendChild(script);
    return () => { cancelled = true; instance?.Quit().catch(() => {}); script.remove(); urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [files]);

  return (
    <>
      {files ? <canvas ref={canvasRef} id="unity-canvas" tabIndex={-1} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : fallback}
      <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 5, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", maxWidth: "70%" }}>
        <input ref={inputRef} type="file" multiple hidden accept=".js,.data,.wasm" onChange={e => { const l = e.target.files; if (l?.length) { setStatus(""); setFiles(Array.from(l)); } e.target.value = ""; }} />
        <button type="button" className="unity-btn" onClick={() => inputRef.current?.click()}>{files ? "Load another Unity scene" : "Load my Unity scene"}</button>
        {files && <button type="button" className="unity-btn" onClick={() => { setFiles(null); setStatus(""); }}>Back to built-in classroom</button>}
        {status && <span className="unity-status">{status}</span>}
      </div>
    </>
  );
}
