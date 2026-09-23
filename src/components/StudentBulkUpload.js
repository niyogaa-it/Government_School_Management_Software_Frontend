import Layout from "./Layout";
import { useState, useRef } from "react";

// const API_BASE = "http://your-server-ip:8080"; // ← Change to your AWS Lightsail IP
const API_BASE = "http://localhost:8080";
// const API_BASE = process.env.REACT_APP_API_URL; // for production

const TABS = [
  { key: "hsc",  label: "HSC Bulk Upload",  color: "#1F4E79", light: "#EBF3FB" },
  { key: "sslc", label: "SSLC Bulk Upload", color: "#375623", light: "#EEF5E9" },
];

export default function StudentBulkUpload() {
  const [activeTab, setActiveTab] = useState("hsc");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const tab = TABS.find((t) => t.key === activeTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setFile(null);
    setResult(null);
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      alert("Please upload only .xlsx or .xls files");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first");
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/bulkupload/${activeTab}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult({ ok: res.ok, ...data });
    } catch (err) {
      setResult({ ok: false, error: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Fixed: uses the new /bulkupload/template/:type route ──────────────────
  const handleDownloadTemplate = async (type) => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/bulkupload/template/${type}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to download template. Please try again.");
        return;
      }
      // Convert response to blob and trigger browser download
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = type === "hsc"
        ? "HSC_BulkUpload_Template.xlsx"
        : "SSLC_BulkUpload_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Network error while downloading template: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="app-page">
        <div style={styles.page}>
          <div style={styles.card}>

            {/* ── Header ── */}
            <div style={styles.header}>
              <div style={styles.headerIcon}></div>
              <div>
                <h2 style={styles.title}>Student Bulk Upload</h2>
                <p style={styles.subtitle}>Upload Excel files to add multiple students at once</p>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div style={styles.tabRow}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  style={{
                    ...styles.tab,
                    background: activeTab === t.key ? t.color : "#F1F5F9",
                    color: activeTab === t.key ? "#fff" : "#555",
                    borderBottom: activeTab === t.key ? `3px solid ${t.color}` : "3px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={styles.body}>

              {/* ── Instructions ── */}
              <div style={{ ...styles.infoBox, background: tab.light, borderLeft: `4px solid ${tab.color}` }}>
                <strong style={{ color: tab.color }}>Instructions</strong>
                <ul style={styles.ul}>
                  <li>Download the template below, fill it with student data</li>
                  <li>Do <strong>NOT</strong> change column headers or the sheet name</li>
                  <li>Required columns: <strong>school_id, academicYear, name</strong> (highlighted yellow)</li>
                  <li>Columns with a <strong>▼ dropdown</strong> — click the cell in Excel to see valid options</li>
                  {activeTab === "sslc" && (
                    <li>For age, fill separate columns: <strong>age_years, age_months, age_days</strong></li>
                  )}
                  <li>Dates must be in <strong>YYYY-MM-DD</strong> format (e.g. 2010-06-15)</li>
                  <li>Duplicate EMIS / Aadhar numbers will be skipped with an error report</li>
                </ul>
              </div>

              {/* ── Download Template ── */}
              <div style={styles.templateRow}>
                <span style={styles.templateLabel}>Download Sample Template:</span>
                <button
                  onClick={() => handleDownloadTemplate(activeTab)}
                  disabled={downloading}
                  style={{
                    ...styles.dlBtn,
                    background: downloading ? "#94A3B8" : tab.color,
                    cursor: downloading ? "not-allowed" : "pointer",
                  }}
                >
                  {downloading
                    ? "Downloading…"
                    : activeTab === "hsc"
                    ? "⬇ HSC_BulkUpload_Template.xlsx"
                    : "⬇ SSLC_BulkUpload_Template.xlsx"}
                </button>
              </div>

              {/* ── Drop Zone ── */}
              <div
                style={{
                  ...styles.dropZone,
                  borderColor: dragOver ? tab.color : file ? "#4CAF50" : "#CBD5E1",
                  background: dragOver ? tab.light : file ? "#F0FFF4" : "#FAFAFA",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                {file ? (
                  <div style={styles.filePreview}>
                    <div>
                      <div style={styles.fileName}>{file.name}</div>
                      <div style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetFile(); }}
                      style={styles.removeBtn}
                    >✕</button>
                  </div>
                ) : (
                  <div style={styles.dropInner}>
                    <div style={styles.dropText}>Drag & drop your Excel file here</div>
                    <div style={styles.dropSub}>or click to browse</div>
                    <div style={styles.dropAccept}>.xlsx / .xls only</div>
                  </div>
                )}
              </div>

              {/* ── Upload Button ── */}
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                style={{
                  ...styles.uploadBtn,
                  background: !file || loading ? "#94A3B8" : tab.color,
                  cursor: !file || loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? <span>Uploading &amp; Processing…</span> : <span>Upload &amp; Import Students</span>}
              </button>

              {/* ── Result Panel ── */}
              {result && (
                <div style={{
                  ...styles.resultBox,
                  borderColor: result.ok ? "#4CAF50" : "#EF4444",
                  background: result.ok ? "#F0FFF4" : "#FFF5F5",
                }}>
                  <div style={styles.resultHeader}>
                    <span style={{ fontSize: 20 }}>{result.ok ? "✅" : "❌"}</span>
                    <strong style={{ color: result.ok ? "#166534" : "#991B1B", marginLeft: 8 }}>
                      {result.message || result.error}
                    </strong>
                  </div>

                  {result.ok && (
                    <div style={styles.statsRow}>
                      <div style={{ ...styles.stat, background: "#DCFCE7", color: "#166534" }}>
                        <span style={styles.statNum}>{result.success}</span>
                        <span style={styles.statLabel}>Imported</span>
                      </div>
                      <div style={{ ...styles.stat, background: "#FEF2F2", color: "#991B1B" }}>
                        <span style={styles.statNum}>{result.failed}</span>
                        <span style={styles.statLabel}>Failed</span>
                      </div>
                      <div style={{ ...styles.stat, background: "#EFF6FF", color: "#1E40AF" }}>
                        <span style={styles.statNum}>{(result.success || 0) + (result.failed || 0)}</span>
                        <span style={styles.statLabel}>Total Rows</span>
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div style={styles.errorsSection}>
                      <strong style={{ color: "#991B1B" }}>⚠️ Errors ({result.errors.length}):</strong>
                      <div style={styles.errorsTable}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#FEE2E2" }}>
                              <th style={styles.th}>Row</th>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.errors.map((e, idx) => (
                              <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#FFF5F5" }}>
                                <td style={styles.td}>{e.row}</td>
                                <td style={styles.td}>{e.name || "—"}</td>
                                <td style={{ ...styles.td, color: "#DC2626" }}>{e.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", fontFamily: "Arial, sans-serif" },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", width: "100%", maxWidth: 860, overflow: "hidden" },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "24px 28px 20px", borderBottom: "1px solid #E2E8F0" },
  headerIcon: { fontSize: 36 },
  title: { margin: 0, fontSize: 22, color: "#1E293B" },
  subtitle: { margin: "4px 0 0", color: "#64748B", fontSize: 14 },
  tabRow: { display: "flex", borderBottom: "1px solid #E2E8F0" },
  tab: { flex: 1, padding: "14px 20px", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600, transition: "all 0.2s", fontFamily: "Arial, sans-serif" },
  body: { padding: "24px 28px" },
  infoBox: { borderRadius: 8, padding: "14px 18px", marginBottom: 20, fontSize: 14 },
  ul: { margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 },
  templateRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  templateLabel: { color: "#475569", fontSize: 14 },
  dlBtn: { padding: "8px 16px", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: "Arial, sans-serif" },
  dropZone: { border: "2px dashed", borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: 20 },
  dropInner: {},
  dropText: { fontSize: 16, fontWeight: 600, color: "#334155" },
  dropSub: { fontSize: 13, color: "#64748B", marginTop: 4 },
  dropAccept: { marginTop: 10, display: "inline-block", background: "#E2E8F0", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "#475569" },
  filePreview: { display: "flex", alignItems: "center", gap: 14, justifyContent: "center" },
  fileName: { fontWeight: 700, color: "#1E293B", fontSize: 15 },
  fileSize: { color: "#64748B", fontSize: 12, marginTop: 2 },
  removeBtn: { background: "#FEE2E2", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#DC2626", fontWeight: 700, fontSize: 14 },
  uploadBtn: { width: "100%", padding: "14px", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, fontFamily: "Arial, sans-serif", marginBottom: 20, transition: "background 0.2s" },
  resultBox: { border: "1.5px solid", borderRadius: 10, padding: "20px" },
  resultHeader: { display: "flex", alignItems: "center", marginBottom: 16 },
  statsRow: { display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" },
  stat: { flex: 1, minWidth: 100, borderRadius: 8, padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center" },
  statNum: { fontSize: 28, fontWeight: 800 },
  statLabel: { fontSize: 12, marginTop: 2, fontWeight: 600 },
  errorsSection: { marginTop: 8 },
  errorsTable: { marginTop: 10, maxHeight: 240, overflowY: "auto", borderRadius: 6, border: "1px solid #FECACA" },
  th: { padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#991B1B", borderBottom: "1px solid #FECACA" },
  td: { padding: "7px 12px", borderBottom: "1px solid #FEE2E2", verticalAlign: "top" },
};