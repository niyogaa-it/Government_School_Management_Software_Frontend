import React, { useState } from "react";
import axios from "axios";
import { Form, Input, Button, Typography, message, Space } from "antd";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const CreateSchool = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8080/school/createSchool",
        values
      );

      // Success
      setLoading(false);
      message.success(response.data.message || "School created successfully!");
      form.resetFields();
    } catch (error) {
      setLoading(false);

      if (error.response) {
        // Duplicate school
        if (error.response.status === 409) {
          message.warning(error.response.data.error || "School already exists!");
        } else {
          // Other server errors
          message.error(error.response.data.error || "Server error. Please try again.");
        }
      } else {
        // Network or unknown error
        message.error("Network error. Please check your connection.");
      }
    }
  };

  const handleCancel = () => {
    navigate("/school-list");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>
        Create School
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: "20px" }}
      >
        <Form.Item
          label="School Name"
          name="name"
          rules={[{ required: true, message: "Please enter the school name!" }]}
        >
          <Input placeholder="Enter school name" />
        </Form.Item>

        <Form.Item
          label="Short Code"
          name="shortcode"
          rules={[{ required: true, message: "Please enter a short code!" }]}
        >
          <Input placeholder="Enter short code" />
        </Form.Item>

        <Form.Item
          label="Address"
          name="address"
          rules={[{ required: true, message: "Please enter the address!" }]}
        >
          <Input placeholder="Enter address" />
        </Form.Item>

        <Form.Item
          label="City"
          name="city"
          rules={[{ required: true, message: "Please enter the city!" }]}
        >
          <Input placeholder="Enter city" />
        </Form.Item>

        <Form.Item
          label="State"
          name="state"
          rules={[{ required: true, message: "Please enter the state!" }]}
        >
          <Input placeholder="Enter state" />
        </Form.Item>

        <Form.Item
          label="Pincode"
          name="pincode"
          rules={[
            { required: true, message: "Please enter the pincode!" },
            { pattern: /^[0-9]{6}$/, message: "Enter a valid 6-digit pincode!" },
          ]}
        >
          <Input placeholder="Enter pincode" />
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
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Creating..." : "Create School"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateSchool;