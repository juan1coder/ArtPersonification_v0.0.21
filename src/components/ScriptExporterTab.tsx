import { useState, useMemo } from "react";
import { generateBashScript, ScriptOptions } from "../utils/scriptGenerator";
import { Download, Copy, Check, Terminal, FileCode, ShieldAlert, Cpu, Sparkles } from "lucide-react";

interface ScriptExporterTabProps {
  gpuVramGB: number;
}

export default function ScriptExporterTab({ gpuVramGB }: ScriptExporterTabProps) {
  const [largeModelContext, setLargeModelContext] = useState<number>(7168);
  const [standardModelContext, setStandardModelContext] = useState<number>(16384);
  const [repeatPenalty, setRepeatPenalty] = useState<number>(1.15);
  const [copied, setCopied] = useState<boolean>(false);

  const scriptOptions: ScriptOptions = useMemo(
    () => ({
      gpuVramGB,
      largeModelContext,
      standardModelContext,
      maxPredictTokens: 4096,
      repeatPenalty,
      autoMinifyJson: true,
    }),
    [gpuVramGB, largeModelContext, standardModelContext, repeatPenalty]
  );

  const generatedScript = useMemo(() => generateBashScript(scriptOptions), [scriptOptions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "artpersona.sh";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Tuning & Instructions */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Actions Card */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <FileCode className="h-4 w-4" />
              Download & Install
            </h2>

            <div className="space-y-2">
              <button
                type="button"
                id="btn-copy-script"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-stone-950" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied Script to Clipboard!" : "Copy Full Bash Script"}
              </button>

              <button
                type="button"
                id="btn-download-script"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-4 py-2.5 text-xs font-medium text-stone-200 hover:border-stone-600 hover:text-white transition-colors"
              >
                <Download className="h-4 w-4 text-cyan-400" />
                Download artpersona.sh
              </button>
            </div>

            {/* Quick Terminal Guide */}
            <div className="mt-4 rounded-lg bg-stone-950 border border-stone-800 p-3">
              <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-1.5 flex items-center gap-1">
                <Terminal className="h-3 w-3 text-emerald-400" />
                Terminal One-Liner
              </span>
              <pre className="text-[11px] font-mono text-emerald-300 select-all whitespace-pre-wrap leading-relaxed">
{`chmod +x artpersona.sh
./artpersona.sh`}
              </pre>
            </div>
          </div>

          {/* Script Parameter Tuner */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-cyan-400" />
              Context & VRAM Settings
            </h3>

            <div>
              <label className="text-xs text-stone-300 block mb-1">
                Large Models Context (26B - 32B):
              </label>
              <select
                value={largeModelContext}
                onChange={(e) => setLargeModelContext(Number(e.target.value))}
                className="w-full rounded border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs font-mono text-stone-100"
              >
                <option value={6144}>6,144 tokens (Extra VRAM headroom)</option>
                <option value={7168}>7,168 tokens (Golden Sweet Spot ⭐)</option>
                <option value={8192}>8,192 tokens (Max context for 16GB)</option>
              </select>
              <p className="text-[10px] text-stone-400 mt-1">
                Applies automatically when selecting Qwen 27B, Gemma 26B, or Granite 30B.
              </p>
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">
                Standard Models Context (≤14B):
              </label>
              <select
                value={standardModelContext}
                onChange={(e) => setStandardModelContext(Number(e.target.value))}
                className="w-full rounded border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs font-mono text-stone-100"
              >
                <option value={8192}>8,192 tokens</option>
                <option value={12288}>12,288 tokens</option>
                <option value={16384}>16,384 tokens (Full window)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">
                Repetition Penalty:
              </label>
              <input
                type="number"
                step={0.05}
                min={1.0}
                max={1.5}
                value={repeatPenalty}
                onChange={(e) => setRepeatPenalty(Number(e.target.value))}
                className="w-full rounded border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs font-mono text-stone-100"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                1.15 prevents looping while maintaining natural creative prose.
              </p>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Included Enhancements
            </h3>
            <ul className="space-y-2 text-xs text-stone-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>
                  <strong>Dynamic Context:</strong> Case-insensitive regex matching for 26B/27B/30B.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>
                  <strong>JSON Minifier:</strong> Strips ~950 tokens of whitespace from persona prompts.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>
                  <strong>Lossless Prompt Logger:</strong> Saves to <code>last_prompt.txt</code> before API call.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>
                  <strong>Live ANSI Stream:</strong> Cyan for reasoning, green for final output.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>
                  <strong>GTK Warning Filter:</strong> Zenity runs without spamming terminal.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Complete Script Viewer */}
        <div className="lg:col-span-8 flex flex-col min-h-[580px]">
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-mono font-semibold text-stone-200">
                  artpersona.sh (Production Ready)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded bg-stone-800 px-2.5 py-1 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Code
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[600px] rounded-lg bg-stone-950 border border-stone-800 p-3.5">
              <pre className="text-xs font-mono text-stone-300 leading-relaxed whitespace-pre select-all">
                {generatedScript}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
