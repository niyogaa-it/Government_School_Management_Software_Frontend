import React, { useEffect, useState, useRef } from "react";
import { Select } from "antd";
import { BankOutlined, CalendarOutlined, UserOutlined, LogoutOutlined, KeyOutlined } from "@ant-design/icons";
import { FaBars } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useFilter, generateAcademicYears } from "./FilterContext";

const { Option } = Select;

const getCurrentAcademicYear = () => {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

const Header = ({ sidebarOpen, onToggleSidebar }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (user?.roleName || "").toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const navigate = useNavigate();

  const { selectedSchool, setSelectedSchool, selectedYear, setSelectedYear, selectedSchoolName, setSelectedSchoolName } = useFilter();
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const academicYears = ["2025-2026", "2026-2027"];

  useEffect(() => {
    if (!selectedYear) setSelectedYear(getCurrentAcademicYear());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSchoolsLoading(true);
    axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
      .then(res => {
        const list = res.data.schools || [];
        setSchools(list);
        if (!isSuperAdmin && user?.school?.id) {
          const matched = list.find(s => s.id.toString() === user.school.id.toString());
          if (matched) { setSelectedSchoolName(matched.name); setSchoolLogo(matched.logo || null); }
        }
      })
      .catch(() => {})
      .finally(() => setSchoolsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleProfile = () => { setMenuOpen(false); navigate("/profile"); };

  // ✅ Navigate to profile page and open the Change Password modal via state
  const handleChangePassword = () => { setMenuOpen(false); navigate("/profile", { state: { openChangePassword: true } }); };

  const initials = (user?.name || user?.roleName || "U").charAt(0).toUpperCase();

  const menuBtnStyle = {
    all: "unset", display: "flex", alignItems: "center", gap: 10,
    padding: "11px 16px", width: "100%", cursor: "pointer",
    fontSize: "13.5px", fontWeight: 500, color: "#1e293b",
    fontFamily: "'Segoe UI',system-ui,sans-serif",
    transition: "background 0.12s", boxSizing: "border-box",
  };

  return (
    <header className="sms-header">
      {/* Left */}
      <div className="sms-hdr-left">
        <button className="sms-hdr-burger" onClick={onToggleSidebar} aria-label="Toggle menu">
          <FaBars />
        </button>

        <div className="sms-hdr-logo">
          {!isSuperAdmin && schoolLogo
            ? <img src={schoolLogo} alt="School Logo" style={{ height: 36, maxWidth: 140, objectFit: "contain" }} />
            : <img src="/images/CES-logo.png" alt="Logo" style={{ width: "40%", maxWidth: "250px" }} />
          }
        </div>

        <div className="sms-hdr-sep" />

        {/* School */}
        <div className="sms-hdr-filter">
          <BankOutlined className="sms-hdr-filter-icon" />
          {isSuperAdmin ? (
            <Select
              value={selectedSchool}
              onChange={val => {
                setSelectedSchool(val);
                const name = val === "all" ? "All Schools" : schools.find(s => s.id.toString() === val)?.name || "All Schools";
                setSelectedSchoolName(name);
              }}
              className="sms-hdr-select"
              loading={schoolsLoading}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
              dropdownStyle={{ minWidth: 240 }}
              size="small"
            >
              <Option value="all">ALL SCHOOLS</Option>
              {schools.map(s => <Option key={s.id} value={s.id.toString()}>{s.name}</Option>)}
            </Select>
          ) : (
            <span className="sms-hdr-school-badge">{user?.school?.name || ""}</span>
          )}
        </div>

        <div className="sms-hdr-sep" />

        {/* Year */}
        <div className="sms-hdr-filter">
          <CalendarOutlined className="sms-hdr-filter-icon" />
          <Select
            value={selectedYear || undefined}
            onChange={val => setSelectedYear(val)}
            placeholder="Select Year"
            allowClear onClear={() => setSelectedYear(null)}
            className="sms-hdr-select sms-hdr-select-year"
            size="small"
            dropdownStyle={{ minWidth: 155 }}
          >
            {academicYears.map(y => <Option key={y} value={y}>{y}</Option>)}
          </Select>
        </div>
      </div>

      {/* Right */}
      <div className="sms-hdr-right">
        <div className="sms-hdr-user-info">
          <span className="sms-hdr-user-name">{user?.name || user?.roleName}</span>
          <span className="sms-hdr-user-role">{user?.roleName}</span>
        </div>

        {/* Avatar + dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <div
            className="sms-hdr-avatar"
            title="Account menu"
            onClick={() => setMenuOpen(o => !o)}
            style={{ cursor: "pointer" }}
          >
            {initials}
          </div>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              background: "#fff", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
              minWidth: 200, zIndex: 2000,
              overflow: "hidden",
              animation: "fadeInDown 0.15s ease",
            }}>

              {/* My Profile */}
              <button
                onClick={handleProfile}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                style={menuBtnStyle}
              >
                <UserOutlined style={{ fontSize: 15, color: "#3b82f6" }} />
                My Profile
              </button>

              {/* ✅ Change Password — available to ALL roles */}
              <button
                onClick={handleChangePassword}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                style={menuBtnStyle}
              >
                <KeyOutlined style={{ fontSize: 15, color: "#7c3aed" }} />
                Change Password
              </button>

              {/* Divider */}
              <div style={{ height: 1, background: "#f1f5f9", margin: "0 10px" }} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                onMouseEnter={e => { e.currentTarget.style.background = "#fff5f5"; e.currentTarget.style.color = "#e21216"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1e293b"; }}
                style={menuBtnStyle}
              >
                <LogoutOutlined style={{ fontSize: 15, color: "#e21216" }} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;