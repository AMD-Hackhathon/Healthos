import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Trash2, Info } from "lucide-react";
import PageShell from "../components/PageShell";
import { api, ApiError } from "../api/client";

const emptyProfile = {
  age: "",
  sex: "",
  height_cm: "",
  weight_kg: "",
  conditions: [],
  medications: [],
  emergency_contact: null,
};

export default function Profile() {
  const location = useLocation();
  const [profile, setProfile] = useState(emptyProfile);
  const [conditionInput, setConditionInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getProfile();
        setProfile({
          age: data.age ?? "",
          sex: data.sex ?? "",
          height_cm: data.height_cm ?? "",
          weight_kg: data.weight_kg ?? "",
          conditions: data.conditions ?? [],
          medications: data.medications ?? [],
          emergency_contact: data.emergency_contact ?? null,
        });
        setIsComplete(data.is_complete);
      } catch (err) {
        // 404 here is expected — no profile yet, show a blank form, not an error.
        if (!(err instanceof ApiError && err.status === 404)) {
          setError("Could not load your profile. Try refreshing.");
        }
        setIsComplete(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateField(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function addCondition() {
    const val = conditionInput.trim();
    if (!val) return;
    setProfile((p) => ({ ...p, conditions: [...p.conditions, val] }));
    setConditionInput("");
  }

  function removeCondition(idx) {
    setProfile((p) => ({ ...p, conditions: p.conditions.filter((_, i) => i !== idx) }));
  }

  function addMedication() {
    setProfile((p) => ({
      ...p,
      medications: [...p.medications, { name: "", dosage: "", time: "" }],
    }));
  }

  function updateMedication(idx, field, value) {
    setProfile((p) => ({
      ...p,
      medications: p.medications.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }));
  }

  function removeMedication(idx) {
    setProfile((p) => ({ ...p, medications: p.medications.filter((_, i) => i !== idx) }));
  }

  function updateContact(field, value) {
    setProfile((p) => ({
      ...p,
      emergency_contact: { ...(p.emergency_contact || { name: "", phone: "" }), [field]: value },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const payload = {
      age: profile.age === "" ? null : Number(profile.age),
      sex: profile.sex || null,
      height_cm: profile.height_cm === "" ? null : Number(profile.height_cm),
      weight_kg: profile.weight_kg === "" ? null : Number(profile.weight_kg),
      conditions: profile.conditions,
      medications: profile.medications.filter((m) => m.name.trim()),
      emergency_contact:
        profile.emergency_contact?.name && profile.emergency_contact?.phone
          ? profile.emergency_contact
          : null,
    };

    try {
      const updated = await api.updateProfile(payload);
      setIsComplete(updated.is_complete);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const showBanner = !loading && !isComplete;

  if (loading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-raised rounded" />
          <div className="h-64 bg-surface-raised rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl font-semibold mb-1">Your profile</h1>
        <p className="text-text-muted text-sm mb-6">
          Keep this up to date so HealthOS can personalize your insights.
        </p>

        {showBanner && (
          <div className="flex items-start gap-3 bg-warn-dim border border-warn/30 rounded-xl px-4 py-3 mb-6">
            <Info className="w-4 h-4 text-warn mt-0.5 shrink-0" />
            <p className="text-sm text-text">
              Fill this out to get your personalized experience.
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4">Basics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Age">
                <input
                  type="number"
                  min="0"
                  value={profile.age}
                  onChange={(e) => updateField("age", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Sex">
                <select
                  value={profile.sex}
                  onChange={(e) => updateField("sex", e.target.value)}
                  className="input"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Height (cm)">
                <input
                  type="number"
                  min="0"
                  value={profile.height_cm}
                  onChange={(e) => updateField("height_cm", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  min="0"
                  value={profile.weight_kg}
                  onChange={(e) => updateField("weight_kg", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4">Known conditions</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.conditions.map((c, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 bg-surface-raised border border-border-strong rounded-full pl-3 pr-1.5 py-1 text-sm"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCondition(i)}
                    className="text-text-faint hover:text-alert transition-colors"
                    aria-label={`Remove ${c}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCondition();
                  }
                }}
                placeholder="e.g. Type 2 diabetes"
                className="input flex-1"
              />
              <button type="button" onClick={addCondition} className="btn-secondary px-4">
                Add
              </button>
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Medications</h2>
              <button
                type="button"
                onClick={addMedication}
                className="flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <Plus className="w-4 h-4" /> Add medication
              </button>
            </div>
            {profile.medications.length === 0 && (
              <p className="text-sm text-text-faint">No medications added yet.</p>
            )}
            <div className="space-y-3">
              {profile.medications.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Name"
                    value={m.name}
                    onChange={(e) => updateMedication(i, "name", e.target.value)}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={m.dosage}
                    onChange={(e) => updateMedication(i, "dosage", e.target.value)}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="e.g. 8:00 PM"
                    value={m.time}
                    onChange={(e) => updateMedication(i, "time", e.target.value)}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedication(i)}
                    className="text-text-faint hover:text-alert transition-colors p-2"
                    aria-label="Remove medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4">Emergency contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <input
                  type="text"
                  value={profile.emergency_contact?.name || ""}
                  onChange={(e) => updateContact("name", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  value={profile.emergency_contact?.phone || ""}
                  onChange={(e) => updateContact("phone", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </section>

          {error && (
            <p className="text-sm text-alert bg-alert-dim border border-alert/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm text-good">Saved.</span>}
          </div>
        </form>
      </div>
    </PageShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
