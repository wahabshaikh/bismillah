"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Note = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

type Artifact = {
  key: string;
  size: number;
  uploaded: string;
};

export default function DemosClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const loadNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    const data = (await res.json()) as { notes?: Note[] };
    setNotes(data.notes ?? []);
  }, []);

  const loadArtifacts = useCallback(async () => {
    const res = await fetch("/api/artifacts");
    const data = (await res.json()) as { objects?: Artifact[] };
    setArtifacts(data.objects ?? []);
  }, []);

  const loadCounter = useCallback(async () => {
    const res = await fetch("/api/counter");
    const data = (await res.json()) as { count?: number };
    setCount(data.count ?? 0);
  }, []);

  useEffect(() => {
    void Promise.all([loadNotes(), loadArtifacts(), loadCounter()]);
  }, [loadNotes, loadArtifacts, loadCounter]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving note…");
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      setStatus("Failed to save note");
      return;
    }
    setTitle("");
    setBody("");
    setStatus("Note saved");
    await loadNotes();
  }

  async function uploadArtifact(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("Uploading…");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/artifacts", { method: "POST", body: form });
    if (!res.ok) {
      setStatus("Upload failed");
      return;
    }
    setFile(null);
    setStatus("Uploaded to R2");
    await loadArtifacts();
  }

  async function bumpCounter() {
    setStatus("Incrementing…");
    const res = await fetch("/api/counter", { method: "POST" });
    const data = (await res.json()) as { count?: number };
    setCount(data.count ?? 0);
    setStatus("Counter updated via KV");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm font-medium text-emerald-700">
              ← Bismillah
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Edge demos</h1>
            <p className="mt-1 text-slate-600">
              D1 notes · R2 artifacts · KV counter
            </p>
          </div>
          <Badge>{status || "Ready"}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>D1 notes</CardTitle>
            <CardDescription>Uses env.DB (database bismillah)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addNote} className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                placeholder="Body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <Button type="submit">Add</Button>
            </form>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="font-medium">{n.title}</div>
                  <div className="text-slate-600">{n.body}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {n.created_at}
                  </div>
                </li>
              ))}
              {notes.length === 0 && (
                <li className="text-sm text-slate-500">No notes yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>R2 artifacts</CardTitle>
            <CardDescription>
              Uses env.ARTIFACTS (bucket bismillah-artifacts)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={uploadArtifact}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="submit" disabled={!file}>
                Upload
              </Button>
            </form>
            <ul className="space-y-2">
              {artifacts.map((o) => (
                <li
                  key={o.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="truncate font-mono text-xs">{o.key}</span>
                  <a
                    className="shrink-0 text-emerald-700 hover:underline"
                    href={`/api/artifacts?key=${encodeURIComponent(o.key)}`}
                  >
                    Download
                  </a>
                </li>
              ))}
              {artifacts.length === 0 && (
                <li className="text-sm text-slate-500">No objects yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KV counter</CardTitle>
            <CardDescription>
              Uses env.KV (not VINEXT_KV_CACHE)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="text-3xl font-semibold tabular-nums">
              {count ?? "—"}
            </div>
            <Button onClick={bumpCounter}>Increment visit counter</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
