import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import { ClockCircleOutlined, ArrowRightOutlined, CoffeeOutlined, BookOutlined } from "@ant-design/icons";
import moment from "moment";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", danger: "#e21216", bg: "#f8fafc", breakBg: "#fff7ed", breakText: "#c2410c" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

// Quick-pick durations so the user rarely has to touch the End Time picker at all.
const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
];

const pad2 = (n) => String(n).padStart(2, "0");

// Position a point on the clock circle for a value expressed in degrees,
// 0 = top (12 o'clock), increasing clockwise — any continuous angle, not
// just the 12 five-minute marks.
const polarDeg = (deg, radius, cx, cy) => {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

// Inverse of polarDeg: given a point relative to the dial's client rect,
// return the clockwise-from-top angle in degrees (0-360).
const degFromPoint = (x, y, cx, cy) => {
  const dx = x - cx, dy = y - cy;
  let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
};

// ── Self-contained analog clock picker, styled after the Material-style
// hour/minute dial: big digital readout up top (click HH or MM to switch
// which ring is active), a circular dial to pick the value, AM/PM toggle,
// and its own Cancel/OK so a bad tap doesn't have to touch the outer form.
//
// The dial responds to drag/click ANYWHERE on the circle (not just the 12
// labeled marks), so any minute 0-59 (e.g. :07, :42) and any hour can be
// selected — the 12 numbers are just visual reference points, same as a
// real analog clock face. ──
const ClockPicker = ({ initialHour, initialMinute, initialPeriod, onConfirm, onCancel }) => {
  const [mode, setMode] = useState("hour"); // 'hour' | 'minute'
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState(initialPeriod);
  const dialRef = React.useRef(null);

  const size = 248, cx = size / 2, cy = size / 2, r = 92;
  const hourValues = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
  const minuteValues = Array.from({ length: 12 }, (_, i) => i * 5); // labeled marks only
  const minuteTicks = Array.from({ length: 60 }, (_, i) => i); // fine ticks so it reads as "any minute"

  const currentDeg = mode === "hour" ? (hour % 12) * 30 : minute * 6;
  const tip = polarDeg(currentDeg, r, cx, cy);

  const pickHour = (h) => setHour(h);
  const pickMinute = (m) => setMinute(m);

  // Continuous drag/click anywhere on the dial face. A tap directly on one
  // of the 12 hour numbers falls through to this same handler (their circle
  // markers are pointer-events:none) and lands on that exact hour; releasing
  // then auto-advances to minute mode via handlePointerUp below, matching
  // normal time-picker behavior.
  const valueFromEvent = (e) => {
    const el = dialRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const deg = degFromPoint(x, y, cx, cy);
    if (mode === "hour") {
      let h = Math.round(deg / 30) % 12;
      return h === 0 ? 12 : h;
    }
    return Math.round(deg / 6) % 60;
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const val = valueFromEvent(e);
    if (val == null) return;
    mode === "hour" ? pickHour(val) : pickMinute(val);
  };
  const handlePointerMove = (e) => {
    if (e.buttons !== 1) return; // only while actively pressed/dragging
    const val = valueFromEvent(e);
    if (val == null) return;
    mode === "hour" ? pickHour(val) : pickMinute(val);
  };
  const handlePointerUp = () => {
    if (mode === "hour") setMode("minute"); // advance after finishing the hour, like a real picker
  };

  const segStyle = (active) => ({
    fontSize: 32, fontWeight: 700, lineHeight: 1, cursor: "pointer", padding: "4px 8px", borderRadius: 8,
    color: active ? "#fff" : COLOR.text, background: active ? COLOR.blue : "transparent", transition: "all 0.15s",
  });
  const periodBtn = (active) => ({
    all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 5,
    color: active ? "#fff" : COLOR.textSoft, background: active ? COLOR.blue : "transparent", letterSpacing: "0.4px",
  });

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FF }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 288, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        {/* Digital readout */}
        <div style={{ background: COLOR.blue, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span onClick={() => setMode("hour")} style={segStyle(mode === "hour")}>{pad2(hour)}</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#bfdbfe" }}>:</span>
          <span onClick={() => setMode("minute")} style={segStyle(mode === "minute")}>{pad2(minute)}</span>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 10, gap: 2 }}>
            <button type="button" onClick={() => setPeriod("AM")} style={periodBtn(period === "AM")}>AM</button>
            <button type="button" onClick={() => setPeriod("PM")} style={periodBtn(period === "PM")}>PM</button>
          </div>
        </div>

        {/* Dial — click or drag anywhere on the circle to pick any hour/minute,
            not just the labeled marks. */}
        <div style={{ padding: "20px 0 6px", display: "flex", justifyContent: "center" }}>
          <svg
            ref={dialRef}
            width={size}
            height={size}
            style={{ touchAction: "none", cursor: "pointer" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <circle cx={cx} cy={cy} r={r + 22} fill={COLOR.bg} />

            {/* Fine 1-unit ticks in minute mode make it visually obvious any
                minute can be picked, not just the labeled 5-minute marks. */}
            {mode === "minute" && minuteTicks.map((m) => {
              if (m % 5 === 0) return null; // labeled marks are drawn separately below
              const p = polarDeg(m * 6, r, cx, cy);
              return <circle key={`tick-${m}`} cx={p.x} cy={p.y} r={2} fill={COLOR.border} style={{ pointerEvents: "none" }} />;
            })}

            <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={COLOR.blueLt} strokeWidth={2} style={{ pointerEvents: "none" }} />
            <circle cx={cx} cy={cy} r={4} fill={COLOR.blueLt} style={{ pointerEvents: "none" }} />
            <circle cx={tip.x} cy={tip.y} r={17} fill={COLOR.blueLt} opacity={0.18} style={{ pointerEvents: "none" }} />

            {(mode === "hour" ? hourValues : minuteValues).map((val) => {
              const deg = mode === "hour" ? (val % 12) * 30 : val * 6;
              const p = polarDeg(deg, r, cx, cy);
              const active = mode === "hour" ? val === hour : val === minute;
              return (
                <g key={val} style={{ cursor: "pointer" }}>
                  <circle cx={p.x} cy={p.y} r={16} fill={active ? COLOR.blueLt : "transparent"} style={{ pointerEvents: "none" }} />
                  <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={600} fill={active ? "#fff" : COLOR.text} style={{ userSelect: "none", pointerEvents: "none" }}>
                    {pad2(val)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* This picker's own confirm row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "8px 18px 18px" }}>
          <button type="button" onClick={onCancel}
            style={{ all: "unset", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.3px", color: COLOR.blue, border: `1px solid ${COLOR.blue}` }}>
            CANCEL
          </button>
          <button type="button" onClick={() => onConfirm({ hour, minute, period })}
            style={{ all: "unset", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.3px", color: "#fff", background: COLOR.blue }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Value stored/sent to backend as 24hr "HH:mm" strings so overlap checks / sorting are trivial.
const TimeSlotModal = ({ open, onClose, onSave, initialSlot }) => {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState(null); // moment
  const [endTime, setEndTime] = useState(null); // moment
  const [isBreak, setIsBreak] = useState(false);
  const [errors, setErrors] = useState({});
  const [pickerFor, setPickerFor] = useState(null); // 'start' | 'end' | null

  useEffect(() => {
    if (open) {
      setName(initialSlot?.name || "");
      setStartTime(initialSlot?.start_time ? moment(initialSlot.start_time, "HH:mm") : null);
      setEndTime(initialSlot?.end_time ? moment(initialSlot.end_time, "HH:mm") : null);
      setIsBreak(initialSlot?.is_break || false);
      setErrors({});
      setPickerFor(null);
    }
  }, [open, initialSlot]);

  const toPickerSeed = (t) => t
    ? { initialHour: +t.format("h"), initialMinute: t.minute(), initialPeriod: t.format("A") }
    : { initialHour: 9, initialMinute: 0, initialPeriod: "AM" };

  const applyPicked = ({ hour, minute, period }) => {
    let h24 = hour % 12;
    if (period === "PM") h24 += 12;
    const value = moment().hour(h24).minute(minute).second(0);
    if (pickerFor === "start") { setStartTime(value); setErrors(prev => ({ ...prev, startTime: undefined })); }
    else { setEndTime(value); setErrors(prev => ({ ...prev, endTime: undefined })); }
    setPickerFor(null);
  };

  const applyDuration = (minutes) => {
    if (!startTime) {
      setErrors(prev => ({ ...prev, startTime: "Pick a Start Time first" }));
      return;
    }
    setEndTime(startTime.clone().add(minutes, "minutes"));
    setErrors(prev => ({ ...prev, endTime: undefined }));
  };

  const handleSave = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    if (!startTime) nextErrors.startTime = "Start Time is required";
    if (!endTime) nextErrors.endTime = "End Time is required";
    if (startTime && endTime && !endTime.isAfter(startTime)) {
      nextErrors.endTime = "End Time must be after Start Time";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      id: initialSlot?.id,
      name: name.trim(),
      start_time: startTime.format("HH:mm"),
      end_time: endTime.format("HH:mm"),
      is_break: isBreak,
    });
  };

  const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: FS, color: COLOR.text, fontWeight: 600, display: "block", marginBottom: 6 };
  const errStyle = { color: COLOR.danger, fontSize: "12px", marginTop: 4 };
  const durationDisabled = !startTime;

  const timeButtonStyle = (hasError) => ({
    all: "unset", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", borderRadius: 7, border: `1px solid ${hasError ? COLOR.danger : COLOR.border}`,
    background: "#fff", cursor: "pointer", fontSize: FS, fontFamily: FF, color: (startTime || endTime) ? COLOR.text : COLOR.textSoft,
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>{initialSlot ? "Edit Time Slot" : "New Time Slot"}</span>}
    >
      <div style={{ fontFamily: FF, display: "flex", flexDirection: "column", gap: 18, paddingTop: 8 }}>
        <div>
          <label style={labelStyle}>Name <span style={{ color: COLOR.danger }}>*</span></label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Period 1, Lunch Break" />
          {errors.name && <div style={errStyle}>{errors.name}</div>}
        </div>

        <div style={{ background: COLOR.bg, border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "16px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: COLOR.blueLt, fontWeight: 600, fontSize: FS }}>
            <ClockCircleOutlined />
            <span>Time Range</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...labelStyle, fontWeight: 500 }}>Start Time <span style={{ color: COLOR.danger }}>*</span></label>
              <button type="button" onClick={() => setPickerFor("start")} style={timeButtonStyle(errors.startTime)}>
                <ClockCircleOutlined style={{ color: COLOR.blueLt }} />
                {startTime ? startTime.format("h:mm A") : "Select time"}
              </button>
            </div>

            <div style={{ paddingBottom: 9, color: COLOR.textSoft, fontSize: 16 }}>
              <ArrowRightOutlined />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ ...labelStyle, fontWeight: 500 }}>End Time <span style={{ color: COLOR.danger }}>*</span></label>
              <button type="button" onClick={() => setPickerFor("end")} style={timeButtonStyle(errors.endTime)}>
                <ClockCircleOutlined style={{ color: COLOR.blueLt }} />
                {endTime ? endTime.format("h:mm A") : "Select time"}
              </button>
            </div>
          </div>
          {(errors.startTime || errors.endTime) && (
            <div style={errStyle}>{errors.startTime || errors.endTime}</div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: COLOR.textSoft, fontWeight: 500 }}>Quick pick:</span>
            {DURATIONS.map(d => (
              <button
                key={d.label}
                type="button"
                onClick={() => applyDuration(d.minutes)}
                disabled={durationDisabled}
                style={{
                  all: "unset", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: durationDisabled ? "not-allowed" : "pointer",
                  color: durationDisabled ? "#94a3b8" : COLOR.blue,
                  background: durationDisabled ? "#e2e8f0" : "#dbeafe",
                  border: `1px solid ${durationDisabled ? "#e2e8f0" : "#bfdbfe"}`,
                  transition: "all 0.15s",
                }}>
                +{d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slot type — a clearer two-way toggle instead of a small checkbox,
            so it's obvious at a glance whether this is a teaching period or a break. */}
        <div>
          <label style={labelStyle}>Slot Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setIsBreak(false)}
              style={{
                all: "unset", flex: 1, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: FS,
                border: `1.5px solid ${!isBreak ? COLOR.blue : COLOR.border}`,
                background: !isBreak ? "#eff6ff" : "#fff",
                color: !isBreak ? COLOR.blue : COLOR.textMid,
                transition: "all 0.15s",
              }}>
              <BookOutlined /> Regular Period
            </button>
            <button type="button" onClick={() => setIsBreak(true)}
              style={{
                all: "unset", flex: 1, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: FS,
                border: `1.5px solid ${isBreak ? COLOR.breakText : COLOR.border}`,
                background: isBreak ? COLOR.breakBg : "#fff",
                color: isBreak ? COLOR.breakText : COLOR.textMid,
                transition: "all 0.15s",
              }}>
              <CoffeeOutlined /> Break
            </button>
          </div>
        </div>

        {/* Footer — a single flex row with two equal-width buttons, so Cancel
            and Save are always side by side on one line, never stacked. */}
        <div style={{ display: "flex", flexWrap: "nowrap", gap: 12, marginTop: 4, paddingTop: 16, borderTop: `1px solid ${COLOR.border}` }}>
          <button type="button" onClick={onClose}
            style={{ all: "unset", boxSizing: "border-box", flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 8, border: `1px solid ${COLOR.border}`, color: COLOR.textMid, fontSize: FS, fontWeight: 600, cursor: "pointer", background: "#fff" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            style={{ all: "unset", boxSizing: "border-box", flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 8, border: "none", color: "#fff", fontSize: FS, fontWeight: 600, cursor: "pointer", background: COLOR.blue }}>
            Save
          </button>
        </div>
      </div>

      {pickerFor && (
        <ClockPicker
          {...toPickerSeed(pickerFor === "start" ? startTime : endTime)}
          onConfirm={applyPicked}
          onCancel={() => setPickerFor(null)}
        />
      )}
    </Modal>
  );
};

export default TimeSlotModal;