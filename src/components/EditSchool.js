import React, { useState, useEffect } from "react";
import { Form, Input, Button, Spin, Typography, Space, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;

const EditSchool = () => {
    const { id } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    //  Load School Data
    useEffect(() => {
        const fetchSchool = async () => {
            try {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_URL}/school/getSchool/${id}`
                );

                form.setFieldsValue({
                    name: res.data.name,
                    shortcode: res.data.shortcode,
                    phoneNumber: res.data.phoneNumber,
                    address: res.data.address,
                    city: res.data.city,
                    state: res.data.state,
                    pincode: res.data.pincode,
                });

            } catch (err) {
                message.error("Failed to load school details");
            } finally {
                setLoading(false);
            }
        };

        fetchSchool();
    }, [id]);

    const handleUpdate = async (values) => {
        setSaving(true);
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/school/updateSchool/${id}`, values);
            message.success("School updated successfully!");
            navigate("/school-list"); // ✅ go back to school list
        } catch (err) {
            console.error(err);
            message.error("Failed to update school");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => navigate("/school-list");

    if (loading) {
        return (
            <div style={{ textAlign: "center", marginTop: "100px" }}>
                <Spin size="large" />
                <p>Loading school data...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: "500px", margin: "50px auto" }}>
            <Title level={2} style={{ textAlign: "center" }}>
                Edit School
            </Title>

            <Form form={form} layout="vertical" onFinish={handleUpdate}>

                <Form.Item
                    name="name"
                    label="School Name"
                    rules={[{ required: true, message: "Please enter school name" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="shortcode"
                    label="Short Code"
                    rules={[{ required: true, message: "Please enter short code" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="phoneNumber"
                    label="Phone Number"
                    rules={[
                        { required: true, message: "Enter Phone Number!" },
                        { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit number!" }
                    ]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="address"
                    label="Address"
                    rules={[{ required: true, message: "Please enter address" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="city"
                    label="City"
                    rules={[{ required: true, message: "Please enter city" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="state"
                    label="State"
                    rules={[{ required: true, message: "Please enter state" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="pincode"
                    label="Pincode"
                    rules={[{ required: true, message: "Please enter pincode" }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Button
                            onClick={handleCancel}
                            disabled={saving}
                            style={{ width: "79%", backgroundColor: "#faad14", color: "#fff", border: "none" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d48806")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#faad14")}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="primary"
                            htmlType="submit"
                            disabled={saving}
                            style={{ width: "90%", backgroundColor: "#52c41a", border: "none" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#389e0d")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#52c41a")}
                        >
                            {saving ? <Spin /> : "Update School"}
                        </Button>
                    </Space>
                </Form.Item>

            </Form>
        </div>
    );
};

export default EditSchool;