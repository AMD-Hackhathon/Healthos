import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UploadCloud, FileCheck, Loader2, FileText } from "lucide-react";
import PageShell from "../components/PageShell";
import { api } from "../api/client";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    api
      .listReports()
      .then(setReports)
      .finally(() => setReportsLoading(false));
  }, []);

  function validateAndSet(f) {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("Choose a PDF, JPG, or PNG file.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  }

  async function handleAnalyze() {
    if (!file) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.uploadReport(file);
      navigate(`/reports/${res.report_id}`);
    } catch {
      setError("We couldn't analyze that file. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold mb-1">Upload a report</h1>
        <p className="text-text-muted text-sm mb-6">
          Drag and drop a file, or choose one to upload.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-2xl p-10 text-center transition-colors ${
            dragging ? "border-accent bg-surface-raised" : "border-border-strong bg-surface"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-6 h-6 text-accent mx-auto mb-3 animate-spin" />
              <p className="font-medium mb-1">Analyzing your report…</p>
              <p className="text-sm text-text-faint">
                This can take a few seconds depending on the file.
              </p>
            </>
          ) : file ? (
            <>
              <FileCheck className="w-6 h-6 text-accent mx-auto mb-3" />
              <p className="font-medium mb-1">Ready to analyze</p>
              <p className="text-sm text-text-faint mb-6">{file.name}</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => inputRef.current?.click()} className="btn-secondary">
                  Choose a different file
                </button>
                <button onClick={handleAnalyze} className="btn-primary">
                  Analyze report
                </button>
              </div>
            </>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 text-text-muted mx-auto mb-3" />
              <p className="font-medium mb-1">Drop your file here</p>
              <p className="text-sm text-text-faint mb-6">PDF, JPG, or PNG</p>
              <button onClick={() => inputRef.current?.click()} className="btn-secondary">
                Choose file
              </button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => validateAndSet(e.target.files?.[0])}
          />
        </div>

        {error && (
          <p className="text-sm text-alert bg-alert-dim border border-alert/30 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Previously uploaded</h2>
            {reports.length > 3 && (
              <Link to="/reports" className="text-sm text-accent hover:underline">
                View all
              </Link>
            )}
          </div>

          {reportsLoading ? (
            <div className="animate-pulse space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 bg-surface-raised rounded-xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl py-8 text-center">
              <FileText className="w-5 h-5 text-text-faint mx-auto mb-2" />
              <p className="text-sm text-text-faint">
                Nothing uploaded yet — your reports will show up here.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {reports.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to={`/reports/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-text-faint shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-text truncate">{r.display_name}</p>
                      <p className="text-xs text-text-faint">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={r.status} riskLevel={r.risk_level} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function StatusPill({ status, riskLevel }) {
  if (status === "processing") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-warn-dim text-warn shrink-0 ml-3">
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-alert-dim text-alert shrink-0 ml-3">
        Failed
      </span>
    );
  }
  const tone =
    riskLevel === "urgent"
      ? "bg-alert-dim text-alert"
      : riskLevel === "advice"
      ? "bg-warn-dim text-warn"
      : "bg-good-dim text-good";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-3 ${tone}`}>
      {riskLevel || "Reviewed"}
    </span>
  );
}
