import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Select, Spin, notification } from "antd";
import { useNavigate } from "react-router-dom";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", border: "#e2e8f0" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const CreateAdmin = () => {
  const [form] = Form.useForm();
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user?.roleName?.toLowerCase().replace(/\s+/g, "") === "superadmin";
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isSuperAdmin) {
          const r = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
          setSchools(r.data.schools || []);
        }
        if (user?.school?.id) {
          const r = await axios.get(`${process.env.REACT_APP_API_URL}/role/getRolesBySchool/${user.school.id}`);
          setRoles(r.data.roles || []);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    init();
  }, []);

  const handleSchoolChange = async (id) => {
    form.setFieldValue("role_id", undefined); // reset role when school changes
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/role/getRolesBySchool/${id}`);
      setRoles(r.data.roles || []);
    } catch { setRoles([]); }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/admin/createAdmin`, {
        ...values,
        school_id: isSuperAdmin ? values.school_id : user.school.id
      });
      if (res.status === 201) {
        api.success({
          message: "User Created!",
          description: `"${values.name}" has been created successfully.`,
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          placement: "topRight",
          duration: 3
        });
        form.resetFields();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        api.warning({
          message: "Duplicate Email!",
          description: `"${values.email}" already exists.`,
          icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
          placement: "topRight",
          duration: 4
        });
      } else {
        api.error({
          message: "Failed to Create User",
          description: err.response?.data?.error || "Something went wrong.",
          placement: "topRight",
          duration: 4
        });
      }
    } finally { setLoading(false); }
  };

  const inp = { fontFamily: FF, fontSize: FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{ fontFamily: FF }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            Create User
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {loading && <div style={{ textAlign: "center", marginBottom: 16 }}><Spin /></div>}

        <div style={{
          maxWidth: 540, margin: "0 auto", background: "#fff", borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: "28px 32px"
        }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ fontFamily: FF }}>

            {isSuperAdmin ? (
              <Form.Item name="school_id" label="School" rules={[{ required: true, message: "Select a school" }]}>
                <Select showSearch placeholder="Select school" onChange={handleSchoolChange} style={inp}>
                  {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item label="School">
                <Input value={user?.school?.name || "N/A"} disabled style={inp} />
              </Form.Item>
            )}

            <Form.Item name="role_id" label="Role" rules={[{ required: true, message: "Select a role" }]}>
              <Select placeholder="Select role" style={inp}>
                {roles.map(r => <Option key={r.id} value={r.id}>{r.roleOfUser}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item label="Name" name="name" rules={[{ required: true, message: "Enter name" }]}>
              <Input style={inp} />
            </Form.Item>

            <Form.Item
              label="Mobile Number"
              name="mobileNumber"
              rules={[
                { required: true, message: "Enter mobile" },
                { pattern: /^[0-9]{10}$/, message: "Enter valid 10-digit number" }
              ]}>
              <Input style={inp} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: "email", message: "Enter valid email" }]}
              extra={!isSuperAdmin && (
                <span style={{ color: "#c98807", fontSize: "12px" }}>Email cannot be changed after submission.</span>
              )}>
              <Input style={inp} />
            </Form.Item>

            {/* ✅ Password required only at creation — min 6 chars to match backend */}
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Enter password" },
                { min: 6, message: "Password must be at least 6 characters" }
              ]}>
              <Input.Password style={inp} />
            </Form.Item>

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
                  disabled={loading}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR.blue}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR.blueLt}
                  style={{
                    all: "unset", padding: "9px 28px", borderRadius: 8,
                    background: COLOR.blueLt, color: "#fff", fontSize: FS, fontWeight: 600,
                    cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s"
                  }}>
                  {loading ? "Creating..." : "Create User"}
                </button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAdmin;