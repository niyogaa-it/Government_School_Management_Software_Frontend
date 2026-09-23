import React, { useState, useEffect } from "react";
import { Form, Input, Select, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", warn:"#92400e", warnBg:"#fef3c7", warnBorder:"#fde68a" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const generateAcademicYears = () => Array.from({length:2},(_,i)=>`${2025+i}-${2026+i}`);

const CreateSection = () => {
  const [form] = Form.useForm();
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesWarning, setGradesWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user?.roleName?.toLowerCase().replace(/\s+/g,"") === "superadmin";

  useEffect(() => {
    if (isSuperAdmin) axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`).then(r=>setSchools(r.data.schools||[])).catch(()=>{});
  }, []);

  const fetchGrades = async (schoolId, year) => {
    if (!schoolId || !year) return;
    setGradesLoading(true); setGrades([]); setGradesWarning(""); form.setFieldsValue({grade_id:undefined});
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${schoolId}/${year}`);
      const list = r.data.grades||[];
      if (list.length===0) setGradesWarning(`No grades created for this school with academic year ${year}.`);
      setGrades(list);
    } catch { setGradesWarning("Failed to fetch grades."); }
    finally { setGradesLoading(false); }
  };

  const handleSchoolChange = () => { form.setFieldsValue({academic_year:undefined,grade_id:undefined}); setGrades([]); setGradesWarning(""); };
  const handleYearChange = (year) => {
    const sid = isSuperAdmin ? form.getFieldValue("school_id") : user.school.id;
    if (!sid && isSuperAdmin) { api.warning({message:"Select a school first",placement:"topRight"}); form.setFieldsValue({academic_year:undefined}); return; }
    fetchGrades(sid, year);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const r = await axios.post(`${process.env.REACT_APP_API_URL}/section/createSection`, { ...values, school_id: isSuperAdmin?values.school_id:user.school.id, status:1 });
      if (r.status===201) { api.success({message:"Section Created!",description:`"${values.sectionName}" for ${values.academic_year} created.`,icon:<CheckCircleOutlined style={{color:"#52c41a"}}/>,placement:"topRight",duration:3}); form.resetFields(); setGrades([]); }
    } catch (err) {
      if (err.response?.status===409) api.warning({message:"Duplicate!",description:`"${values.sectionName}" already exists for this grade.`,icon:<ExclamationCircleOutlined style={{color:"#faad14"}}/>,placement:"topRight",duration:4});
      else api.error({message:"Failed to Create Section",placement:"topRight",duration:4});
    } finally { setLoading(false); }
  };

  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Create Section</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{fontFamily:FF}}>
            {isSuperAdmin ? (
              <Form.Item name="school_id" label="School" rules={[{required:true,message:"Select a school"}]}>
                <Select showSearch placeholder="Select school" onChange={handleSchoolChange} style={inp}>{schools.map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}</Select>
              </Form.Item>
            ) : (
              <Form.Item label="School"><Input value={user?.school?.name} disabled style={inp}/></Form.Item>
            )}
            <Form.Item name="academic_year" label="Academic Year" rules={[{required:true,message:"Select academic year"}]}>
              <Select placeholder="Select academic year" onChange={handleYearChange} style={inp}>{generateAcademicYears().map(y=><Option key={y} value={y}>{y}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="grade_id" label="Grade" rules={[{required:true,message:"Select a grade"}]}>
              {gradesWarning ? (
                <div style={{background:COLOR.warnBg,border:`1px solid ${COLOR.warnBorder}`,borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,fontSize:"13px",color:COLOR.warn,fontWeight:500}}>
                  <span style={{fontSize:16}}>⚠️</span>{gradesWarning}
                </div>
              ) : (
                <Select placeholder={grades.length===0?"Select school & academic year first":"Select grade"} disabled={grades.length===0||gradesLoading} loading={gradesLoading} style={inp}>
                  {grades.map(g=><Option key={g.id} value={g.id}>{g.grade}</Option>)}
                </Select>
              )}
            </Form.Item>
            <Form.Item name="sectionName" label="Section Name" rules={[{required:true,message:"Enter section name"}]}><Input placeholder="Enter section name" style={inp}/></Form.Item>
            <Form.Item name="shortCode" label="Short Code" rules={[{required:true,message:"Enter short code"}]}><Input placeholder="Enter short code" style={inp}/></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>navigate("/section")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={loading} onMouseEnter={e=>e.currentTarget.style.background=COLOR.blue} onMouseLeave={e=>e.currentTarget.style.background=COLOR.blueLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.blueLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(59,130,246,0.28)",transition:"all 0.18s"}}>{loading?"Creating...":"Create Section"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default CreateSection;
