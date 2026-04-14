'use client'
import { useState, useEffect, useCallback } from 'react'

const G='#C9A84C',D1='#0A0A0A',D2='#141414',D3='#1C1C1C',D4='#242424',MU='#666'
const COLORS=['#4C7BC9','#C94C6E','#4CC98A','#C97A4C','#9B4CC9','#4CC9C9','#C9A84C','#C94C4C','#7BC94C']
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MKEYS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

function pct(tasks){if(!tasks||!tasks.length)return 0;return Math.round(tasks.filter(t=>t.done).length/tasks.length*100)}
function fmtDate(ds){if(!ds)return'';const d=new Date(ds);return d.getDate()+' '+MON[d.getMonth()]}
function daysLeft(ds){if(!ds)return null;return Math.ceil((new Date(ds)-new Date())/86400000)}
function dlColor(d,done){if(done)return MU;if(d===null)return MU;if(d<0)return'#C94C4C';if(d<=7)return'#C97A4C';return'#4CC98A'}

export default function Dashboard(){
  const[projects,setProjects]=useState([])
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState({})
  const[showAdd,setShowAdd]=useState(false)
  const[selColor,setSelColor]=useState(COLORS[0])
  const[newProj,setNewProj]=useState({name:'',desc:'',deadline:''})
  const[newTask,setNewTask]=useState({})
  const[aiLoading,setAiLoading]=useState({})
  const[aiSugs,setAiSugs]=useState({})

  const load=useCallback(async()=>{
    const r=await fetch('/api/projects')
    const d=await r.json()
    setProjects(Array.isArray(d)?d:[])
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const allTasks=projects.flatMap(p=>p.tasks||[])
  const totalDone=allTasks.filter(t=>t.done).length
  const op=allTasks.length?Math.round(totalDone/allTasks.length*100):0

  // Finance totals
  let totIncome=0,totExpense=0
  projects.forEach(p=>{
    const f=p.finance||{}
    MKEYS.forEach(m=>{totIncome+=parseFloat(f[m+'_i'])||0;totExpense+=parseFloat(f[m+'_e'])||0})
  })
  const profit=totIncome-totExpense

  async function toggleTask(taskId,projId,done){
    await fetch('/api/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:taskId,done:!done})})
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,tasks:p.tasks.map(t=>t.id===taskId?{...t,done:!done}:t)}:p))
  }

  async function addTask(projId){
    const title=(newTask[projId]||'').trim()
    if(!title)return
    const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:projId,title,sort_order:999})})
    const t=await r.json()
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,tasks:[...(p.tasks||[]),{...t,dashboard_subtasks:[]}]}:p))
    setNewTask(prev=>({...prev,[projId]:''}))
  }

  async function deleteTask(taskId,projId){
    await fetch('/api/tasks?id='+taskId,{method:'DELETE'})
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,tasks:p.tasks.filter(t=>t.id!==taskId)}:p))
  }

  async function addProject(){
    if(!newProj.name.trim())return
    const r=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...newProj,color:selColor,sort_order:999})})
    const d=await r.json()
    setProjects(prev=>[...prev,{...d,tasks:[]}])
    setNewProj({name:'',desc:'',deadline:''})
    setShowAdd(false)
    setExpanded(prev=>({...prev,[d.id]:true}))
  }

  async function deleteProject(id){
    if(!confirm('Delete project and all tasks?'))return
    await fetch('/api/projects?id='+id,{method:'DELETE'})
    setProjects(prev=>prev.filter(p=>p.id!==id))
  }

  async function updateFin(projId,key,val){
    const p=projects.find(x=>x.id===projId)
    if(!p)return
    const finance={...(p.finance||{}),[key]:parseFloat(val)||0}
    await fetch('/api/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:projId,finance})})
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,finance}:x))
  }

  async function generateAi(proj){
    setAiLoading(prev=>({...prev,[proj.id]:true}))
    const r=await fetch('/api/ai-tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_name:proj.name,project_description:proj.description||'',existing_tasks:proj.tasks||[]})})
    const d=await r.json()
    setAiSugs(prev=>({...prev,[proj.id]:d.tasks||[]}))
    setAiLoading(prev=>({...prev,[proj.id]:false}))
  }

  async function acceptAi(projId,task){
    const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:projId,title:task.title,note:task.note||null,hours_planned:task.hours_planned||null,ai_generated:true,sort_order:999})})
    const t=await r.json()
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,tasks:[...(p.tasks||[]),{...t,dashboard_subtasks:[]}]}:p))
    setAiSugs(prev=>({...prev,[projId]:(prev[projId]||[]).filter(s=>s.title!==task.title)}))
  }

  if(loading)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:G}}>Loading...</div>

  return(
    <div style={{minHeight:'100vh',background:D1,paddingBottom:60}}>
      {/* HEADER */}
      <div style={{position:'sticky',top:0,zIndex:50,background:D1,borderBottom:'1px solid #1a1a1a',padding:'14px 20px 12px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:14}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:G}}>Diana Dashboard</div>
            <div style={{fontSize:11,color:MU,marginTop:1}}>{projects.length} projects</div>
          </div>
          <div style={{flex:1,height:5,background:D3,borderRadius:3,overflow:'hidden'}}>
            <div style={{width:op+'%',height:'100%',background:op>70?'#4CC98A':op>40?G:'#C97A4C',borderRadius:3,transition:'width .5s ease'}}/>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:op>70?'#4CC98A':op>40?G:'#C97A4C'}}>{op}%</div>
          <button onClick={()=>setShowAdd(true)} style={{background:'rgba(201,168,76,0.12)',border:'1px solid rgba(201,168,76,0.25)',color:G,borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:12,fontWeight:600}}>+ Project</button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'18px 20px'}}>
        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
          {[[op+'%','Progress'],[totalDone+'/'+allTasks.length,'Tasks'],[projects.filter(p=>pct(p.tasks)===100).length+'/'+projects.length,'Completed'],['$'+totIncome.toLocaleString(),'Income'],['$'+totExpense.toLocaleString(),'Expenses'],[(profit>=0?'$':'-$')+Math.abs(profit).toLocaleString(),'Profit']].map(([v,l],i)=>(
            <div key={i} style={{background:D2,borderRadius:10,padding:'14px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:700,color:G,marginBottom:3}}>{v}</div>
              <div style={{fontSize:11,color:MU}}>{l}</div>
            </div>
          ))}
        </div>

        {/* PROJECTS */}
        {projects.map(p=>{
          const progress=pct(p.tasks)
          const days=daysLeft(p.deadline)
          const isOpen=!!expanded[p.id]
          const sugs=aiSugs[p.id]||[]
          const fin=p.finance||{}
          const pIncome=MKEYS.reduce((s,k)=>s+(parseFloat(fin[k+'_i'])||0),0)
          const pExpense=MKEYS.reduce((s,k)=>s+(parseFloat(fin[k+'_e'])||0),0)

          return(
            <div key={p.id} style={{background:D2,borderRadius:14,marginBottom:12,borderLeft:'4px solid '+p.color,border:'1px solid #1a1a1a',borderLeft:'4px solid '+p.color,overflow:'hidden'}}>
              <div style={{padding:'15px 18px',cursor:'pointer'}} onClick={()=>setExpanded(prev=>({...prev,[p.id]:!prev[p.id]}))}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>{p.name}</div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',fontSize:11,color:MU}}>
                      {p.deadline&&<span style={{color:dlColor(days,progress===100)}}>{days<0?'OVERDUE':days+'d left'} · {fmtDate(p.deadline)}</span>}
                      <span>{(p.tasks||[]).filter(t=>t.done).length}/{(p.tasks||[]).length} tasks</span>
                      {p.desc&&<span>{p.desc}</span>}
                    </div>
                  </div>
                  <div style={{fontSize:22,fontWeight:700,color:progress===100?'#4CC98A':progress>50?G:'#C97A4C',flexShrink:0}}>{progress}%</div>
                  <span style={{color:'#333',fontSize:12}}>{isOpen?'▲':'▼'}</span>
                </div>
                <div style={{height:3,background:D4,borderRadius:2,overflow:'hidden',marginTop:10}}>
                  <div style={{width:progress+'%',height:'100%',background:p.color,borderRadius:2,opacity:.8}}/>
                </div>
              </div>

              {isOpen&&(
                <div style={{borderTop:'1px solid #1a1a1a'}}>
                  {/* TASKS */}
                  <div style={{padding:'12px 18px 8px'}}>
                    {(p.tasks||[]).map(t=>(
                      <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid #111'}}>
                        <div onClick={()=>toggleTask(t.id,p.id,t.done)} style={{width:20,height:20,borderRadius:6,border:t.done?'none':'2px solid '+p.color,background:t.done?p.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:11,fontWeight:800,color:'white',flexShrink:0,marginTop:1}}>
                          {t.done?'v':''}
                        </div>
                        <div style={{flex:1,cursor:'pointer'}} onClick={()=>toggleTask(t.id,p.id,t.done)}>
                          <div style={{fontSize:13,color:t.done?MU:'#E8E8E0',textDecoration:t.done?'line-through':'none'}}>
                            {t.ai_generated&&!t.done&&<span style={{fontSize:9,background:'rgba(201,168,76,0.15)',color:G,padding:'1px 5px',borderRadius:4,marginRight:5}}>AI</span>}
                            {t.title}
                          </div>
                          {t.note&&<div style={{fontSize:11,color:'#C97A4C',marginTop:2}}>{t.note}</div>}
                        </div>
                        <button onClick={()=>deleteTask(t.id,p.id)} style={{background:'none',border:'none',color:'#2a2a2a',cursor:'pointer',fontSize:14,padding:'0 3px'}}>x</button>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:6,marginTop:10}}>
                      <input value={newTask[p.id]||''} onChange={e=>setNewTask(prev=>({...prev,[p.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')addTask(p.id)}}
                        placeholder="Add task..." style={{flex:1,background:D3,border:'1px solid #2a2a2a',borderRadius:7,color:'#E8E8E0',fontSize:12,padding:'7px 10px',outline:'none'}}/>
                      <button onClick={()=>addTask(p.id)} style={{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.2)',color:G,borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:600}}>Add</button>
                    </div>
                  </div>

                  {/* AI SUGGESTIONS */}
                  {sugs.length>0&&(
                    <div style={{margin:'0 18px 12px',background:'rgba(76,201,138,0.04)',border:'1px solid rgba(76,201,138,0.15)',borderRadius:10,padding:'12px 14px'}}>
                      <div style={{fontSize:11,color:'#4CC98A',fontWeight:600,marginBottom:8}}>Claude suggests:</div>
                      {sugs.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'7px 10px',background:D2,borderRadius:8,marginBottom:5,cursor:'pointer'}} onClick={()=>acceptAi(p.id,s)}>
                          <span style={{color:'#4CC98A',fontSize:16,flexShrink:0}}>+</span>
                          <div>
                            <div style={{fontSize:12,fontWeight:500}}>{s.title}</div>
                            {s.note&&<div style={{fontSize:11,color:MU,marginTop:1}}>{s.note}</div>}
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>setAiSugs(prev=>({...prev,[p.id]:[]}))} style={{background:'none',border:'none',color:MU,fontSize:11,cursor:'pointer',marginTop:4}}>Dismiss</button>
                    </div>
                  )}

                  {/* FINANCE */}
                  <div style={{margin:'0 18px 12px',background:D3,borderRadius:10,padding:'12px 14px'}}>
                    <div style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:MU,marginBottom:10}}>Finance by month</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))',gap:6,marginBottom:10}}>
                      {['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>{
                        const mk=MKEYS[i+3]
                        return(
                          <div key={m} style={{background:D4,borderRadius:7,padding:'8px'}}>
                            <div style={{fontSize:10,color:MU,marginBottom:4}}>{m}</div>
                            <div style={{fontSize:9,color:'#4CC98A',marginBottom:2}}>Income $</div>
                            <input type="number" min="0" defaultValue={fin[mk+'_i']||''} placeholder="0"
                              onChange={e=>updateFin(p.id,mk+'_i',e.target.value)}
                              style={{width:'100%',background:D2,border:'1px solid #2a2a2a',borderRadius:5,color:'#E8E8E0',fontSize:11,padding:'3px 6px',outline:'none',marginBottom:4}}/>
                            <div style={{fontSize:9,color:'#C94C4C',marginBottom:2}}>Expense $</div>
                            <input type="number" min="0" defaultValue={fin[mk+'_e']||''} placeholder="0"
                              onChange={e=>updateFin(p.id,mk+'_e',e.target.value)}
                              style={{width:'100%',background:D2,border:'1px solid #2a2a2a',borderRadius:5,color:'#E8E8E0',fontSize:11,padding:'3px 6px',outline:'none'}}/>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{display:'flex',gap:16,fontSize:12}}>
                      <span>Income: <span style={{color:'#4CC98A',fontWeight:600}}>${pIncome.toLocaleString()}</span></span>
                      <span>Expenses: <span style={{color:'#C94C4C',fontWeight:600}}>${pExpense.toLocaleString()}</span></span>
                      <span>Profit: <span style={{color:(pIncome-pExpense)>=0?G:'#C94C4C',fontWeight:600}}>{(pIncome-pExpense)>=0?'$':'-$'}{Math.abs(pIncome-pExpense).toLocaleString()}</span></span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div style={{display:'flex',gap:8,padding:'10px 18px 14px',borderTop:'1px solid #111'}}>
                    <button onClick={()=>generateAi(p)} disabled={!!aiLoading[p.id]} style={{background:'rgba(76,201,138,0.08)',border:'1px solid rgba(76,201,138,0.2)',color:'#4CC98A',borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:600}}>
                      {aiLoading[p.id]?'Loading...':'Ask Claude for tasks'}
                    </button>
                    <button onClick={()=>deleteProject(p.id)} style={{background:'none',border:'1px solid #2a2a2a',color:MU,borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,marginLeft:'auto'}}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ADD PROJECT MODAL */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
          <div style={{background:D2,border:'1px solid #2a2a2a',borderRadius:16,padding:24,width:'100%',maxWidth:440}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:18}}>New Project</div>
            <input value={newProj.name} onChange={e=>setNewProj(p=>({...p,name:e.target.value}))} placeholder="Name *"
              style={{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:14,padding:'10px 12px',outline:'none',marginBottom:10,fontFamily:'inherit'}}/>
            <input value={newProj.desc} onChange={e=>setNewProj(p=>({...p,desc:e.target.value}))} placeholder="Description"
              style={{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:13,padding:'10px 12px',outline:'none',marginBottom:10,fontFamily:'inherit'}}/>
            <input type="date" value={newProj.deadline} onChange={e=>setNewProj(p=>({...p,deadline:e.target.value}))}
              style={{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:13,padding:'10px 12px',outline:'none',marginBottom:14}}/>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
              {COLORS.map(c=><div key={c} onClick={()=>setSelColor(c)} style={{width:26,height:26,borderRadius:7,background:c,cursor:'pointer',border:'3px solid '+(selColor===c?'white':'transparent')}}/>)}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,background:D3,border:'1px solid #2a2a2a',color:MU,borderRadius:8,padding:12,cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>Cancel</button>
              <button onClick={addProject} style={{flex:1,background:G,border:'none',color:'#111',borderRadius:8,padding:12,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                                                                               }
