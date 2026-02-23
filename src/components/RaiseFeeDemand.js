import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Typography,
  Select,
  message,
  Radio,
  InputNumber,
  Space,
} from "antd";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

/* ================= Fee Section Component ================= */

const FeeSection = ({
  label,
  checked,
  setChecked,
  descName,
  amountSetter,
  mediumSetter,
  studentType,
  setStudentType,
}) => (
  <>
    <Form.Item>
      <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
        {label} Fee
      </Checkbox>
    </Form.Item>

    {checked && (
      <>
        <Form.Item
          label={`${label} Description`}
          name={descName}
          rules={[{ required: true, message: "Enter description" }]}
        >
          <Input placeholder="Enter description" />
        </Form.Item>

        <Form.Item label="Student Type">
          <Radio.Group
            value={studentType}
            onChange={(e) => setStudentType(e.target.value)}
          >
            <Radio value="Old">Old</Radio>
            <Radio value="New">New</Radio>
            <Radio value="Both">Both</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Medium" required>
          <Select
            placeholder="Select medium"
            onChange={mediumSetter}
          >
            <Option value="Tamil">Tamil</Option>
            <Option value="English">English</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Amount" required>
          <Input
            type="number"
            placeholder="Enter amount"
            onChange={(e) => amountSetter(e.target.value)}
          />
        </Form.Item>
      </>
    )}
  </>
);

/* ================= Main Component ================= */

const RaiseFeeDemand = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedGrades, setSelectedGrades] = useState([]);

  const [startYear, setStartYear] = useState(dayjs().year());
  const [academicYear, setAcademicYear] = useState(
    `${dayjs().year()}-${dayjs().year() + 1}`
  );

  const [managementChecked, setManagementChecked] = useState(false);
  const [ptaChecked, setPtaChecked] = useState(false);
  const [studentType, setStudentType] = useState("Old");

  const [managementAmount, setManagementAmount] = useState(0);
  const [ptaAmount, setPtaAmount] = useState(0);
  const [managementMedium, setManagementMedium] = useState(null);
  const [ptaMedium, setPtaMedium] = useState(null);

  const totalAmount =
    (parseFloat(managementAmount) || 0) +
    (parseFloat(ptaAmount) || 0);

  /* ================= Effects ================= */

  useEffect(() => {
    if (isSuperAdmin) fetchSchools();
    else setSelectedSchool(user?.school?.id);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedSchool) fetchGrades(selectedSchool);
  }, [selectedSchool]);

  /* ================= API Calls ================= */

  const fetchSchools = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8080/school/getAllSchools"
      );
      setSchools(res.data.schools || []);
    } catch {
      message.error("Failed to fetch schools");
    }
  };

  const fetchGrades = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/grade/getGradesBySchool/${id}`
      );
      setGrades(res.data.grades || []);
    } catch {
      message.error("Failed to fetch grades");
    }
  };

  /* ================= Submit ================= */

  const handleSubmit = async (values) => {
    if (!academicYear || !selectedGrades.length || !selectedSchool) {
      message.error("Please fill all required fields");
      return;
    }

    const payload = {
      school_id: selectedSchool,
      grade_ids: selectedGrades,
      academicYear,
      feeDetails: [],
    };

    if (managementChecked) {
      selectedGrades.forEach((gid) => {
        payload.feeDetails.push({
          grade: grades.find((x) => x.id === gid)?.grade,
          grade_id: gid,
          type: "Management",
          description: values.managementDescription,
          amount: managementAmount,
          studentType,
          medium: managementMedium,
        });
      });
    }

    if (ptaChecked) {
      selectedGrades.forEach((gid) => {
        payload.feeDetails.push({
          grade: grades.find((x) => x.id === gid)?.grade,
          grade_id: gid,
          type: "PTA",
          description: values.ptaDescription,
          amount: ptaAmount,
          studentType,
          medium: ptaMedium,
        });
      });
    }

    try {
      await axios.post(
        "http://localhost:8080/raiseFeeDemand/createraiseFeeDemand",
        payload
      );

      message.success("Fee demand raised successfully");
      form.resetFields();
      setSelectedGrades([]);
      setManagementChecked(false);
      setPtaChecked(false);
      setManagementAmount(0);
      setPtaAmount(0);
    } catch {
      message.error("Failed to raise fee demand");
    }
  };

  /* ================= UI ================= */

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <Title level={2} style={{ textAlign: "center" }}>
        Raise Fee Demand
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: "20px" }}
      >
        {isSuperAdmin && (
          <Form.Item label="School" required>
            <Select
              placeholder="Select school"
              onChange={setSelectedSchool}
            >
              {schools.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item label="Academic Year" required>
          <div style={{ display: "flex", gap: 10 }}>
            <InputNumber
              min={2000}
              max={2100}
              value={startYear}
              onChange={(y) => {
                setStartYear(y);
                setAcademicYear(`${y}-${y + 1}`);
              }}
              style={{ width: "50%" }}
            />
            <Input
              value={startYear + 1}
              readOnly
              style={{ width: "50%" }}
            />
          </div>
        </Form.Item>

        <Form.Item label="Grades" required>
          <Checkbox.Group
            options={grades.map((g) => ({
              label: g.grade,
              value: g.id,
            }))}
            value={selectedGrades}
            onChange={setSelectedGrades}
          />
        </Form.Item>

        <FeeSection
          label="Management"
          checked={managementChecked}
          setChecked={setManagementChecked}
          descName="managementDescription"
          amountSetter={setManagementAmount}
          mediumSetter={setManagementMedium}
          studentType={studentType}
          setStudentType={setStudentType}
        />

        <FeeSection
          label="PTA"
          checked={ptaChecked}
          setChecked={setPtaChecked}
          descName="ptaDescription"
          amountSetter={setPtaAmount}
          mediumSetter={setPtaMedium}
          studentType={studentType}
          setStudentType={setStudentType}
        />

        <Form.Item label="Total Amount">
          <Input value={totalAmount} readOnly />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              onClick={() => navigate("/raiseFeeDemand")}
              style={{
                width: 150,
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
              style={{ width: 150 }}
            >
              Raise Demand
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RaiseFeeDemand;


































