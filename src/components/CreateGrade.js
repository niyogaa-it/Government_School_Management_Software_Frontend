import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Select, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const generateAcademicYears = () => Array.from({length:2},(_,i)=>`${2025+i}-${2026+i}`);

const CreateGrade = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user?.roleName?.toLowerCase().replace(/\s+/g,"") === "superadmin";

  useEffect(() => {
    if (isSuperAdmin) axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`).then(r=>setSchools(r.data.schools||[])).catch(()=>{});
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/grade/createGrade`, { ...values, school_id: isSuperAdmin ? values.school_id : user.school.id });
      if (res.status===201) { api.success({message:"Grade Created!",description:`"${values.grade}" for ${values.academic_year} created.`,icon:<CheckCircleOutlined style={{color:"#52c41a"}}/>,placement:"topRight",duration:3}); form.resetFields(); }
    } catch (err) {
      if (err.response?.status===400) api.warning({message:"Duplicate!",description:`"${values.grade}" for ${values.academic_year} already exists.`,icon:<ExclamationCircleOutlined style={{color:"#faad14"}}/>,placement:"topRight",duration:4});
      else api.error({message:"Failed to Create Grade",placement:"topRight",duration:4});
    } finally { setLoading(false); }
  };

  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Create Grade</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{fontFamily:FF}}>
            {isSuperAdmin ? (
              <Form.Item name="school_id" label="School" rules={[{required:true,message:"Select a school"}]}>
                <Select showSearch placeholder="Select school" style={inp}>{schools.map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}</Select>
              </Form.Item>
            ) : (
              <Form.Item label="School"><Input value={user?.school?.name||"N/A"} disabled style={inp}/></Form.Item>
            )}
            <Form.Item label="Academic Year" name="academic_year" rules={[{required:true,message:"Select academic year"}]}>
              <Select placeholder="Select academic year" style={inp}>{generateAcademicYears().map(y=><Option key={y} value={y}>{y}</Option>)}</Select>
            </Form.Item>
            <Form.Item label="Grade" name="grade" rules={[{required:true,message:"Enter grade name"}]}><Input placeholder="Enter grade name" style={inp}/></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>navigate("/grade")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={loading} onMouseEnter={e=>e.currentTarget.style.background=COLOR.blue} onMouseLeave={e=>e.currentTarget.style.background=COLOR.blueLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.blueLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(59,130,246,0.28)",transition:"all 0.18s"}}>{loading?"Creating...":"Create Grade"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default CreateGrade;
