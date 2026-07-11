import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, MessageCircle, FileText, ChevronRight, Pill } from "lucide-react";
import PageShell from "../components/PageShell";
import PulseLine from "../components/PulseLine";
import { iconForInsight, toneForInsight } from "../lib/icons";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

function scoreBand(score, hasData) {
  if (!hasData) return "unknown";
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "alert";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [dashRes, reportsRes, profileRes] = await Promise.allSettled([
        api.getDashboard(),
        api.listReports(),
        api.getProfile(),
      ]);
      if (dashRes.status === "fulfilled") setDashboard(dashRes.value);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-surface-raised rounded" />
          <div className="h-48 bg-surface-raised rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-surface-raised rounded-2xl" />
            <div className="h-40 bg-surface-raised rounded-2xl" />
          </div>
        </div>
      </PageShell>
    );
  }

  const insights = dashboard?.insights || [];
  const hasData = insights.length > 0;
  const band = scoreBand(dashboard?.health_score ?? 0, hasData);
  const upcomingMeds = profile?.medications || [];

  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-sm font-medium text-accent mb-1">HealthOS</p>
        <h1 className="font-display text-3xl font-semibold">
          {greeting()}, {user?.username || "there"}
        </h1>
      </div>

      {/* Hero: Health score + pulse line + insight feed */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted font-medium mb-2">
                Health score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-6xl font-medium tabular-nums">
                  {hasData ? dashboard.health_score : "—"}
                </span>
                <span className="text-text-faint text-lg">/100</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/upload" className="btn-primary flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload report
              </Link>
              <Link to="/chat" className="btn-secondary flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </Link>
            </div>
          </div>
          <PulseLine band={band} />
        </div>

        <div className="border-t border-border">
          {hasData ? (
            <ul className="divide-y divide-border">
              {insights.map((insight, i) => {
                const Icon = iconForInsight(insight.icon);
                return (
                  <li key={i} className="flex items-start gap-3 px-6 sm:px-8 py-4">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${toneForInsight(insight.icon)}`} />
                    <p className="text-sm text-text">{insight.text}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-6 sm:px-8 py-10 text-center">
              <p className="text-text-muted text-sm mb-4">
                Upload your first report to see your health score and insights.
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
              >
                <Upload className="w-4 h-4" />
                Upload a report
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Secondary row: recent reports + medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Recent reports</h2>
            {reports.length > 0 && (
              <Link
                to="/reports"
                className="text-sm text-accent hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-6 h-6 text-text-faint mx-auto mb-2" />
              <p className="text-sm text-text-faint">No reports uploaded yet.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {reports.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/reports/${r.id}`}
                    className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-surface-raised transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text truncate">{r.display_name}</p>
                      <p className="text-xs text-text-faint">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusPill status={r.status} riskLevel={r.risk_level} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4">Medications</h2>
          {upcomingMeds.length === 0 ? (
            <div className="text-center py-6">
              <Pill className="w-6 h-6 text-text-faint mx-auto mb-2" />
              <p className="text-sm text-text-faint mb-2">No medications on file.</p>
              <Link to="/profile" className="text-sm text-accent hover:underline">
                Add to your profile
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingMeds.slice(0, 4).map((m, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Pill className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-sm text-text">{m.name}</span>
                    {m.dosage && (
                      <span className="text-xs text-text-faint">{m.dosage}</span>
                    )}
                  </div>
                  {m.time && (
                    <span className="text-xs font-mono text-text-muted">{m.time}</span>
                  )}
                </li>
              ))}
            </ul>
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
