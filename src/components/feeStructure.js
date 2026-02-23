import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, InputNumber, Input, Typography, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const { Title } = Typography;

const FeeStructure = () => {
  const [startYear, setStartYear] = useState(2024);
  const [feeData, setFeeData] = useState([]);
  const navigate = useNavigate();

  const academicYear = `${startYear}-${startYear + 1}`;

  const fetchFeeDemands = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8080/raiseFeeDemand/getAllFeeDemand"
      );

      const demands = response.data?.data || response.data || [];

      const filtered = demands
        .filter((d) => d.academic_year === academicYear)
        .flatMap((d) => {
          let details = [];

          if (typeof d.fee_details === "string") {
            try {
              details = JSON.parse(d.fee_details);
            } catch {
              return [];
            }
          } else if (Array.isArray(d.fee_details)) {
            details = d.fee_details;
          }

          return details.map((fee, index) => ({
            key: `${d.id}-${index}`,
            grade: fee.grade || "—",
            type: fee.type || "—",
            description: fee.description || "—",
            studentType: fee.studentType || "—",
            medium: fee.medium || "—",
            amount: fee.amount || 0,
          }));
        });

      setFeeData(filtered);
    } catch (err) {
      console.error(err);
      message.error("Failed to load fee structure");
    }
  };

  useEffect(() => {
    fetchFeeDemands();
  }, [startYear]);

  const columns = [
    {
      title: "S.No",
      render: (_, __, index) => index + 1,
      width: 70,
    },
    {
      title: "Grade",
      dataIndex: "grade",
    },
    {
      title: "Fee Type",
      dataIndex: "type",
    },
    {
      title: "Student Type",
      dataIndex: "studentType",
    },
    {
      title: "Medium",
      dataIndex: "medium",
    },
    {
      title: "Description",
      dataIndex: "description",
    },
    {
      title: "Amount",
      dataIndex: "amount",
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Title level={3} style={{ marginBottom: 5 }}>
            Annual Fee Structure
          </Title>
        </div>

        {/* Create Button */}
        <Button
          type="primary"
          style={{ marginBottom: 20 }}
          onClick={() => navigate("/feeDemand")}
        >
          Create Fee Structure
        </Button>

        {/* Academic Year Selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <strong>Academic Year:</strong>

          <InputNumber
            min={2000}
            max={2100}
            value={startYear}
            onChange={(value) => setStartYear(value)}
          />

          <span>-</span>

          <Input
            value={startYear + 1}
            readOnly
            style={{ width: 90, textAlign: "center" }}
          />
        </div>

        {/* Fee Table */}
        <Table
          dataSource={feeData}
          columns={columns}
          bordered
          pagination={false}
        />

        {/* Action Buttons */}
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <Button>Edit</Button>

          <Button danger>Delete</Button>

          <Button onClick={() => window.print()} type="dashed">
            Print
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .ant-table, .ant-table * {
            visibility: visible;
          }
          .ant-table {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default FeeStructure;
