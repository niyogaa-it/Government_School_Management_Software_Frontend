import React, { useState, useEffect } from "react";
import { Form, Input, Button, Select, Spin, Typography, Space, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { Option } = Select;

const CreateSection = () => {
  const [form] = Form.useForm();
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  useEffect(() => {
    const fetchSchools = async () => {
      if (isSuperAdmin) {
        try {
          const res = await axios.get("http://localhost:8080/school/getAllSchools");
          setSchools(res.data.schools || []);
        } catch {
          message.error("Failed to load schools");
        }
      } else {
        fetchGrades(user.school.id);
      }
    };
    fetchSchools();
  }, [isSuperAdmin]);

  const fetchGrades = async (schoolId) => {
    try {
      const res = await axios.get(`http://localhost:8080/grade/getGradesBySchool/${schoolId}`);
      setGrades(res.data.grades || []);
    } catch {
      message.error("Failed to load grades");
    }
  };

  const handleSchoolChange = (schoolId) => {
    form.setFieldsValue({ grade_id: undefined });
    fetchGrades(schoolId);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        school_id: isSuperAdmin ? values.school_id : user.school.id,
        status: 1,
      };

      const res = await axios.post("http://localhost:8080/section/createSection", payload);
      if (res.status === 201) {
        message.success("Section created successfully!");
        form.resetFields();
      }
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to create section");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate("/section");

  return (
    <div className="container" style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>Create Section</Title>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {isSuperAdmin ? (
          <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
            <Select placeholder="Select school" onChange={handleSchoolChange}>
              {schools.map((s) => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item label="School Name">
            <Input value={user?.school?.name} disabled />
          </Form.Item>
        )}

        <Form.Item name="grade_id" label="Grade" rules={[{ required: true }]}>
          <Select placeholder="Select grade">
            {grades.map((g) => (
              <Option key={g.id} value={g.id}>{g.grade}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="sectionName" label="Section Name" rules={[{ required: true }]}>
          <Input placeholder="Enter section name" />
        </Form.Item>

        <Form.Item name="shortCode" label="Short Code" rules={[{ required: true }]}>
          <Input placeholder="Enter short code" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              onClick={handleCancel}
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

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: "100%" }}
            >
              {loading ? <Spin /> : "Create Section"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateSection;
