import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Form, Input } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, KeyOutlined, LockOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const COLOR = {
  blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", textSoft:"#64748b",
  border:"#e2e8f0", rowOdd:"#ffffff", rowEven:"#f8fafc", rowHover:"#eff6ff",
  headBg:"#1a2236", headText:"#ffffff",
  danger:"#e21216", dangerBg:"rgba(226,18,22,0.08)",
  viewBg:"rgba(30,64,175,0.08)", editColor:"#0891b2", editBg:"rgba(8,145,178,0.08)",
  keyColor:"#7c3aed", keyBg:"rgba(124,58,237,0.08)"
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all:"unset", width:32, height:32, borderRadius:7,
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", fontSize:16, transition:"all 0.15s",
        color: hov ? color : COLOR.textMid,
        background: hov ? bg : "transparent"
      }}>
      {icon}
    </button>
  );
};

const AdminList = () => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  // ── Reset Password state ──
  const [resetTarget, setResetTarget] = useState(null);   // admin object being reset
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForm] = Form.useForm();

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      let response;
      if (role === "superadmin") {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/getAllAdmins`);
        setAdmins(response.data.admins.filter(
          a => a.Role?.roleOfUser?.toLowerCase().replace(/\s+/g, "") !== "superadmin"
        ));
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/getAdminsBySchool/${user.school.id}`);
        setAdmins(response.data.admins);
      }
    } catch {
      message.error("Failed to fetch users");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/admin/deleteAdmin/${id}`);
      message.success("User deleted successfully");
      fetchAdmins();
    } catch {
      message.error("Failed to delete user");
    }
  };

  // ── Open Reset Password modal ──
  const openResetPassword = (admin) => {
    setResetTarget(admin);
    resetForm.resetFields();
    setIsResetOpen(true);
  };

  // ── Submit Reset Password ──
  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      setResetLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/admin/resetPassword/${resetTarget.id}`,
        { newPassword: values.newPassword }
      );
      message.success(`Password reset successfully for ${resetTarget.name}`);
      setIsResetOpen(false);
      resetForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return; // Ant Design validation — already shown inline
      const msg = err?.response?.data?.error || "Failed to reset password";
      message.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetModalClose = () => {
    setIsResetOpen(false);
    resetForm.resetFields();
  };

  const cols = ["S.No", "School", "Role", "Name", "Email", "Mobile", "Action"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            Users List
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <button
          onClick={() => navigate("/create-admin")}
          onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
          style={{
            all: "unset", display: "inline-flex", alignItems: "center", gap: 7,
            background: COLOR.blueLt, color: "#fff", padding: "9px 20px",
            borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer",
            marginBottom: 20, boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s"
          }}>
          Create User
        </button>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {cols.map((h, i) => (
                    <th key={h} style={{
                      padding: "13px 16px", fontWeight: 600, fontSize: "13px",
                      color: COLOR.headText, textAlign: i === cols.length - 1 ? "center" : "left",
                      whiteSpace: "nowrap", letterSpacing: "0.2px"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.length > 0 ? admins.map((admin, index) => (
                  <tr
                    key={admin.id}
                    onMouseEnter={() => setHoveredRow(admin.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: hoveredRow === admin.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven,
                      transition: "background 0.12s",
                      borderBottom: `1px solid ${COLOR.border}`
                    }}>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>
                      {role === "superadmin" ? (admin.School?.name || "N/A") : (user.school?.name || "N/A")}
                    </td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{admin.Role?.roleOfUser || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{admin.name}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{admin.email}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{admin.mobileNumber}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn
                          icon={<EyeOutlined />}
                          title="View User"
                          color={COLOR.blue}
                          bg={COLOR.viewBg}
                          onClick={() => { setSelectedAdmin(admin); setIsModalVisible(true); }}
                        />
                        <IconBtn
                          icon={<EditOutlined />}
                          title="Edit User"
                          color={COLOR.editColor}
                          bg={COLOR.editBg}
                          onClick={() => navigate(`/edit-admin/${admin.id}`)}
                        />
                        {/* ✅ Reset Password — superadmin only */}
                        {role === "superadmin" && (
                          <IconBtn
                            icon={<KeyOutlined />}
                            title="Reset Password"
                            color={COLOR.keyColor}
                            bg={COLOR.keyBg}
                            onClick={() => openResetPassword(admin)}
                          />
                        )}
                        {role === "superadmin" && (
                          <IconBtn
                            icon={<DeleteOutlined />}
                            title="Delete User"
                            color={COLOR.danger}
                            bg={COLOR.dangerBg}
                            onClick={() => handleDelete(admin.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── View User Modal ── */}
        {selectedAdmin && (
          <Modal
            title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>User Details</span>}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}>
            <Descriptions
              bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}>
              <Descriptions.Item label="School">
                {role === "superadmin" ? selectedAdmin.School?.name : user.school?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Role">{selectedAdmin.Role?.roleOfUser || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedAdmin.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedAdmin.email}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{selectedAdmin.mobileNumber}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

        {/* ── Reset Password Modal ── */}
        <Modal
          open={isResetOpen}
          onCancel={handleResetModalClose}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                onClick={handleResetModalClose}
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
                onClick={handleResetPassword}
                disabled={resetLoading}
                onMouseEnter={e => { if (!resetLoading) e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { if (!resetLoading) e.currentTarget.style.background = COLOR.keyColor; }}
                style={{
                  all: "unset", padding: "8px 24px", borderRadius: 8,
                  background: resetLoading ? "#a78bfa" : COLOR.keyColor,
                  color: "#fff", fontSize: FS, fontWeight: 600,
                  cursor: resetLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(124,58,237,0.28)",
                  transition: "all 0.18s", fontFamily: FF
                }}>
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          }
          width={420}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: COLOR.keyBg, display: "flex",
                alignItems: "center", justifyContent: "center"
              }}>
                <LockOutlined style={{ color: COLOR.keyColor, fontSize: 16 }} />
              </div>
              <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>
                Reset Password
              </span>
            </div>
          }>

          {/* Target user info banner */}
          {resetTarget && (
            <div style={{
              background: "#f5f3ff", border: "1px solid #ddd6fe",
              borderRadius: 8, padding: "10px 14px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: COLOR.keyColor, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 15, flexShrink: 0
              }}>
                {resetTarget.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: FS, color: COLOR.text, fontFamily: FF }}>
                  {resetTarget.name}
                </div>
                <div style={{ fontSize: "12px", color: COLOR.textSoft, fontFamily: FF }}>
                  {resetTarget.email}
                </div>
              </div>
            </div>
          )}

          <p style={{ fontFamily: FF, fontSize: FS, color: COLOR.textMid, margin: "0 0 20px" }}>
            Set a new password for this user. They will need to use it on their next login.
          </p>

          <Form form={resetForm} layout="vertical" style={{ fontFamily: FF }}>
            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                { required: true, message: "Enter a new password" },
                { min: 6, message: "Password must be at least 6 characters" }
              ]}>
              <Input.Password placeholder="New password (min 6 characters)" size="large" />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Please confirm the new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match!"));
                  }
                })
              ]}>
              <Input.Password placeholder="Confirm new password" size="large" />
            </Form.Item>
          </Form>
        </Modal>

      </div>
    </Layout>
  );
};

export default AdminList;