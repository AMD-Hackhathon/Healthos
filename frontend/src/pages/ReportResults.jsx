import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, AlertTriangle, FileText } from "lucide-react";
import PageShell from "../components/PageShell";
import { api, ApiError } from "../api/client";

const RISK_TONE = {
  urgent: "bg-alert-dim text-alert border-alert/30",
  advice: "bg-warn-dim text-warn border-warn/30",
  normal: "bg-good-dim text-good border-good/30",
};

const VALUE_TONE = {
  high: "text-alert",
  low: "text-alert",
  urgent: "text-alert",
  normal: "text-good",
};

export default function ReportResults() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  function handleViewFile() {
    setFileLoading(true);
    api
      .getReportFileUrl(reportId)
      .then((url) => window.open(url, "_blank"))
      .catch(() => {})
      .finally(() => setFileLoading(false));
  }

  useEffect(() => {
    api
      .getReport(reportId)
      .then(setReport)
      .catch((err) => {
        // 404 here is a real error — a bad/missing/foreign report id.
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-8 w-48 bg-surface-raised rounded" />
          <div className="h-32 bg-surface-raised rounded-2xl" />
          <div className="h-48 bg-surface-raised rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto text-center py-16">
          <AlertTriangle className="w-8 h-8 text-text-faint mx-auto mb-3" />
          <h1 className="font-display text-xl font-semibold mb-2">Report not found</h1>
          <p className="text-text-muted text-sm mb-6">
            This report doesn't exist, or it belongs to a different account.
          </p>
          <Link to="/reports" className="btn-primary inline-block">
            Back to reports
          </Link>
        </div>
      </PageShell>
    );
  }

  const riskTone = RISK_TONE[report.risk_level] || RISK_TONE.advice;

  return (
    <PageShell>
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/reports")}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to reports
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl font-semibold">Your report</h1>
          {report.risk_level && (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${riskTone}`}>
              {report.risk_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mb-6">
          <p className="text-text-faint text-sm">
            Uploaded{" "}
            {new Date(report.created_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <span className="text-text-faint">·</span>
          <button
            onClick={handleViewFile}
            disabled={fileLoading}
            className="flex items-center gap-1.5 text-sm text-accent hover:underline disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            {fileLoading ? "Opening..." : "View original file"}
          </button>
        </div>

        {report.status === "processing" && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center text-text-muted text-sm">
            Still analyzing this report. Check back in a moment.
          </div>
        )}

        {report.status === "failed" && (
          <div className="bg-alert-dim border border-alert/30 rounded-2xl p-6 text-center text-sm text-alert">
            We couldn't analyze this report. Try uploading it again.
          </div>
        )}

        {report.status === "complete" && (
          <>
            <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
              <p className="text-sm leading-relaxed text-text">
                {report.summary || "No summary available for this report."}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-display font-semibold">Flagged values</h2>
              </div>
              {report.flagged_values.length === 0 ? (
                <p className="px-6 py-6 text-sm text-text-faint text-center">
                  Nothing flagged in this report.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {report.flagged_values.map((v) => (
                    <li key={v.id} className="flex items-center justify-between px-6 py-3">
                      <span className="text-sm text-text capitalize">
                        {v.term.replaceAll("_", " ")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-text-muted">
                          {v.value} {v.unit || ""}
                        </span>
                        {v.status && (
                          <span
                            className={`text-xs font-medium uppercase tracking-wide ${
                              VALUE_TONE[v.status] || "text-text-faint"
                            }`}
                          >
                            {v.status}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Link to="/dashboard" className="btn-secondary">
            Back to dashboard
          </Link>
          <Link
            to={`/chat?report=${reportId}`}
            className="btn-primary flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Ask HealthOS about this
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
