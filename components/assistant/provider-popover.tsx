"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { useApp } from "@/components/app-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clearProvider, saveProvider, testProvider, type ProviderInput, type TestResult } from "@/app/actions/provider";

type Field = "baseUrl" | "model" | "apiKey";
const INPUT = "h-7 w-full rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface)] px-2 text-[12.5px] font-[var(--font-mono)] outline-none focus:border-[var(--line-strong)]";

export function ProviderPopover() {
  const { role, modelId, defaultModelId, provider } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
  const [model, setModel] = useState(provider?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [err, setErr] = useState<{ field?: Field; error: string } | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [busy, start] = useTransition();

  const input = (): ProviderInput => ({ baseUrl, model, apiKey, keepKey: !!provider?.keyHint && !apiKey });
  const done = () => {
    setOpen(false);
    router.refresh();
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string; field?: Field }>) => {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (r.ok) done();
      else setErr({ field: r.field, error: r.error ?? "Something went wrong." });
    });
  };
  const fieldErr = (f: Field) => err?.field === f && <div className="mt-0.5 text-[11.5px] text-[var(--danger)]">{err.error}</div>;

  const row = (ok: boolean | null, label: string) => (
    <div key={label} className="flex items-center gap-1.5" style={{ color: ok === false ? "var(--danger)" : "var(--ok)" }}>
      <I name={ok === false ? "x" : "check"} className="h-3 w-3" />
      <span className="text-[var(--fg)]">{label}</span>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setBaseUrl(provider?.baseUrl ?? "");
          setModel(provider?.model ?? "");
          setApiKey("");
          setErr(null);
          setTest(null);
        }
      }}
    >
      <PopoverTrigger className="model cursor-pointer hover:border-[var(--line-strong)] hover:text-[var(--fg)]" render={<button type="button" aria-label="Model provider" />}>
        {modelId}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2.5 p-3 text-[12.5px]">
        <div className="font-semibold">Model provider</div>
        <div className="rounded-[var(--r)] bg-[var(--sunken)] px-2 py-1.5">
          <div className="font-medium">{provider ? `Custom endpoint · ${provider.model}` : `Default · ${defaultModelId}`}</div>
          {provider && <div className="mono break-all text-[11px] text-[var(--faint)]">{provider.baseUrl}</div>}
        </div>

        {role !== "admin" ? (
          <p className="text-[var(--muted)]">Only an Admin can change the model provider. Switch View as to Admin to try it.</p>
        ) : (
          <>
            <label className="block">
              <span className="text-[var(--muted)]">Base URL</span>
              <input className={INPUT} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://llm.example.com/v1" />
              {fieldErr("baseUrl")}
            </label>
            <label className="block">
              <span className="text-[var(--muted)]">Model id</span>
              <input className={INPUT} value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-v4-flash" />
              {fieldErr("model")}
            </label>
            <label className="block">
              <span className="text-[var(--muted)]">API key</span>
              <input
                className={INPUT}
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider?.keyHint ? `•••• ${provider.keyHint}` : "Optional"}
              />
              {fieldErr("apiKey")}
            </label>
            {err && !err.field && <div className="text-[11.5px] text-[var(--danger)]">{err.error}</div>}

            {test && (
              <div className="flex flex-col gap-1 rounded-[var(--r)] border border-[var(--line)] p-2 text-[12px]">
                {row(test.reachable, "Reachable")}
                {row(test.modelFound ?? true, test.modelFound === null ? "Model not listed by the endpoint" : "Model listed")}
                {row(test.toolCalls, "Tool calling")}
                {test.latencyMs > 0 && <div className="text-[var(--faint)]">{test.latencyMs} ms</div>}
                {test.error && <div className="text-[var(--danger)]">{test.error}</div>}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button type="button" className="btn" disabled={busy} onClick={() => { setTest(null); start(async () => setTest(await testProvider(input()))); }}>
                Test connection
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => saveProvider(input()))}>
                Save
              </button>
              {provider && (
                <button type="button" className="btn ml-auto" disabled={busy} onClick={() => run(clearProvider)}>
                  Use default
                </button>
              )}
            </div>
            <p className="text-[11.5px] text-[var(--faint)]">
              Any OpenAI-compatible API (vLLM, LiteLLM, Ollama…). The key is stored encrypted and never shown again. The daily request limit still applies.
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
