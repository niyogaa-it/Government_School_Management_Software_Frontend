import React, { useState, useEffect } from "react";
import { Form, Input, Button, Spin, Typography, Space, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;

const EditSection = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // ✅ added missing state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSection = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/section/getAllSections`);
        const section = res.data.sections.find((sec) => sec.id === parseInt(id));
        if (section) form.setFieldsValue(section);
      } catch {
        message.error("Failed to load section details");
      } finally {
        setLoading(false);
      }
    };

    fetchSection();
  }, [id, form]);

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      await axios.put(`http://localhost:8080/section/updateSection/${id}`, values);
      message.success("Section updated successfully!");
      navigate("/section");
    } catch (err) {
      console.error("Update error:", err);
      message.error("Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/section");

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <Spin size="large" />
        <p>Loading section data...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>Edit Section</Title>

      <Form form={form} layout="vertical" onFinish={handleUpdate}>
        <Form.Item
          name="sectionName"
          label="Section Name"
          rules={[{ required: true, message: "Please enter section name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="shortCode"
          label="Short Code"
          rules={[{ required: true, message: "Please enter short code" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            {/* Cancel Button */}
            <Button
              onClick={handleCancel}
              disabled={saving}
              style={{
                width: "80%",
                backgroundColor: "#faad14",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d48806")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#faad14")}
            >
              Cancel
            </Button>

            {/* Update Button */}
            <Button
              type="primary"
              htmlType="submit"
              disabled={saving}
              style={{
                width: "85%",
                backgroundColor: "#52c41a",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#389e0d")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#52c41a")}
            >
              {saving ? <Spin /> : "Update Section"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditSection;
