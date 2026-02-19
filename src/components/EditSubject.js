import React, { useState, useEffect } from "react";
import { Form, Input, Button, Spin, Typography, Space, Select, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

const EditSubject = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const navigate = useNavigate();

  //  Load grades based on school
  const fetchGradesBySchool = async (schoolId) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${schoolId}`
      );
      setGrades(res.data.grades || []);
    } catch (err) {
      setGrades([]);
      message.error("Failed to load grades");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load schools
        const schoolRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/school/getAllSchools`
        );
        setSchools(schoolRes.data.schools);

        // Load subject
        const subjectRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/subject/getAllSubjects`
        );

        const subject = subjectRes.data.subjects.find(
          (sub) => sub.id === parseInt(id)
        );

        if (subject) {
          form.setFieldsValue({
            school_id: subject.school_id,
            grade_id: subject.grade_id,
            subjectName: subject.subjectName,
            shortCode: subject.shortCode,
          });

          // ✅ Load only that school's grades
          await fetchGradesBySchool(subject.school_id);
        }

      } catch (err) {
        message.error("Failed to load subject details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/subject/updateSubject/${id}`,
        values
      );

      message.success("Subject updated successfully!");
      navigate("/subject");
    } catch (err) {
      console.error(err);
      message.error("Failed to update subject");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/subject");

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <Spin size="large" />
        <p>Loading subject data...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>
        Edit Subject
      </Title>

      <Form form={form} layout="vertical" onFinish={handleUpdate}>
        
        {/* SCHOOL */}
        <Form.Item
          name="school_id"
          label="School"
          rules={[{ required: true, message: "Please select school" }]}
        >
          <Select
            onChange={(value) => {
              form.setFieldsValue({ grade_id: undefined }); // reset grade
              fetchGradesBySchool(value); // load grades for selected school
            }}
          >
            {schools.map((school) => (
              <Option key={school.id} value={school.id}>
                {school.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* GRADE (Filtered) */}
        <Form.Item
          name="grade_id"
          label="Grade"
          rules={[{ required: true, message: "Please select grade" }]}
        >
          <Select>
            {grades.map((grade) => (
              <Option key={grade.id} value={grade.id}>
                {grade.grade}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* SUBJECT NAME */}
        <Form.Item
          name="subjectName"
          label="Subject Name"
          rules={[{ required: true, message: "Please enter subject name" }]}
        >
          <Input />
        </Form.Item>

        {/* SHORT CODE */}
        <Form.Item
          name="shortCode"
          label="Short Code"
          rules={[{ required: true, message: "Please enter short code" }]}
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
              {saving ? <Spin /> : "Update Subject"}
            </Button>
          </Space>
        </Form.Item>

      </Form>
    </div>
  );
};

export default EditSubject;