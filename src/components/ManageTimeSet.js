import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { message, Select } from "antd";
import { RightOutlined, LeftOutlined, DoubleRightOutlined, DoubleLeftOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", headerBg: "#f8fafc", selected: "#dbeafe" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const buildAcademicYears = () => {
  const startYear = new Date().getFullYear() - 1;
  return Array.from({ length: 6 }, (_, i) => `${startYear + i} - ${startYear + i + 1}`);
};

// One side of the dual-list box. `selected` is a Set of ids currently highlighted.
const ListBox = ({ title, items, selected, onToggle }) => (
  <div style={{ flex: 1, minWidth: 200 }}>
    <div style={{ fontWeight: 600, fontSize: FS, color: COLOR.text, marginBottom: 8 }}>{title}</div>
    <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, height: 280, overflowY: "auto", background: "#fff" }}>
      {items.length > 0 ? items.map(item => (
        <div key={item.id} onClick={() => onToggle(item.id)}
          style={{
            padding: "9px 14px", fontSize: FS, fontFamily: FF, color: COLOR.text, cursor: "pointer",
            background: selected.has(item.id) ? COLOR.selected : "transparent", userSelect: "none",
            borderBottom: `1px solid ${COLOR.border}`,
          }}>
          {item.label}
        </div>
      )) : (
        <div style={{ padding: "20px 14px", fontSize: FS, color: COLOR.textSoft, textAlign: "center" }}>No sections</div>
      )}
    </div>
  </div>
);

const ArrowBtn = ({ icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ all: "unset", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: disabled ? "#e2e8f0" : COLOR.blueLt, color: "#fff", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
    {icon}
  </button>
);

const ManageTimeSet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const academicYears = buildAcademicYears();

  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(isSuperAdmin ? "" : user?.school?.id || "");
  const [academicYear, setAcademicYear] = useState("");
  const [timeSets, setTimeSets] = useState([]);
  const [timeSetId, setTimeSetId] = useState("");
  // true while we're pre-filling School/Year/Time Set from a ?time_set_id= deep link,
  // so the school/year effect doesn't immediately reset timeSetId back to "".
  const [hydrating, setHydrating] = useState(false);

  const [unassigned, setUnassigned] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [selUnassigned, setSelUnassigned] = useState(new Set());
  const [selAssigned, setSelAssigned] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
        .then(res => setSchools(res.data.schools || []))
        .catch(() => message.error("Failed to fetch schools"));
    }
  }, [isSuperAdmin]);

  // Deep link from TimeSetList's "Manage Sections" icon: /manage-time-set?time_set_id=5
  // Look the time set up so we can pre-select School / Academic Year / Time Set.
  // Without this, those three selects stay blank on arrival and the sections that
  // are already saved in the backend never get fetched/displayed.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tsId = params.get("time_set_id");
    if (!tsId) return;

    setHydrating(true);
    axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetById/${tsId}`)
      .then(res => {
        const ts = res.data?.timeSet;
        if (ts) {
          setSchoolId(ts.school_id ?? ts.School?.id ?? "");
          setAcademicYear(ts.academic_year || "");
          setTimeSetId(String(ts.id));
        } else {
          message.error("Time Set not found");
        }
      })
      .catch(() => message.error("Failed to load the selected Time Set"))
      .finally(() => setHydrating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Fetch time sets whenever school + year are chosen
  useEffect(() => {
    if (hydrating) return; // don't wipe out the timeSetId we just set from the URL
    setTimeSetId("");
    setUnassigned([]);
    setAssigned([]);
    if (schoolId && academicYear) {
      axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetsBySchoolAndYear/${schoolId}/${academicYear}`)
        .then(res => setTimeSets(res.data.timeSets || []))
        .catch(() => message.error("Failed to fetch time sets"));
    } else {
      setTimeSets([]);
    }
  }, [schoolId, academicYear, hydrating]);

  // Once we've hydrated from the URL, still populate the Time Set dropdown
  // options for the resolved school + year (the effect above was skipped
  // while hydrating, so it wouldn't have fetched the list on its own).
  useEffect(() => {
    if (!hydrating && schoolId && academicYear && timeSetId) {
      axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetsBySchoolAndYear/${schoolId}/${academicYear}`)
        .then(res => setTimeSets(res.data.timeSets || []))
        .catch(() => message.error("Failed to fetch time sets"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrating]);

  // Fetch assigned/un-assigned sections whenever a time set is chosen
  useEffect(() => {
    setSelUnassigned(new Set());
    setSelAssigned(new Set());
    if (timeSetId && schoolId && academicYear) {
      axios.get(`${process.env.REACT_APP_API_URL}/timeset/getSectionsForTimeSet/${timeSetId}/${schoolId}/${academicYear}`)
        .then(res => {
          setUnassigned(res.data.unassigned || []);
          setAssigned(res.data.assigned || []);
        })
        .catch(() => message.error("Failed to fetch sections"));
    } else {
      setUnassigned([]);
      setAssigned([]);
    }
  }, [timeSetId, schoolId, academicYear]);

  // Changing school invalidates the year-scoped time set selection downstream
  const handleSchoolChange = (val) => {
    setSchoolId(val);
    setAcademicYear("");
  };

  const toggle = (set, setSet, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setSet(next);
  };

  const moveToAssigned = () => {
    const moving = unassigned.filter(i => selUnassigned.has(i.id));
    setAssigned(prev => [...prev, ...moving]);
    setUnassigned(prev => prev.filter(i => !selUnassigned.has(i.id)));
    setSelUnassigned(new Set());
  };
  const moveAllToAssigned = () => {
    setAssigned(prev => [...prev, ...unassigned]);
    setUnassigned([]);
    setSelUnassigned(new Set());
  };
  const moveToUnassigned = () => {
    const moving = assigned.filter(i => selAssigned.has(i.id));
    setUnassigned(prev => [...prev, ...moving]);
    setAssigned(prev => prev.filter(i => !selAssigned.has(i.id)));
    setSelAssigned(new Set());
  };
  const moveAllToUnassigned = () => {
    setUnassigned(prev => [...prev, ...assigned]);
    setAssigned([]);
    setSelAssigned(new Set());
  };

  const handleSave = async () => {
    if (!timeSetId) {
      message.error("Please select a Time Set");
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/timeset/saveSectionAssignments/${timeSetId}`, {
        section_ids: assigned.map(a => a.id),
      });
      message.success("Time Set assignments saved successfully");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = { width: 240 };
  const labelStyle = { fontSize: FS, color: COLOR.text, fontWeight: 500, display: "block", marginBottom: 6 };

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLOR.text, margin: 0 }}>Manage Time Set</h1>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: 24 }}>
          {/* School → Academic Year → Time Set, in that order, so each selection
              scopes the next one and the flow reads naturally left to right. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 26 }}>
            <div>
              <label style={labelStyle}>School <span style={{ color: "#e21216" }}>*</span></label>
              {isSuperAdmin ? (
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder="Select School"
                  style={selectStyle}
                  value={schoolId || undefined}
                  onChange={handleSchoolChange}
                >
                  {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              ) : (
                <input
                  style={{ ...selectStyle, height: 32, padding: "0 11px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, background: "#f1f5f9", color: COLOR.textMid }}
                  value={user?.school?.name || ""}
                  disabled
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Academic Year <span style={{ color: "#e21216" }}>*</span></label>
              <Select
                placeholder={schoolId ? "Select Year" : "Select school first"}
                style={selectStyle}
                value={academicYear || undefined}
                onChange={val => setAcademicYear(val)}
                disabled={!schoolId}
              >
                {academicYears.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </div>

            <div>
              <label style={labelStyle}>Time Set <span style={{ color: "#e21216" }}>*</span></label>
              <Select
                showSearch
                optionFilterProp="children"
                placeholder={schoolId && academicYear ? "Select Time Set" : "Select school & year first"}
                style={selectStyle}
                value={timeSetId || undefined}
                onChange={val => setTimeSetId(val)}
                disabled={!schoolId || !academicYear}
              >
                {timeSets.map(ts => <Option key={ts.id} value={ts.id}>{ts.name}</Option>)}
              </Select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
            <ListBox title="Un-Assigned Sections" items={unassigned} selected={selUnassigned} onToggle={id => toggle(selUnassigned, setSelUnassigned, id)} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 32 }}>
              <ArrowBtn icon={<RightOutlined />} onClick={moveToAssigned} disabled={selUnassigned.size === 0} />
              <ArrowBtn icon={<LeftOutlined />} onClick={moveToUnassigned} disabled={selAssigned.size === 0} />
            </div>

            <ListBox title="Assigned Sections" items={assigned} selected={selAssigned} onToggle={id => toggle(selAssigned, setSelAssigned, id)} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28 }}>
            <button
              onClick={() => navigate("/timesetlist")}
              style={{
                all: "unset",
                background: "#fff",
                color: COLOR.textMid,
                border: `1px solid ${COLOR.border}`,
                padding: "9px 28px",
                borderRadius: 8,
                fontSize: FS,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button disabled={saving} onClick={handleSave}
              style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManageTimeSet;