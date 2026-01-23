import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, message, Select } from "antd";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

const CreateGroup = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState([]);
    const [schools, setSchools] = useState([]);

    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = role === "superadmin";
    const userSchoolId = user?.school?.id;

    useEffect(() => {
        const fetchData = async () => {
            if (isSuperAdmin) {
                try {
                    const schoolsResponse = await axios.get("http://localhost:8080/school/getAllSchools");
                    setSchools(schoolsResponse.data.schools || []);
                } catch (error) {
                    message.error("Failed to fetch schools");
                }
            }

            if (form.getFieldValue("school_id") || userSchoolId) {
                fetchGrades();
            }
        };
        fetchData();
    }, [isSuperAdmin, userSchoolId, form]);

    const fetchGrades = async () => {
        const schoolId = isSuperAdmin
            ? form.getFieldValue("school_id")
            : userSchoolId;

        if (!schoolId) return;

        setGrades([]); // Clear old grades first

        try {
            const response = await axios.get(
                `http://localhost:8080/grade/getGradesBySchool/${schoolId}`
            );
            const fetchedGrades = response.data.grades || [];

            if (fetchedGrades.length === 0) {
                message.warning("No grades found for the selected school.");
            }

            setGrades(fetchedGrades);
        } catch (error) {
            setGrades([]);
            message.error("Failed to fetch grades for the selected school.");
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const schoolId = isSuperAdmin ? values.school_id : userSchoolId;
            const gradeId = values.grade_id;
            const groupName = values.availableGroups.trim().toLowerCase();

            // ✅ Fetch existing groups for this school
            const response = await axios.get(
                `http://localhost:8080/group/getGroupsBySchool/${schoolId}`
            );

            const existingGroups = response.data.groups || [];

            // ✅ Check for duplicate group for same grade
            const isDuplicate = existingGroups.some(
                (group) =>
                    group.grade_id === gradeId &&
                    group.availableGroups.toLowerCase() === groupName
            );

            if (isDuplicate) {
                message.error("This group already exists for the selected grade.");
                setLoading(false);
                return;
            }

            const payload = {
                ...values,
                school_id: schoolId,
                availableGroups: groupName,
            };

            const createRes = await axios.post(
                "http://localhost:8080/group/createGroup",
                payload
            );

            if (createRes.status === 201) {
                message.success("Group created successfully!");
                form.resetFields();
                setGrades([]); // Optional: reset grades
            }
        } catch (error) {
            message.error(error.response?.data?.error || "Failed to create group");
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: "500px", margin: "0 auto", marginTop: "50px" }}>
            <Title level={2} style={{ textAlign: "center" }}>Create Group</Title>

            <Form form={form} onFinish={handleSubmit} layout="vertical">
                {isSuperAdmin ? (
                    <Form.Item
                        name="school_id"
                        label="School"
                        rules={[{ required: true, message: "Please select a school!" }]}
                    >
                        <Select
                            showSearch
                            placeholder="Select school"
                            onChange={async (value) => {
                                form.setFieldsValue({ grade_id: undefined });
                                setGrades([]); // Clear grades visually before fetch
                                await fetchGrades(); // ✅ make sure this is inside an async function
                            }}
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
                        <Form.Item name="school_id" hidden initialValue={userSchoolId}>
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
                    rules={[{ required: true, message: "Please select a grade!" }]}
                >
                    <Select placeholder="Select grade" loading={loading}>
                        {grades.length > 0 ? (
                            grades
                                .filter((grade) =>
                                    ["XI", "XII"].includes(grade.grade.toUpperCase())
                                )
                                .map((grade) => (
                                    <Option key={grade.id} value={grade.id}>
                                        {grade.grade}
                                    </Option>
                                ))
                        ) : (
                            <Option disabled key="no-grade">No grades available</Option>
                        )}
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Available Groups"
                    name="availableGroups"
                    rules={[{ required: true, message: "Please enter a group name!" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        {loading ? "Creating..." : "Create Group"}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default CreateGroup;
