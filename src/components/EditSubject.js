import React, { useState, useEffect } from "react";
import { Form, Input, Select, Spin, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", green:"#16a34a", greenLt:"#22c55e", warn:"#92400e", warnBg:"#fef3c7", warnBorder:"#fde68a" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const generateAcademicYears = () => { const y=new Date().getFullYear(); return Array.from({length:3},(_,i)=>`${y-2+i}-${y-1+i}`); };

const EditSubject = () => {
  const { id } = useParams(); const [form] = Form.useForm();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]); const [grades, setGrades] = useState([]);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const fetchGrades = async (schoolId, year) => {
    if (!schoolId||!year) return;
    try { const r=await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${schoolId}/${year}`); setGrades(r.data.grades||[]); } catch { setGrades([]); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [sr, subR] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`),
          axios.get(`${process.env.REACT_APP_API_URL}/subject/getAllSubjects`)
        ]);
        setSchools(sr.data.schools||[]);
        const sub = subR.data.subjects.find(x=>x.id===parseInt(id));
        if (sub) {
          form.setFieldsValue({school_id:sub.school_id,academic_year:sub.academic_year||undefined,grade_id:sub.grade_id,subjectName:sub.subjectName,shortCode:sub.shortCode});
          if (sub.school_id&&sub.academic_year) await fetchGrades(sub.school_id,sub.academic_year);
        } else api.error({message:"Subject not found",placement:"topRight"});
      } catch { api.error({message:"Failed to load subject",placement:"topRight"}); }
      finally { setLoading(false); }
    };
    init();
  }, [id]);

  const handleSchoolChange = () => { form.setFieldsValue({academic_year:undefined,grade_id:undefined}); setGrades([]); };
  const handleYearChange = (year) => { form.setFieldsValue({grade_id:undefined}); fetchGrades(form.getFieldValue("school_id"),year); };

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/subject/updateSubject/${id}`, values);
      api.success({message:"Subject Updated!",description:`"${values.subjectName}" updated.`,icon:<CheckCircleOutlined style={{color:"#52c41a"}}/>,placement:"topRight",duration:3});
      setTimeout(()=>navigate("/subject"),1500);
    } catch (err) {
      if (err.response?.status===409) api.warning({message:"Duplicate!",description:`"${values.subjectName}" already exists.`,icon:<ExclamationCircleOutlined style={{color:"#faad14"}}/>,placement:"topRight",duration:4});
      else api.error({message:"Failed to update subject",placement:"topRight"});
    } finally { setSaving(false); }
  };

  if (loading) return <Layout><div style={{textAlign:"center",padding:80}}><Spin size="large"/><p>Loading...</p></div></Layout>;
  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Edit Subject</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleUpdate} style={{fontFamily:FF}}>
            <Form.Item name="school_id" label="School" rules={[{required:true}]}><Select onChange={handleSchoolChange} style={inp}>{schools.map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item>
            <Form.Item name="academic_year" label="Academic Year" rules={[{required:true}]}><Select placeholder="Select year" onChange={handleYearChange} style={inp}>{generateAcademicYears().map(y=><Option key={y} value={y}>{y}</Option>)}</Select></Form.Item>
            <Form.Item name="grade_id" label="Grade" rules={[{required:true}]}><Select placeholder={grades.length===0?"Select school & year first":"Select grade"} disabled={grades.length===0} style={inp}>{grades.map(g=><Option key={g.id} value={g.id}>{g.grade}</Option>)}</Select></Form.Item>
            <Form.Item name="subjectName" label="Subject Name" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="shortCode" label="Short Code" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>navigate("/subject")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={saving} onMouseEnter={e=>e.currentTarget.style.background=COLOR.green} onMouseLeave={e=>e.currentTarget.style.background=COLOR.greenLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.greenLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(34,197,94,0.25)",transition:"all 0.18s"}}>{saving?"Saving...":"Update Subject"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default EditSubject;
