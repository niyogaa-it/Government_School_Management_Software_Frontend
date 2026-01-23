import React, { useEffect, useState } from "react";
import { Form, Input, Button, Select, Typography, Spin, message } from "antd";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

const CreateSubject = () => {
  const [form] = Form.useForm();
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const userSchoolId = user?.school?.id;

  const [selectedSchoolId, setSelectedSchoolId] = useState(
    isSuperAdmin ? null : userSchoolId
  );

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllSchools();
    } else {
      fetchGrades(userSchoolId);
    }
  }, []);

  const fetchAllSchools = async () => {
    try {
      const response = await axios.get("http://localhost:8080/school/getAllSchools");
      setSchools(response.data.schools || []);
    } catch (error) {
      message.error("Failed to fetch schools");
    }
  };

  const fetchGrades = async (schoolId) => {
    try {
      const response = await axios.get(`http://localhost:8080/grade/getGradesBySchool/${schoolId}`);
      setGrades(response.data.grades || []);
    } catch (error) {
      message.error("Failed to fetch grades");
    }
  };

  const fetchSections = async (gradeId) => {
    try {
      const response = await axios.get(`http://localhost:8080/section/getSectionsByGrade/${gradeId}`);
      setSections(response.data.sections || []);
    } catch (error) {
      message.error("Failed to fetch sections");
    }
  };

  const handleSchoolChange = (schoolId) => {
    setSelectedSchoolId(schoolId);
    form.setFieldsValue({ grade_id: null, section_id: null });
    setGrades([]);
    setSections([]);
    fetchGrades(schoolId);
  };

  const handleGradeChange = (gradeId) => {
    form.setFieldsValue({ section_id: null });
    fetchSections(gradeId);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        school_id: selectedSchoolId,
      };

      const response = await axios.post("http://localhost:8080/subject/createSubject", payload);

      if (response.status === 201) {
        message.success("Subject created successfully!");
        form.resetFields();
        setSections([]);
      }
    } catch (error) {
      message.error("Failed to create subject.");
    }
    setLoading(false);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "600px" }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <Title level={3} style={{ textAlign: "center", marginBottom: 30 }}>
            Create Subject
          </Title>

          {loading && (
            <Spin size="large" style={{ display: "block", margin: "auto" }} />
          )}

          <Form form={form} onFinish={handleSubmit} layout="vertical">
            {isSuperAdmin ? (
              <Form.Item
                label="School"
                name="school_id"
                rules={[{ required: true, message: "Please select a school" }]}
              >
                <Select placeholder="Select school" onChange={handleSchoolChange}>
                  {schools.map((school) => (
                    <Option key={school.id} value={school.id}>
                      {school.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <>
                <Form.Item name="school_id" initialValue={userSchoolId} hidden>
                  <Input type="hidden" />
                </Form.Item>
                <Form.Item label="School Name">
                  <Input value={user?.school?.name || "N/A"} disabled />
                </Form.Item>
              </>
            )}

            <Form.Item
              label="Grade"
              name="grade_id"
              rules={[{ required: true, message: "Please select grade!" }]}
            >
              <Select
                placeholder="Select grade"
                onChange={handleGradeChange}
                disabled={!selectedSchoolId}
              >
                {grades.map((grade) => (
                  <Option key={grade.id} value={grade.id}>
                    {grade.grade}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Section"
              name="section_id"
              rules={[{ required: true, message: "Please select section!" }]}
            >
              <Select placeholder="Select section" disabled={grades.length === 0}>
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <Option key={section.id} value={section.id}>
                      {section.sectionName}
                    </Option>
                  ))
                ) : (
                  form.getFieldValue("grade_id") && (
                    <Option disabled>No sections available</Option>
                  )
                )}
              </Select>
            </Form.Item>

            <Form.Item
              label="Subject Name"
              name="subjectName"
              rules={[{ required: true, message: "Enter subject name!" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Short Code"
              name="shortCode"
              rules={[{ required: true, message: "Enter short code!" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" disabled={loading} block>
                {loading ? <Spin /> : "Create Subject"}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default CreateSubject;
