"use client";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export function ImageUpload({
  value,
  onChange,
  label = "Image / Logo",
  hint,
  aspect = "aspect-[16/9]",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
      toast.success("Image uploadée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className={`relative overflow-hidden rounded-md border border-dashed border-bg-ring bg-bg-soft ${aspect}`}>
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-bg-ring bg-bg/80 text-zinc-200 backdrop-blur-sm transition hover:text-red-300"
              title="Supprimer"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-term-comment">
            <ImageIcon size={28} />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-secondary"
        >
          <Upload size={14} /> {busy ? "..." : "uploader"}
        </button>
        <input
          className="input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="… ou colle une URL"
        />
      </div>
      {hint ? <p className="mt-1 font-mono text-xs text-term-comment">// {hint}</p> : null}
    </div>
  );
}
