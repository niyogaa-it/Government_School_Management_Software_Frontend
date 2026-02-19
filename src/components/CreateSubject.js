import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  Typography,
  Space,
  message,
  Spin,
} from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { Option } = Select;

const CreateSubject = () => {
  const [form] = Form.useForm();
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  const schoolId = user?.school?.id;

  // ✅ Initial Load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchSchools();
    } else if (schoolId) {
      fetchGrades(schoolId);
    }
  }, [isSuperAdmin, schoolId]);

  // ✅ Fetch Schools (SuperAdmin Only)
  const fetchSchools = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/school/getAllSchools`
      );
      setSchools(res.data.schools || []);
    } catch {
      message.error("Failed to load schools");
    }
  };

  // ✅ Fetch Grades Based On School
  const fetchGrades = async (schoolId) => {
    if (!schoolId) return;

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${schoolId}`
      );
      setGrades(res.data.grades || []);
    } catch {
      message.error("Failed to load grades");
    }
  };

  // ✅ When School Changes
  const handleSchoolChange = (schoolId) => {
    form.setFieldsValue({ grade_id: undefined });
    setGrades([]);
    fetchGrades(schoolId);
  };

  // ✅ Submit
  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const payload = {
        ...values,
        school_id: isSuperAdmin ? values.school_id : schoolId,
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/subject/createSubject`,
        payload
      );

      if (res.status === 201) {
        message.success("Subject created successfully!");
        form.resetFields();
        navigate("/subject"); // redirect after create
      }
    } catch (err) {
      message.error(
        err.response?.data?.error || "Failed to create subject"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/subject");
  };

  return (
    <div
      className="container"
      style={{ maxWidth: "600px", margin: "50px auto" }}
    >
      <Title level={3} style={{ textAlign: "center" }}>
        Create Subject
      </Title>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* ✅ School */}
        {isSuperAdmin ? (
          <Form.Item
            name="school_id"
            label="School"
            rules={[{ required: true, message: "Please select school" }]}
          >
            <Select
              placeholder="Select school"
              onChange={handleSchoolChange}
            >
              {schools.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <>
            <Form.Item name="school_id" hidden initialValue={schoolId}>
              <Input type="hidden" />
            </Form.Item>

            <Form.Item label="School Name">
              <Input value={user?.school?.name} disabled />
            </Form.Item>
          </>
        )}

        {/* ✅ Grade */}
        <Form.Item
          name="grade_id"
          label="Grade"
          rules={[{ required: true, message: "Please select grade" }]}
        >
          <Select placeholder="Select grade">
            {grades.map((g) => (
              <Option key={g.id} value={g.id}>
                {g.grade}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* ✅ Subject Name */}
        <Form.Item
          name="subjectName"
          label="Subject Name"
          rules={[{ required: true, message: "Enter subject name" }]}
        >
          <Input placeholder="Enter subject name" />
        </Form.Item>

        {/* ✅ Short Code */}
        <Form.Item
          name="shortCode"
          label="Short Code"
          rules={[{ required: true, message: "Enter short code" }]}
        >
          <Input placeholder="Enter short code" />
        </Form.Item>

        {/* ✅ Buttons */}
        <Form.Item>
          <Space
            style={{
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <Button
              onClick={handleCancel}
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
              loading={loading}
              style={{ width: "100%" }}
            >
              {loading ? <Spin /> : "Create Subject"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateSubject;