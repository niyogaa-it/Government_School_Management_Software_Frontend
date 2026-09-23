import React, { useState, useEffect } from "react";
import { Form, Input, Select, Spin, notification } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", green:"#16a34a", greenLt:"#22c55e" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const generateAcademicYears = () => { const y=new Date().getFullYear(); return Array.from({length:3},(_,i)=>`${y-2+i}-${y-1+i}`); };

const EditSection = () => {
  const { id } = useParams(); const [form] = Form.useForm();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/section/getAllSections`)
      .then(r=>{ const s=r.data.sections.find(x=>x.id===parseInt(id)); if(s) form.setFieldsValue({sectionName:s.sectionName,shortCode:s.shortCode,academic_year:s.academic_year||undefined}); else api.error({message:"Section not found",placement:"topRight"}); })
      .catch(()=>api.error({message:"Failed to load section",placement:"topRight"}))
      .finally(()=>setLoading(false));
  }, [id]);

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/section/updateSection/${id}`, values);
      api.success({message:"Section Updated!",description:`"${values.sectionName}" updated.`,icon:<CheckCircleOutlined style={{color:"#52c41a"}}/>,placement:"topRight",duration:3});
      setTimeout(()=>navigate("/section"),1500);
    } catch { api.error({message:"Failed to update section",placement:"topRight"}); }
    finally { setSaving(false); }
  };

  if (loading) return <Layout><div style={{textAlign:"center",padding:80}}><Spin size="large"/><p>Loading...</p></div></Layout>;
  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Edit Section</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleUpdate} style={{fontFamily:FF}}>
            <Form.Item name="sectionName" label="Section Name" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="shortCode" label="Short Code" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="academic_year" label="Academic Year" rules={[{required:true}]}><Select placeholder="Select year" style={inp}>{generateAcademicYears().map(y=><Option key={y} value={y}>{y}</Option>)}</Select></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>navigate("/section")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={saving} onMouseEnter={e=>e.currentTarget.style.background=COLOR.green} onMouseLeave={e=>e.currentTarget.style.background=COLOR.greenLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.greenLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(34,197,94,0.25)",transition:"all 0.18s"}}>{saving?"Saving...":"Update Section"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default EditSection;
