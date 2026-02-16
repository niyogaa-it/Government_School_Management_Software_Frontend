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

  const schoolId = user?.school?.id;

  const [selectedSchoolId, setSelectedSchoolId] = useState(
    isSuperAdmin ? null : schoolId
  );

  // ✅ Initial Load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllSchools();
    } else if (schoolId) {
      fetchGrades(schoolId);
    }
  }, [role, schoolId]);

  // ✅ Fetch Schools
  const fetchAllSchools = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8080/school/getAllSchools"
      );
      setSchools(response.data.schools || []);
    } catch (error) {
      message.error("Failed to fetch schools");
    }
  };

  // ✅ Fetch Grades
  const fetchGrades = async (schoolId) => {
    if (!schoolId) return;

    try {
      const res = await axios.get(
        `http://localhost:8080/grade/getGradesBySchool/${schoolId}`
      );
      setGrades(res.data.grades || []);
    } catch (error) {
      message.error("Failed to fetch grades");
    }
  };

  // ✅ Fetch Sections
  const fetchSectionsBySchoolAndGrade = async (schoolId, gradeId) => {
    if (!schoolId || !gradeId) return;

    try {
      const response = await axios.get(
        `http://localhost:8080/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`
      );
      setSections(response.data.sections || []);
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch sections");
    }
  };

  // ✅ When School Changes (SuperAdmin)
  const handleSchoolChange = (value) => {
    setSelectedSchoolId(value);

    form.setFieldsValue({
      grade_id: undefined,
      section_id: undefined,
    });

    setGrades([]);
    setSections([]);

    fetchGrades(value);
  };

  // ✅ When Grade Changes
  const handleGradeChange = (gradeId) => {
    const selectedSchool =
      role === "superadmin"
        ? form.getFieldValue("school_id")
        : schoolId;

    form.setFieldsValue({ section_id: undefined });
    setSections([]);

    if (selectedSchool && gradeId) {
      fetchSectionsBySchoolAndGrade(selectedSchool, gradeId);
    }
  };

  // ✅ Submit
  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const payload = {
        ...values,
        school_id: isSuperAdmin ? values.school_id : schoolId,
      };

      const response = await axios.post(
        "http://localhost:8080/subject/createSubject",
        payload
      );

      if (response.status === 201) {
        message.success("Subject created successfully!");
        form.resetFields();
        setSections([]);
      }
    } catch (error) {
      message.error("Failed to create subject");
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

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            
            {/* ✅ School */}
            {isSuperAdmin ? (
              <Form.Item
                name="school_id"
                label="School"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select school"
                  onChange={handleSchoolChange}
                  showSearch
                >
                  {schools.map((school) => (
                    <Option key={school.id} value={school.id}>
                      {school.name}
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
                  <Input value={user?.school?.name || "N/A"} disabled />
                </Form.Item>
              </>
            )}

            {/* ✅ Grade */}
            <Form.Item
              label="Grade"
              name="grade_id"
              rules={[{ required: true, message: "Please select grade!" }]}
            >
              <Select
                placeholder="Select grade"
                onChange={handleGradeChange}
              >
                {grades.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.grade}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* ✅ Section */}
            <Form.Item
              label="Section"
              name="section_id"
              rules={[{ required: true, message: "Please select section!" }]}
            >
              <Select placeholder="Select section" disabled={!sections.length}>
                {sections.map((section) => (
                  <Option key={section.id} value={section.id}>
                    {section.sectionName}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* ✅ Subject Name */}
            <Form.Item
              label="Subject Name"
              name="subjectName"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            {/* ✅ Short Code */}
            <Form.Item
              label="Short Code"
              name="shortCode"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Create Subject
              </Button>
            </Form.Item>

          </Form>
        </div>
      </div>
    </div>
  );
};

export default CreateSubject;
