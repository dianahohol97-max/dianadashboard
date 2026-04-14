'use client'
import{useState,useEffect,useCallback}from 'react'
const G='#C9A84C',D1='#0A0A0A',D2='#141414',D3='#1C1C1C',D4='#242424',MU='#666'
const COLORS=['#4C7BC9','#C94C6E','#4CC98A','#C97A4C','#9B4CC9','#4CC9C9','#C9A84C','#C94C4C','#7BC94C']
const MKEYS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const MLABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function pct(tasks){if(!tasks||!tasks.length)return 0;return Math.round(tasks.filter(t=>t.done).length/tasks.length*100)}
function fmtDate(ds){if(!ds)return'';const d=new Date(ds);return d.getDate()+' '+MLABELS[d.getMonth()]}
function daysLeft(ds){if(!ds)return null;return Math.ceil((new Date(ds)-new Date())/86400000)}
function dlColor(d){if(d===null)return MU;if(d<0)return'#C94C4C';if(d<=7)return'#C97A4C';return'#4CC98A'}
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
    try{
      const r=await fetch('/api/projects')
      const d=await r.json()
      setProjects(Array.isArray(d)?d:[])
    }catch(e){console.error(e)}
    setLoading(false)
  },[])
  useEffect(()=>{load()},[load])
  const allTasks=projects.flatMap(p=>p.tasks||[])
  const totalDone=allTasks.filter(t=>t.done).length
  const op=allTasks.length?Math.round(totalDone/allTasks.length*100):0
  let totIncome=0,totExpense=0
  projects.forEach(p=>{
    const f=p.finance||{}
    MKEYS.forEach(m=>{totIncome+=parseFloat(f[m+'_i'])||0;totExpense+=parseFloat(f[m+'_e'])||0})
  })
  const profit=totIncome-totExpense
  async function toggleTask(tid,pid,done){
    await fetch('/api/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:tid,done:!done})})
    setProjects(prev=>prev.map(p=>p.id===pid?{...p,tasks:p.tasks.map(t=>t.id===tid?{...t,done:!done}:t)}:p))
  }
  async function addTask(pid){
    const title=(newTask[pid]||'').trim()
    if(!title)return
    const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:pid,title,sort_order:999})})
    const t=await r.json()
    setProjects(prev=>prev.map(p=>p.id===pid?{...p,tasks:[...(p.tasks||[]),t]}:p))
    setNewTask(prev=>({...prev,[pid]:''}))
  }
  async function deleteTask(tid,pid){
    await fetch('/api/tasks?id='+tid,{method:'DELETE'})
    setProjects(prev=>prev.map(p=>p.id===pid?{...p,tasks:p.tasks.filter(t=>t.id!==tid)}:p))
  }
  async function addProject(){
    if(!newProj.name.trim())return
    const r=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...newProj,color:selColor,sort_order:999})})
    const d=await r.json()
    setProjects(prev=>[...prev,{...d,tasks:[]}])
    setNewProj({name:'',desc:'',deadline:''})
    setShowAdd(false)
  }
  async function deleteProject(id){
    if(!confirm('Delete project?'))return
    await fetch('/api/projects?id='+id,{method:'DELETE'})
    setProjects(prev=>prev.filter(p=>p.id!==id))
  }
  async function updateFin(pid,key,val){
    const p=projects.find(x=>x.id===pid)
    if(!p)return
    const finance={...(p.finance||{}),[key]:parseFloat(val)||0}
    await fetch('/api/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pid,finance})})
    setProjects(prev=>prev.map(x=>x.id===pid?{...x,finance}:x))
  }
  async function getAiTasks(proj){
    setAiLoading(prev=>({...prev,[proj.id]:true}))
    const r=await fetch('/api/ai-tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_name:proj.name,project_description:proj.description||'',existing_tasks:proj.tasks||[]})})
    const d=await r.json()
    setAiSugs(prev=>({...prev,[proj.id]:d.tasks||[]}))
    setAiLoading(prev=>({...prev,[proj.id]:false}))
  }
  async function acceptAi(pid,task){
    const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:pid,title:task.title,note:task.note||null,ai_generated:true,sort_order:999})})
    const t=await r.json()
    setProjects(prev=>prev.map(p=>p.id===pid?{...p,tasks:[...(p.tasks||[]),t]}:p))
    setAiSugs(prev=>({...prev,[pid]:(prev[pid]||[]).filter(s=>s.title!==task.title)}))
  }
  if(loading)return React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:G,fontSize:18}},'Loading...')
  return(
    React.createElement('div',{style:{minHeight:'100vh',background:D1,paddingBottom:60}},
      React.createElement('div',{style:{position:'sticky',top:0,zIndex:50,background:D1,borderBottom:'1px solid #1a1a1a',padding:'14px 20px'}},
        React.createElement('div',{style:{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:14}},
          React.createElement('div',null,
            React.createElement('div',{style:{fontSize:17,fontWeight:700,color:G}},'Diana Dashboard'),
            React.createElement('div',{style:{fontSize:11,color:MU}},projects.length+' projects')
          ),
          React.createElement('div',{style:{flex:1,height:5,background:D3,borderRadius:3,overflow:'hidden'}},
            React.createElement('div',{style:{width:op+'%',height:'100%',background:op>70?'#4CC98A':op>40?G:'#C97A4C',borderRadius:3}})
          ),
          React.createElement('div',{style:{fontSize:22,fontWeight:700,color:op>70?'#4CC98A':op>40?G:'#C97A4C'}},op+'%'),
          React.createElement('button',{onClick:()=>setShowAdd(true),style:{background:'rgba(201,168,76,0.12)',border:'1px solid rgba(201,168,76,0.25)',color:G,borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:12,fontWeight:600}},'+  Project')
        )
      ),
      React.createElement('div',{style:{maxWidth:900,margin:'0 auto',padding:'18px 20px'}},
        React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}},
          [[op+'%','Progress'],[totalDone+'/'+allTasks.length,'Tasks'],[projects.filter(p=>pct(p.tasks)===100).length+'/'+projects.length,'Done'],['$'+totIncome,'Income'],['$'+totExpense,'Expenses'],[(profit>=0?'$':'-$')+Math.abs(profit),'Profit']].map(([v,l],i)=>
            React.createElement('div',{key:i,style:{background:D2,borderRadius:10,padding:'14px',textAlign:'center'}},
              React.createElement('div',{style:{fontSize:20,fontWeight:700,color:G,marginBottom:3}},v),
              React.createElement('div',{style:{fontSize:11,color:MU}},l)
            )
          )
        ),
        projects.map(p=>{
          const progress=pct(p.tasks)
          const days=daysLeft(p.deadline)
          const isOpen=!!expanded[p.id]
          const fin=p.finance||{}
          const pInc=MKEYS.reduce((s,k)=>s+(parseFloat(fin[k+'_i'])||0),0)
          const pExp=MKEYS.reduce((s,k)=>s+(parseFloat(fin[k+'_e'])||0),0)
          const sugs=aiSugs[p.id]||[]
          return React.createElement('div',{key:p.id,style:{background:D2,borderRadius:14,marginBottom:12,borderLeft:'4px solid '+p.color,border:'1px solid #1a1a1a',borderLeft:'4px solid '+p.color,overflow:'hidden'}},
            React.createElement('div',{style:{padding:'15px 18px',cursor:'pointer'},onClick:()=>setExpanded(prev=>({...prev,[p.id]:!prev[p.id]}))},
              React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12}},
                React.createElement('div',{style:{flex:1,minWidth:0}},
                  React.createElement('div',{style:{fontSize:15,fontWeight:500,marginBottom:4}},p.name),
                  React.createElement('div',{style:{display:'flex',gap:10,fontSize:11,color:MU,flexWrap:'wrap'}},
                    p.deadline&&React.createElement('span',{style:{color:dlColor(days)}},days<0?'OVERDUE':days+'d left'),
                    React.createElement('span',null,(p.tasks||[]).filter(t=>t.done).length+'/'+(p.tasks||[]).length+' tasks')
                  )
                ),
                React.createElement('div',{style:{fontSize:22,fontWeight:700,color:progress===100?'#4CC98A':progress>50?G:'#C97A4C',flexShrink:0}},progress+'%'),
                React.createElement('span',{style:{color:'#444',fontSize:12}},isOpen?'a':'v')
              ),
              React.createElement('div',{style:{height:3,background:D4,borderRadius:2,overflow:'hidden',marginTop:10}},
                React.createElement('div',{style:{width:progress+'%',height:'100%',background:p.color,borderRadius:2}})
              )
            ),
            isOpen&&React.createElement('div',{style:{borderTop:'1px solid #1a1a1a'}},
              React.createElement('div',{style:{padding:'12px 18px 8px'}},
                (p.tasks||[]).map(t=>
                  React.createElement('div',{key:t.id,style:{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid #111'}},
                    React.createElement('div',{onClick:()=>toggleTask(t.id,p.id,t.done),style:{width:20,height:20,borderRadius:6,border:t.done?'none':'2px solid '+p.color,background:t.done?p.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:11,fontWeight:800,color:'white',flexShrink:0,marginTop:1}},t.done?'v':''),
                    React.createElement('div',{style:{flex:1,cursor:'pointer'},onClick:()=>toggleTask(t.id,p.id,t.done)},
                      React.createElement('div',{style:{fontSize:13,color:t.done?MU:'#E8E8E0',textDecoration:t.done?'line-through':'none'}},t.title),
                      t.note&&React.createElement('div',{style:{fontSize:11,color:'#C97A4C',marginTop:2}},t.note)
                    ),
                    React.createElement('button',{onClick:()=>deleteTask(t.id,p.id),style:{background:'none',border:'none',color:'#333',cursor:'pointer',fontSize:16,padding:'0 3px'}},'x')
                  )
                ),
                React.createElement('div',{style:{display:'flex',gap:6,marginTop:10}},
                  React.createElement('input',{value:newTask[p.id]||'',onChange:e=>setNewTask(prev=>({...prev,[p.id]:e.target.value})),onKeyDown:e=>{if(e.key==='Enter')addTask(p.id)},placeholder:'Add task...',style:{flex:1,background:D3,border:'1px solid #2a2a2a',borderRadius:7,color:'#E8E8E0',fontSize:12,padding:'7px 10px',outline:'none'}}),
                  React.createElement('button',{onClick:()=>addTask(p.id),style:{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.2)',color:G,borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:600}},'Add')
                )
              ),
              sugs.length>0&&React.createElement('div',{style:{margin:'0 18px 12px',background:'rgba(76,201,138,0.04)',border:'1px solid rgba(76,201,138,0.15)',borderRadius:10,padding:'12px 14px'}},
                React.createElement('div',{style:{fontSize:11,color:'#4CC98A',fontWeight:600,marginBottom:8}},'Claude suggests:'),
                sugs.map((s,i)=>React.createElement('div',{key:i,onClick:()=>acceptAi(p.id,s),style:{display:'flex',gap:8,padding:'7px 10px',background:D2,borderRadius:8,marginBottom:5,cursor:'pointer'}},
                  React.createElement('span',{style:{color:'#4CC98A',fontSize:16}},' + '),
                  React.createElement('div',null,
                    React.createElement('div',{style:{fontSize:12,fontWeight:500}},s.title),
                    s.note&&React.createElement('div',{style:{fontSize:11,color:MU,marginTop:1}},s.note)
                  )
                ))
              ),
              React.createElement('div',{style:{margin:'0 18px 12px',background:D3,borderRadius:10,padding:'12px 14px'}},
                React.createElement('div',{style:{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:MU,marginBottom:10}},'Finance by month'),
                React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(88px,1fr))',gap:6,marginBottom:10}},
                  MKEYS.map((mk,i)=>React.createElement('div',{key:mk,style:{background:D4,borderRadius:7,padding:'8px'}},
                    React.createElement('div',{style:{fontSize:10,color:MU,marginBottom:4}},MLABELS[i]),
                    React.createElement('div',{style:{fontSize:9,color:'#4CC98A',marginBottom:2}},'Income $'),
                    React.createElement('input',{type:'number',min:'0',defaultValue:fin[mk+'_i']||'',placeholder:'0',onChange:e=>updateFin(p.id,mk+'_i',e.target.value),style:{width:'100%',background:D2,border:'1px solid #2a2a2a',borderRadius:5,color:'#E8E8E0',fontSize:11,padding:'3px 6px',outline:'none',marginBottom:4}}),
                    React.createElement('div',{style:{fontSize:9,color:'#C94C4C',marginBottom:2}},'Expense $'),
                    React.createElement('input',{type:'number',min:'0',defaultValue:fin[mk+'_e']||'',placeholder:'0',onChange:e=>updateFin(p.id,mk+'_e',e.target.value),style:{width:'100%',background:D2,border:'1px solid #2a2a2a',borderRadius:5,color:'#E8E8E0',fontSize:11,padding:'3px 6px',outline:'none'}})
                  ))
                ),
                React.createElement('div',{style:{display:'flex',gap:16,fontSize:12}},
                  React.createElement('span',null,'Income: ',React.createElement('b',{style:{color:'#4CC98A'}},'$'+pInc)),
                  React.createElement('span',null,'Expenses: ',React.createElement('b',{style:{color:'#C94C4C'}},'$'+pExp)),
                  React.createElement('span',null,'Profit: ',React.createElement('b',{style:{color:(pInc-pExp)>=0?G:'#C94C4C'}},(pInc-pExp)>=0?'$':'-$'+Math.abs(pInc-pExp)))
                )
              ),
              React.createElement('div',{style:{display:'flex',gap:8,padding:'10px 18px 14px',borderTop:'1px solid #111'}},
                React.createElement('button',{onClick:()=>getAiTasks(p),disabled:!!aiLoading[p.id],style:{background:'rgba(76,201,138,0.08)',border:'1px solid rgba(76,201,138,0.2)',color:'#4CC98A',borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:600}},aiLoading[p.id]?'Loading...':'Ask Claude for tasks'),
                React.createElement('button',{onClick:()=>deleteProject(p.id),style:{background:'none',border:'1px solid #2a2a2a',color:MU,borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:11,marginLeft:'auto'}},'Delete')
              )
            )
          )
        })
      ),
      showAdd&&React.createElement('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}},
        React.createElement('div',{style:{background:D2,border:'1px solid #2a2a2a',borderRadius:16,padding:24,width:'100%',maxWidth:440}},
          React.createElement('div',{style:{fontSize:16,fontWeight:600,marginBottom:18}},'New Project'),
          React.createElement('input',{value:newProj.name,onChange:e=>setNewProj(p=>({...p,name:e.target.value})),placeholder:'Name *',style:{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:14,padding:'10px 12px',outline:'none',marginBottom:10,fontFamily:'inherit',display:'block'}}),
          React.createElement('input',{value:newProj.desc,onChange:e=>setNewProj(p=>({...p,desc:e.target.value})),placeholder:'Description',style:{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:13,padding:'10px 12px',outline:'none',marginBottom:10,fontFamily:'inherit',display:'block'}}),
          React.createElement('input',{type:'date',value:newProj.deadline,onChange:e=>setNewProj(p=>({...p,deadline:e.target.value})),style:{width:'100%',background:D3,border:'1px solid #2a2a2a',borderRadius:8,color:'#E8E8E0',fontSize:13,padding:'10px 12px',outline:'none',marginBottom:14,fontFamily:'inherit',display:'block'}}),
          React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}},
            COLORS.map(c=>React.createElement('div',{key:c,onClick:()=>setSelColor(c),style:{width:26,height:26,borderRadius:7,background:c,cursor:'pointer',border:'3px solid '+(selColor===c?'white':'transparent')}}))
          ),
          React.createElement('div',{style:{display:'flex',gap:8}},
            React.createElement('button',{onClick:()=>setShowAdd(false),style:{flex:1,background:D3,border:'1px solid #2a2a2a',color:MU,borderRadius:8,padding:12,cursor:'pointer',fontSize:13,fontFamily:'inherit'}},'Cancel'),
            React.createElement('button',{onClick:addProject,style:{flex:1,background:G,border:'none',color:'#111',borderRadius:8,padding:12,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}},'Create')
          )
        )
      )
    )
  )
}
