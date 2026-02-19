import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Spin,
  Select,
  Typography,
  Space,
  message,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;

const EditGrade = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch grade
        const gradeRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/grade/getAllGrades`
        );

        const gradeData = gradeRes.data.grades.find(
          (g) => g.id === parseInt(id)
        );

        if (!gradeData) {
          message.error("Grade not found");
          return;
        }

        // If superadmin → fetch schools
        if (role === "superadmin") {
          const schoolRes = await axios.get(
            `${process.env.REACT_APP_API_URL}/school/getAllSchools`
          );
          setSchools(schoolRes.data.schools || []);
        }

        // Set form values
        form.setFieldsValue({
          grade: gradeData.grade,
          school_id: gradeData.school_id,
        });
      } catch (error) {
        console.error(error);
        message.error("Failed to load grade details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      const payload = {
        grade: values.grade,
        school_id:
          role === "superadmin"
            ? values.school_id
            : user?.school?.id,
      };

      await axios.put(
        `${process.env.REACT_APP_API_URL}/grade/updateGrade/${id}`,
        payload
      );

      message.success("Grade updated successfully!");
      navigate("/grade");
    } catch (err) {
      console.error("Update error:", err);
      message.error("Failed to update grade");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/grade");

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <Spin size="large" />
        <p>Loading grade data...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>
        Edit Grade
      </Title>

      <Form form={form} layout="vertical" onFinish={handleUpdate}>
        {/* Show School dropdown only for Superadmin */}
        {role === "superadmin" && (
          <Form.Item
            name="school_id"
            label="School"
            rules={[{ required: true, message: "Please select school" }]}
          >
            <Select placeholder="Select School">
              {schools.map((school) => (
                <Select.Option key={school.id} value={school.id}>
                  {school.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="grade"
          label="Grade Name"
          rules={[{ required: true, message: "Please enter grade name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              onClick={handleCancel}
              disabled={saving}
              style={{
                width: "79%",
                backgroundColor: "#faad14",
                color: "#fff",
                border: "none",
              }}
            >
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              disabled={saving}
              style={{
                width: "90%",
                backgroundColor: "#52c41a",
                border: "none",
              }}
            >
              {saving ? <Spin /> : "Update Grade"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditGrade;