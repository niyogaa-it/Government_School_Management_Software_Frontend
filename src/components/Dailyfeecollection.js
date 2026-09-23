import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "./Layout";
import {
  CalendarOutlined,
  PrinterOutlined,
  ReloadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const BASE = `${process.env.REACT_APP_API_URL}`;

/* ── Sidebar colour tokens (same as StudentFeeCollection) ── */
const C = {
  primary: "#1d2a4d",
  accent: "#4f8ef7",
  accentLight: "#e8f0fe",
  success: "#22c55e",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#ef4444",
  purple: "#8b5cf6",
  purpleLight: "#ede9fe",
  border: "#d1dae8",
  bg: "#f4f6fb",
  card: "#ffffff",
  text: "#1d2a4d",
  muted: "#6b7a99",
};

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 16px",
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "opacity 0.15s, background 0.15s",
};

const DailyFeeCollection = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const rawRole = (user?.roleName || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const isAdmin = rawRole === "superadmin";
  const schoolId = user?.school?.id || null;

  const { selectedSchool, selectedYear } = useFilter();

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({
    PTA: 0,
    Management: 0,
    Special: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  // Sort state: { key, dir } — key is a column key, dir is "asc" | "desc"
  const [sortCfg, setSortCfg] = useState({ key: null, dir: "asc" });
  // Column filters: text search per column
  const [colFilters, setColFilters] = useState({});
  // Which filter dropdown is open
  const [openFilter, setOpenFilter] = useState(null);

  useEffect(() => {
    fetchCollections();
  }, [fromDate, toDate, selectedSchool, selectedYear]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const url = isAdmin
        ? `${BASE}/feeCollection/getAllRecords`
        : schoolId
          ? `${BASE}/feeCollection/getAllBySchool/${schoolId}`
          : `${BASE}/feeCollection/getAllRecords`;

      const res = await axios.get(url);
      const all = res.data.data || [];
      const norm = (y) => y?.replace(/\s*-\s*/g, "-").trim();
      const filtered = all.filter((c) => {
        const d = c.collection_date
          ? c.collection_date.toString().split("T")[0]
          : "";

        if (!d) return false;

        if (d < fromDate || d > toDate) return false;
        // Filter by header school selection (superadmin only)
        if (isAdmin && selectedSchool && selectedSchool !== "all") {
          if (String(c.school_id) !== String(selectedSchool)) return false;
        }
        // Filter by header academic year selection
        if (selectedYear && norm(c.academic_year) !== norm(selectedYear))
          return false;
        return true;
      });
      buildSummary(filtered);
      setCollections(filtered);
    } catch (err) {
      console.error("fetchCollections error:", err);
      setCollections([]);
      buildSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const buildSummary = (data) => {
    const s = { PTA: 0, Management: 0, Special: 0, total: 0 };
    data.forEach((c) => {
      let items = c.fee_items || [];
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      items.forEach((item) => {
        const t = item.type || "";
        // PTA: exact match
        if (t === "PTA") s.PTA += parseFloat(item.amount || 0);
        // Management: exact "Management" OR prefixed "Management - Tuition Fee" etc.
        else if (
          t === "Management" ||
          t.startsWith("Management -") ||
          t.startsWith("Management-")
        )
          s.Management += parseFloat(item.amount || 0);
        // Special: "Special Fee - Science Group" etc.
        else if (t.startsWith("Special Fee") || t.startsWith("Special-"))
          s.Special += parseFloat(item.amount || 0);
      });
      s.total += parseFloat(c.paid_amount || 0);
    });
    setSummary(s);
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const str = typeof d === "string" ? d.split("T")[0] : String(d);
    const parts = str.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };

  const formatINR = (val) =>
    `₹ ${parseFloat(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isToday = fromDate === getTodayDate() && toDate === getTodayDate();

  const paymentModeCounts = collections.reduce((acc, c) => {
    const m = c.payment_mode || "Cash";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const modeColor = (m) =>
    m === "Cash"
      ? C.success
      : m === "Online"
        ? C.accent
        : m === "Cheque"
          ? C.purple
          : C.muted;

  /* Summary card config */
  const summaryCards = [
    {
      label: "Total Collected",
      value: formatINR(summary.total),
      sub: "All fee types",
      accent: C.accent,
      bg: C.accentLight,
    },
    {
      label: "PTA Fee",
      value: formatINR(summary.PTA),
      sub: "PTA collections",
      accent: C.success,
      bg: C.successLight,
    },
    {
      label: "Management Fee",
      value: formatINR(summary.Management),
      sub: "Tuition, Uniform etc.",
      accent: C.warning,
      bg: C.warningLight,
    },
    {
      label: "Special Fee",
      value: formatINR(summary.Special),
      sub: "Science, Arts etc.",
      accent: "#8b5cf6",
      bg: "#ede9fe",
    },
    {
      label: "Total Receipts",
      value: collections.length,
      sub: "Transactions",
      accent: C.purple,
      bg: C.purpleLight,
    },
  ];

  /* ── SORT + FILTER HELPERS ── */
  const COL_KEYS = {
    "Receipt No": (c) => c.receipt_no || "",
    "Admission No": (c) => c.admission_number || "",
    "Student Name": (c) => c.student_name || "",
    Grade: (c) => c.grade || "",
    Section: (c) => c.section || "",
    "Fee Type": (c) => {
      let fi = c.fee_items || [];
      if (typeof fi === "string") {
        try {
          fi = JSON.parse(fi);
        } catch {
          fi = [];
        }
      }
      return fi
        .map((f) => f.type)
        .filter(Boolean)
        .join(", ");
    },
    "Paid Amount": (c) => parseFloat(c.paid_amount || 0),
    Balance: (c) => parseFloat(c.balance_amount || 0),
    "Payment Mode": (c) => c.payment_mode || "",
  };

  const handleSort = (col) => {
    if (!COL_KEYS[col]) return;
    setSortCfg((prev) =>
      prev.key === col
        ? { key: col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key: col, dir: "asc" },
    );
  };

  const handleFilterChange = (col, val) => {
    setColFilters((prev) => ({ ...prev, [col]: val }));
  };

  const clearFilter = (col) => {
    setColFilters((prev) => {
      const n = { ...prev };
      delete n[col];
      return n;
    });
    setOpenFilter(null);
  };

  const clearAllFilters = () => {
    setColFilters({});
    setOpenFilter(null);
    setSortCfg({ key: null, dir: "asc" });
  };

  // Apply filters then sort
  const displayRows = (() => {
    let rows = [...collections];
    // Apply column text filters
    Object.entries(colFilters).forEach(([col, val]) => {
      if (!val) return;
      const getter = COL_KEYS[col];
      if (!getter) return;
      const lower = val.toLowerCase();
      rows = rows.filter((c) =>
        String(getter(c)).toLowerCase().includes(lower),
      );
    });
    // Apply sort
    if (sortCfg.key && COL_KEYS[sortCfg.key]) {
      const getter = COL_KEYS[sortCfg.key];
      rows.sort((a, b) => {
        const va = getter(a),
          vb = getter(b);
        if (typeof va === "number")
          return sortCfg.dir === "asc" ? va - vb : vb - va;
        return sortCfg.dir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }
    return rows;
  })();

  const activeFilterCount = Object.values(colFilters).filter(Boolean).length;

  /* ── EXPORT TO EXCEL ── */
  const exportToExcel = () => {
    if (!collections.length) return;

    // Build rows
    const headers = [
      "S.No",
      "Receipt No",
      "Admission No",
      "Student Name",
      "Grade",
      "Section",
      "Fee Type",
      "Description",
      "Paid Amount",
      "Balance",
      "Payment Mode",
      "Transaction ID",
      "Collection Date",
      "Time",
    ];

    const rows = collections.map((c, i) => {
      let feeItemsArr = c.fee_items || [];
      if (typeof feeItemsArr === "string") {
        try {
          feeItemsArr = JSON.parse(feeItemsArr);
        } catch {
          feeItemsArr = [];
        }
      }
      const feeTypes = feeItemsArr
        .map((f) => f.type)
        .filter(Boolean)
        .join(", ");
      const feeDescs = feeItemsArr
        .map((f) => f.description)
        .filter(Boolean)
        .join(", ");
      const createdAt = c.createdAt
        ? new Date(c.createdAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "";
      return [
        i + 1,
        c.receipt_no || "",
        c.admission_number || "",
        c.student_name || "",
        c.grade || "",
        c.section || "",
        feeTypes,
        feeDescs,
        parseFloat(c.paid_amount || 0).toFixed(2),
        parseFloat(c.balance_amount || 0).toFixed(2),
        c.payment_mode || "Cash",
        c.transaction_id || "",
        c.collection_date || "",
        createdAt,
      ];
    });

    // Add summary rows at the bottom
    const summaryRows = [
      [],
      ["Summary"],
      [
        "Total Collected",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        parseFloat(summary.total).toFixed(2),
      ],
      [
        "PTA Fee",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        parseFloat(summary.PTA).toFixed(2),
      ],
      [
        "Management Fee",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        parseFloat(summary.Management).toFixed(2),
      ],
      [
        "Special Fee",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        parseFloat(summary.Special).toFixed(2),
      ],
      ["Total Receipts", collections.length],
    ];

    // Build CSV content (Excel opens CSV perfectly)
    const escape = (val) => {
      const str = String(val ?? "");
      const needsQuote =
        str.indexOf(",") !== -1 ||
        str.indexOf('"') !== -1 ||
        str.indexOf("\n") !== -1;
      return needsQuote ? '"' + str.split('"').join('""') + '"' : str;
    };

    const csvLines = [
      [`Daily Fee Collection Report`],
      [`Date: ${formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}`],
      [],
      headers.map(escape).join(","),
      ...rows.map((row) => row.map(escape).join(",")),
      ...summaryRows.map((row) => row.map(escape).join(",")),
    ].map((line) => (Array.isArray(line) ? line.join(",") : line));

    const csvContent = "\uFEFF" + csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DailyFeeCollection_${fromDate}_to_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      {/* Close filter dropdown on outside click */}
      {openFilter && (
        <div
          onClick={() => setOpenFilter(null)}
          style={{ position: "fixed", inset: 0, zIndex: 998 }}
        />
      )}
      <style>{`
        /* ── Print styles ── */
        .dfc-print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { width: 100%; margin: 0; padding: 0; }
          body * { visibility: hidden; }
          .dfc-print-area, .dfc-print-area * { visibility: visible; }
          .dfc-print-area {
            position: absolute; top: 0; left: 0;
            width: 100%; padding: 0;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
          .dfc-print-only {
            display: block !important;
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #1d2a4d;
            padding-bottom: 8px;
          }
          .dfc-print-only h2 { font-size: 16px; font-weight: bold; margin: 0 0 3px; color: #1d2a4d; }
          .dfc-print-only p  { font-size: 10px; color: #444; margin: 1px 0; }
          .dfc-table-card { border: none !important; box-shadow: none !important; overflow: visible !important; }
          .dfc-table-scroll { overflow: visible !important; }
          .dfc-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
            table-layout: fixed;
          }
          .dfc-table colgroup col.col-sno    { width: 4%; }
          .dfc-table colgroup col.col-receipt { width: 14%; }
          .dfc-table colgroup col.col-admno  { width: 9%; }
          .dfc-table colgroup col.col-name   { width: 11%; }
          .dfc-table colgroup col.col-grade  { width: 5%; }
          .dfc-table colgroup col.col-sec    { width: 7%; }
          .dfc-table colgroup col.col-type   { width: 7%; }
          .dfc-table colgroup col.col-paid   { width: 8%; }
          .dfc-table colgroup col.col-bal    { width: 8%; }
          .dfc-table colgroup col.col-mode   { width: 7%; }
          .dfc-table colgroup col.col-txn    { width: 11%; }
          .dfc-table colgroup col.col-time   { width: 9%; }
          .dfc-table thead { display: table-header-group; }
          .dfc-table tfoot { display: table-footer-group; }
          .dfc-table tbody { display: table-row-group; }
          .dfc-table tr    { page-break-inside: avoid; }
          .dfc-table th {
            background: #1d2a4d !important;
            color: #fff !important;
            padding: 5px 5px !important;
            font-size: 8px !important;
            font-weight: 700 !important;
            text-transform: uppercase;
            border: 1px solid #aaa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            white-space: normal !important;
            word-break: break-word;
          }
          .dfc-table td {
            padding: 4px 5px !important;
            font-size: 9px !important;
            color: #000 !important;
            border: 1px solid #ccc !important;
            word-break: break-word;
            white-space: normal !important;
          }
          .dfc-table td.amt-col { text-align: right !important; font-variant-numeric: tabular-nums; }
          .dfc-table th.amt-col { text-align: right !important; }
          .dfc-table tbody tr:nth-child(even) td {
            background: #f7f9ff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .dfc-table tfoot td {
            background: #dcfce7 !important;
            font-weight: 700 !important;
            color: #166534 !important;
            border: 1px solid #aaa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* hide inline-styled badges — just show plain text in print */
          .dfc-table td span.receipt-print { font-family: monospace; font-size: 9px; }
          .dfc-table td span[style] { background: none !important; color: inherit !important; padding: 0 !important; border-radius: 0 !important; }
        }
        .dfc-table tbody tr:hover { background: ${C.accentLight} !important; }
        @media (max-width: 768px) {
          .dfc-cards-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      <div
        className="app-page"
        style={{ background: C.bg, minHeight: "100vh", padding: "20px 24px" }}
      >
        {/* ── PAGE HEADER ── */}
        <div
          className="no-print"
          style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, #2d4073 100%)`,
            borderRadius: 12,
            padding: "16px 24px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h5
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 17,
                color: "#fff",
              }}
            >
              Daily Fee Collection
              {isToday && (
                <span
                  style={{
                    background: C.success,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 10px",
                    borderRadius: 20,
                    marginLeft: 10,
                    verticalAlign: "middle",
                  }}
                >
                  Today
                </span>
              )}
            </h5>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}
            </p>
          </div>

          {/* Controls — compact inline row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {/* Date picker — exact same height as Today & Print buttons */}
            {/* <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                boxSizing: "border-box",
                padding: "0 11px",
                borderRadius: 7,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)",
                cursor: "pointer",
              }}
            >
              <CalendarOutlined
                style={{ color: "#fff", fontSize: 12, flexShrink: 0 }}
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: 96,
                  height: "100%",
                  padding: 0,
                }}
              />
            </div> */}
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 30,
                  padding: "0 11px",
                  borderRadius: 7,
                  border: "1.5px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.12)",
                }}
              >
                <CalendarOutlined style={{ color: "#fff", fontSize: 12 }} />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 30,
                  padding: "0 11px",
                  borderRadius: 7,
                  border: "1.5px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.12)",
                }}
              >
                <CalendarOutlined style={{ color: "#fff", fontSize: 12 }} />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>
            {/* Today button */}
            {!isToday && (
              <button
                onClick={() => {
                  const today = getTodayDate();
                  setFromDate(today);
                  setToDate(today);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 30,
                  padding: "0 11px",
                  borderRadius: 7,
                  border: "1.5px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <ReloadOutlined style={{ fontSize: 12 }} />
                Today
              </button>
            )}

            {/* Export Excel */}
            <button
              onClick={exportToExcel}
              disabled={!collections.length}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 11px",
                borderRadius: 7,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: collections.length
                  ? "rgba(34,197,94,0.25)"
                  : "rgba(255,255,255,0.08)",
                color: collections.length ? "#fff" : "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontWeight: 600,
                cursor: collections.length ? "pointer" : "not-allowed",
                boxSizing: "border-box",
              }}
              title="Export to Excel"
            >
              <FileExcelOutlined style={{ fontSize: 13 }} />
              Export
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 11px",
                borderRadius: 7,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <PrinterOutlined style={{ fontSize: 12 }} />
              Print
            </button>
          </div>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div
          className="dfc-cards-grid no-print"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {summaryCards.map(({ label, value, sub, accent, bg }) => (
            <div
              key={label}
              style={{
                background: C.card,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                padding: "16px 18px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 4,
                  height: "100%",
                  background: accent,
                  borderRadius: "10px 0 0 10px",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: accent,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── PAYMENT MODE PILLS ── */}
        {collections.length > 0 && (
          <div
            className="no-print"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            {Object.entries(paymentModeCounts).map(([mode, count]) => (
              <div
                key={mode}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.card,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: modeColor(mode),
                    flexShrink: 0,
                  }}
                />
                {mode}: {count} receipt{count !== 1 ? "s" : ""}
              </div>
            ))}
          </div>
        )}

        {/* ── PRINT AREA ── */}
        <div className="dfc-print-area">
          {/* Print header */}
          <div className="dfc-print-only">
            <h2>Daily Fee Collection Report</h2>
            <p>
              Date: {formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}
            </p>
            <p>
              Total Records: {collections.length} &nbsp;|&nbsp; Total:{" "}
              {formatINR(summary.total)} &nbsp;|&nbsp; PTA:{" "}
              {formatINR(summary.PTA)} &nbsp;|&nbsp; Management:{" "}
              {formatINR(summary.Management)} &nbsp;|&nbsp; Special:{" "}
              {formatINR(summary.Special)}
            </p>
            <p>Printed on: {new Date().toLocaleDateString("en-IN")}</p>
          </div>

          {/* ── TABLE CARD ── */}
          <div
            className="dfc-table-card"
            style={{
              background: C.card,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: `1.5px solid ${C.border}`,
                background: C.bg,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
                Fee Collections — {formatDisplayDate(fromDate)} -{" "}
                {formatDisplayDate(toDate)}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: `1px solid ${C.danger}`,
                      background: "rgba(239,68,68,0.08)",
                      color: C.danger,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Clear {activeFilterCount} filter
                    {activeFilterCount > 1 ? "s" : ""}
                  </button>
                )}
                <span
                  style={{
                    fontSize: 12,
                    color: C.accent,
                    background: C.accentLight,
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontWeight: 600,
                  }}
                >
                  {activeFilterCount > 0
                    ? `${displayRows.length} / ${collections.length}`
                    : collections.length}{" "}
                  record{collections.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* States */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div className="spinner-border" style={{ color: C.accent }} />
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  Loading collections…
                </div>
              </div>
            ) : collections.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: C.muted,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  No collections found
                </div>
                <div style={{ fontSize: 13 }}>
                  No fee collections recorded between{" "}
                  {formatDisplayDate(fromDate)} and {formatDisplayDate(toDate)}.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  className="dfc-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <colgroup>
                    <col className="col-sno" />
                    <col className="col-receipt" />
                    <col className="col-admno" />
                    <col className="col-name" />
                    <col className="col-grade" />
                    <col className="col-sec" />
                    <col className="col-type" />
                    <col className="col-paid" />
                    <col className="col-bal" />
                    <col className="col-mode" />
                    <col className="col-txn" />
                    <col className="col-time" />
                  </colgroup>
                  <thead>
                    <tr style={{ background: C.primary, color: "#fff" }}>
                      {[
                        "S.No",
                        "Receipt No",
                        "Admission No",
                        "Student Name",
                        "Grade",
                        "Section",
                        "Fee Type",
                        "Paid Amount",
                        "Balance",
                        "Payment Mode",
                        "Transaction ID",
                        "Time",
                      ].map((h) => {
                        const sortable = !!COL_KEYS[h];
                        const filterable = !!COL_KEYS[h];
                        const isActive = sortCfg.key === h;
                        const hasFilter = !!colFilters[h];
                        const isRight = ["Paid Amount", "Balance"].includes(h);
                        return (
                          <th
                            key={h}
                            style={{
                              padding: "8px 10px",
                              fontWeight: 600,
                              fontSize: 11,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                              position: "relative",
                              textAlign: isRight ? "right" : "left",
                              background: isActive ? "#253460" : "transparent",
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                justifyContent: isRight
                                  ? "flex-end"
                                  : "flex-start",
                              }}
                            >
                              {/* Sort trigger */}
                              <span
                                onClick={() => handleSort(h)}
                                style={{
                                  cursor: sortable ? "pointer" : "default",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                {h}
                                {sortable && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      opacity: isActive ? 1 : 0.4,
                                      marginLeft: 2,
                                    }}
                                  >
                                    {isActive
                                      ? sortCfg.dir === "asc"
                                        ? "▲"
                                        : "▼"
                                      : "⇅"}
                                  </span>
                                )}
                              </span>
                              {/* Filter trigger */}
                              {filterable && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenFilter(openFilter === h ? null : h);
                                  }}
                                  title={
                                    hasFilter
                                      ? "Filter active — click to edit"
                                      : "Filter"
                                  }
                                  style={{
                                    cursor: "pointer",
                                    fontSize: 11,
                                    lineHeight: 1,
                                    opacity: hasFilter ? 1 : 0.5,
                                    color: hasFilter ? "#fbbf24" : "#fff",
                                    padding: "1px 3px",
                                    borderRadius: 3,
                                    background: hasFilter
                                      ? "rgba(251,191,36,0.2)"
                                      : "transparent",
                                  }}
                                >
                                  ▾
                                </span>
                              )}
                            </div>

                            {/* Filter dropdown */}
                            {openFilter === h && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  zIndex: 999,
                                  background: "#fff",
                                  border: `1.5px solid ${C.border}`,
                                  borderRadius: 8,
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                                  padding: "10px 12px",
                                  minWidth: 200,
                                  color: C.text,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: C.muted,
                                    marginBottom: 6,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Filter: {h}
                                </div>
                                <input
                                  autoFocus
                                  type={
                                    ["Paid Amount", "Balance"].includes(h)
                                      ? "number"
                                      : "text"
                                  }
                                  placeholder={
                                    ["Paid Amount", "Balance"].includes(h)
                                      ? "e.g. 500"
                                      : `Search ${h}...`
                                  }
                                  value={colFilters[h] || ""}
                                  onChange={(e) =>
                                    handleFilterChange(h, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "Escape")
                                      setOpenFilter(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "6px 9px",
                                    border: `1.5px solid ${C.border}`,
                                    borderRadius: 6,
                                    fontSize: 13,
                                    outline: "none",
                                    boxSizing: "border-box",
                                    color: C.text,
                                  }}
                                />
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 6,
                                    marginTop: 8,
                                  }}
                                >
                                  <button
                                    onClick={() => setOpenFilter(null)}
                                    style={{
                                      flex: 1,
                                      padding: "5px 0",
                                      background: C.accent,
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: 5,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={() => clearFilter(h)}
                                    style={{
                                      flex: 1,
                                      padding: "5px 0",
                                      background: C.bg,
                                      color: C.muted,
                                      border: `1px solid ${C.border}`,
                                      borderRadius: 5,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((c, i) => {
                      let feeItemsArr = c.fee_items || [];
                      if (typeof feeItemsArr === "string") {
                        try {
                          feeItemsArr = JSON.parse(feeItemsArr);
                        } catch {
                          feeItemsArr = [];
                        }
                      }
                      if (!Array.isArray(feeItemsArr)) feeItemsArr = [];
                      const feeTypes = [
                        ...new Set(
                          feeItemsArr.map((f) => f.type).filter(Boolean),
                        ),
                      ];

                      const createdAt = c.createdAt
                        ? new Date(c.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—";

                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            background: i % 2 === 0 ? "#fff" : C.bg,
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontWeight: 600,
                            }}
                          >
                            {i + 1}
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                background: C.primary,
                                color: "#fff",
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.receipt_no}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: "10px 14px",
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: C.muted,
                            }}
                          >
                            {c.admission_number}
                          </td>

                          <td
                            style={{
                              padding: "10px 14px",
                              fontWeight: 600,
                              color: C.text,
                            }}
                          >
                            {c.student_name}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {c.grade || "—"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {c.section || "—"}
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            {feeTypes.length === 0
                              ? "—"
                              : feeTypes.map((t) => (
                                  <span
                                    key={t}
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 9px",
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      marginRight: 4,
                                      whiteSpace: "nowrap",
                                      background:
                                        t === "PTA"
                                          ? C.accentLight
                                          : t.startsWith("Management")
                                            ? C.warningLight
                                            : "#ede9fe",
                                      color:
                                        t === "PTA"
                                          ? C.accent
                                          : t.startsWith("Management")
                                            ? "#92400e"
                                            : "#6d28d9",
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                          </td>

                          <td
                            className="amt-col"
                            style={{
                              padding: "10px 14px",
                              color: "#166534",
                              fontWeight: 700,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatINR(c.paid_amount)}
                          </td>

                          <td
                            className="amt-col"
                            style={{
                              padding: "10px 14px",
                              fontWeight: 700,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              color:
                                parseFloat(c.balance_amount) > 0
                                  ? C.danger
                                  : C.muted,
                            }}
                          >
                            {formatINR(c.balance_amount)}
                          </td>

                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 9px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                                background: modeColor(c.payment_mode || "Cash"),
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.payment_mode || "Cash"}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 12,
                            }}
                          >
                            {c.transaction_id ? (
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                  color: C.text,
                                }}
                              >
                                {c.transaction_id}
                              </span>
                            ) : (
                              <span style={{ color: C.muted, fontSize: 11 }}>
                                —
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 12,
                            }}
                          >
                            {createdAt}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: C.successLight }}>
                      <td
                        colSpan={7}
                        style={{
                          padding: "11px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#166534",
                        }}
                      >
                        {activeFilterCount > 0
                          ? `Showing ${displayRows.length} of ${collections.length} records`
                          : `Total (${collections.length} records)`}
                      </td>
                      <td
                        className="amt-col"
                        style={{
                          padding: "11px 14px",
                          fontWeight: 800,
                          fontSize: 14,
                          color: "#166534",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatINR(summary.total)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* ── END PRINT AREA ── */}
      </div>
    </Layout>
  );
};

export default DailyFeeCollection;
