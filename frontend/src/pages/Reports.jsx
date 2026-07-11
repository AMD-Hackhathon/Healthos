import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Upload } from "lucide-react";
import PageShell from "../components/PageShell";
import { api } from "../api/client";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listReports()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Your reports</h1>
          <p className="text-text-muted text-sm">Everything you've uploaded, in one place.</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload report
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-surface-raised rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <FileText className="w-8 h-8 text-text-faint mx-auto mb-3" />
          <p className="text-text-muted mb-4">No reports uploaded yet.</p>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload your first report
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {reports.map((r) => (
            <Link
              key={r.id}
              to={`/reports/${r.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-surface-raised transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-text-faint shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text truncate">{r.display_name}</p>
                  <p className="text-xs text-text-faint">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <StatusPill status={r.status} riskLevel={r.risk_level} />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function StatusPill({ status, riskLevel }) {
  if (status === "processing") {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-warn-dim text-warn shrink-0 ml-3">
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-alert-dim text-alert shrink-0 ml-3">
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
    <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${tone}`}>
      {riskLevel || "Reviewed"}
    </span>
  );
}
