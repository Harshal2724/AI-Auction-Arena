import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bot, Gavel, Plus, RefreshCw, ShieldCheck, Users, Wallet, Trophy, Upload, Play, Pause, RotateCcw, Search, FileSpreadsheet, Sparkles, ChevronRight, X, Check, Clock3, Target, SlidersHorizontal } from 'lucide-react';
import { createRoom, getFranchises, getHealth, getRoom, listSavedGames, saveGameSnapshot, deleteGameSnapshot, importPlayerFile } from './services/api';

const FRANCHISES = [
  { short_name:'MI', name:'Mumbai Indians', color:'#1769aa' }, { short_name:'CSK', name:'Chennai Super Kings', color:'#f6c900' },
  { short_name:'RCB', name:'Royal Challengers Bengaluru', color:'#c62828' }, { short_name:'KKR', name:'Kolkata Knight Riders', color:'#673ab7' },
  { short_name:'SRH', name:'Sunrisers Hyderabad', color:'#f36c21' }, { short_name:'RR', name:'Rajasthan Royals', color:'#e91e8f' },
  { short_name:'PBKS', name:'Punjab Kings', color:'#d32f2f' }, { short_name:'DC', name:'Delhi Capitals', color:'#1565c0' },
  { short_name:'GT', name:'Gujarat Titans', color:'#174b70' }, { short_name:'LSG', name:'Lucknow Super Giants', color:'#00a6a6' }
];
const DEMO_PLAYERS = [
  ['Aarav Deshmukh','India','Batter','Right hand','—',0.50],['Dev Malhotra','India','Fast bowler','Right arm fast','—',0.75],['Ishan Verma','India','Wicketkeeper','Right hand','—',1.00],['Karan Gill','India','All-rounder','Right arm medium','—',1.50],['Rohan Nair','India','Leg-spinner','Right arm legbreak','—',0.50],['Zayan Khan','India','Fast bowler','Left arm fast','—',2.00],['Kabir Sethi','India','Batter','Left hand','—',0.30],['Arjun Rao','India','Off-spinner','Right arm offbreak','—',0.40],['Marcus Hale','Australia','Fast bowler','Right arm fast','—',2.00],['Liam Mercer','England','All-rounder','Right arm medium','—',1.50],['Noah Perera','Sri Lanka','Leg-spinner','Right arm legbreak','—',1.00],['Dilan Fernando','Sri Lanka','Batter','Right hand','—',0.50],['Samir Qureshi','India','Wicketkeeper','Left hand','—',0.40],['Vikram Pawar','India','Fast bowler','Right arm fast','—',0.30],['Tushar Kulkarni','India','All-rounder','Off spin','—',0.75],['Ben Carter','New Zealand','Batter','Right hand','—',1.00],['Ravi Bhandari','India','Pacer','Left arm medium','—',0.50],['Akhil Menon','India','Batter','Right hand','—',0.30],['Owen Clarke','South Africa','All-rounder','Right arm fast','—',1.50],['Nikhil Jadhav','India','Wrist spinner','Right arm legbreak','—',0.40]
].map((p,i)=>({id:`demo-${i+1}`,name:p[0],country:p[1],role:p[2],style:p[3],previous_team:p[4],base_price:p[5],status:'Available'}));
const DEFAULTS = { name:'Friday Night IPL Auction', auction_type:'mini', total_purse:120, max_squad_size:25, min_squad_size:18, max_overseas_players:8, bid_timer_seconds:20, automatic_auctioneer:true, allow_pause_resume:true, difficulty:'realistic', personality:'balanced' };
const money = n => `₹${Number(n || 0).toFixed(2)} Cr`;
const readStore = () => { try { return JSON.parse(localStorage.getItem('auction-arena-v1') || '[]'); } catch { return []; } };
const writeStore = games => localStorage.setItem('auction-arena-v1', JSON.stringify(games));

export default function App() {
  const [tab,setTab] = useState('setup');
  const [franchises,setFranchises] = useState(FRANCHISES);
  const [selected,setSelected] = useState(FRANCHISES.map(f=>f.short_name));
  const [humans,setHumans] = useState(['MI']);
  const [form,setForm] = useState(DEFAULTS);
  const [players,setPlayers] = useState(DEMO_PLAYERS);
  const [games,setGames] = useState(readStore);
  const [game,setGame] = useState(null);
  const [health,setHealth] = useState('checking');
  const [error,setError] = useState('');
  const [search,setSearch] = useState('');
  const [uploadMessage,setUploadMessage] = useState('');
  const [bidAmount,setBidAmount] = useState('');
  const fileRef = useRef(null);

  useEffect(()=>{ getFranchises().then(data=>{if(data?.length)setFranchises(data)}).catch(()=>{}); getHealth().then(()=>setHealth('online')).catch(()=>setHealth('demo')); listSavedGames().then(remote=>{if(Array.isArray(remote)&&remote.length){setGames(old=>{const merged=[...remote,...old.filter(g=>!remote.some(r=>r.id===g.id))];return merged;});}}).catch(()=>{}); },[]);
  useEffect(()=>writeStore(games),[games]);
  const selectedTeams = useMemo(()=>franchises.filter(f=>selected.includes(f.short_name)),[franchises,selected]);
  const botCount = selected.length - humans.filter(h=>selected.includes(h)).length;
  const update=(k,v)=>setForm(p=>({...p,[k]:v}));
  const toggleTeam=code=>{setSelected(p=>p.includes(code)?p.filter(x=>x!==code):p.length<10?[...p,code]:p);setHumans(p=>p.filter(x=>x!==code));};
  const toggleHuman=code=>setHumans(p=>p.includes(code)?p.filter(x=>x!==code):p.length<selected.length?[...p,code]:p);

  function saveGame(next){setGame(next);setGames(old=>{const idx=old.findIndex(g=>g.id===next.id);if(idx<0)return [next,...old];const copy=[...old];copy[idx]=next;return copy;});saveGameSnapshot(next).catch(()=>{});}
  async function createAuction(e){e.preventDefault();setError('');if(selected.length<2)return setError('Choose at least two franchises.');if(!humans.some(h=>selected.includes(h)))return setError('Assign at least one human-controlled franchise.');
    const roster=selectedTeams.map(t=>({code:t.short_name,name:t.name,color:t.color||'#667085',control:humans.includes(t.short_name)?'human':'bot',purse:Number(form.total_purse),startingPurse:Number(form.total_purse),squad:[],overseas:0,needs:{},personality:humans.includes(t.short_name)?'human':['balanced','aggressive','value','conservative'][selected.indexOf(t.short_name)%4]}));
    let serverRoom=null;try{serverRoom=await createRoom({...form,franchise_short_names:selected,human_controlled_short_names:humans.filter(h=>selected.includes(h))});}catch{}
    const next={id:serverRoom?.id?`room-${serverRoom.id}-${Date.now()}`:`local-${Date.now()}`,server_id:serverRoom?.id||null,name:form.name,format:form.auction_type,status:'setup',createdAt:new Date().toISOString(),rules:{...form},teams:roster,players:players.map(p=>({...p})),queue:players.map(p=>p.id),currentIndex:-1,currentPlayer:null,currentBid:0,highestTeam:null,bidHistory:[],results:[],humanTeam:humans.find(h=>selected.includes(h)),log:[{time:new Date().toISOString(),text:'Auction room created. Squad analysis is ready.'}]};
    next.teams.forEach(t=>{t.needs=analyseNeeds(t,next.rules);});saveGame(next);setTab('room');
  }
  function analyseNeeds(team,rules){const roles=['Batter','Fast bowler','All-rounder','Wicketkeeper','Spinner'];const counts={};team.squad.forEach(p=>counts[normalRole(p.role)]=(counts[normalRole(p.role)]||0)+1);const target={Batter:7,'Fast bowler':6,'All-rounder':4,Wicketkeeper:2,Spinner:4};return Object.fromEntries(roles.map(r=>[r,Math.max(0,target[r]-(counts[r]||0))]));}
  function normalRole(role=''){if(/keeper/i.test(role))return 'Wicketkeeper';if(/all/i.test(role))return 'All-rounder';if(/spin|leg|off/i.test(role))return 'Spinner';if(/bowl|pace|fast|medium/i.test(role))return 'Fast bowler';return 'Batter';}
  const humanTeam = game?.teams.find(t=>t.code===game.humanTeam);
  const currentPlayer=game?.players.find(p=>p.id===game.queue[game.currentIndex]);
  const currentBid=game?.currentBid||0;
  const highestTeam=game?.teams.find(t=>t.code===game.highestTeam);

  function logEvent(g,text){g.log=[...(g.log||[]),{time:new Date().toISOString(),text}].slice(-100);}
  function minimumFutureReserve(team,p,g){const slots=Math.max(0,Number(g.rules.min_squad_size)-team.squad.length-1);if(!slots)return 0;const prices=g.players.filter(x=>x.status==='Available'&&x.id!==p.id).map(x=>Number(x.base_price)||0.2);const cheapest=prices.length?Math.min(...prices):0.2;return slots*cheapest;}
  function availableFor(team,p,g){const overseas=p.country!=='India';return team.purse>=p.base_price && team.squad.length<Number(g.rules.max_squad_size) && (!overseas||team.overseas<Number(g.rules.max_overseas_players)) && team.purse-p.base_price >= minimumFutureReserve(team,p,g);}
  function botMax(team,p,g){const role=normalRole(p.role);const need=team.needs?.[role]||0;const slotsLeft=Number(g.rules.max_squad_size)-team.squad.length;const budgetAfterReserve=team.purse-minimumFutureReserve(team,p,g);const roleMultiplier=need>=5?2.8:need>=3?2.1:need>=1?1.35:0.55;const scarcity=/Wicketkeeper|Spinner/.test(role)?1.15:1;const personality=team.personality==='aggressive'?1.3:team.personality==='conservative'?0.78:team.personality==='value'?0.92:1;const difficulty=g.rules.difficulty==='advanced'?1.15:1;return Math.max(0,Math.min(budgetAfterReserve,p.base_price*roleMultiplier*scarcity*personality*difficulty,slotsLeft>0?team.purse:0));}
  function nextLot(g){let idx=g.currentIndex+1;while(idx<g.queue.length){const p=g.players.find(x=>x.id===g.queue[idx]);if(p&&p.status==='Available')break;idx++;}g.currentIndex=idx;g.currentBid=0;g.highestTeam=null;g.currentPlayer=g.players.find(x=>x.id===g.queue[idx])||null;if(!g.currentPlayer){g.status='completed';logEvent(g,'Auction completed. All available players have been processed.');}else{g.status='live';logEvent(g,`LOT ${idx+1}: ${g.currentPlayer.name} enters at ${money(g.currentPlayer.base_price)}.`);}return g;}
  function beginAuction(){if(!game)return;const g=structuredClone(game);if(g.status==='paused')g.status='live';if(!g.currentPlayer)nextLot(g);else logEvent(g,'Auction resumed.');saveGame(g);}
  function placeBid(teamCode,amount,byBot=false){if(!game||!currentPlayer)return;const g=structuredClone(game);const team=g.teams.find(t=>t.code===teamCode);const min=Math.max(currentBid?currentBid+0.1:currentPlayer.base_price,currentPlayer.base_price);const value=Number(amount.toFixed(2));if(!team||value+1e-6<min||value>team.purse||!availableFor(team,currentPlayer,g)){if(!byBot)setError('That bid is not valid for this franchise.');return;}g.currentBid=value;g.highestTeam=teamCode;g.bidHistory.push({playerId:currentPlayer.id,team:teamCode,amount:value,time:new Date().toISOString(),bot:byBot});logEvent(g,`${team.code} ${byBot?'(AI) ':''}bids ${money(value)} for ${currentPlayer.name}.`);saveGame(g);setError('');}
  function botResponseFor(g){
    const p=g.currentPlayer;if(!p)return g;
    const nextMin=g.currentBid?g.currentBid+0.1:p.base_price;
    const candidates=g.teams.filter(t=>t.control==='bot'&&t.code!==g.highestTeam&&availableFor(t,p,g)&&botMax(t,p,g)>=nextMin);
    if(!candidates.length){
      if(g.highestTeam){const winner=g.teams.find(t=>t.code===g.highestTeam);winner.purse=Number((winner.purse-g.currentBid).toFixed(2));winner.squad.push({...p,sold_price:g.currentBid});if(p.country!=='India')winner.overseas++;p.status='Sold';p.sold_to=winner.code;p.sold_price=g.currentBid;g.results.push({player:p.name,team:winner.code,price:g.currentBid});winner.needs=analyseNeeds(winner,g.rules);logEvent(g,`${p.name} SOLD to ${winner.code} for ${money(g.currentBid)}.`);}
      else{p.status='Unsold';logEvent(g,`${p.name} goes UNSOLD.`);}
      g=nextLot(g);return g;
    }
    candidates.sort((a,b)=>(botMax(b,p,g)-g.currentBid)-(botMax(a,p,g)-g.currentBid));
    const bidder=candidates[0];const increment=g.currentBid<1?0.1:g.currentBid<5?0.25:0.5;const offer=Number((g.currentBid?g.currentBid+increment:p.base_price).toFixed(2));
    if(offer>botMax(bidder,p,g))return g;
    g.currentBid=offer;g.highestTeam=bidder.code;g.bidHistory.push({playerId:p.id,team:bidder.code,amount:offer,time:new Date().toISOString(),bot:true});logEvent(g,`${bidder.code} (AI) bids ${money(offer)} for ${p.name}.`);return g;
  }
  function runBots(){if(!game||!currentPlayer)return;const g=botResponseFor(structuredClone(game));saveGame(g);}
  function sellCurrent(){if(!game||!currentPlayer)return;const g=structuredClone(game);if(g.highestTeam){const winner=g.teams.find(t=>t.code===g.highestTeam);const p=g.players.find(x=>x.id===g.currentPlayer.id);winner.purse=Number((winner.purse-g.currentBid).toFixed(2));winner.squad.push({...p,sold_price:g.currentBid});if(p.country!=='India')winner.overseas++;p.status='Sold';p.sold_to=winner.code;p.sold_price=g.currentBid;g.results.push({player:p.name,team:winner.code,price:g.currentBid});winner.needs=analyseNeeds(winner,g.rules);logEvent(g,`${p.name} SOLD to ${winner.code} for ${money(g.currentBid)}.`);}else{const p=g.players.find(x=>x.id===g.currentPlayer.id);p.status='Unsold';logEvent(g,`${p.name} goes UNSOLD.`);}g=nextLot(g);saveGame(g);}
  function pauseGame(){if(!game)return;const g=structuredClone(game);g.status='paused';logEvent(g,'Auction paused and saved.');saveGame(g);}
  function humanBid(){if(!humanTeam||!currentPlayer)return;const val=Number(bidAmount);placeBid(humanTeam.code,val,false);setBidAmount('');}
  async function importFile(file){
    if(!file)return;setUploadMessage('Reading player file…');
    try{
      const parsed=await importPlayerFile(file);
      if(parsed.players?.length){const normalized=parsed.players.map((p,i)=>({...p,id:p.id||`import-${Date.now()}-${i}`}));setPlayers(normalized);setUploadMessage(`${parsed.count} players extracted from ${file.name}. Review the pool before creating an auction. ${parsed.warnings?.join(' ')||''}`);return;}
      setUploadMessage(parsed.warnings?.join(' ')||'No players were detected.');
    }catch(apiError){
      if(file.name.toLowerCase().endsWith('.csv')){
        const reader=new FileReader();reader.onload=()=>{try{const text=String(reader.result);const rows=text.split(/\r?\n/).filter(Boolean);const headers=rows.shift().split(',').map(x=>x.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_'));const parsed=rows.map((line,i)=>{const cells=line.split(',').map(x=>x.trim());const obj=Object.fromEntries(headers.map((h,j)=>[h,cells[j]||'']));const name=obj.player_name||obj.name||obj.player;if(!name)throw new Error('A player name column is required.');return{id:`upload-${Date.now()}-${i}`,name,country:obj.country||obj.nationality||'India',role:obj.role||obj.player_role||'Batter',style:obj.style||obj.bowling_style||'',previous_team:obj.previous_team||'',base_price:Number(String(obj.base_price||obj.price||'0').replace(/[^0-9.]/g,'')),status:'Available'};});setPlayers(parsed);setUploadMessage(`${parsed.length} players imported from CSV using browser fallback.`);}catch(e){setUploadMessage(`Import failed: ${e.message}`);}};reader.readAsText(file);
      }else{setUploadMessage(`Server-side ${file.name.split('.').pop().toUpperCase()} extraction needs the backend running. ${apiError.message}`);}
    }
  }
  const filteredPlayers=players.filter(p=>`${p.name} ${p.country} ${p.role}`.toLowerCase().includes(search.toLowerCase()));
  function openSaved(g){setGame(g);setTab('room');}

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Gavel size={21}/></div><div><strong>AUCTION ARENA</strong><span>AI-powered cricket auction simulator</span></div></div><div className={`status ${health}`}><span/>{health==='online'?'API connected':'Demo mode'}</div></header>
    <main>
      <section className="hero"><div className="eyebrow"><Sparkles size={13}/> CRICKET AUCTION SIMULATOR</div><h1>Every bid has a <em>strategy.</em></h1><p>Build your franchise, challenge independent AI teams and run your own cricket auction. Demo mode works without an API key.</p><div className="hero-pills"><span><Users size={14}/> 1–10 franchises</span><span><Bot size={14}/> AI opponents</span><span><ShieldCheck size={14}/> Budget validation</span><span><Activity size={14}/> Autosaved games</span></div></section>
      <nav className="tabs"><button className={tab==='setup'?'active':''} onClick={()=>setTab('setup')}><Plus size={16}/> New auction</button><button className={tab==='room'?'active':''} disabled={!game} onClick={()=>setTab('room')}><Gavel size={16}/> Auction room</button><button className={tab==='players'?'active':''} onClick={()=>setTab('players')}><FileSpreadsheet size={16}/> Player pool</button><button className={tab==='saved'?'active':''} onClick={()=>setTab('saved')}><Clock3 size={16}/> Saved auctions <span className="tab-count">{games.length}</span></button></nav>
      {tab==='setup'&&<div className="content-grid"><form className="panel setup-panel" onSubmit={createAuction}><div className="panel-heading"><div><div className="eyebrow">ROOM CONFIGURATION</div><h2>Create your auction</h2></div><span className="step">01 / 03</span></div>
        <label className="field-label">Auction name<input value={form.name} onChange={e=>update('name',e.target.value)} minLength="3" maxLength="120" required/></label>
        <div className="two-cols"><label className="field-label">Auction format<select value={form.auction_type} onChange={e=>update('auction_type',e.target.value)}><option value="mini">Mini auction</option><option value="mega">Mega auction</option></select></label><label className="field-label">Purse per franchise (Cr)<input type="number" min="1" step="0.05" value={form.total_purse} onChange={e=>update('total_purse',Number(e.target.value))}/></label></div>
        <div className="section-title"><div><h3>Choose franchises</h3><p>Select 2–10 teams for this auction.</p></div><b>{selected.length}/10</b></div><div className="team-grid">{franchises.map(t=><button type="button" key={t.short_name} className={`team-chip ${selected.includes(t.short_name)?'selected':''}`} onClick={()=>toggleTeam(t.short_name)}><span className="team-code" style={{background:t.color||'#344054'}}>{t.short_name}</span><span>{t.name}</span><span className="check">{selected.includes(t.short_name)?'✓':'+'}</span></button>)}</div>
        <div className="section-title"><div><h3>Human-controlled franchises</h3><p>Each remaining franchise is managed by an AI bot.</p></div><b>{humans.filter(h=>selected.includes(h)).length} human · {botCount} bots</b></div><div className="human-list">{selectedTeams.map(t=><label key={t.short_name} className="human-option"><input type="checkbox" checked={humans.includes(t.short_name)} onChange={()=>toggleHuman(t.short_name)}/><span>{t.name}</span><small>{humans.includes(t.short_name)?'HUMAN':'AI BOT'}</small></label>)}</div>
        <div className="section-title"><div><h3>Squad and auction rules</h3><p>Configure the limits for every franchise.</p></div></div><div className="two-cols"><label className="field-label">Minimum squad size<input type="number" min="1" max="50" value={form.min_squad_size} onChange={e=>update('min_squad_size',Number(e.target.value))}/></label><label className="field-label">Maximum squad size<input type="number" min="5" max="50" value={form.max_squad_size} onChange={e=>update('max_squad_size',Number(e.target.value))}/></label><label className="field-label">Maximum overseas players<input type="number" min="0" max="25" value={form.max_overseas_players} onChange={e=>update('max_overseas_players',Number(e.target.value))}/></label><label className="field-label">Bid timer (seconds)<input type="number" min="5" max="120" value={form.bid_timer_seconds} onChange={e=>update('bid_timer_seconds',Number(e.target.value))}/></label></div>
        <div className="two-cols"><label className="field-label">AI difficulty<select value={form.difficulty} onChange={e=>update('difficulty',e.target.value)}><option value="realistic">Realistic</option><option value="advanced">Advanced</option></select></label><label className="field-label">Default bot personality<select value={form.personality} onChange={e=>update('personality',e.target.value)}><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option><option value="conservative">Conservative</option><option value="value">Value hunter</option></select></label></div>
        <div className="switch-row"><div><b>Automatic auctioneer</b><small>Automatically advances to the next player after each sale.</small></div><input type="checkbox" checked={form.automatic_auctioneer} onChange={e=>update('automatic_auctioneer',e.target.checked)}/></div><div className="switch-row"><div><b>Save and resume</b><small>Store this auction in this browser automatically.</small></div><input type="checkbox" checked={form.allow_pause_resume} onChange={e=>update('allow_pause_resume',e.target.checked)}/></div>
        <div className="source-note"><Sparkles size={16}/><span><b>Demo player pool loaded.</b> These are sample entries, not a verified official auction list. Import your own CSV before a real-world simulation.</span></div>{error&&<div className="error">{error}</div>}<button className="primary-btn" type="submit"><Play size={17}/> Create auction room</button></form>
        <aside className="side-column"><div className="panel summary-panel"><div className="eyebrow">LIVE CONFIGURATION</div><h2>Room overview</h2><div className="metric"><Users/><div><strong>{selected.length}</strong><span>Franchises selected</span></div></div><div className="metric"><Bot/><div><strong>{botCount}</strong><span>AI-controlled franchises</span></div></div><div className="metric"><Wallet/><div><strong>{money(form.total_purse)}</strong><span>Starting purse per franchise</span></div></div><div className="metric"><Activity/><div><strong>{form.auction_type.toUpperCase()}</strong><span>Auction format</span></div></div><div className="note"><b>AI squad planning</b><p>Each bot tracks role coverage, remaining budget, overseas availability and squad size. Its maximum bid changes with its needs.</p></div></div><div className="panel import-card"><div className="eyebrow">CUSTOM PLAYER POOL</div><h3>Bring your own auction list</h3><p>Upload PDF, XLSX or CSV. The backend extracts player fields into a reviewable pool; CSV also has an offline browser fallback.</p><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import player file</button><input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf,text/csv,application/pdf" hidden onChange={e=>importFile(e.target.files?.[0])}/>{uploadMessage&&<p className="upload-message">{uploadMessage}</p>}</div></aside></div>}
      {tab==='players'&&<div className="panel pool-panel"><div className="panel-heading"><div><div className="eyebrow">PLAYER DATABASE</div><h2>Available player pool</h2><p>{players.length} players · Demo dataset or your imported CSV</p></div><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import player file</button><input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf,text/csv,application/pdf" hidden onChange={e=>importFile(e.target.files?.[0])}/></div><div className="searchbar"><Search size={17}/><input placeholder="Search player, country or role" value={search} onChange={e=>setSearch(e.target.value)}/></div>{uploadMessage&&<div className="source-note">{uploadMessage}</div>}<div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>COUNTRY</th><th>ROLE</th><th>BASE PRICE</th><th>STATUS</th></tr></thead><tbody>{filteredPlayers.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.country}</td><td>{p.role}</td><td>{money(p.base_price)}</td><td><span className="status-pill">{p.status}</span></td></tr>)}</tbody></table></div><p className="muted small">Demo names are illustrative only. For production player lists, import a verified auction pool. Supported columns: name/player_name, country/nationality, role, base_price/price, style/bowling_style, previous_team. PDF extraction is best-effort and needs review.</p></div>}
      {tab==='room'&&game&&<AuctionRoom game={game} currentPlayer={currentPlayer} currentBid={currentBid} highestTeam={highestTeam} humanTeam={humanTeam} bidAmount={bidAmount} setBidAmount={setBidAmount} onStart={beginAuction} onBid={humanBid} onBotRound={runBots} onSell={sellCurrent} onPause={pauseGame} onRefresh={()=>{const g=readStore().find(x=>x.id===game.id);if(g)setGame(g);}} onBack={()=>setTab('saved')} error={error} setError={setError}/>}
      {tab==='saved'&&<div className="panel saved-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR AUCTIONS</div><h2>Saved auction rooms</h2><p>Games are saved automatically in this browser.</p></div></div>{games.length===0?<div className="empty-state"><Trophy size={30}/><h3>No saved auctions yet</h3><p>Create an auction to see it here.</p><button className="primary-btn" onClick={()=>setTab('setup')}>Create first auction</button></div>:<div className="saved-list">{games.map(g=><div className="saved-item" key={g.id}><div className="saved-icon"><Gavel/></div><div className="saved-info"><b>{g.name}</b><span>{g.format.toUpperCase()} · {g.teams.length} teams · {g.results.length} purchases · {new Date(g.createdAt).toLocaleString()}</span></div><span className={`game-status ${g.status}`}>{g.status}</span><button className="secondary-btn compact" onClick={()=>openSaved(g)}>Open <ChevronRight size={14}/></button><button className="icon-btn" title="Delete" onClick={()=>{if(confirm('Delete this saved auction?')){setGames(old=>old.filter(x=>x.id!==g.id));deleteGameSnapshot(g.id).catch(()=>{});}}}><X size={16}/></button></div>)}</div>}</div>}
    </main><footer><span>AUCTION ARENA</span><span>Demo build · v0.2.0 · Browser autosave</span></footer>
  </div>;
}

function AuctionRoom({game,currentPlayer,currentBid,highestTeam,humanTeam,bidAmount,setBidAmount,onStart,onBid,onBotRound,onSell,onPause,onBack,error,setError}) {
  const [showSquads,setShowSquads] = useState(false);
  const [activity,setActivity] = useState(true);
  const [secondsLeft,setSecondsLeft] = useState(Number(game.rules.bid_timer_seconds || 20));
  useEffect(() => {
    if (game.status !== 'live' || !currentPlayer || !game.rules.automatic_auctioneer) return;
    setSecondsLeft(Number(game.rules.bid_timer_seconds || 20));
    const interval = setInterval(() => setSecondsLeft(value => {
      if (value <= 1) { clearInterval(interval); onSell(); return 0; }
      return value - 1;
    }), 1000);
    return () => clearInterval(interval);
  }, [game.currentPlayer?.id, currentBid, game.status, game.rules.automatic_auctioneer, game.rules.bid_timer_seconds]);
  const topBids = game.bidHistory.slice(-8).reverse();
  const minBid = currentBid ? currentBid + 0.1 : (currentPlayer?.base_price || 0);
  const isReady = game.status === 'setup' || game.status === 'paused';
  return (
    <div className="auction-layout">
      <section className="panel auction-main">
        <div className="auction-topline">
          <div><div className="eyebrow">{game.format.toUpperCase()} AUCTION · ROOM {String(game.id).slice(-6)}</div><h2>{game.name}</h2></div>
          <span className={`game-status ${game.status}`}>{game.status}</span>
        </div>
        <div className="auction-scorebar">
          <div><span>YOUR TEAM</span><b>{humanTeam?.name || 'No human team'}</b></div>
          <div><span>YOUR PURSE</span><b>{money(humanTeam?.purse)}</b></div>
          <div><span>SQUAD</span><b>{humanTeam?.squad.length || 0}/{game.rules.max_squad_size}</b></div>
          <div><span>OVERSEAS</span><b>{humanTeam?.overseas || 0}/{game.rules.max_overseas_players}</b></div>
        </div>
        {isReady ? (
          <div className="auction-placeholder">
            <div className="auction-player-icon"><Gavel size={34}/></div>
            <div className="eyebrow">{game.status === 'paused' ? 'AUCTION PAUSED' : 'READY TO BEGIN'}</div>
            <h2>{game.status === 'paused' ? 'Resume your auction' : 'The auction room is ready'}</h2>
            <p>{game.players.length} players in the pool · {game.teams.length} franchises · {game.teams.filter(t => t.control === 'bot').length} AI opponents</p>
            <button className="primary-btn" onClick={onStart}><Play size={16}/>{game.status === 'paused' ? 'Resume auction' : 'Start auction'}</button>
          </div>
        ) : game.status === 'completed' ? (
          <div className="auction-placeholder"><Trophy size={42}/><h2>Auction completed</h2><p>{game.results.length} players sold. Your results are saved.</p><button className="secondary-btn" onClick={onBack}>View saved auctions</button></div>
        ) : (
          <>
            <div className="lot-label"><span>LOT {game.currentIndex + 1}</span><span>{game.rules.automatic_auctioneer ? `BID CLOSES IN ${secondsLeft}s` : 'MANUAL LOT CONTROL'}</span><span>{game.queue.length - game.currentIndex - 1} players after this</span></div>
            <div className="player-stage">
              <div className="player-avatar"><span>{currentPlayer?.name?.split(' ').map(s => s[0]).join('').slice(0,2) || '??'}</span></div>
              <div className="player-info">
                <div className="eyebrow">CURRENT PLAYER · {currentPlayer?.country || '—'}</div>
                <h1>{currentPlayer?.name || 'Player'}</h1>
                <div className="player-tags"><span>{currentPlayer?.role}</span><span>{currentPlayer?.style || 'Style not specified'}</span><span>{currentPlayer?.country === 'India' ? 'Indian' : 'Overseas'}</span></div>
                <div className="base-price">Base price <b>{money(currentPlayer?.base_price)}</b></div>
              </div>
              <div className="live-bid"><span>CURRENT BID</span><strong>{money(currentBid || currentPlayer?.base_price)}</strong><small>{highestTeam ? `${highestTeam.name} leading` : 'Awaiting opening bid'}</small></div>
            </div>
            <div className="bid-controls">
              <div className="bid-entry">
                <label>YOUR BID (₹ CRORE)</label>
                <div className="bid-input-wrap"><input type="number" min={minBid} step="0.10" placeholder={minBid.toFixed(2)} value={bidAmount} onChange={e => setBidAmount(e.target.value)}/><button className="primary-btn" onClick={onBid} disabled={!bidAmount || Number(bidAmount) < minBid || !humanTeam || highestTeam?.code === humanTeam.code}>Place bid</button></div>
                <small>Minimum next bid: {money(minBid)} · Minimum increment: ₹0.10 Cr</small>
              </div>
              <div className="auction-actions"><button className="secondary-btn" onClick={onBotRound}><Bot size={15}/> Run AI bids</button><button className="secondary-btn" onClick={onSell}><Check size={15}/> Close lot</button><button className="secondary-btn" onClick={onPause}><Pause size={15}/> Pause</button></div>
            </div>
            {error && <div className="error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
          </>
        )}
        <div className="room-bottom"><button className="text-btn" onClick={() => setShowSquads(!showSquads)}><Users size={15}/>{showSquads ? 'Hide' : 'View'} squads and needs</button><button className="text-btn" onClick={() => setActivity(!activity)}><Activity size={15}/>{activity ? 'Hide' : 'Show'} bid history</button></div>
        {showSquads && <div className="team-squad-grid">{game.teams.map(t => (
          <div className="squad-card" key={t.code}>
            <div className="squad-head"><b>{t.code}</b><span>{money(t.purse)}</span></div>
            <small>{t.squad.length} players · {t.overseas} overseas · {t.control === 'bot' ? 'AI' : 'Human'}</small>
            <div className="squad-names">{t.squad.length ? t.squad.map(p => <span key={p.id}>{p.name}<i>{money(p.sold_price)}</i></span>) : <em>No purchases yet</em>}</div>
            {t.control === 'bot' && <div className="need-chips">{Object.entries(t.needs || {}).filter(([,v]) => v > 0).slice(0,3).map(([r,v]) => <i key={r}>{r}: {v}</i>)}</div>}
          </div>
        ))}</div>}
        {activity && <div className="activity-list">
          {topBids.length ? topBids.map((b,i) => <div key={`${b.time}-${i}`}><span>{b.team}</span><b>{money(b.amount)}</b><small>{b.bot ? 'AI bid' : 'Human bid'}</small></div>) : <p>No bids yet. Start by placing a bid or running the AI round.</p>}
          {game.log.slice(-5).reverse().map((l,i) => <p className="log-line" key={i}>{l.text}</p>)}
        </div>}
      </section>
      <aside className="panel auction-side">
        <div className="eyebrow">FRANCHISE TABLE</div><h3>Live standings</h3>
        {game.teams.map(t => <div className={`franchise-row ${t.code === humanTeam?.code ? 'your-franchise' : ''}`} key={t.code}>
          <span className="franchise-badge" style={{background:t.color}}>{t.code}</span><div><b>{t.name}</b><small>{t.squad.length} players · {t.control === 'bot' ? `AI · ${t.personality}` : 'You'}</small></div><strong>{money(t.purse)}</strong>
        </div>)}
        <div className="side-note"><Target size={16}/><span>AI teams update role priorities after every purchase. Bid ceilings are recalculated from needs, purse and squad space.</span></div>
        <button className="secondary-btn full" onClick={onBack}>Back to saved auctions</button>
      </aside>
    </div>
  );
}
