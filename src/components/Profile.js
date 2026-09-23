import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Modal, Form, Input, message } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, TagOutlined, KeyOutlined, LockOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  textSoft: "#64748b", border: "#e2e8f0", keyColor: "#7c3aed", keyBg: "#f5f3ff"
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLOR.border}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.blueLt, fontSize: 16, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: COLOR.textSoft, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 500, color: COLOR.text }}>{value || "—"}</div>
    </div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) { navigate("/"); return; }
    setUser(storedUser);
    // ✅ If navigated here from Header "Change Password" click, auto-open the modal
    if (location.state?.openChangePassword) {
      setIsChangePwdOpen(true);
      // Clear the state so refreshing doesn't reopen it
      window.history.replaceState({}, document.title);
    }
  }, [navigate, location.state]);

  const handleChangePassword = async () => {
    try {
      const values = await pwdForm.validateFields();
      setPwdLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/admin/changePassword/${user.id}`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }
      );
      message.success("Password changed successfully!");
      setIsChangePwdOpen(false);
      pwdForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return; // Ant Design form validation — fields already highlighted
      const msg = err?.response?.data?.error || "Failed to change password";
      message.error(msg);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsChangePwdOpen(false);
    pwdForm.resetFields();
  };

  if (!user) return null;

  const initials = (user?.name || user?.roleName || "U").charAt(0).toUpperCase();

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>My Profile</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* Avatar card */}
          <div style={{
            background: "linear-gradient(135deg, #1e40af, #3b82f6)",
            borderRadius: "14px 14px 0 0", padding: "32px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{user?.name || "—"}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{user?.roleName}</div>
                {user?.school?.name && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{user.school.name}</div>}
              </div>
            </div>

            {/* ✅ Change Password button inside profile header */}
            <button
              onClick={() => setIsChangePwdOpen(true)}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              style={{
                all: "unset", display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, color: "#fff",
                transition: "background 0.15s", flexShrink: 0
              }}>
              <KeyOutlined style={{ fontSize: 14 }} />
              Change Password
            </button>
          </div>

          {/* Info card */}
          <div style={{
            background: "#fff", borderRadius: "0 0 14px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: `1px solid ${COLOR.border}`, borderTop: "none",
            padding: "8px 28px 20px"
          }}>
            <InfoRow icon={<UserOutlined />}  label="Full Name" value={user?.name} />
            <InfoRow icon={<TagOutlined />}   label="Role"      value={user?.roleName} />
            <InfoRow icon={<BankOutlined />}  label="School"    value={user?.school?.name} />
            <InfoRow icon={<MailOutlined />}  label="Email"     value={user?.email} />
            <InfoRow icon={<PhoneOutlined />} label="Mobile"    value={user?.mobileNumber} />
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLOR.keyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LockOutlined style={{ color: COLOR.keyColor, fontSize: 16 }} />
            </div>
            <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>
              Change Password
            </span>
          </div>
        }
        open={isChangePwdOpen}
        onCancel={handleModalClose}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              onClick={handleModalClose}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              style={{
                all: "unset", padding: "8px 24px", borderRadius: 8,
                border: `1px solid ${COLOR.border}`, fontSize: FS, fontWeight: 600,
                color: COLOR.textMid, cursor: "pointer", background: "#fff",
                transition: "background 0.15s", fontFamily: FF
              }}>
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={pwdLoading}
              onMouseEnter={e => { if (!pwdLoading) e.currentTarget.style.background = "#6d28d9"; }}
              onMouseLeave={e => { if (!pwdLoading) e.currentTarget.style.background = COLOR.keyColor; }}
              style={{
                all: "unset", padding: "8px 24px", borderRadius: 8,
                background: pwdLoading ? "#a78bfa" : COLOR.keyColor,
                color: "#fff", fontSize: FS, fontWeight: 600,
                cursor: pwdLoading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(124,58,237,0.28)",
                transition: "all 0.18s", fontFamily: FF
              }}>
              {pwdLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        }
        width={420}
      >
        <p style={{ fontFamily: FF, fontSize: FS, color: COLOR.textMid, margin: "4px 0 20px" }}>
          Enter your current password, then choose a new one.
        </p>

        <Form form={pwdForm} layout="vertical" style={{ fontFamily: FF }}>
          {/* Current password — verified server-side against stored hash */}
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password placeholder="Your current password" size="large" />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 6, message: "Password must be at least 6 characters" }
            ]}
          >
            <Input.Password placeholder="New password (min 6 characters)" size="large" />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match!"));
                }
              })
            ]}
          >
            <Input.Password placeholder="Confirm new password" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Profile;