import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Button, Select, Spin, Typography, Space, message } from "antd";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { Title } = Typography;

const CreateAdmin = () => {
    const [form] = Form.useForm();
    const [roles, setRoles] = useState([]);
    const navigate = useNavigate();
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch all schools if superadmin
                if (isSuperAdmin) {
                    const schoolsResponse = await axios.get("http://localhost:8080/school/getAllSchools");
                    setSchools(schoolsResponse.data.schools || []);
                }

                // Fetch initial roles based on user type
                if (user?.school?.id) {
                    const rolesResponse = await axios.get(
                        `http://localhost:8080/role/getRolesBySchool/${user.school.id}`
                    );
                    setRoles(rolesResponse.data.roles || []);
                }
            } catch (error) {
                message.error("Failed to load initial data");
            }
            setLoading(false);
        };

        fetchInitialData();
    }, [isSuperAdmin, user?.school?.id]);

    const handleSchoolChange = async (selectedSchoolId) => {
        setLoading(true);
        try {
            const response = await axios.get(
                `http://localhost:8080/role/getRolesBySchool/${selectedSchoolId}`
            );
            setRoles(response.data.roles || []);
            form.setFieldsValue({ school_id: selectedSchoolId });
        } catch (error) {
            message.error("Failed to fetch roles for selected school");
            setRoles([]);
        }
        setLoading(false);
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                school_id: isSuperAdmin ? values.school_id : user.school.id
            };

            const response = await axios.post(
                "http://localhost:8080/admin/createAdmin",
                payload
            );

            if (response.status === 201) {
                message.success("Admin created successfully!");
                form.resetFields();
            }
        } catch (error) {
            message.error(error.response?.data?.message || "Failed to create admin");
        }
        setLoading(false);
    };

    const handleCancel = () => {
        navigate("/admin"); // Navigate back to admin list page
    };
    return (
        <div className="container" style={{ maxWidth: "500px", margin: "0 auto", marginTop: "50px" }}>
            <Title level={2} style={{ textAlign: "center" }}>Create Users</Title>
            {loading && <Spin size="large" style={{ display: "block", margin: "auto" }} />}

            <Form form={form} onFinish={handleSubmit} layout="vertical">
                {isSuperAdmin && (
                    <Form.Item
                        name="school_id"
                        label="School"
                        rules={[{ required: true, message: "Please select a school!" }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="children"
                            onChange={handleSchoolChange}
                            placeholder="Select a school"
                        >
                            {schools.map((school) => (
                                <Option key={school.id} value={school.id}>
                                    {school.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {!isSuperAdmin && (
                    <Form.Item label="School Name">
                        <Input
                            value={user?.school?.name || "N/A"}
                            disabled
                        />
                    </Form.Item>
                )}

                <Form.Item name="role_id" label="Role" rules={[{ required: true, message: "Select a role!" }]}>
                    <Select>
                        {roles.map((role) => (
                            <Option key={role.id} value={role.id}>{role.roleOfUser}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: "Please enter user name!" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item label="Mobile Number" name="mobileNumber" rules={[
                    { required: true, message: "Enter Mobile Number!" },
                    { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit number!" }
                ]}>
                    <Input />
                </Form.Item>

                <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter a valid email!" }]}>
                    <Input />
                </Form.Item>

                <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter a password!" }]}>
                    <Input.Password />
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
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d48806")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#faad14")}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="primary"
                            htmlType="submit"
                            disabled={loading}
                            style={{ width: "100%" }}
                        >
                            {loading ? <Spin /> : "Create User"}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default CreateAdmin;
