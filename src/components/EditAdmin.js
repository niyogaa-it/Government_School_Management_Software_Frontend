import React, { useEffect, useState } from "react";
import { Form, Input, Button, Spin, Typography, Space, message } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const { Title } = Typography;

const EditAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/admin/getAdminById/${id}`);
        const a = res.data.admin;
        form.setFieldsValue({
          name: a.name || "",
          email: a.email || "",
          mobileNumber: a.mobileNumber || "",
          password: a.password || "",
        });
      } catch (err) {
        console.error("Error fetching admin:", err);
        message.error("Failed to load admin details");
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, [id, form]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await axios.put(`http://localhost:8080/admin/updateAdmin/${id}`, values);
      message.success("Admin updated successfully!");
      navigate("/admin");
    } catch (err) {
      console.error("Update error:", err);
      message.error("Failed to update admin");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <Spin size="large" />
        <p>Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "500px", margin: "0 auto", marginTop: "50px" }}>
      <Title level={2} style={{ textAlign: "center" }}>Edit User</Title>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please enter user name!" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: "email", message: "Enter a valid email!" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Mobile Number"
          name="mobileNumber"
          rules={[
            { required: true, message: "Enter Mobile Number!" },
            { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit number!" }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Enter a password!" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            {/* Cancel Button (Yellow) */}
            <Button
              onClick={handleCancel}
              disabled={saving}
              style={{
                width: "100%",
                backgroundColor: "#faad14",
                color: "#fff",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d48806")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#faad14")}
            >
              Cancel
            </Button>

            {/* Update Button (Green) */}
            <Button
              type="primary"
              htmlType="submit"
              disabled={saving}
              style={{
                width: "100%",
                backgroundColor: "#52c41a",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#389e0d")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#52c41a")}
            >
              {saving ? <Spin /> : "Update Admin"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditAdmin;
