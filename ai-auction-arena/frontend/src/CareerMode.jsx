import React, { useMemo, useState } from 'react';
import { Play, Trophy, Award, RotateCcw, ArrowLeftRight, Clock, Check, X, Handshake } from 'lucide-react';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function hashSeed(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const SPECIALIST_BOWLERS=new Set([
 'jasprit bumrah','bhuvneshwar kumar','jofra archer','kagiso rabada','mohammed siraj','mohammad siraj','rashid khan','yuzvendra chahal','yuzvendra chahal',
 'arshdeep singh','trent boult','josh hazlewood','mitchell starc','kuldeep yadav','varun chakravarthy','varun chakaravarthy','noor ahmad','praveen dubey','ravi bishnoi','ravi ashwin','ravichandran ashwin','mohammed shami','mohammad shami',
 'pat cummins','harshal patel','harshit rana','mohit sharma','mukesh kumar','mukesh choudhary','deepak chahar','t natarajan','khaleel ahmed','avesh khan','prasidh krishna','ishant sharma','sandeep sharma','tushar deshpande','shardul thakur','umran malik','vaibhav arora','mustafizur rahman','matheesha pathirana','karthik tyagi','kartik tyagi','aksh deep','akash deep','nathan ellis','noor ahmad','maheesh theekshana','wanindu hasaranga','sai kishore','r sai kishore','kuldeep sen','nandre burger','lockie ferguson','xavier bartlett','ben dwarshuis','marco jansen','josh hazlewood','jofra archer','mitchell santner','adam milne','anrich nortje','matt henry','dushmantha chameera','kyle jamieson','lungi ngidi','jacob duffy','nuwan thushara','yash dayal','suyash sharma','rasikh dar','rasikh salam dar','suyash sharma','sushant mishra','kwena maphaka','yash thakur','harpreet brar','vyshak vijaykumar','mohsin khan','mayank yadav','digvesh rathi','prince yadav','manimaran siddharth','aksh singh','mohammed shami','mohit sharma','jaydev unadkat','zeeshan ansari','eshan malinga','harsh dubey','brydon carse','sakib hussain','shivam mavi','onkar tarmale','praful hinge','krains fuletra','amit kumar','gurnoor singh brar','ashwani kumar','mayank markande','raghu sharma','allah ghazanfar','allah mohammad ghazanfar','shreyas gopal','anshul kamboj','gurjapneet singh','ramakrishna ghosh','mukesh choudhary','ak eal hosein','akeal hosein','rahul chahar','shreyas gopal','jayant yadav','manav suthar','ashok sharma','prithvi raj yarra','arshad khan','luke wood','prashant solanki','mustafizur rahman','kartik tyagi','naman tiwari','shahbaz ahmed','swapnil singh','vicky ostwal','jacob duffy','abhinandan singh','mangesh yadav','yudhvir singh charak','vignesh puthur','brijesh sharma','kulwant khejroliya','ravi bishnoi','harshal patel','pat cummins','harshit rana','vaibhav arora','varun chakravarthy','anukul roy','sunil narine','rachin ravindra','cameron green','hardik pandya','axar patel','ravindra jadeja','krunal pandya','romario shepherd','shardul thakur','corbin bosch','will jacks','atharva ankolekar','raj angad bawa','mitchell santner','washington sundar','rahul tewatia','jason holder','azmatullah omarzai','sam curran','marcus stoinis','cooper connolly','shivam dube','prashant veer','zak foulkes','jamie overton','matthew short','ramakrishna ghosh','liam livingstone','abhishek sharma','nitish kumar reddy','kamindu mendis','jack edwards','glenn phillips'
]);
const KNOWN_KEEPERS=new Set(['dhruv jurel','anuj rawat','sanju samson','jos buttler','rishabh pant','kl rahul','ishan kishan','jitesh sharma','phil salt','quinton de kock','rahmanullah gurbaz','ryan rickelton','robin minz','kumar kushagra','donovan ferreira','vishnu vinod','josh inglis','jonny bairstow','henrich klaasen','ms dhoni','tom banton','finn allen','tim seifert','salil arora','mukul choudhary','jordan cox','kartik sharma','urvil patel','ben duckett','lhuan dre pretorius']);
function roleOf(p){const r=String(p.role||'').toLowerCase().replace(/[_-]+/g,' ');const n=String(p.name||'').trim().toLowerCase();if(KNOWN_KEEPERS.has(n)||/wicket.?keeper|keeper/.test(r))return 'wk';if(/all.?round/.test(r))return 'ar';if(/spin|leg.?break|off.?break/.test(r))return 'spin';if(/bowl|pace|fast|medium|seam/.test(r))return 'bowl';if(/batter|batsman|batting/.test(r))return 'bat';return 'flex';}
function isBowler(p){const n=String(p.name||'').trim().toLowerCase();if(KNOWN_KEEPERS.has(n)||/wicket.?keeper|keeper/i.test(String(p.role||'')))return false;return SPECIALIST_BOWLERS.has(n)||['bowl','spin','ar'].includes(roleOf(p));}
function playerQuality(p){const price=Number(p.sold_price||p.base_price||0.3);const known=Number(p.rating||p.overall||0);return clamp((known?known/100:0.52+Math.log1p(price)/9),0.35,1.15);}
function teamStrength(team){const squad=team.squad||[];if(!squad.length)return 0.35;const bat=squad.filter(p=>['bat','wk','ar'].includes(roleOf(p))).map(playerQuality);const bowl=squad.filter(p=>['bowl','spin','ar'].includes(roleOf(p))).map(playerQuality);const all=squad.map(playerQuality);const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0.35;return clamp(avg(all)*0.55+avg(bat)*0.23+avg(bowl)*0.22,0.35,1.15);}
function makeFixtures(teams,seed){const a=teams.filter((_,i)=>i%2===0),b=teams.filter((_,i)=>i%2===1);const A=teams.slice(0,5),B=teams.slice(5,10);const pairs=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){pairs.push([A[i],A[j]],[A[i],A[j]],[B[i],B[j]],[B[i],B[j]]);}for(let i=0;i<5;i++)for(let j=0;j<5;j++)pairs.push([A[i],B[j]]);const extra=[0,1,2,3,4].map(i=>[A[i],B[(i+2)%5]]);pairs.push(...extra);const random=rng(seed);return pairs.map((pair,i)=>({id:i+1,home:pair[0].code,away:pair[1].code,round:i+1,order:random()})).sort((x,y)=>x.order-y.order).map(({order,...m},i)=>({...m,id:i+1}));}
function makeInnings(team,opponent,seed,matchNo,innings){
 const random=rng(seed+matchNo*97+innings*7919);
 const squad=(team.squad||[]).filter(p=>p&&p.name);
 const batters=squad;
 const bowlers=(opponent.squad||[]).filter(isBowler);
 const batPower=batters.length?batters.reduce((n,p)=>n+playerQuality(p),0)/batters.length:0.55;
 const bowlPower=bowlers.length?bowlers.reduce((n,p)=>n+playerQuality(p),0)/bowlers.length:0.55;
 const strength=teamStrength(team);
 const total=clamp(Math.round(158+(batPower-0.65)*55-(bowlPower-0.65)*32+(strength-0.7)*25+(random()-0.5)*54),105,218);
 const wickets=clamp(Math.round(6.1+(bowlPower-batPower)*2+random()*2.4),3,10);
 const contributions=[];
 const ordered=[...batters].sort((x,y)=>playerQuality(y)-playerQuality(x)).slice(0,7);
 ordered.forEach((p,i)=>{const share=i===0?0.23:i===1?0.18:i===2?0.15:0.44/Math.max(1,ordered.length-3);const runs=Math.max(0,Math.round(total*share*(0.78+random()*0.42)));contributions.push({name:p.name,team:team.code,runs,balls:Math.max(1,Math.round(runs/(1.15+random()*0.65))),fours:Math.round(runs/21),sixes:Math.round(runs/55),notOut:random()>0.55});});
 const sum=contributions.reduce((n,p)=>n+p.runs,0);if(contributions.length)contributions[0].runs=Math.max(0,contributions[0].runs+(total-sum));
 const bowlStats=[];const chosen=[...bowlers].sort((x,y)=>playerQuality(y)-playerQuality(x)).slice(0,5);
 const wicketsByBowler=chosen.map(()=>0);
 for(let w=0;w<wickets;w++){if(!chosen.length)break;const eligible=chosen.map((p,i)=>({p,i})).filter(x=>wicketsByBowler[x.i]<2);if(!eligible.length)break;const weights=eligible.map(x=>Math.max(0.2,playerQuality(x.p))*(roleOf(x.p)==='ar'?0.82:1));let roll=random()*weights.reduce((a,b)=>a+b,0);let pick=eligible[0];for(let i=0;i<eligible.length;i++){roll-=weights[i];if(roll<=0){pick=eligible[i];break;}}wicketsByBowler[pick.i]++;}
 chosen.forEach((p,i)=>{bowlStats.push({name:p.name,team:opponent.code,wickets:wicketsByBowler[i],runsConceded:Math.round(total*(0.13+random()*0.055)),overs:Math.min(4,Math.max(2,4))});});
 return {runs:total,wickets,overs:20,batting:contributions,bowling:bowlStats};
}
function playMatch(home,away,seed,number){const a=makeInnings(home,away,seed,number,1),b=makeInnings(away,home,seed,number,2);const homePower=teamStrength(home),awayPower=teamStrength(away);const toss=rng(seed+number*12345)();let winner;if(a.runs===b.runs)winner=toss>0.5?home:away;else winner=a.runs>b.runs?home:away;const margin=winner.code===home.code?Math.abs(a.runs-b.runs):Math.abs(a.runs-b.runs);return {id:number,home:home.code,away:away.code,homeScore:a,awayScore:b,winner:winner.code,margin:Math.max(1,margin),potm:[...a.batting,...b.batting].sort((x,y)=>y.runs-x.runs)[0]?.name||'',strengths:{[home.code]:homePower,[away.code]:awayPower}};}
export function simulateIplSeason(game){const teams=game.teams.map(t=>({...t,squad:[...(t.squad||[])]}));if(teams.length!==10)throw new Error('The IPL season requires all 10 franchises.');if(teams.some(t=>(t.squad||[]).length<11))throw new Error('Every franchise needs at least 11 players before the season can begin.');const seed=hashSeed(String(game.id)+'-'+String(game.season||2026));const fixtures=makeFixtures(teams,seed);const table=Object.fromEntries(teams.map(t=>[t.code,{team:t.code,name:t.name,played:0,won:0,lost:0,tied:0,points:0,runsFor:0,oversFor:0,runsAgainst:0,oversAgainst:0,nrr:0}]));const players={};teams.forEach(t=>(t.squad||[]).forEach(p=>{players[t.code+'|'+p.name]={name:p.name,team:t.code,role:roleOf(p),canBowl:isBowler(p),runs:0,balls:0,fours:0,sixes:0,wickets:0,overs:0,runsConceded:0,matches:0};}));const matches=fixtures.map(f=>{const h=teams.find(t=>t.code===f.home),a=teams.find(t=>t.code===f.away);const m=playMatch(h,a,seed,f.id);const hs=table[h.code],as=table[a.code];hs.played++;as.played++;hs.runsFor+=m.homeScore.runs;hs.oversFor+=20;hs.runsAgainst+=m.awayScore.runs;hs.oversAgainst+=20;as.runsFor+=m.awayScore.runs;as.oversFor+=20;as.runsAgainst+=m.homeScore.runs;as.oversAgainst+=20;const win=table[m.winner];win.won++;win.points+=2;table[m.winner===h.code?a.code:h.code].lost++;for(const inn of [m.homeScore,m.awayScore]){inn.batting.forEach(x=>{const p=players[x.team+'|'+x.name];if(p){p.runs+=x.runs;p.balls+=x.balls;p.fours+=x.fours;p.sixes+=x.sixes;p.matches++;}});inn.bowling.forEach(x=>{const p=players[x.team+'|'+x.name];if(p){p.wickets+=x.wickets;p.overs+=x.overs;p.runsConceded+=x.runsConceded;p.matches++;}});}return m;});Object.values(table).forEach(t=>t.nrr=Number((t.runsFor/Math.max(1,t.oversFor)-t.runsAgainst/Math.max(1,t.oversAgainst)).toFixed(3)));const standings=Object.values(table).sort((a,b)=>b.points-a.points||b.nrr-a.nrr);const stats=Object.values(players);const orange=stats.filter(p=>p.balls>0).sort((a,b)=>b.runs-a.runs||b.sixes-a.sixes).slice(0,5);const purple=stats.filter(p=>p.canBowl&&p.overs>0).sort((a,b)=>b.wickets-a.wickets||a.runsConceded/Math.max(1,a.overs)-b.runsConceded/Math.max(1,b.overs)).slice(0,5);const topFour=standings.slice(0,4);const byCode=Object.fromEntries(teams.map(t=>[t.code,t]));const playoff=(id,label,one,two)=>{const m=playMatch(byCode[one],byCode[two],seed+9000,id);return {...m,label};};const q1=playoff(71,'Qualifier 1',topFour[0].team,topFour[1].team);const elim=playoff(72,'Eliminator',topFour[2].team,topFour[3].team);const q2=playoff(73,'Qualifier 2',q1.winner===q1.home?q1.away:q1.home,elim.winner);const final=playoff(74,'Final',q1.winner,q2.winner);const allMatches=[...matches,q1,elim,q2,final];const finalStats=stats;const mvp=finalStats.slice().sort((a,b)=>(b.runs+b.wickets*22)-(a.runs+a.wickets*22))[0];const bestSR=finalStats.filter(p=>p.balls>=40).sort((a,b)=>b.runs/Math.max(1,b.balls)-a.runs/Math.max(1,a.balls))[0];const bestEconomy=finalStats.filter(p=>p.overs>=10).sort((a,b)=>a.runsConceded/Math.max(1,a.overs)-b.runsConceded/Math.max(1,b.overs))[0];return {simVersion:2,season:Number(game.season||2026),generatedAt:new Date().toISOString(),teams:teams.map(t=>({code:t.code,name:t.name,squad:t.squad})),fixtures,matches,standings,playoffs:{qualifier1:q1,eliminator:elim,qualifier2:q2,final},champion:final.winner,awards:{orange,purple,mvp,bestSR,bestEconomy},playerStats:finalStats};}

function teamRoleNeeds(team){const sq=team?.squad||[];return {bat:sq.filter(p=>['bat','wk','ar','flex'].includes(roleOf(p))).length,bowl:sq.filter(isBowler).length,overseas:sq.filter(p=>Boolean(p.country)&&!['india','indian','unknown'].includes(String(p.country).toLowerCase())).length};}
function tradeValue(p){return playerQuality(p);}

function TradeWindow({game,career,onSave}){
 const userCode=game.humanTeam||game.teams.find(t=>t.control==='human')?.code||game.teams[0]?.code;
 const teams=career.teams.map(t=>({...t,squad:[...(t.squad||[])]}));
 const userTeam=teams.find(t=>t.code===userCode);
 const [target,setTarget]=useState(teams.find(t=>t.code!==userCode)?.code||'');
 const [give,setGive]=useState('');const [get,setGet]=useState('');const [cash,setCash]=useState('0');
 const [requestMode,setRequestMode]=useState('player');const [counterCash,setCounterCash]=useState('');const [counterPlayer,setCounterPlayer]=useState('');
 const [err,setErr]=useState('');
 const saved=game.tradeWindow||{status:'not_started',offers:[]};
 const endAt=saved.startedAt?new Date(saved.startedAt).getTime()+10*60000:0;
 const active=saved.status==='open'&&Date.now()<endAt;
 const secondsLeft=saved.startedAt?Math.max(0,Math.ceil((endAt-Date.now())/1000)):600;
 const teamName=code=>teams.find(t=>t.code===code)?.name||code;
 const save=(nextTeams,window)=>onSave({...game,teams:nextTeams,career:{...career,teams:nextTeams},tradeWindow:window});
 const findPlayer=(team,id)=>team?.squad?.find(p=>String(p.id||p.name)===String(id));
 const completed=(saved.offers||[]).filter(o=>o.status==='completed');
 const playerMovements=code=>completed.reduce((n,o)=>n+((o.from===code&&o.offeredPlayer)?1:0)+((o.to===code&&o.requestedPlayer)?1:0),0);
 const canMove=(code,count=1)=>playerMovements(code)+count<=3;
 const isCore=(team,p)=>{if(!team||!p)return false;const sorted=[...(team.squad||[])].sort((a,b)=>tradeValue(b)-tradeValue(a));return sorted.slice(0,5).some(x=>x.name===p.name);};
 const teamAccepts=(offer)=>{
  const from=teams.find(t=>t.code===offer.from),to=teams.find(t=>t.code===offer.to);
  if(!from||!to||Number(offer.cashCr||0)>Number(from.purse||0))return false;
  const offered=findPlayer(from,offer.offeredPlayer),requested=findPlayer(to,offer.requestedPlayer);
  if(offer.offeredPlayer&&!offered)return false;
  if(offer.requestedPlayer&&!requested)return false;
  if((offered||requested)&&(!canMove(from.code,offered?1:0)||!canMove(to.code,requested?1:0)))return false;
  if(requested&&isCore(to,requested)){
   if(!offered||tradeValue(offered)<tradeValue(requested)*0.9)return false;
  }
  if(offered&&isCore(from,offered)){
   if(!requested||tradeValue(requested)<tradeValue(offered)*0.9)return false;
  }
  const value=(offered?tradeValue(offered):0)+Number(offer.cashCr||0)/20;
  const wanted=requested?tradeValue(requested):0;
  const needs=teamRoleNeeds(from);
  const needBonus=offered&&((isBowler(offered)&&needs.bowl<5)||(!isBowler(offered)&&needs.bat<7))?0.12:0;
  return offer.cashOnly?Number(offer.cashCr||0)>=0.25:(value+needBonus>=wanted*0.88);
 };
 const playerAccepts=(player,destination)=>{
  if(!player)return true;
  const origin=teams.find(t=>t.squad.some(p=>p.name===player.name));
  if(!origin)return true;
  return teamStrength(destination)>=teamStrength(origin)-0.2||tradeValue(player)<0.72;
 };
 const execute=(offer)=>{
  const next=teams.map(t=>({...t,squad:[...(t.squad||[])]}));
  const from=next.find(t=>t.code===offer.from),to=next.find(t=>t.code===offer.to);
  const offered=findPlayer(from,offer.offeredPlayer),requested=findPlayer(to,offer.requestedPlayer);
  if(offered){from.squad=from.squad.filter(p=>p.name!==offered.name);to.squad.push({...offered,status:'Traded',tradedFrom:from.code});}
  if(requested){to.squad=to.squad.filter(p=>p.name!==requested.name);from.squad.push({...requested,status:'Traded',tradedFrom:to.code});}
  const amount=Number(offer.cashCr||0);
  from.purse=Number((Number(from.purse||0)-amount).toFixed(2));to.purse=Number((Number(to.purse||0)+amount).toFixed(2));
  return next;
 };
 const finishPlayerStage=(offer)=>{
  const from=teams.find(t=>t.code===offer.from),to=teams.find(t=>t.code===offer.to);
  const a=findPlayer(from,offer.offeredPlayer),b=findPlayer(to,offer.requestedPlayer);
  if(!playerAccepts(a,to)||!playerAccepts(b,from))return {status:'player_rejected',playerDecision:'rejected'};
  return {status:'completed',playerDecision:'accepted'};
 };
 const start=()=>save(teams,{status:'open',startedAt:new Date().toISOString(),offers:[]});
 const end=()=>save(teams,{...saved,status:'closed',closedAt:new Date().toISOString()});
 const submit=()=>{
  setErr('');if(!active)return setErr('The trading window is closed.');
  const other=teams.find(t=>t.code===target),offered=findPlayer(userTeam,give),requested=findPlayer(other,get),amount=Number(cash||0);
  if(!offered&&!amount)return setErr('Choose a player or enter a cash offer.');
  if(requestMode==='player'&&!requested)return setErr('Choose a player you want.');
  if(requestMode==='cash'&&requested)return setErr('Choose cash-only request mode.');
  if(amount<0||amount>Number(userTeam.purse||0))return setErr('Cash offer exceeds your available purse.');
  const offer={id:'trade-'+Date.now(),from:userCode,to:target,offeredPlayer:offered?(offered.id||offered.name):null,requestedPlayer:requestMode==='player'?(requested.id||requested.name):null,cashCr:amount,cashOnly:requestMode==='cash',summary:(offered?.name||'Cash only')+' + ₹'+amount.toFixed(2)+' Cr',stage:'team',status:'submitted',createdAt:new Date().toISOString()};
  if(!teamAccepts(offer)){save(teams,{...saved,offers:[...(saved.offers||[]),{...offer,status:'team_rejected',teamDecision:'rejected'}]});return;}
  const playerStage=finishPlayerStage(offer);
  const nextOffers=[...(saved.offers||[]),{...offer,status:playerStage.status,teamDecision:'accepted',...playerStage}];
  if(playerStage.status==='completed'){const next=execute(offer);save(next,{...saved,offers:nextOffers});}
  else save(teams,{...saved,offers:nextOffers});
  setGive('');setGet('');setCash('0');
 };
 const counter=(offer)=>{
  const from=teams.find(t=>t.code===offer.from),to=teams.find(t=>t.code===offer.to);
  const extra=Number(counterCash||0);const player=findPlayer(to,counterPlayer);
  if(extra<0||extra>Number(from.purse||0))return setErr('Counter cash exceeds the offering team purse.');
  const revised={...offer,id:offer.id+'-counter-'+Date.now(),cashCr:Number(offer.cashCr||0)+extra,requestedPlayer:player?(player.id||player.name):offer.requestedPlayer,counteredFrom:offer.id,summary:'Counter: '+(offer.offeredPlayer?findPlayer(from,offer.offeredPlayer)?.name:'Cash')+' + ₹'+(Number(offer.cashCr||0)+extra).toFixed(2)+' Cr'};
  if(!teamAccepts(revised)){save(teams,{...saved,offers:[...(saved.offers||[]),{...revised,status:'team_rejected',teamDecision:'rejected'}]});return;}
  const stage=finishPlayerStage(revised);
  const offers=[...(saved.offers||[]),{...offer,status:'countered',teamDecision:'countered'}, {...revised,status:stage.status,teamDecision:'accepted',...stage}];
  if(stage.status==='completed')save(execute(revised),{...saved,offers});else save(teams,{...saved,offers});
  setCounterCash('');setCounterPlayer('');setErr('');
 };
 const pending=(saved.offers||[]).filter(o=>o.to===userCode&&o.status==='submitted');
 const fmt=(team,key)=>findPlayer(team,key)?.name||'Cash only';
 const mins=Math.floor(secondsLeft/60),secs=secondsLeft%60;
 return <section className="panel" style={{padding:22,marginTop:18}}>
  <div className="eyebrow">POST-SEASON · FRANCHISE MANAGEMENT</div><h2><Handshake size={20}/> Trading window</h2>
  {saved.status==='not_started'?<><p>Trading lasts 10 minutes. Make player swaps, cash-only offers or cash-plus-player deals. Teams evaluate first; players decide only after their franchises accept.</p><button className="primary-btn" onClick={start}><Clock size={16}/> Start 10-minute trading window</button></>:<>
   <div className="metric"><Clock/><div><strong>{active?mins+':'+String(secs).padStart(2,'0')+' remaining':'Window closed'}</strong><span>Maximum 3 player movements per franchise · cash deals do not count</span></div></div>
   {active&&<button className="secondary-btn" onClick={end}>End trading window</button>}
   {pending.length>0&&<><h3>Offers awaiting your franchise decision</h3>{pending.map(o=><div className="squad-card" key={o.id}><b>{teamName(o.from)} offer</b><p>{fmt(teams.find(t=>t.code===o.from),o.offeredPlayer)} + ₹{Number(o.cashCr||0).toFixed(2)} Cr for {o.requestedPlayer?fmt(userTeam,o.requestedPlayer):'cash'}</p><button className="primary-btn" onClick={()=>{const revised={...o,to:userCode};const stage=finishPlayerStage(revised);const offers=saved.offers.map(x=>x.id===o.id?{...x,status:stage.status,teamDecision:'accepted',...stage}:x);if(stage.status==='completed')save(execute(revised),{...saved,offers});else save(teams,{...saved,offers});}}>Accept</button> <button className="secondary-btn" onClick={()=>save(teams,{...saved,offers:saved.offers.map(x=>x.id===o.id?{...x,status:'team_rejected',teamDecision:'rejected'}:x)})}>Reject</button></div>)}</>}
   {active&&<><h3>Make a trade offer</h3><div className="field-grid">
    <label className="field-label">Franchise<select value={target} onChange={e=>{setTarget(e.target.value);setGet('');}}>{teams.filter(t=>t.code!==userCode).map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</select></label>
    <label className="field-label">Your player<select value={give} onChange={e=>setGive(e.target.value)}><option value="">Cash only</option>{userTeam.squad.map(p=><option key={p.id||p.name} value={p.id||p.name}>{p.name}</option>)}</select></label>
    <label className="field-label">Deal type<select value={requestMode} onChange={e=>setRequestMode(e.target.value)}><option value="player">Request a player</option><option value="cash">Request cash only</option></select></label>
    {requestMode==='player'&&<label className="field-label">Player requested<select value={get} onChange={e=>setGet(e.target.value)}><option value="">Choose player</option>{(teams.find(t=>t.code===target)?.squad||[]).map(p=><option key={p.id||p.name} value={p.id||p.name}>{p.name}</option>)}</select></label>}
    <label className="field-label">Cash added by you (₹ Cr)<input type="number" min="0" step="0.05" max={userTeam.purse||0} value={cash} onChange={e=>setCash(e.target.value)}/><small>Available purse: ₹{Number(userTeam.purse||0).toFixed(2)} Cr</small></label>
   </div>{err&&<p className="error">{err}</p>}<button className="primary-btn" onClick={submit}>Submit offer</button></>}
   <h3>Trade history</h3>{(saved.offers||[]).map(o=><div className="squad-card" key={o.id}><b>{teamName(o.from)} → {teamName(o.to)}</b><p>{o.summary}</p><small>Status: {String(o.status).replaceAll('_',' ')} · {o.teamDecision||'pending team decision'} {o.playerDecision?'· Player '+o.playerDecision:''}</small></div>)}
  </>}
 </section>;
}

export default function CareerMode({game,onSave}){const career=game.career?.simVersion===2?game.career:null;const [busy,setBusy]=useState(false);const [err,setErr]=useState('');const [view,setView]=useState('overview');const canStart=game.status==='completed'&&game.teams?.length===10;const start=()=>{try{setBusy(true);setErr('');const result=simulateIplSeason(game);onSave({...game,career:{...result,status:'completed'}});setView('overview');}catch(e){setErr(e.message||'Unable to simulate season.');}finally{setBusy(false);}};if(!career)return <section className="panel" style={{padding:24}}><div className="eyebrow">IPL {game.season||2026} · CAREER MODE</div><h2>{game.career?'Updated season simulator ready':'Ready for the season?'}</h2><p>Your auction is complete. The simulator will use the final squads and team strengths created in this auction.</p><p><b>{game.teams.length} franchises</b> · {game.teams.reduce((n,t)=>n+(t.squad||[]).length,0)} total squad places filled · 70 league matches · 4 playoff matches</p>{!canStart&&<p className="error">Complete a 10-team auction before starting the IPL season.</p>}{err&&<p className="error">{err}</p>}<button className="primary-btn" disabled={!canStart||busy} onClick={start}><Play size={16}/>{busy?'Simulating…':'Simulate IPL '+(game.season||2026)+' season'}</button></section>;const fmt=n=>Number(n||0).toFixed(2);const teamName=code=>career.teams.find(t=>t.code===code)?.name||code;const matchCard=m=><div className="squad-card" key={m.id}><b>{m.label||('Match '+m.id)}</b><p>{teamName(m.home)} <strong>{m.homeScore.runs}/{m.homeScore.wickets}</strong> vs {teamName(m.away)} <strong>{m.awayScore.runs}/{m.awayScore.wickets}</strong></p><small>Winner: {teamName(m.winner)} · Player of the match: {m.potm||'—'}</small></div>;const awardRows=(rows,key)=>rows.map((p,i)=><tr key={p.team+'-'+p.name}><td>{i+1}</td><td>{p.name}</td><td>{teamName(p.team)}</td><td>{p[key]}</td></tr>);return <div className="career-layout"><section className="panel" style={{padding:22}}><div className="eyebrow">IPL {career.season} · SEASON COMPLETE</div><h2>{teamName(career.champion)} are champions!</h2><div className="tabs" style={{margin:'16px 0'}}>{[['overview','Overview'],['table','Points table'],['playoffs','Playoffs'],['awards','Awards'],['matches','League matches'],['trades','Trading window']].map(([k,l])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</div>{view==='overview'&&<><div className="metric"><Trophy/><div><strong>{teamName(career.champion)}</strong><span>IPL {career.season} champions</span></div></div><h3>Top four</h3>{career.standings.slice(0,4).map((t,i)=><div className="franchise-row" key={t.team}><b>{i+1}</b><div><b>{t.name}</b><small>{t.points} points · NRR {fmt(t.nrr)}</small></div></div>)}<h3>Final</h3>{matchCard(career.playoffs.final)}</>}{view==='table'&&<div className="table-wrap"><table><thead><tr><th>#</th><th>TEAM</th><th>PLD</th><th>W</th><th>L</th><th>PTS</th><th>NRR</th></tr></thead><tbody>{career.standings.map((t,i)=><tr key={t.team}><td>{i+1}</td><td>{t.name}</td><td>{t.played}</td><td>{t.won}</td><td>{t.lost}</td><td><b>{t.points}</b></td><td>{fmt(t.nrr)}</td></tr>)}</tbody></table></div>}{view==='playoffs'&&<div className="team-squad-grid">{[career.playoffs.qualifier1,career.playoffs.eliminator,career.playoffs.qualifier2,career.playoffs.final].map(matchCard)}</div>}{view==='awards'&&<><h3><Award size={17}/> Orange Cap · Top 5 run scorers</h3><div className="table-wrap"><table><thead><tr><th>#</th><th>PLAYER</th><th>TEAM</th><th>RUNS</th></tr></thead><tbody>{awardRows(career.awards.orange,'runs')}</tbody></table></div><h3><Award size={17}/> Purple Cap · Top 5 wicket takers</h3><div className="table-wrap"><table><thead><tr><th>#</th><th>PLAYER</th><th>TEAM</th><th>WICKETS</th></tr></thead><tbody>{awardRows(career.awards.purple,'wickets')}</tbody></table></div><div className="team-squad-grid">{[['Most Valuable Player',career.awards.mvp?.name],['Best Strike Rate',career.awards.bestSR?.name],['Best Economy',career.awards.bestEconomy?.name]].map(([l,n])=><div className="squad-card" key={l}><b>{l}</b><p>{n||'—'}</p></div>)}</div></>}{view==='matches'&&<div className="team-squad-grid">{career.matches.map(matchCard)}</div>}{view==='trades'&&<TradeWindow game={game} career={career} onSave={onSave}/>}<p className="muted small">This is a generated simulation, not actual historical IPL results. League stage uses a 70-match 10-team schedule; playoffs are simulated separately. Player awards are calculated from simulated match performances.</p><button className="secondary-btn" onClick={()=>{if(confirm('Re-simulate and replace this season result?')){onSave({...game,career:null});setView('overview');}}}><RotateCcw size={15}/> Reset season simulation</button></section></div>;}
