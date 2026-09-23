/**
 * FeeDemandList.js
 *
 * Shows ALL students who have a fee demand raised, grouped by status.
 * Filters: academic year, course, grade, section, status.
 *
 * Actions per row:
 *   • Collect Payment → opens PaymentModal → generates receipt + updates status
 *   • Print Receipt   → (only if Partial or Paid) prints last receipt
 *   • Delete Demand   → removes the demand row (with confirmation)
 */

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Layout from "./Layout";
import { useNavigate } from "react-router-dom";
import { useFilter } from "./FilterContext";
import { notification, Select, Spin } from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  PrinterOutlined,
  DeleteOutlined,
  RiseOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  ExclamationCircleOutlined as ExclamCircle,
} from "@ant-design/icons";

const BASE = process.env.REACT_APP_API_URL;
const { Option } = Select;
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

/* ── colour tokens ── */
const C = {
  primary: "#1d2a4d",
  accent: "#4f8ef7",
  accentLight: "#e8f0fe",
  success: "#22c55e",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  partial: "#8b5cf6",
  partialLight: "#ede9fe",
  border: "#d1dae8",
  bg: "#f4f6fb",
  card: "#ffffff",
  text: "#1d2a4d",
  muted: "#6b7a99",
  headBg: "#1a2236",
};

/* ── Semantic icon-button color pairs (matches StudentAppSSLCList) ── */
const COLOR = {
  payColor: "#16a34a",
  payBg: "rgba(22,163,74,0.09)",
  printColor: "#c2580a",
  printBg: "rgba(194,88,10,0.08)",
  downloadColor: "#0891b2",
  downloadBg: "rgba(8,145,178,0.08)",
  danger: "#e21216",
  dangerBg: "rgba(226,18,22,0.08)",
  rowOdd: "#ffffff",
  rowEven: "#f8fafc",
  rowHover: "#eff6ff",
  border: "#e2e8f0",
  textMid: "#475569",
  textSoft: "#64748b",
};

/* ── Reusable icon button — same pattern as StudentAppSSLCList ── */
const IconBtn = ({ icon, title, color, bg, onClick, disabled }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all: "unset",
        width: 32,
        height: 32,
        borderRadius: 7,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 16,
        transition: "all 0.15s",
        color: disabled ? "#c0c0c0" : hov ? color : COLOR.textMid,
        background: disabled ? "transparent" : hov ? bg : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
    </button>
  );
};

const inr = (v) =>
  `₹ ${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const ACADEMIC_YEAR_OPTIONS = ["2024-2025", "2025-2026", "2026-2027"];
const PAYMENT_MODES = ["Cash", "Online", "Cheque", "DD"];

/* ── status badge ── */
const StatusBadge = ({ status }) => {
  const cfg = {
    Paid: {
      bg: C.successLight,
      color: "#166534",
      border: `1px solid ${C.success}`,
      text: "✓ Paid",
    },
    Partial: {
      bg: C.partialLight,
      color: "#5b21b6",
      border: `1px solid ${C.partial}`,
      text: "◑ Partial",
    },
    Unpaid: {
      bg: C.dangerLight,
      color: "#991b1b",
      border: `1px solid ${C.danger}`,
      text: "✕ Unpaid",
    },
  }[status] || {
    bg: C.bg,
    color: C.muted,
    border: `1px solid ${C.border}`,
    text: status,
  };

  return (
    <span
      style={{
        ...cfg,
        padding: "3px 12px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.text}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   RECEIPT PRINTER  — same rich format as FeeCollectionList
══════════════════════════════════════════════════════════ */
const formatReceiptDate = (d) => {
  if (!d) return "—";
  const str = typeof d === "string" ? d.split("T")[0] : String(d);
  const parts = str.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
};

const printReceipt = (record, school) => {
  let feeItemsArr = record.fee_items || [];
  if (typeof feeItemsArr === "string") {
    try {
      feeItemsArr = JSON.parse(feeItemsArr);
    } catch {
      feeItemsArr = [];
    }
  }
  if (!Array.isArray(feeItemsArr)) feeItemsArr = [];

  const schoolName = school?.name || record.school_name || "School Name";
  const schoolAddress = school?.address || record.school_address || "";
  const schoolLogo = school?.logo || record.school_logo || "";

  // ── Payment breakdown fields ──────────────────────────────────────────────
  // total_fee      = original full demand amount
  // already_paid   = what was paid in PREVIOUS receipts (before this one)
  // current_payment / paid_amount = what was paid in THIS transaction
  // balance_amount = what remains after this payment
  const totalFee = parseFloat(record.total_fee || record.total_amount || 0);
  const alreadyPaid = parseFloat(record.already_paid || 0);
  const currentPayment = parseFloat(
    record.current_payment || record.paid_amount || 0,
  );
  const balanceAmt = parseFloat(record.balance_amount || 0);
  const isFullyPaid = balanceAmt <= 0;

  // ── Fee items rows (the items in this demand) ─────────────────────────────
  const feeItemsRows =
    feeItemsArr.length > 0
      ? feeItemsArr
          .map(
            (f, idx) =>
              `<tr>
          <td>${idx + 1}</td>
          <td>${f.type || f.name || "—"}</td>
          <td style="text-align:right">${parseFloat(f.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="text-align:center;color:#888;padding:12px">No fee items listed</td></tr>`;

  // ── Summary rows ──────────────────────────────────────────────────────────
  const totalFeeRow = `
    <tr style="background:#f0f4ff!important">
      <td colspan="2" style="padding:8px 12px;font-weight:600;color:#1d2a4d">Total Fee</td>
      <td style="text-align:right;padding:8px 12px;font-weight:700;color:#1d2a4d">${totalFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>`;

  const alreadyPaidRow =
    alreadyPaid > 0
      ? `<tr style="background:#f0fff4!important">
        <td colspan="2" style="padding:8px 12px;font-weight:600;color:#166534">Already Paid</td>
        <td style="text-align:right;padding:8px 12px;font-weight:700;color:#166534">${alreadyPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
       </tr>`
      : "";

  const balanceToPayRow =
    alreadyPaid > 0
      ? `<tr style="background:#fff7ed!important">
        <td colspan="2" style="padding:8px 12px;font-weight:600;color:#92400e">Balance to Pay</td>
        <td style="text-align:right;padding:8px 12px;font-weight:700;color:#92400e">${(totalFee - alreadyPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
       </tr>`
      : "";

  const currentPaymentRow = `
    <tr style="background:#e8eaf6!important">
      <td colspan="2" style="padding:10px 12px;font-weight:700;color:#1d2a4d;font-size:14px">Current Payment</td>
      <td style="text-align:right;padding:10px 12px;font-weight:800;color:#1d2a4d;font-size:14px">${currentPayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>`;

  const balanceDueRow =
    balanceAmt > 0
      ? `<tr style="color:#c0392b">
        <td colspan="2" style="padding:8px 12px;font-weight:600">Balance Due</td>
        <td style="text-align:right;padding:8px 12px;font-weight:700">${balanceAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
       </tr>`
      : `<tr style="color:#166534">
        <td colspan="2" style="padding:8px 12px;font-weight:600">Balance Due</td>
        <td style="text-align:right;padding:8px 12px;font-weight:700">0.00</td>
       </tr>`;

  const paymentStatusRow = `
    <tr style="background:${isFullyPaid ? "#dcfce7" : "#ede9fe"}!important">
      <td colspan="2" style="padding:8px 12px;font-weight:600;color:${isFullyPaid ? "#166534" : "#5b21b6"}">Payment Status</td>
      <td style="text-align:right;padding:8px 12px;font-weight:700;color:${isFullyPaid ? "#166534" : "#5b21b6"}">${isFullyPaid ? "Fully Paid" : "Partial Payment"}</td>
    </tr>`;

  const paidStamp = isFullyPaid
    ? `<div style="display:inline-block;border:3px solid #27ae60;color:#27ae60;font-weight:800;font-size:22px;padding:6px 20px;border-radius:6px;transform:rotate(-12deg);letter-spacing:3px;">PAID</div>`
    : `<div style="display:inline-block;border:3px solid #e67e22;color:#e67e22;font-weight:800;font-size:18px;padding:6px 16px;border-radius:6px;transform:rotate(-12deg);letter-spacing:2px;">PARTIAL</div>`;

  const logoHTML = schoolLogo
    ? `<img src="${schoolLogo}" alt="School Logo" style="height:70px;width:70px;object-fit:contain;flex-shrink:0;" />`
    : "";

  const receiptHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Fee Receipt - ${record.receipt_no || "Receipt"}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
      body{font-family:'Segoe UI',Tahoma,sans-serif;background:#f0f4f8;display:flex;justify-content:center;align-items:flex-start;padding:20px;min-height:100vh;}
      /* A5 landscape: 210mm wide × 148mm tall */
      .rw{background:#fff;width:210mm;min-height:148mm;max-height:148mm;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.12);border-radius:4px;overflow:hidden;display:flex;flex-direction:column;}
      /* Header — compact for landscape */
      .hd{background:linear-gradient(135deg,#1d2a4d 0%,#2d4073 100%)!important;color:white!important;padding:10px 20px 8px;display:flex;align-items:center;gap:14px;flex-shrink:0;}
      .hd-logo img{height:46px;width:46px;object-fit:contain;}
      .hd-info{flex:1;text-align:center;}
      .sn{font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;}
      .sa{font-size:9.5px;opacity:0.85;margin-bottom:5px;}
      .rb{display:inline-block;background:rgba(255,255,255,0.2)!important;border:1px solid rgba(255,255,255,0.5);color:white!important;font-size:9px;font-weight:700;letter-spacing:2.5px;padding:2px 12px;border-radius:20px;text-transform:uppercase;}
      /* Body — two-column landscape layout */
      .bd{padding:10px 16px 10px;flex:1;display:flex;flex-direction:column;gap:8px;}
      /* Receipt meta row */
      .rm{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:1.5px dashed #e0e0e0;}
      .rn,.rd{font-size:10px;color:#555;}
      .rn span,.rd span{font-weight:700;color:#1d2a4d;font-size:11px;}
      /* Two-column: left = student info, right = fee table */
      .cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;}
      /* Student info grid — 2 cols inside left panel */
      .ig{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;background:#f8f9ff!important;border-radius:6px;padding:8px 10px;align-content:start;}
      .ir{display:flex;flex-direction:column;gap:1px;}
      .il{font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.6px;}
      .iv{font-size:10px;font-weight:600;color:#222;}
      /* Right panel — fee table */
      .tpanel{display:flex;flex-direction:column;}
      table{width:100%;border-collapse:collapse;font-size:10px;}
      thead tr{background:#1d2a4d!important;color:white!important;}
      th{padding:5px 7px;text-align:left;font-weight:600;font-size:9px;color:white!important;}
      tbody tr:nth-child(even){background:#f5f7ff!important;}
      td{padding:4px 7px;border-bottom:1px solid #eee;color:#333;}
      /* Footer */
      .ft{display:flex;justify-content:space-between;align-items:flex-end;padding-top:6px;border-top:1.5px dashed #ddd;flex-shrink:0;}
      .ft-note{font-size:8px;color:#aaa;line-height:1.7;}
      .ft-sign{width:110px;border-top:1px solid #555;padding-top:4px;font-size:9px;color:#666;font-weight:600;text-align:center;}
      @media print{
        body{background:white;padding:0;display:block;}
        .rw{box-shadow:none;width:100%;min-height:unset;max-height:unset;}
        @page{size:A5 portrait;margin:2mm;}
      }
    </style>
    </head><body><div class="rw">
    <div class="hd">
      ${logoHTML ? `<div class="hd-logo">${logoHTML}</div>` : ""}
      <div class="hd-info">
        <div class="sn">${schoolName}</div>
        ${schoolAddress ? `<div class="sa">${schoolAddress}</div>` : ""}
        <div class="rb">Fee Payment Receipt</div>
      </div>
    </div>
    <div class="bd">
      <div class="rm">
        <div class="rn">Receipt No: <span>${record.receipt_no || "—"}</span></div>
        <div class="rd">Date: <span>${formatReceiptDate(record.collection_date)}</span></div>
      </div>
      <div class="cols">
        <!-- LEFT: Student Details -->
        <div class="ig">
          <div class="ir"><span class="il">Student Name</span><span class="iv">${record.student_name || "—"}</span></div>
          <div class="ir"><span class="il">Admission No.</span><span class="iv">${record.admission_number || "—"}</span></div>
          <div class="ir"><span class="il">EMIS Number</span><span class="iv">${record.emis_number || "—"}</span></div>
          <div class="ir"><span class="il">Academic Year</span><span class="iv">${record.academic_year || "—"}</span></div>
          <div class="ir"><span class="il">Course</span><span class="iv">${record.course || "—"}</span></div>
          <div class="ir"><span class="il">Grade &amp; Section</span><span class="iv">${record.grade || "—"} — ${record.section || "—"}</span></div>
          <div class="ir"><span class="il">Medium</span><span class="iv">${record.medium || "—"}</span></div>
          <div class="ir"><span class="il">Payment Mode</span><span class="iv">${record.payment_mode || "Cash"}</span></div>
        </div>
        <!-- RIGHT: Fee Table -->
        <div class="tpanel">
          <table>
            <thead><tr><th width="28">S.No</th><th>Fee Type</th><th style="text-align:right">Amount (₹)</th></tr></thead>
            <tbody>
              ${feeItemsRows}
              <tr><td colspan="3" style="padding:2px 0;border:none;background:transparent"></td></tr>
              ${totalFeeRow}
              ${alreadyPaidRow}
              ${balanceToPayRow}
              ${currentPaymentRow}
              ${balanceDueRow}
              ${paymentStatusRow}
            </tbody>
          </table>
        </div>
      </div>
      <div class="ft">
        <div class="ft-note">* Computer-generated receipt. Retain for your records.<br/>* For queries, contact the school office.</div>
        <div style="display:flex;align-items:flex-end;">${paidStamp}</div>
        <div class="ft-sign">Authorized Signature</div>
      </div>
    </div></div>
    <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
    </body></html>`;

  const pw = window.open("", "_blank", "width=900,height=660");
  if (pw) {
    pw.document.write(receiptHTML);
    pw.document.close();
  } else alert("Popup blocked. Please allow popups to print receipts.");
};

/* ══════════════════════════════════════════════════════════
   PAYMENT MODAL
══════════════════════════════════════════════════════════ */
const PaymentModal = ({ demand, school, onClose, onSaved, notifApi }) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const total = parseFloat(demand.total_amount || 0);
  const alreadyPaid = parseFloat(demand.paid_amount || 0);
  const outstanding = Math.max(0, total - alreadyPaid);

  const [paymentMode, setPaymentMode] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [paidAmount, setPaidAmount] = useState(String(outstanding));
  const [collectionDate, setCollectionDate] = useState(todayStr);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCollection, setLastCollection] = useState(null);

  const needsTxn = ["Online", "Cheque", "DD"].includes(paymentMode);
  const numPaid = parseFloat(paidAmount || 0);
  const newBalance = total - alreadyPaid - numPaid;

  const inp = {
    width: "100%",
    padding: "7px 11px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13.5,
    color: C.text,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };
  const lbl = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const handleSave = async () => {
    if (!paidAmount || numPaid <= 0) return alert("Enter a valid paid amount.");
    if (numPaid > outstanding + 0.01)
      return alert(`Cannot exceed outstanding ₹${outstanding.toFixed(2)}.`);
    if (needsTxn && !transactionId.trim())
      return alert("Enter a transaction ID.");
    if (!collectionDate) return alert("Select a collection date.");

    try {
      setSaving(true);
      const r = await axios.post(
        `${BASE}/studentFeeDemand/recordPayment/${demand.id}`,
        {
          paid_amount: numPaid,
          payment_mode: paymentMode,
          transaction_id: transactionId || null,
          collection_date: collectionDate,
          remarks: remarks || null,
          collected_by: user.name || null,
          // ── Payment breakdown — stored in the collection record ──────────────
          total_fee: total, // full demand amount
          already_paid: alreadyPaid, // paid BEFORE this transaction
          current_payment: numPaid, // paid in THIS transaction
        },
      );

      const { collection, demand: updatedDemand } = r.data.data;
      setLastCollection(collection);

      // Enrich the collection object so printReceipt renders correctly
      // even if the backend doesn't yet return these new fields

      // Parse fee_items from demand (may be JSON string or array)
      let demandFeeItems = demand.fee_items || [];
      if (typeof demandFeeItems === "string") {
        try {
          demandFeeItems = JSON.parse(demandFeeItems);
        } catch {
          demandFeeItems = [];
        }
      }
      if (!Array.isArray(demandFeeItems)) demandFeeItems = [];

      // Parse fee_items from collection response (may also be JSON string)
      let collectionFeeItems = collection.fee_items || [];
      if (typeof collectionFeeItems === "string") {
        try {
          collectionFeeItems = JSON.parse(collectionFeeItems);
        } catch {
          collectionFeeItems = [];
        }
      }
      if (!Array.isArray(collectionFeeItems)) collectionFeeItems = [];

      // Prefer demand fee_items (always has the items) over collection's (often empty)
      const resolvedFeeItems =
        demandFeeItems.length > 0 ? demandFeeItems : collectionFeeItems;

      const enrichedCollection = {
        ...collection,
        total_fee: collection.total_fee ?? total,
        already_paid: collection.already_paid ?? alreadyPaid,
        current_payment: collection.current_payment ?? numPaid,
        // balance_amount = what remains AFTER this payment
        balance_amount:
          collection.balance_amount != null
            ? collection.balance_amount
            : Math.max(0, total - alreadyPaid - numPaid),
        // carry student / school metadata if collection lacks it
        student_name: collection.student_name || demand.student_name,
        admission_number:
          collection.admission_number || demand.admission_number,
        emis_number: collection.emis_number || demand.emis_number,
        academic_year: collection.academic_year || demand.academic_year,
        course: collection.course || demand.course,
        grade: collection.grade || demand.grade,
        section: collection.section || demand.section,
        medium: collection.medium || demand.medium,
        fee_items: resolvedFeeItems,
      };

      notifApi.success({
        message: "Payment Collected Successfully!",
        description: `Receipt ${collection.receipt_no} generated for ${demand.student_name}. Printing receipt…`,
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        placement: "topRight",
        duration: 4,
      });

      printReceipt(enrichedCollection, school);

      onSaved(updatedDemand);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  /* ── fee items ── */
  let feeItems = demand.fee_items || [];
  if (typeof feeItems === "string") {
    try {
      feeItems = JSON.parse(feeItems);
    } catch {
      feeItems = [];
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          width: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>
              Collect Payment
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {demand.student_name} · {demand.admission_number}
            </div>
          </div>
        </div>

        {/* Fee summary */}
        <div
          style={{
            background: C.bg,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 18,
          }}
        >
          {feeItems.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                paddingBottom: 6,
                marginBottom: 6,
                borderBottom:
                  i < feeItems.length - 1 ? `1px solid ${C.border}` : "none",
              }}
            >
              <span style={{ color: C.muted }}>
                {f.type} – {f.description}
              </span>
              <span style={{ fontWeight: 600, color: C.text }}>
                {inr(f.amount)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTop: `1.5px solid ${C.border}`,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <span>Total Demand</span>
            <span style={{ color: C.primary }}>{inr(demand.total_amount)}</span>
          </div>
          {alreadyPaid > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginTop: 4,
                color: "#166534",
              }}
            >
              <span>Already Paid</span>
              <span style={{ fontWeight: 600 }}>{inr(alreadyPaid)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              marginTop: 4,
              fontWeight: 700,
              color: "#991b1b",
            }}
          >
            <span>Outstanding</span>
            <span>{inr(outstanding)}</span>
          </div>
        </div>

        {/* Payment inputs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <span style={lbl}>Amount Paid *</span>
            <input
              style={inp}
              type="number"
              min="0"
              max={outstanding}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>
          <div>
            <span style={lbl}>Payment Mode</span>
            <select
              style={inp}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          {needsTxn && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={lbl}>Transaction / Cheque / DD No. *</span>
              <input
                style={inp}
                placeholder="Enter reference number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
          )}

          <div>
            <span style={lbl}>Collection Date *</span>
            <input
              style={inp}
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
            />
          </div>
          <div>
            <span style={lbl}>Remarks</span>
            <input
              style={inp}
              placeholder="Optional remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        {/* Balance preview */}
        {numPaid > 0 && (
          <div
            style={{
              background: newBalance <= 0 ? C.successLight : C.warningLight,
              border: `1px solid ${newBalance <= 0 ? C.success : C.warning}`,
              borderRadius: 7,
              padding: "8px 14px",
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              color: newBalance <= 0 ? "#166534" : "#92400e",
            }}
          >
            {newBalance <= 0
              ? "✓ Fully paid after this payment."
              : `Balance remaining after payment: ${inr(newBalance)}`}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: C.bg,
              color: C.primary,
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 24px",
              background: C.success,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Collect & Print Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RECEIPT HISTORY MODAL
   Shows every receipt for a demand; allows printing any one.
══════════════════════════════════════════════════════════ */
const ReceiptHistoryModal = ({ demand, collections, school, onClose }) => {
  // Sort ascending so R001 is first, R002 second, etc.
  const sorted = [...collections].sort((a, b) => a.id - b.id);

  const inrFmt = (v) =>
    parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const handlePrint = (col) => {
    const totalFee = parseFloat(col.total_fee || demand.total_amount || 0);

    // Parse fee_items — prefer demand's (always populated) over collection's (often empty)
    let demandFeeItems = demand.fee_items || [];
    if (typeof demandFeeItems === "string") {
      try {
        demandFeeItems = JSON.parse(demandFeeItems);
      } catch {
        demandFeeItems = [];
      }
    }
    if (!Array.isArray(demandFeeItems)) demandFeeItems = [];

    let colFeeItems = col.fee_items || [];
    if (typeof colFeeItems === "string") {
      try {
        colFeeItems = JSON.parse(colFeeItems);
      } catch {
        colFeeItems = [];
      }
    }
    if (!Array.isArray(colFeeItems)) colFeeItems = [];

    const resolvedFeeItems =
      demandFeeItems.length > 0 ? demandFeeItems : colFeeItems;

    const enriched = {
      ...col,
      total_fee: col.total_fee ?? totalFee,
      already_paid: col.already_paid ?? 0,
      current_payment: col.current_payment ?? parseFloat(col.paid_amount || 0),
      balance_amount: col.balance_amount ?? 0,
      student_name: col.student_name || demand.student_name,
      admission_number: col.admission_number || demand.admission_number,
      emis_number: col.emis_number || demand.emis_number,
      academic_year: col.academic_year || demand.academic_year,
      course: col.course || demand.course,
      grade: col.grade || demand.grade,
      section: col.section || demand.section,
      medium: col.medium || demand.medium,
      fee_items: resolvedFeeItems,
    };
    printReceipt(enriched, school);
  };

  const thS = {
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    background: C.headBg,
    textAlign: "left",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const tdS = {
    padding: "9px 12px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.50)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          width: 820,
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "24px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>
              Receipt History
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {demand.student_name} · {demand.admission_number} ·{" "}
              {demand.academic_year}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Total Demand:{" "}
              <strong style={{ color: C.primary }}>
                {inr(demand.total_amount)}
              </strong>
              &nbsp;|&nbsp; Paid:{" "}
              <strong style={{ color: "#166534" }}>
                {inr(demand.paid_amount)}
              </strong>
              &nbsp;|&nbsp; Balance:{" "}
              <strong
                style={{
                  color:
                    parseFloat(demand.balance_amount) > 0
                      ? "#991b1b"
                      : "#166534",
                }}
              >
                {inr(demand.balance_amount)}
              </strong>
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: C.muted,
              padding: "32px 0",
              fontSize: 14,
            }}
          >
            No receipts found for this student.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "S.No",
                    "Receipt ",
                    "Date",
                    "Total Fee",
                    "Paid Now",
                    "Balance",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} style={thS}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((col, idx) => {
                  const totalFee = parseFloat(
                    col.total_fee || demand.total_amount || 0,
                  );
                  const currentPmt = parseFloat(
                    col.current_payment || col.paid_amount || 0,
                  );
                  const balanceDue = parseFloat(col.balance_amount || 0);
                  const isFullyPaid = balanceDue <= 0;

                  return (
                    <tr
                      key={col.id}
                      style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfd" }}
                    >
                      <td style={{ ...tdS, color: C.muted, fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: C.accent,
                        }}
                      >
                        {col.receipt_no || "—"}
                      </td>
                      <td style={tdS}>
                        {formatReceiptDate(col.collection_date)}
                      </td>
                      <td style={{ ...tdS, fontWeight: 600 }}>
                        {inrFmt(totalFee)}
                      </td>
                      <td style={{ ...tdS, fontWeight: 700, color: C.primary }}>
                        {inrFmt(currentPmt)}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          color: isFullyPaid ? "#166534" : "#991b1b",
                          fontWeight: 600,
                        }}
                      >
                        {inrFmt(balanceDue)}
                      </td>
                      <td style={tdS}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isFullyPaid
                              ? C.successLight
                              : C.partialLight,
                            color: isFullyPaid ? "#166534" : "#5b21b6",
                            border: `1px solid ${isFullyPaid ? C.success : C.partial}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isFullyPaid ? "✓ Fully Paid" : "◑ Partial"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <button
                          onClick={() => handlePrint(col)}
                          style={{
                            padding: "4px 12px",
                            background: C.accentLight,
                            color: C.accent,
                            border: `1px solid ${C.accent}`,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 11,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          🖨 Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 22px",
              background: C.bg,
              color: C.primary,
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function FeeDemandList() {
  const navigate = useNavigate();
  const { selectedSchool, selectedYear } = useFilter();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const rawRole = (user?.roleName || "").toLowerCase().replace(/\s+/g, "");
  const isAdmin = rawRole === "superadmin";
  const schoolId = isAdmin
    ? selectedSchool && selectedSchool !== "all"
      ? String(selectedSchool)
      : null
    : String(user?.school?.id || "");

  const [notifApi, notifContextHolder] = notification.useNotification();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [receiptHistory, setReceiptHistory] = useState(null); // { demand, collections }

  /* filters */
  const [filterYear, setFilterYear] = useState(
    selectedYear || ACADEMIC_YEAR_OPTIONS[1],
  );
  const [filterCourse, setFilterCourse] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);

  /* ── filter grades by selected course ── */
  const filteredGradeOptions = gradeOptions.filter((g) => {
    const gradeName = g.grade?.trim().toUpperCase();
    if (filterCourse === "HSC") {
      return (
        gradeName === "XI" ||
        gradeName === "XII" ||
        gradeName === "11" ||
        gradeName === "12"
      );
    }
    if (filterCourse === "SSLC") {
      return (
        gradeName !== "XI" &&
        gradeName !== "XII" &&
        gradeName !== "11" &&
        gradeName !== "12"
      );
    }
    return true; // "All" — show all grades
  });

  /* ── fetch school info ── */
  useEffect(() => {
    if (!schoolId) return;
    axios
      .get(`${BASE}/feeCollection/getSchool/${schoolId}`)
      .then((r) => setSchool(r.data.data))
      .catch(() => {});
  }, [schoolId]);

  /* ── fetch grades for filter ── */
  useEffect(() => {
    if (!schoolId || !filterYear) return;
    axios
      .get(`${BASE}/grade/getGradesBySchoolAndYear/${schoolId}/${filterYear}`)
      .then((r) => setGradeOptions(r.data.grades || []))
      .catch(() => setGradeOptions([]));
  }, [schoolId, filterYear]);

  /* ── fetch sections ── */
  useEffect(() => {
    if (!schoolId || !filterGrade) {
      setSectionOptions([]);
      return;
    }
    axios
      .get(
        `${BASE}/section/getSectionsBySchoolAndGrade/${schoolId}/${filterGrade}`,
      )
      .then((r) => setSectionOptions(r.data.sections || []))
      .catch(() => setSectionOptions([]));
  }, [schoolId, filterGrade]);

  /* ── fetch demands ── */
  const fetchDemands = useCallback(async () => {
    if (!schoolId || !filterYear) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        academic_year: filterYear,
      });
      if (filterCourse) params.set("course", filterCourse);
      if (filterGrade) {
        const gl = gradeOptions.find(
          (g) => g.id === parseInt(filterGrade),
        )?.grade;
        if (gl) params.set("grade", gl);
      }
      if (filterSection) {
        const sl = sectionOptions.find(
          (s) => s.id === parseInt(filterSection),
        )?.sectionName;
        if (sl) params.set("section", sl);
      }
      if (filterStatus) params.set("status", filterStatus);

      const r = await axios.get(`${BASE}/studentFeeDemand/list?${params}`);
      setDemands(r.data.data || []);
    } catch {
      setDemands([]);
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    filterYear,
    filterCourse,
    filterGrade,
    filterSection,
    filterStatus,
    gradeOptions,
    sectionOptions,
  ]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  /* ── delete demand ── */
  const handleDelete = async (demand) => {
    const msg =
      demand.status === "Paid"
        ? `This demand is fully paid. Deleting will NOT remove the receipt. Continue?`
        : `Delete demand for ${demand.student_name}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await axios.delete(`${BASE}/studentFeeDemand/delete/${demand.id}`);
      setDemands((prev) => prev.filter((d) => d.id !== demand.id));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete.");
    }
  };

  /* ── payment saved callback ── */
  const handlePaymentSaved = (updatedDemand) => {
    setDemands((prev) =>
      prev.map((d) => (d.id === updatedDemand.id ? updatedDemand : d)),
    );
    setPaymentTarget(null);
  };

  /* ── fetch all receipts for a demand → open history modal ── */
  const [printingId, setPrintingId] = useState(null);

  const handlePrintDemandReceipt = async (demand) => {
    setPrintingId(demand.id);
    try {
      // Fetch all fee-collection receipts for this school
      const r = await axios.get(
        `${BASE}/feeCollection/getAllBySchool/${demand.school_id}`,
      );
      const collections = (r.data.data || []).filter(
        (c) =>
          c.admission_number === demand.admission_number &&
          c.academic_year === demand.academic_year,
      );

      if (!collections.length) {
        notifApi.warning({
          message: "No Receipts Found",
          description: "No payment receipts found for this student.",
          placement: "topRight",
          duration: 3,
        });
        return;
      }

      // Fetch school info if not already loaded
      let schoolData = school;
      if (!schoolData?.name && demand.school_id) {
        try {
          const sr = await axios.get(
            `${BASE}/feeCollection/getSchool/${demand.school_id}`,
          );
          schoolData = sr.data?.data || sr.data || null;
        } catch {
          /* silent */
        }
      }

      // Open the history modal showing ALL receipts
      setReceiptHistory({ demand, collections, school: schoolData });
    } catch (e) {
      notifApi.error({
        message: "Failed to Load Receipts",
        description: "Could not fetch receipt data. Please try again.",
        placement: "topRight",
        duration: 3,
      });
    } finally {
      setPrintingId(null);
    }
  };
  const visible = demands.filter((d) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (
      d.student_name?.toLowerCase().includes(q) ||
      d.admission_number?.toLowerCase().includes(q) ||
      d.grade?.toLowerCase().includes(q)
    );
  });

  /* ── stats ── */
  const stats = {
    total: demands.length,
    unpaid: demands.filter((d) => d.status === "Unpaid").length,
    partial: demands.filter((d) => d.status === "Partial").length,
    paid: demands.filter((d) => d.status === "Paid").length,
    totalDue: demands.reduce((s, d) => s + parseFloat(d.total_amount || 0), 0),
    totalPaid: demands.reduce((s, d) => s + parseFloat(d.paid_amount || 0), 0),
  };

  /* ── pagination ── */
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    filterSearch,
    filterYear,
    filterCourse,
    filterGrade,
    filterSection,
    filterStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paginated = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* ── Export to Excel (CSV) ── */
  const handleExportExcel = () => {
    const headers = [
      "S.No",
      "Student Name",
      "Admission No.",
      "Grade",
      "Section",
      "Medium",
      "Type",
      "Total",
      "Paid",
      "Balance",
      "Status",
    ];
    const rows = visible.map((d, i) => [
      i + 1,
      d.student_name || "",
      d.admission_number || "",
      d.grade || "",
      d.section || "",
      d.medium || "",
      d.student_type || "",
      parseFloat(d.total_amount || 0).toFixed(2),
      parseFloat(d.paid_amount || 0).toFixed(2),
      parseFloat(d.balance_amount || 0).toFixed(2),
      d.status || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee_demands_${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Print table records ── */
  const handlePrintTable = () => {
    const rows = visible
      .map(
        (d, i) => `
      <tr>
        <td>${i + 1}</td><td>${d.student_name || ""}</td>
        <td>${d.admission_number || ""}</td><td>${d.grade || ""}</td>
        <td>${d.section || ""}</td><td>${d.medium || ""}</td>
        <td>${d.student_type || ""}</td>
        <td style="text-align:right">${parseFloat(d.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${parseFloat(d.paid_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${parseFloat(d.balance_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td>${d.status || ""}</td>
      </tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Fee Demand List</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;padding:20px;font-size:12px;}
      h2{margin-bottom:14px;color:#1d2a4d;font-size:16px;}
      table{width:100%;border-collapse:collapse;}th{background:#1d2a4d;color:#fff;padding:8px 10px;text-align:left;font-size:11px;}
      td{padding:7px 10px;border-bottom:1px solid #e0e5f0;}tr:nth-child(even){background:#f4f6fb;}
      tfoot td{font-weight:700;background:#dcfce7;color:#166534;}
      @media print{@page{margin:12mm;}}</style></head><body>
      <h2>Fee Demand List — ${filterYear}</h2>
      <table><thead><tr><th>#</th><th>Student Name</th><th>Admission No.</th><th>Grade</th><th>Section</th><th>Medium</th><th>Type</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="7" style="text-align:right;padding:8px 10px;">Total (${visible.length} records)</td>
        <td style="text-align:right;padding:8px 10px;">${stats.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;padding:8px 10px;">${stats.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;padding:8px 10px;">${(stats.totalDue - stats.totalPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td></td></tr></tfoot></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script></body></html>`;
    const pw = window.open("", "_blank", "width=1100,height=750");
    if (pw) {
      pw.document.write(html);
      pw.document.close();
    } else alert("Popup blocked. Please allow popups to print.");
  };

  /* ── Bulk Download Receipts — builds one combined print-to-PDF window ── */
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const buildReceiptHTML = (record, school, feeItemsArr) => {
    const schoolName = school?.name || record.school_name || "School Name";
    const schoolAddress = school?.address || record.school_address || "";
    const schoolLogo = school?.logo || record.school_logo || "";
    const totalFee = parseFloat(record.total_fee || record.total_amount || 0);
    const alreadyPaid = parseFloat(record.already_paid || 0);
    const currentPayment = parseFloat(
      record.current_payment || record.paid_amount || 0,
    );
    const balanceAmt = parseFloat(record.balance_amount || 0);
    const isFullyPaid = balanceAmt <= 0;
    const fmt = (v) =>
      parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

    const feeRows =
      feeItemsArr.length > 0
        ? feeItemsArr
            .map(
              (f, idx) =>
                `<tr><td>${idx + 1}</td><td>${f.type || f.name || "—"}</td><td style="text-align:right">${fmt(f.amount)}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="3" style="text-align:center;color:#888;padding:12px">No fee items listed</td></tr>`;

    const summaryRows = `
      <tr class="row-total"><td colspan="2" style="padding:7px 12px">Total Fee</td><td style="text-align:right;padding:7px 12px">${fmt(totalFee)}</td></tr>
      ${alreadyPaid > 0 ? `<tr class="row-already"><td colspan="2" style="padding:7px 12px">Already Paid</td><td style="text-align:right;padding:7px 12px">${fmt(alreadyPaid)}</td></tr>` : ""}
      ${alreadyPaid > 0 ? `<tr class="row-balance-to-pay"><td colspan="2" style="padding:7px 12px">Balance to Pay</td><td style="text-align:right;padding:7px 12px">${fmt(totalFee - alreadyPaid)}</td></tr>` : ""}
      <tr class="row-current"><td colspan="2" style="padding:8px 12px">Current Payment</td><td style="text-align:right;padding:8px 12px">${fmt(currentPayment)}</td></tr>
      <tr class="${balanceAmt > 0 ? "row-due-red" : "row-due-green"}"><td colspan="2" style="padding:7px 12px">Balance Due</td><td style="text-align:right;padding:7px 12px">${balanceAmt > 0 ? fmt(balanceAmt) : "0.00"}</td></tr>
      <tr class="${isFullyPaid ? "row-status-paid" : "row-status-partial"}"><td colspan="2" style="padding:7px 12px">Payment Status</td><td style="text-align:right;padding:7px 12px">${isFullyPaid ? "Fully Paid" : "Partial Payment"}</td></tr>`;

    const stamp = isFullyPaid
      ? `<div class="stamp-paid">PAID</div>`
      : `<div class="stamp-partial">PARTIAL</div>`;

    const logoHTML = schoolLogo
      ? `<img src="${schoolLogo}" style="height:60px;width:60px;object-fit:contain;flex-shrink:0" />`
      : "";

    return `
      <div class="receipt-page">
        <div class="hd">
          ${logoHTML ? `<div class="hd-logo">${logoHTML}</div>` : ""}
          <div class="hd-info">
            <div class="sn">${schoolName}</div>
            ${schoolAddress ? `<div class="sa">${schoolAddress}</div>` : ""}
            <div class="rb">Fee Payment Receipt</div>
          </div>
        </div>
        <div class="bd">
          <div class="rm">
            <div class="rn">Receipt No: <span>${record.receipt_no || "—"}</span></div>
            <div class="rd">Date: <span>${formatReceiptDate(record.collection_date)}</span></div>
          </div>
          <div class="ig">
            <div class="ir"><span class="il">Student Name</span><span class="iv">${record.student_name || "—"}</span></div>
            <div class="ir"><span class="il">Admission No.</span><span class="iv">${record.admission_number || "—"}</span></div>
            <div class="ir"><span class="il">EMIS Number</span><span class="iv">${record.emis_number || "—"}</span></div>
            <div class="ir"><span class="il">Academic Year</span><span class="iv">${record.academic_year || "—"}</span></div>
            <div class="ir"><span class="il">Course</span><span class="iv">${record.course || "—"}</span></div>
            <div class="ir"><span class="il">Grade &amp; Section</span><span class="iv">${record.grade || "—"} — ${record.section || "—"}</span></div>
            <div class="ir"><span class="il">Medium</span><span class="iv">${record.medium || "—"}</span></div>
            <div class="ir"><span class="il">Payment Mode</span><span class="iv">${record.payment_mode || "Cash"}</span></div>
          </div>
          <table>
            <thead><tr><th width="36">#</th><th>Fee Type</th><th style="text-align:right">Amount (₹)</th></tr></thead>
            <tbody>${feeRows}<tr><td colspan="3" style="border:none;padding:3px 0;background:transparent"></td></tr>${summaryRows}</tbody>
          </table>
          <div class="footer-row">
            <div class="footer-note">* Computer-generated receipt.<br/>* Retain for your records.<br/>* Queries: contact school office.</div>
            <div class="stamp-wrap">${stamp}</div>
            <div class="sig-wrap"><div class="sig-line">Authorized Signature</div></div>
          </div>
        </div>
      </div>`;
  };

  const handleBulkDownload = async () => {
    const paid = visible.filter((d) => d.status !== "Unpaid");
    if (!paid.length) {
      notifApi.warning({
        message: "No receipts to download",
        description: "All demands are unpaid.",
        placement: "topRight",
        duration: 3,
      });
      return;
    }
    setBulkDownloading(true);
    notifApi.info({
      message: `Preparing ${paid.length} receipt(s)…`,
      description: "Fetching receipt data, please wait.",
      placement: "topRight",
      duration: 3,
    });

    try {
      // Fetch school info once
      let schoolData = school;
      if (!schoolData?.name && paid[0]?.school_id) {
        try {
          const sr = await axios.get(
            `${BASE}/feeCollection/getSchool/${paid[0].school_id}`,
          );
          schoolData = sr.data?.data || sr.data || null;
        } catch {
          /* silent */
        }
      }

      // Fetch all collections for this school once
      const collectionsRes = await axios.get(
        `${BASE}/feeCollection/getAllBySchool/${paid[0].school_id}`,
      );
      const allCollections = collectionsRes.data.data || [];

      // Build receipt HTML blocks for every collection of every paid demand
      const receiptBlocks = [];
      for (const demand of paid) {
        const cols = allCollections
          .filter(
            (c) =>
              c.admission_number === demand.admission_number &&
              c.academic_year === demand.academic_year,
          )
          .sort((a, b) => a.id - b.id);

        if (!cols.length) continue;

        // Parse demand fee_items once
        let demandFeeItems = demand.fee_items || [];
        if (typeof demandFeeItems === "string") {
          try {
            demandFeeItems = JSON.parse(demandFeeItems);
          } catch {
            demandFeeItems = [];
          }
        }
        if (!Array.isArray(demandFeeItems)) demandFeeItems = [];

        for (const col of cols) {
          let colFeeItems = col.fee_items || [];
          if (typeof colFeeItems === "string") {
            try {
              colFeeItems = JSON.parse(colFeeItems);
            } catch {
              colFeeItems = [];
            }
          }
          if (!Array.isArray(colFeeItems)) colFeeItems = [];
          const feeItems =
            demandFeeItems.length > 0 ? demandFeeItems : colFeeItems;

          const enriched = {
            ...col,
            total_fee: col.total_fee ?? parseFloat(demand.total_amount || 0),
            already_paid: col.already_paid ?? 0,
            current_payment:
              col.current_payment ?? parseFloat(col.paid_amount || 0),
            balance_amount: col.balance_amount ?? 0,
            student_name: col.student_name || demand.student_name,
            admission_number: col.admission_number || demand.admission_number,
            emis_number: col.emis_number || demand.emis_number,
            academic_year: col.academic_year || demand.academic_year,
            course: col.course || demand.course,
            grade: col.grade || demand.grade,
            section: col.section || demand.section,
            medium: col.medium || demand.medium,
          };

          receiptBlocks.push(buildReceiptHTML(enriched, schoolData, feeItems));
        }
      }

      if (!receiptBlocks.length) {
        notifApi.warning({
          message: "No receipts found",
          description: "Could not find any payment collections.",
          placement: "topRight",
          duration: 4,
        });
        return;
      }

      // Open one combined print window — browser "Save as PDF" = one PDF with all receipts
      const combinedHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <title>Bulk Fee Receipts — ${filterYear}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
          body{font-family:'Segoe UI',Tahoma,sans-serif;background:#f0f4f8;}
          .receipt-page{background:#fff;width:210mm;margin:0 auto 0;overflow:hidden;page-break-after:always;}
          .receipt-page:last-child{page-break-after:auto;}
          .hd{background:linear-gradient(135deg,#1d2a4d 0%,#2d4073 100%)!important;color:white!important;padding:20px 28px 16px;display:flex;align-items:center;gap:18px;position:relative;}
          .hd-logo{flex-shrink:0;}
          .hd-info{flex:1;text-align:center;}
          .hd::after{content:'';position:absolute;bottom:-10px;left:0;right:0;height:20px;background:white!important;clip-path:ellipse(55% 100% at 50% 100%);z-index:1;}
          .sn{font-size:21px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;}
          .sa{font-size:11px;opacity:0.85;margin-bottom:8px;}
          .rb{display:inline-block;background:rgba(255,255,255,0.2)!important;border:1.5px solid rgba(255,255,255,0.5);color:white!important;font-size:11px;font-weight:600;letter-spacing:3px;padding:3px 16px;border-radius:20px;text-transform:uppercase;}
          .bd{padding:24px 28px 20px;}
          .rm{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px dashed #e0e0e0;}
          .rn{font-size:12px;color:#555;}.rn span{font-weight:700;color:#1d2a4d;font-size:14px;}
          .rd{font-size:12px;color:#555;text-align:right;}.rd span{font-weight:700;color:#333;}
          .ig{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:16px;background:#f8f9ff!important;border-radius:8px;padding:14px;}
          .ir{display:flex;flex-direction:column;gap:1px;}
          .il{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;}
          .iv{font-size:12px;font-weight:600;color:#222;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          thead tr{background:#1d2a4d!important;color:white!important;}
          th{padding:8px 10px;text-align:left;font-weight:600;font-size:11px;color:white!important;}
          tbody tr:nth-child(even){background:#f5f7ff!important;}
          td{padding:8px 10px;border-bottom:1px solid #eee;color:#333;}
          .row-total{background:#f0f4ff!important;} .row-total td{color:#1d2a4d!important;font-weight:600;}
          .row-already{background:#f0fff4!important;} .row-already td{color:#166534!important;font-weight:600;}
          .row-balance-to-pay{background:#fff7ed!important;} .row-balance-to-pay td{color:#92400e!important;font-weight:600;}
          .row-current{background:#e8eaf6!important;} .row-current td{color:#1d2a4d!important;font-weight:700;font-size:13px;}
          .row-due-red td{color:#c0392b!important;font-weight:600;}
          .row-due-green td{color:#166534!important;font-weight:600;}
          .row-status-paid{background:#dcfce7!important;} .row-status-paid td{color:#166534!important;font-weight:700;}
          .row-status-partial{background:#ede9fe!important;} .row-status-partial td{color:#5b21b6!important;font-weight:700;}
          .footer-row{margin-top:16px;padding-top:12px;border-top:1.5px dashed #ddd;display:flex;justify-content:space-between;align-items:flex-end;}
          .footer-note{font-size:9.5px;color:#999;line-height:1.8;flex:1;}
          .stamp-wrap{flex:1;display:flex;justify-content:center;align-items:flex-end;}
          .sig-wrap{flex:1;display:flex;justify-content:flex-end;align-items:flex-end;}
          .sig-line{width:130px;border-top:1.5px solid #555;padding-top:5px;font-size:10px;color:#666;font-weight:600;text-align:center;}
          .stamp-paid{border:3px solid #27ae60!important;color:#27ae60!important;font-weight:800;font-size:20px;padding:5px 16px;border-radius:6px;transform:rotate(-12deg);letter-spacing:3px;display:inline-block;}
          .stamp-partial{border:3px solid #e67e22!important;color:#e67e22!important;font-weight:800;font-size:16px;padding:5px 14px;border-radius:6px;transform:rotate(-12deg);letter-spacing:2px;display:inline-block;}
          @media print{
            body{background:white;}
            .receipt-page{box-shadow:none;margin:0;}
            @page{size:A4;margin:8mm;}
          }
        </style>
      </head>
      <body>
        ${receiptBlocks.join("\n")}
        <script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script>
      </body></html>`;

      const pw = window.open("", "_blank", "width=1000,height=750");
      if (pw) {
        pw.document.write(combinedHTML);
        pw.document.close();
        notifApi.success({
          message: `${receiptBlocks.length} receipt(s) ready`,
          description: 'Use "Save as PDF" in the print dialog to download.',
          placement: "topRight",
          duration: 6,
        });
      } else {
        alert("Popup blocked. Please allow popups and try again.");
      }
    } catch (e) {
      console.error("Bulk download error:", e);
      notifApi.error({
        message: "Failed to generate receipts",
        description: "Please try again.",
        placement: "topRight",
        duration: 4,
      });
    } finally {
      setBulkDownloading(false);
    }
  };

  /* ── table cell style ── */
  const td = {
    padding: "10px 12px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
  };
  const th = {
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: C.headBg,
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const inp = {
    padding: "6px 10px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13,
    color: C.text,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };
  const lbl = {
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 3,
    display: "block",
  };

  return (
    <Layout>
      {notifContextHolder}
      <style>{`
        .fdl-tbl { width: 100%; border-collapse: collapse; }
        .fdl-tbl thead tr { background: ${C.primary}; }
        .fdl-tbl thead th { color: #fff; font-weight: 600; font-size: 12px; padding: 11px 13px; white-space: nowrap; text-align: left; }
        .fdl-tbl tbody tr { border-bottom: 1px solid ${C.border}; transition: background 0.12s; }
        .fdl-tbl tbody tr:nth-child(even) { background: ${C.bg}; }
        .fdl-tbl tbody tr:hover { background: ${C.accentLight} !important; }
        .fdl-tbl tbody td { padding: 10px 13px; font-size: 13px; vertical-align: middle; color: ${C.text}; }
        .fdl-tbl tfoot tr { background: ${C.successLight}; }
        .fdl-tbl tfoot td { padding: 11px 13px; font-weight: 700; color: #166534; }
        .fdl-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #ccc; border-top-color: ${C.accent}; border-radius: 50%; animation: fdl-spin 0.7s linear infinite; }
        @keyframes fdl-spin { to { transform: rotate(360deg); } }
      `}</style>

      {paymentTarget && (
        <PaymentModal
          demand={paymentTarget}
          school={school}
          onClose={() => setPaymentTarget(null)}
          onSaved={handlePaymentSaved}
          notifApi={notifApi}
        />
      )}
      {receiptHistory && (
        <ReceiptHistoryModal
          demand={receiptHistory.demand}
          collections={receiptHistory.collections}
          school={receiptHistory.school}
          onClose={() => setReceiptHistory(null)}
        />
      )}

      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          padding: "20px 24px",
          fontFamily: FF,
        }}
      >
        {/* ── GRADIENT HEADER ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, #2d4073 100%)`,
            borderRadius: 12,
            padding: "16px 24px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              Fee Demand List
            </h5>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {visible.length} of {demands.length} demands
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Export to Excel */}
            <button
              onClick={handleExportExcel}
              title="Export to Excel"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                border: "1.5px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <FileExcelOutlined style={{ fontSize: 13 }} /> Excel
            </button>
            {/* Print Table */}
            <button
              onClick={handlePrintTable}
              title="Print table records"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                border: "1.5px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <PrinterOutlined style={{ fontSize: 13 }} /> Print
            </button>
            {/* Bulk Download Receipts */}
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              title="Bulk download all receipts as PDF"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 30,
                padding: "0 12px",
                borderRadius: 6,
                border: "1.5px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: bulkDownloading ? "not-allowed" : "pointer",
                opacity: bulkDownloading ? 0.7 : 1,
              }}
            >
              <DownloadOutlined style={{ fontSize: 13 }} />
              {bulkDownloading ? "Preparing…" : "Receipts"}
            </button>
            {/* Raise Demand */}
            <button
              onClick={() => navigate("/raisestudentdemand")}
              title="Raise Demand"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 6,
                border: "1.5px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.22)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                lineHeight: "1.4",
              }}
            >
              <RiseOutlined style={{ fontSize: 13 }} /> Raise Demand
            </button>
          </div>
        </div>

        {/* ── SUMMARY STRIP ── */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Total Demands",
              value: stats.total,
              color: C.accent,
              bg: C.accentLight,
            },
            {
              label: "Unpaid",
              value: stats.unpaid,
              color: C.danger,
              bg: "#fee2e2",
            },
            {
              label: "Partial",
              value: stats.partial,
              color: "#8b5cf6",
              bg: "#ede9fe",
            },
            {
              label: "Paid",
              value: stats.paid,
              color: C.success,
              bg: C.successLight,
            },
            {
              label: "Outstanding",
              value: `₹ ${(stats.totalDue - stats.totalPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              color: C.warning,
              bg: C.warningLight,
            },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              style={{
                background: bg,
                border: `1.5px solid ${color}33`,
                borderRadius: 8,
                padding: "10px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 18,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: `1.5px solid #e8f0fe`,
            }}
          >
            Filter Demands
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 14,
              alignItems: "end",
            }}
          >
            {/* Academic Year */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Academic Year
              </label>
              <Select
                value={filterYear}
                onChange={(val) => setFilterYear(val)}
                style={{ width: "100%", fontFamily: FF }}
                size="middle"
              >
                {ACADEMIC_YEAR_OPTIONS.map((y) => (
                  <Option key={y} value={y}>
                    {y}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Course */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Course
              </label>
              <Select
                value={filterCourse || undefined}
                placeholder="All Courses"
                allowClear
                onChange={(val) => {
                  setFilterCourse(val || "");
                  setFilterGrade("");
                  setFilterSection("");
                }}
                style={{ width: "100%", fontFamily: FF }}
              >
                <Option value="SSLC">SSLC</Option>
                <Option value="HSC">HSC</Option>
              </Select>
            </div>

            {/* Grade */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Grade
              </label>
              <Select
                value={filterGrade || undefined}
                placeholder="All Grades"
                allowClear
                onChange={(val) => {
                  setFilterGrade(val || "");
                  setFilterSection("");
                }}
                style={{ width: "100%", fontFamily: FF }}
              >
                {filteredGradeOptions.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.grade}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Section */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Section
              </label>
              <Select
                value={filterSection || undefined}
                placeholder="All Sections"
                allowClear
                disabled={!filterGrade}
                onChange={(val) => setFilterSection(val || "")}
                style={{ width: "100%", fontFamily: FF }}
              >
                {sectionOptions.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.sectionName}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Status
              </label>
              <Select
                value={filterStatus || undefined}
                placeholder="All Statuses"
                allowClear
                onChange={(val) => setFilterStatus(val || "")}
                style={{ width: "100%", fontFamily: FF }}
              >
                <Option value="Unpaid">Unpaid</Option>
                <Option value="Partial">Partial</Option>
                <Option value="Paid">Paid</Option>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Search
              </label>
              <input
                style={{
                  width: "100%",
                  padding: "7px 11px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 7,
                  fontSize: FS,
                  color: C.text,
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: FF,
                }}
                placeholder="Name / Admission no."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── TABLE CARD ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            overflow: "hidden",
            border: `1px solid ${COLOR.border}`,
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "13px 18px",
              borderBottom: `1.5px solid ${C.border}`,
              background: C.bg,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
              Fee Demands
            </span>
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
              {visible.length} record{visible.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
              <Spin size="large" />
              <div style={{ marginTop: 12, fontSize: 14 }}>Loading…</div>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
              <FileTextOutlined
                style={{
                  fontSize: 36,
                  color: C.border,
                  display: "block",
                  marginBottom: 10,
                }}
              />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                No demands found
              </div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                {demands.length === 0
                  ? "No demands have been raised yet."
                  : "No demands match the current filters."}
              </div>
              <button
                onClick={() => navigate("/raisestudentdemand")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 18px",
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <RiseOutlined /> Raise First Demand
              </button>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="fdl-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>Action</th>
                      <th style={{ width: 44 }}>S.No</th>
                      <th>Student Name</th>
                      <th>Admission No.</th>
                      <th style={{ width: 54 }}>Grade</th>
                      <th style={{ width: 80 }}>Section</th>
                      <th style={{ width: 80 }}>Medium</th>
                      <th style={{ width: 70 }}>Type</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Paid</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                      <th style={{ width: 100 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((d, i) => {
                      const globalIdx = (currentPage - 1) * PAGE_SIZE + i;
                      const balance = parseFloat(d.balance_amount || 0);
                      const totalAmt = parseFloat(d.total_amount || 0);
                      const paidAmt = parseFloat(d.paid_amount || 0);
                      const baseBg = i % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven;
                      return (
                        <tr
                          key={d.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = COLOR.rowHover)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = baseBg)
                          }
                          style={{
                            background: baseBg,
                            transition: "background 0.12s",
                            borderBottom: `1px solid ${COLOR.border}`,
                          }}
                        >
                          {/* Action icons column */}
                          <td
                            style={{
                              whiteSpace: "nowrap",
                              textAlign: "center",
                              padding: "8px 16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 2,
                              }}
                            >
                              {d.status !== "Paid" && (
                                <IconBtn
                                  icon={<DollarOutlined />}
                                  title="Collect Payment"
                                  color={COLOR.payColor}
                                  bg={COLOR.payBg}
                                  onClick={() => setPaymentTarget(d)}
                                />
                              )}
                              {d.status !== "Unpaid" && (
                                <IconBtn
                                  icon={
                                    printingId === d.id ? (
                                      <span
                                        className="fdl-spinner"
                                        style={{ width: 14, height: 14 }}
                                      />
                                    ) : (
                                      <PrinterOutlined />
                                    )
                                  }
                                  title="View Receipts"
                                  color={COLOR.printColor}
                                  bg={COLOR.printBg}
                                  disabled={printingId === d.id}
                                  onClick={() => handlePrintDemandReceipt(d)}
                                />
                              )}
                              <IconBtn
                                icon={<DeleteOutlined />}
                                title="Delete Demand"
                                color={COLOR.danger}
                                bg={COLOR.dangerBg}
                                onClick={() => handleDelete(d)}
                              />
                            </div>
                          </td>
                          <td style={{ color: C.muted, fontWeight: 600 }}>
                            {globalIdx + 1}
                          </td>
                          <td style={{ fontWeight: 600 }}>{d.student_name}</td>
                          <td
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: C.muted,
                            }}
                          >
                            {d.admission_number}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {d.grade || "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {d.section || "—"}
                          </td>
                          <td>{d.medium || "—"}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 9px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: C.accentLight,
                                color: C.accent,
                              }}
                            >
                              {d.student_type || "—"}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: C.primary,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {totalAmt.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#166534",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {paidAmt > 0
                              ? paidAmt.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              color: balance > 0 ? C.danger : C.muted,
                            }}
                          >
                            {balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {visible.length > 0 && (
                    <tfoot>
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#166534",
                            padding: "11px 13px",
                          }}
                        >
                          Total ({visible.length} records)
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 800,
                            fontSize: 14,
                            color: "#166534",
                            fontVariantNumeric: "tabular-nums",
                            padding: "11px 13px",
                          }}
                        >
                          {stats.totalDue.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#166534",
                            fontVariantNumeric: "tabular-nums",
                            padding: "11px 13px",
                          }}
                        >
                          {stats.totalPaid.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: C.warning,
                            fontVariantNumeric: "tabular-nums",
                            padding: "11px 13px",
                          }}
                        >
                          {(stats.totalDue - stats.totalPaid).toLocaleString(
                            "en-IN",
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* ── Pagination — matches StudentAppSSLCList ── */}
              {visible.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderTop: `1px solid ${COLOR.border}`,
                    background: "#fafbfc",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: COLOR.textSoft,
                      fontFamily: FF,
                    }}
                  >
                    Showing{" "}
                    <strong>
                      {visible.length === 0
                        ? 0
                        : (currentPage - 1) * PAGE_SIZE + 1}
                    </strong>
                    –
                    <strong>
                      {Math.min(currentPage * PAGE_SIZE, visible.length)}
                    </strong>{" "}
                    of <strong>{visible.length}</strong> records
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {/* Prev */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        all: "unset",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        background: currentPage === 1 ? "#f0f0f0" : "#fff",
                        border: `1px solid ${COLOR.border}`,
                        color: currentPage === 1 ? "#c0c0c0" : COLOR.textMid,
                        fontSize: 13,
                      }}
                    >
                      <LeftOutlined />
                    </button>

                    {/* Page numbers */}
                    {(() => {
                      const pages = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (currentPage > 3) pages.push("...");
                        for (
                          let i = Math.max(2, currentPage - 1);
                          i <= Math.min(totalPages - 1, currentPage + 1);
                          i++
                        )
                          pages.push(i);
                        if (currentPage < totalPages - 2) pages.push("...");
                        pages.push(totalPages);
                      }
                      return pages.map((page, i) =>
                        page === "..." ? (
                          <span
                            key={`dots-${i}`}
                            style={{
                              padding: "0 4px",
                              color: COLOR.textSoft,
                              fontSize: 13,
                            }}
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              all: "unset",
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: currentPage === page ? 700 : 400,
                              background:
                                currentPage === page ? "#1a2236" : "#fff",
                              color:
                                currentPage === page ? "#fff" : COLOR.textMid,
                              border: `1px solid ${currentPage === page ? "#1a2236" : COLOR.border}`,
                              transition: "all 0.15s",
                            }}
                          >
                            {page}
                          </button>
                        ),
                      );
                    })()}

                    {/* Next */}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      style={{
                        all: "unset",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor:
                          currentPage === totalPages
                            ? "not-allowed"
                            : "pointer",
                        background:
                          currentPage === totalPages ? "#f0f0f0" : "#fff",
                        border: `1px solid ${COLOR.border}`,
                        color:
                          currentPage === totalPages
                            ? "#c0c0c0"
                            : COLOR.textMid,
                        fontSize: 13,
                      }}
                    >
                      <RightOutlined />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
