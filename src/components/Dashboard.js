import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { HomeOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons";
import Layout from "./Layout";
import { useFilter } from "./FilterContext";

const StatCard = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: "#fff", borderRadius: 14, padding: "22px 20px",
    display: "flex", alignItems: "center", gap: 18,
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    flex: "1 1 180px", minWidth: 160,
    transition: "transform 0.18s, box-shadow 0.18s", cursor: "default",
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
  >
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 13, color: "#888", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  </div>
);

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (user?.roleName || "").toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();
  const [stats, setStats] = useState({ sslc: 0, hsc: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  const schoolLabel = isSuperAdmin
    ? (selectedSchool === "all" ? "All Schools" : selectedSchoolName)
    : (user?.school?.name || "");

  // Primitive value, stable across renders (unlike the `user` object itself,
  // which is re-created on every render by JSON.parse and would cause an
  // infinite fetch loop if used directly as a useCallback dependency).
  const userSchoolId = user?.school?._id || user?.school?.id || "";

 const fetchStats = useCallback(async () => {
  setLoadingStats(true);
  try {
    // Super admin: honor the selected filter (all schools, or one specific school).
    // Every other role (school admin, accounts, etc.): always scope to their own
    // logged-in school, regardless of what the filter currently holds.
    const schoolId = isSuperAdmin
      ? (selectedSchool === "all" ? "" : selectedSchool)
      : userSchoolId;

    const sslcRes = await axios.get(
      `${process.env.REACT_APP_API_URL}/studentsslc/count`,
      {
        params: {
          schoolId,
          year: selectedYear,
        },
      }
    );

    const hscRes = await axios.get(
      `${process.env.REACT_APP_API_URL}/studenthsc/count`,
      {
        params: {
          schoolId,
          year: selectedYear,
        },
      }
    );

    setStats({
      sslc: sslcRes.data.count || 0,
      hsc: hscRes.data.count || 0,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
  } finally {
    setLoadingStats(false);
  }
}, [selectedSchool, selectedYear, isSuperAdmin, userSchoolId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <Layout>
      <div className="app-page">
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#888" }}>
          <HomeOutlined />
          <span>Home</span>
          <span style={{ color: "#ccc" }}>/</span>
          <span style={{ color: "#1a3c6e", fontWeight: 600 }}>Dashboard</span>
        </div>

        {/* Context banner */}
        <div style={{
          background: "linear-gradient(135deg, #1a3c6e 0%, #2563eb 100%)",
          borderRadius: 14, padding: "20px 28px", marginBottom: 28,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#fff", boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
        }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{isSuperAdmin ? "Viewing" : "School"}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{schoolLabel}</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
              Academic Year: {selectedYear || "All Years"}
            </div>
          </div>
          <div style={{ textAlign: "right", opacity: 0.85 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Welcome back,</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name || user?.roleName}</div>
            <div style={{
              display: "inline-block", marginTop: 6,
              background: "rgba(255,255,255,0.2)", borderRadius: 20,
              padding: "2px 12px", fontSize: 12, fontWeight: 600,
            }}>
              {user?.roleName || "User"}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <StatCard
  icon={<UserOutlined />}
  label="Students SSLC"
  value={loadingStats ? "..." : stats.sslc.toLocaleString()}
  color="#2563eb"
  bg="#eff6ff"
/>

<StatCard
  icon={<TeamOutlined />}
  label="Students HSC"
  value={loadingStats ? "..." : stats.hsc.toLocaleString()}
  color="#f59e0b"
  bg="#fffbeb"
/>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;