import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Form, Input, Spin, Typography, message, Select, Space } from "antd";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { Option } = Select;

const CreateGrade = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  useEffect(() => {
    const fetchSchools = async () => {
      if (isSuperAdmin) {
        try {
          const response = await axios.get("http://localhost:8080/school/getAllSchools");
          setSchools(response.data.schools || []);
        } catch (error) {
          message.error("Failed to fetch schools");
        }
      }
    };
    fetchSchools();
  }, [isSuperAdmin]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        school_id: isSuperAdmin ? values.school_id : user.school.id,
      };

      const response = await axios.post("http://localhost:8080/grade/createGrade", payload);

      if (response.status === 201) {
        message.success("Grade created successfully!");
        form.resetFields();
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response.data?.error === "Grade already exists for this school") {
        message.error("Error: This grade already exists for the selected school.");
      } else {
        console.error(error);
        message.error("Failed to create grade. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/grade"); // ?? Redirect to grade list page
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>Create Grade</Title>

      <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: "20px" }}>
        {isSuperAdmin ? (
          <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select school">
              {schools.map((school) => (
                <Option key={school.id} value={school.id}>
                  {school.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item label="School Name">
            <Input value={user?.school?.name || "N/A"} disabled />
          </Form.Item>
        )}

        <Form.Item
          label="Grade"
          name="grade"
          rules={[{ required: true, message: "Please enter the grade name!" }]}
        >
          <Input placeholder="Enter grade name" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#faad14",
                color: "#fff",
                border: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#d48806")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#faad14")
              }
            >
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Creating..." : "Create Grade"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateGrade;
