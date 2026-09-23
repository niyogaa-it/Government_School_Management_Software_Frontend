import React, { useState, useRef } from "react";
import axios from "axios";
import { Form, Input, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, PictureOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", border: "#e2e8f0", accent: "#4f8ef7", accentLight: "#e8f0fe" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const CreateSchool = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  /* ── Logo upload handler ── */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      api.error({ message: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG).", placement: "topRight", duration: 3 });
      return;
    }
    // Validate size — max 2MB
    if (file.size > 2 * 1024 * 1024) {
      api.error({ message: "File too large", description: "Logo must be under 2MB.", placement: "topRight", duration: 3 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoBase64(ev.target.result);   // full base64 string (data:image/png;base64,...)
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, logo: logoBase64 || null };
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/school/createSchool`, payload);
      if (res.status === 201) {
        api.success({
          message: "School Created!",
          description: `"${values.name}" created successfully.`,
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          placement: "topRight", duration: 3,
        });
        form.resetFields();
        removeLogo();
      }
    } catch (err) {
      if (err.response?.status === 409)
        api.warning({ message: "Duplicate!", description: `"${values.name}" already exists.`, icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />, placement: "topRight", duration: 4 });
      else
        api.error({ message: "Failed to Create School", placement: "topRight", duration: 4 });
    } finally { setLoading(false); }
  };

  const inp = { fontFamily: FF, fontSize: FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Create School</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ maxWidth: 540, margin: "0 auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: "28px 32px" }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ fontFamily: FF }}>

            {/* ── Logo Upload ── */}
            <Form.Item label="School Logo" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

                {/* Preview box */}
                <div style={{
                  width: 80, height: 80, borderRadius: 10,
                  border: `2px dashed ${logoPreview ? COLOR.accent : COLOR.border}`,
                  background: logoPreview ? "#fff" : COLOR.accentLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <PictureOutlined style={{ fontSize: 28, color: COLOR.accent }} />
                  }
                </div>

                {/* Upload controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      all: "unset", padding: "7px 18px", borderRadius: 7,
                      border: `1.5px solid ${COLOR.accent}`, background: COLOR.accentLight,
                      color: COLOR.accent, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", textAlign: "center",
                    }}>
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      style={{
                        all: "unset", padding: "5px 14px", borderRadius: 7,
                        border: "1.5px solid #fca5a5", background: "#fff5f5",
                        color: "#ef4444", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", textAlign: "center",
                      }}>
                      Remove
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: COLOR.textMid }}>PNG, JPG, SVG · Max 2MB</span>
                </div>
              </div>
            </Form.Item>

            {/* ── School fields ── */}
            <Form.Item label="School Name" name="name" rules={[{ required: true, message: "Enter school name" }]}><Input placeholder="Enter school name" style={inp} /></Form.Item>
            <Form.Item label="Short Code" name="shortcode" rules={[{ required: true, message: "Enter short code" }]}><Input placeholder="Enter short code" style={inp} /></Form.Item>
            <Form.Item label="Phone Number" name="phoneNumber" rules={[{ required: true, message: "Enter phone" }, { pattern: /^[0-9]{10}$/, message: "Enter valid 10-digit number" }]}><Input placeholder="Enter 10-digit phone" style={inp} /></Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter valid email" }]}><Input placeholder="Enter email" style={inp} /></Form.Item>
            <Form.Item label="Address" name="address" rules={[{ required: true, message: "Enter address" }]}><Input placeholder="Enter address" style={inp} /></Form.Item>
            <Form.Item label="City" name="city" rules={[{ required: true, message: "Enter city" }]}><Input placeholder="Enter city" style={inp} /></Form.Item>
            <Form.Item label="State" name="state" rules={[{ required: true, message: "Enter state" }]}><Input placeholder="Enter state" style={inp} /></Form.Item>
            <Form.Item label="Pincode" name="pincode" rules={[{ required: true, message: "Enter pincode" }, { pattern: /^[0-9]{6}$/, message: "Enter valid 6-digit pincode" }]}><Input placeholder="Enter pincode" style={inp} /></Form.Item>

            {/* Buttons */}
            <Form.Item style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => navigate("/school-list")}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  style={{ all: "unset", padding: "9px 28px", borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: FS, fontWeight: 600, color: COLOR.textMid, cursor: "pointer", background: "#fff", transition: "background 0.15s" }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = COLOR.blue; }}
                  onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; }}
                  style={{ all: "unset", padding: "9px 28px", borderRadius: 8, background: COLOR.blueLt, color: "#fff", fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s" }}>
                  {loading ? "Creating…" : "Create School"}
                </button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateSchool;
