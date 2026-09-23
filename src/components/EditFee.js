import React, { useEffect, useState } from "react";
import axios from "axios";
import { Form, Input, InputNumber, Select, Spin, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", green:"#16a34a", greenLt:"#22c55e" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const BASE_URL = `${process.env.REACT_APP_API_URL}/raiseFeeDemand`;

const EditFee = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false); const [editData, setEditData] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("editFeeData");
    if (stored) {
      const p = JSON.parse(stored);
      setEditData(p);
      form.setFieldsValue({ grade:p.grade==="—"?"":p.grade, type:p.type==="—"?undefined:p.type, description:p.description==="—"?"":p.description, studentType:p.studentType==="—"?undefined:p.studentType, medium:p.medium==="—"?undefined:p.medium, amount:p.amount });
    } else { message.error("No edit data found."); navigate("/raiseFeeDemand"); }
  }, []);

  const handleSubmit = async (values) => {
    if (!editData) return;
    setLoading(true);
    try {
      await axios.put(`${BASE_URL}/updateFeeDemand/${id}`, { feeIndex:editData.feeIndex, ...values });
      sessionStorage.removeItem("editFeeData");
      message.success("Fee updated!"); navigate("/raiseFeeDemand");
    } catch (err) { message.error(err.response?.data?.message||"Failed to update fee"); }
    finally { setLoading(false); }
  };

  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Edit Fee Entry</h1>
          <div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/>
          {editData?.academicYear && <p style={{fontSize:"13px",color:COLOR.textMid,marginTop:8}}>Academic Year: <strong>{editData.academicYear}</strong></p>}
        </div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{fontFamily:FF}}>
            <Form.Item label="Grade" name="grade" rules={[{required:true,message:"Enter grade"}]}><Input placeholder="e.g. XI" style={inp}/></Form.Item>
            <Form.Item label="Fee Type" name="type" rules={[{required:true}]}><Select placeholder="Select fee type" style={inp}><Option value="Management">Management</Option><Option value="PTA">PTA</Option></Select></Form.Item>
            <Form.Item label="Student Type" name="studentType" rules={[{required:true}]}><Select placeholder="Select student type" style={inp}><Option value="New">New</Option><Option value="Old">Old</Option></Select></Form.Item>
            <Form.Item label="Medium" name="medium" rules={[{required:true}]}><Select placeholder="Select medium" style={inp}><Option value="English">English</Option><Option value="Tamil">Tamil</Option></Select></Form.Item>
            <Form.Item label="Description" name="description"><Input placeholder="Enter description" style={inp}/></Form.Item>
            <Form.Item label="Amount" name="amount" rules={[{required:true}]}><InputNumber min={0} style={{width:"100%",...inp}} placeholder="Enter amount"/></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>{sessionStorage.removeItem("editFeeData");navigate("/raiseFeeDemand");}} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={loading} onMouseEnter={e=>e.currentTarget.style.background=COLOR.green} onMouseLeave={e=>e.currentTarget.style.background=COLOR.greenLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.greenLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(34,197,94,0.25)",transition:"all 0.18s"}}>{loading?"Saving...":"Update Fee"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default EditFee;
