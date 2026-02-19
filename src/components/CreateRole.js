import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Form,
    Input,
    Button,
    Select,
    Spin,
    Typography,
    Space,
    message,
} from "antd";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { Title } = Typography;

const CreateRole = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [schools, setSchools] = useState([]);

    const user = JSON.parse(localStorage.getItem("user"));
    const roleName = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = roleName === "superadmin";

    // Fetch schools (only for Superadmin)
    useEffect(() => {
        const fetchSchools = async () => {
            if (!isSuperAdmin) return;

            try {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_URL}/school/getAllSchools`
                );
                setSchools(res.data.schools || []);
            } catch (error) {
                console.error(error);
                message.error("Failed to fetch schools");
            }
        };

        fetchSchools();
    }, [isSuperAdmin]);

    // Submit Form
    const handleSubmit = async (values) => {
        setLoading(true);

        try {
            const schoolId = isSuperAdmin
                ? values.school_id
                : user?.school?.id;

            const payload = {
                roleOfUser: values.roleOfUser,
                school_id: schoolId,
            };

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/role/createRole`,
                payload
            );

            if (response.status === 201) {
                message.success("Role created successfully!");
                form.resetFields();
            }
        } catch (error) {
            console.error(error);

            if (error.response && error.response.data?.error) {
                message.error(error.response.data.error);
            } else {
                message.error("Failed to create role");
            }
        }

        setLoading(false);
    };

    const handleCancel = () => {
        navigate("/role");
    };

    return (
        <div
            style={{
                maxWidth: "500px",
                margin: "50px auto",
                padding: "20px",
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 0 10px rgba(0,0,0,0.05)",
            }}
        >
            <Title level={2} style={{ textAlign: "center" }}>
                Create Role
            </Title>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {/* School Field */}
                {isSuperAdmin ? (
                    <Form.Item
                        name="school_id"
                        label="School"
                        rules={[{ required: true, message: "Please select school" }]}
                    >
                        <Select showSearch placeholder="Select school">
                            {schools.map((school) => (
                                <Option key={school.id} value={school.id}>
                                    {school.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                ) : (
                    <Form.Item label="School">
                        <Input value={user?.school?.name || "N/A"} disabled />
                    </Form.Item>
                )}

                {/* Role Field */}
                <Form.Item
                    name="roleOfUser"
                    label="Role Name"
                    rules={[{ required: true, message: "Please select role" }]}
                >
                    <Select placeholder="Select role">
                        <Option value="School Admin">School Admin</Option>
                        <Option value="Teacher">Teacher</Option>
                        <Option value="Accounts">Accounts</Option>
                    </Select>
                </Form.Item>

                {/* Buttons */}
                <Form.Item>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Button
                            onClick={handleCancel}
                            disabled={loading}
                            style={{
                                width: "48%",
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
                            loading={loading}
                            style={{ width: "48%" }}
                        >
                            Create Role
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default CreateRole;