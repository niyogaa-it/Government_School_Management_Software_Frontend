import React, { useEffect, useState } from "react";
import { Form, Input, Spin, message } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "./Layout";

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  border: "#e2e8f0", green: "#16a34a", greenLt: "#22c55e"
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const EditAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user?.roleName?.toLowerCase().replace(/\s+/g, "") === "superadmin";

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/admin/getAdminById/${id}`)
      .then(r => {
        const a = r.data.admin;
        // ✅ Password intentionally NOT set — use Reset Password from the Users List
        form.setFieldsValue({
          name: a.name || "",
          email: a.email || "",
          mobileNumber: a.mobileNumber || "",
        });
      })
      .catch(() => message.error("Failed to load user details"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values) => {
    // ✅ Only send non-password fields — matches updated updateAdmin controller
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/admin/updateAdmin/${id}`, {
        name: values.name,
        email: values.email,
        mobileNumber: values.mobileNumber,
      });
      message.success("User updated successfully!");
      navigate("/admin");
    } catch {
      message.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Layout>
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
        <p>Loading...</p>
      </div>
    </Layout>
  );

  const inp = { fontFamily: FF, fontSize: FS };

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            Edit User
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{
          maxWidth: 540, margin: "0 auto", background: "#fff", borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: "28px 32px"
        }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ fontFamily: FF }}>

            <Form.Item label="Name" name="name" rules={[{ required: true, message: "Enter name" }]}>
              <Input style={inp} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              extra={!isSuperAdmin && (
                <span style={{ color: "#faad14", fontSize: "12px" }}>Email cannot be changed.</span>
              )}>
              <Input disabled={!isSuperAdmin} style={inp} />
            </Form.Item>

            <Form.Item
              label="Mobile Number"
              name="mobileNumber"
              rules={[
                { required: true, message: "Enter mobile" },
                { pattern: /^[0-9]{10}$/, message: "10-digit number required" }
              ]}>
              <Input style={inp} />
            </Form.Item>

            {/* ⛔ Password field removed — to reset password, use the 🔑 Reset Password button from Users List */}
            <div style={{
              background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
              padding: "10px 14px", marginBottom: 24, fontSize: "13px",
              color: "#92400e", fontFamily: FF
            }}>
              🔑 To change this user's password, use the <strong>Reset Password</strong> button on the Users List page.
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  style={{
                    all: "unset", padding: "9px 28px", borderRadius: 8,
                    border: `1px solid ${COLOR.border}`, fontSize: FS, fontWeight: 600,
                    color: COLOR.textMid, cursor: "pointer", background: "#fff", transition: "background 0.15s"
                  }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR.green}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR.greenLt}
                  style={{
                    all: "unset", padding: "9px 28px", borderRadius: 8,
                    background: COLOR.greenLt, color: "#fff", fontSize: FS, fontWeight: 600,
                    cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,0.25)", transition: "all 0.18s"
                  }}>
                  {saving ? "Saving..." : "Update User"}
                </button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default EditAdmin;