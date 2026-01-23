import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Button, Select, Spin, Typography, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
const { Option } = Select;
const { Title } = Typography;

const CreateRole = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [schools, setSchools] = useState([]);
    const user = JSON.parse(localStorage.getItem("user")); // Get logged-in user
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = role === "superadmin";

    // Fetch all schools if user is a superadmin
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

    // Handle form submission
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Check for duplicate roles in the school
            const roleRes = await axios.get(`http://112.133.196.79:8080/role/getRolesBySchool/${isSuperAdmin ? values.school_id : user.school.id}`);
            const existingRoles = roleRes.data.roles || [];

            const isDuplicate = existingRoles.some(
                (role) => role.roleOfUser.toLowerCase() === values.roleOfUser.toLowerCase()
            );

            if (isDuplicate) {
                message.error("This role already exists in your school.");
                setLoading(false);
                return;
            }

            const payload = { ...values, school_id: isSuperAdmin ? values.school_id : user.school.id };
            const response = await axios.post("http://112.133.196.79:8080/role/createRole", payload);
            if (response.status === 201) {
                message.success("Role created successfully!");
                form.resetFields();
            }
        } catch (error) {
            message.error("Failed to create role.");
        }
        setLoading(false);
    };
    const handleCancel = () => {
    navigate("/role"); // Change this to your desired route
  };

    return (
        <div className="container" style={{ maxWidth: "500px", margin: "0 auto", marginTop: "50px" }}>
            <Title level={2} style={{ textAlign: "center" }}>Create Role</Title>

            {loading ? <Spin size="large" style={{ display: "block", margin: "auto" }} /> : null}

            <Form form={form} onFinish={handleSubmit} layout="vertical">
                {isSuperAdmin ? (
                    <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select school">
                            {schools.map(school => (
                                <Option key={school.id} value={school.id}>{school.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                ) : (
                    <Form.Item label="School Name">
                        <Input value={user?.school?.name || "N/A"} disabled />
                    </Form.Item>
                )}
                <Form.Item
                   name="roleOfUser"
                     label="Role Name"
                    rules={[{ required: true, message: 'Required!' }]}
                >
                    <Select placeholder="Select">
                        <Option value="School Admin">School Admin</Option>
                        <Option value="Teacher">Teacher</Option>
                        <Option value="Accounts">Accounts</Option>
                    </Select>
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
              {loading ? "Creating..." : "Create Role"}
            </Button>
          </Space>
        </Form.Item>
            </Form>
        </div>
    );
};

export default CreateRole;
