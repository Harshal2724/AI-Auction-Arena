import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bot, Gavel, Plus, RefreshCw, ShieldCheck, Users, Wallet, Trophy, Upload, Play, Pause, RotateCcw, Search, FileSpreadsheet, Sparkles, ChevronRight, X, Check, Clock3, Target, SlidersHorizontal, Plane, SkipForward } from 'lucide-react';
import IPL2025_AUCTION_PLAYERS from './data/ipl2025AuctionPlayers.json';
import HISTORICAL_RETENTIONS from './data/historicalRetentions.json';
import { createRoom, getFranchises, getHealth, getRoom, listSavedGames, saveGameSnapshot, deleteGameSnapshot, importPlayerFile } from './services/api';

const FRANCHISES = [
  { short_name:'MI', name:'Mumbai Indians', color:'#1769aa' }, { short_name:'CSK', name:'Chennai Super Kings', color:'#f6c900' },
  { short_name:'RCB', name:'Royal Challengers Bengaluru', color:'#c62828' }, { short_name:'KKR', name:'Kolkata Knight Riders', color:'#673ab7' },
  { short_name:'SRH', name:'Sunrisers Hyderabad', color:'#f36c21' }, { short_name:'RR', name:'Rajasthan Royals', color:'#e91e8f' },
  { short_name:'PBKS', name:'Punjab Kings', color:'#d32f2f' }, { short_name:'DC', name:'Delhi Capitals', color:'#1565c0' },
  { short_name:'GT', name:'Gujarat Titans', color:'#174b70' }, { short_name:'LSG', name:'Lucknow Super Giants', color:'#00a6a6' }
];
const DEMO_PLAYERS = IPL2025_AUCTION_PLAYERS.map(p=>({...p}));
const LEGACY_FRANCHISES = {
  KXIP:{short_name:'KXIP',name:'Kings XI Punjab',color:'#d32f2f'},
  DD:{short_name:'DD',name:'Delhi Daredevils',color:'#1565c0'},
  RPS:{short_name:'RPS',name:'Rising Pune Supergiant',color:'#673ab7'},
  GL:{short_name:'GL',name:'Gujarat Lions',color:'#f36c21'}
};
const seasonFranchiseList = year => Object.keys(HISTORICAL_RETENTIONS[year]?.teams||{}).map(code=>LEGACY_FRANCHISES[code]||FRANCHISES.find(t=>t.short_name===code)).filter(Boolean);

const IPL2025_RETENTIONS = {
  CSK:{purse:55,players:[['Ruturaj Gaikwad',18],['Matheesha Pathirana',13,'Sri Lanka'],['Shivam Dube',12],['Ravindra Jadeja',18],['MS Dhoni',4]]},
  DC:{purse:73,players:[['Axar Patel',16.5],['Kuldeep Yadav',13.25],['Tristan Stubbs',10,'South Africa'],['Abhishek Porel',4]]},
  GT:{purse:69,players:[['Rashid Khan',18,'Afghanistan'],['Shubman Gill',16.5],['Sai Sudharsan',8.5],['Rahul Tewatia',4],['Shahrukh Khan',4]]},
  KKR:{purse:51,players:[['Rinku Singh',13],['Varun Chakaravarthy',12],['Sunil Narine',12,'West Indies'],['Andre Russell',12,'West Indies'],['Harshit Rana',4],['Ramandeep Singh',4]]},
  LSG:{purse:69,players:[['Nicholas Pooran',21,'West Indies'],['Ravi Bishnoi',11],['Mayank Yadav',11],['Mohsin Khan',4],['Ayush Badoni',4]]},
  MI:{purse:45,players:[['Jasprit Bumrah',18],['Suryakumar Yadav',16.35],['Hardik Pandya',16.35],['Rohit Sharma',16.3],['Tilak Varma',8]]},
  PBKS:{purse:110.5,players:[['Shashank Singh',5.5],['Prabhsimran Singh',4]]},
  RR:{purse:41,players:[['Sanju Samson',18],['Yashasvi Jaiswal',18],['Riyan Parag',14],['Dhruv Jurel',14],['Shimron Hetmyer',11,'West Indies'],['Sandeep Sharma',4]]},
  RCB:{purse:83,players:[['Virat Kohli',21],['Rajat Patidar',11],['Yash Dayal',5]]},
  SRH:{purse:45,players:[['Pat Cummins',18,'Australia'],['Abhishek Sharma',14],['Nitish Kumar Reddy',6],['Heinrich Klaasen',23,'South Africa'],['Travis Head',14,'Australia']]}
};
const DEFAULTS = { name:'IPL 2025 Mega Auction', auction_type:'mega', total_purse:120, max_squad_size:25, min_squad_size:18, max_overseas_players:8, bid_timer_seconds:10, automatic_auctioneer:true, allow_pause_resume:true, difficulty:'realistic', personality:'balanced' };
const isOverseas = p => Boolean(p && p.country && isOverseas(p) && p.country !== 'Unknown');
const money = n => `₹${Number(n || 0).toFixed(2)} Cr`;
const readStore = () => { try { return JSON.parse(localStorage.getItem('auction-arena-v1') || '[]'); } catch { return []; } };
const writeStore = games => localStorage.setItem('auction-arena-v1', JSON.stringify(games));

export default function App() {
  const [tab,setTab] = useState('setup');
  const [franchises,setFranchises] = useState(FRANCHISES);
  const [selected,setSelected] = useState(FRANCHISES.map(f=>f.short_name));
  const [humans,setHumans] = useState(['MI']);
  const [form,setForm] = useState(DEFAULTS);
  const [auctionYear,setAuctionYear] = useState('2025');
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
  const activeFranchises = useMemo(()=>seasonFranchiseList(auctionYear),[auctionYear]);
  const selectedTeams = useMemo(()=>activeFranchises.filter(f=>selected.includes(f.short_name)),[activeFranchises,selected]);
  const botCount = selected.length - humans.filter(h=>selected.includes(h)).length;
  const update=(k,v)=>setForm(p=>({...p,[k]:v}));
  function changeAuctionYear(year){const season=HISTORICAL_RETENTIONS[year];const list=seasonFranchiseList(year);setAuctionYear(year);setPlayers(year==='2025'?DEMO_PLAYERS:[]);setFranchises(list);setSelected(list.map(t=>t.short_name));setHumans(list.length?[list[0].short_name]:[]);setForm(p=>({...p,auction_type:season?.format||'mini',total_purse:season?.purse||120,name:'IPL '+year+' '+(season?.format||'mini').toUpperCase()+' Auction'}));setUploadMessage('');setError('');}

  const toggleTeam=code=>{setSelected(p=>p.includes(code)?p.filter(x=>x!==code):p.length<10?[...p,code]:p);setHumans(p=>p.filter(x=>x!==code));};
  const toggleHuman=code=>setHumans(p=>p.includes(code)?p.filter(x=>x!==code):p.length<selected.length?[...p,code]:p);

  function saveGame(next){setGame(next);setGames(old=>{const idx=old.findIndex(g=>g.id===next.id);if(idx<0)return [next,...old];const copy=[...old];copy[idx]=next;return copy;});saveGameSnapshot(next).catch(()=>{});}
  async function createAuction(e){e.preventDefault();setError('');if(selected.length<2)return setError('Choose at least two franchises.');if(!humans.some(h=>selected.includes(h)))return setError('Assign at least one human-controlled franchise.');if(!players.length)return setError('Upload the selected season auction player list before creating this auction. The 2025 demo pool is not reused for other years.');
    const season=HISTORICAL_RETENTIONS[auctionYear]||{teams:{},purse:Number(form.total_purse)};
    const roster=selectedTeams.map(t=>{const names=season.teams?.[t.short_name]||[];const squad=names.map((name,i)=>{const known=players.find(p=>p.name.toLowerCase()===name.toLowerCase());const overseas=OVERSEAS_RETAINED.has(name)||isOverseas(known);return {id:`retained-${auctionYear}-${t.short_name}-${i}`,name,country:known?.country||(overseas?'Overseas':'Unknown'),role:known?.role||'Unknown',base_price:0,status:'Retained',sold_price:0,retained:true,retention_price_known:false};});const purse=Number(season.remainingPurse?.[t.short_name]??season.purse??form.total_purse);return {code:t.short_name,name:t.name,color:t.color||'#667085',control:humans.includes(t.short_name)?'human':'bot',purse,startingPurse:purse,squad,overseas:squad.filter(isOverseas).length,needs:analyseNeeds({squad},form),personality:humans.includes(t.short_name)?'human':'balanced'};});
    let serverRoom=null;try{serverRoom=await createRoom({...form,auction_year:Number(auctionYear),franchise_short_names:selected,human_controlled_short_names:humans.filter(h=>selected.includes(h))});}catch{}
    const retainedNames=new Set(roster.flatMap(t=>t.squad.map(p=>p.name.toLowerCase())));
    const pool=players.filter(p=>!retainedNames.has(p.name.toLowerCase())).map(p=>({...p}));
    const next={id:serverRoom?.id?`room-${serverRoom.id}-${Date.now()}`:`local-${Date.now()}`,server_id:serverRoom?.id||null,name:form.name,season:Number(auctionYear),format:form.auction_type,status:'setup',createdAt:new Date().toISOString(),rules:{...form,auction_year:Number(auctionYear)},teams:roster,players:pool,queue:pool.map(p=>p.id),currentIndex:-1,currentPlayer:null,currentBid:0,highestTeam:null,bidHistory:[],results:[],humanTeam:humans.find(h=>selected.includes(h)),log:[{time:new Date().toISOString(),text:'IPL '+auctionYear+' auction room created with season-specific retention records.'}]};
    next.teams.forEach(t=>{t.needs=analyseNeeds(t,next.rules);});saveGame(next);setTab('room');
  }
  function analyseNeeds(team,rules){const roles=['Batter','Fast bowler','All-rounder','Wicketkeeper','Spinner'];const counts={};team.squad.forEach(p=>counts[normalRole(p.role)]=(counts[normalRole(p.role)]||0)+1);const target={Batter:7,'Fast bowler':6,'All-rounder':4,Wicketkeeper:2,Spinner:4};return Object.fromEntries(roles.map(r=>[r,Math.max(0,target[r]-(counts[r]||0))]));}
  function normalRole(role=''){if(/keeper/i.test(role))return 'Wicketkeeper';if(/all/i.test(role))return 'All-rounder';if(/spin|leg|off/i.test(role))return 'Spinner';if(/bowl|pace|fast|medium/i.test(role))return 'Fast bowler';if(/bat/i.test(role))return 'Batter';return 'Unknown';}
  const humanTeam = game?.teams.find(t=>t.code===game.humanTeam);
  const currentPlayer=game?.players.find(p=>p.id===game.queue[game.currentIndex]);
  const currentBid=game?.currentBid||0;
  const highestTeam=game?.teams.find(t=>t.code===game.highestTeam);

  function logEvent(g,text){g.log=[...(g.log||[]),{time:new Date().toISOString(),text}].slice(-100);}
  function minimumFutureReserve(team,p,g){const slots=Math.max(0,Number(g.rules.min_squad_size)-team.squad.length-1);return slots*0.3;}
  function availableFor(team,p,g){const overseas=isOverseas(p);const slotsLeft=Number(g.rules.max_squad_size)-team.squad.length;const minSlotsNeeded=Math.max(0,Number(g.rules.min_squad_size)-team.squad.length);const reserveAfterPurchase=Math.max(0,minSlotsNeeded-1)*0.3;return slotsLeft>0&&team.purse>=p.base_price&&(!overseas||team.overseas<Number(g.rules.max_overseas_players))&&team.purse-p.base_price>=reserveAfterPurchase;}
  function playerMarketValue(p){
    const sold2025={'Rishabh Pant':27,'Shreyas Iyer':26.75,'Venkatesh Iyer':23.75,'Arshdeep Singh':18,'Yuzvendra Chahal':18,'Jos Buttler':15.75,'KL Rahul':14,'Jofra Archer':12.5,'Josh Hazlewood':12.5,'Trent Boult':12.5,'Mohammed Siraj':12.25,'Mitchell Starc':11.75,'Phil Salt':11.5,'Ishan Kishan':11.25,'Jitesh Sharma':11,'Marcus Stoinis':11,'Bhuvneshwar Kumar':10.75,'T Natarajan':10.75,'Kagiso Rabada':10.75,'Mohammed Shami':10,'Prasidh Krishna':9.5,'Deepak Chahar':9.25,'Liam Livingstone':8.75,'Avesh Khan':9.75,'Harshal Patel':8,'Akash Deep':8,'David Miller':7.5,'Harry Brook':6.25,'Devon Conway':6.25,'Rahul Tripathi':3.4,'Rachin Ravindra':4,'R Ashwin':9.75,'Mitchell Marsh':3.4,'Glenn Maxwell':4.2,'Quinton de Kock':3.6,'Aiden Markram':2,'Rahmanullah Gurbaz':2,'Khaleel Ahmed':4.8,'Maheesh Theekshana':4.4,'Rahul Chahar':3.2,'Adam Zampa':2.4,'Wanindu Hasaranga':5.25,'Nehal Wadhera':4.2,'Naman Dhir':5.25,'Abdul Samad':4.2,'Rasikh Dar':6,'Anshul Kamboj':3.4,'Gurjapneet Singh':2.2,'Vaibhav Arora':1.8,'Harpreet Brar':1.5,'Yash Thakur':1.6,'Vijay Shankar':1.2,'Suyash Sharma':2.6,'Ashutosh Sharma':3.8,'Sameer Rizvi':0.95,'Rasikh Salam':6};
    const performance2025={'Sai Sudharsan':{runs:759,avg:54.21,sr:156.17},'Suryakumar Yadav':{runs:717,avg:65.18,sr:167.92},'Virat Kohli':{runs:657,avg:54.75,sr:144.71},'Shubman Gill':{runs:650,avg:50,sr:155.88},'Mitchell Marsh':{runs:627,avg:48.23,sr:163.71},'Shreyas Iyer':{runs:604,avg:50.33,sr:175.07},'Yashasvi Jaiswal':{runs:559,avg:43,sr:159.71},'Prabhsimran Singh':{runs:549,avg:32.29,sr:160.53},'KL Rahul':{runs:539,avg:53.9,sr:149.72},'Jos Buttler':{runs:538,avg:59.78,sr:163.03},'Nicholas Pooran':{runs:524,avg:43.67,sr:196.25},'Heinrich Klaasen':{runs:487,avg:44.27,sr:172.7},'Priyansh Arya':{runs:475,avg:27.94,sr:179.25},'Aiden Markram':{runs:445,avg:34.23,sr:148.83},'Abhishek Sharma':{runs:439,avg:33.77,sr:193.39},'Prasidh Krishna':{wickets:25,economy:8.27,average:19.52},'Noor Ahmad':{wickets:24,economy:8.16,average:17},'Josh Hazlewood':{wickets:22,economy:8.77,average:17.55},'Trent Boult':{wickets:22,economy:8.97,average:23.5},'Arshdeep Singh':{wickets:21,economy:8.88,average:24.67},'Sai Kishore':{wickets:19,economy:9.25,average:20.68},'Jasprit Bumrah':{wickets:18,economy:6.68,average:17.56},'Varun Chakaravarthy':{wickets:17,economy:7.7,average:22.5},'Krunal Pandya':{wickets:17,economy:8.2,average:22.3},'Bhuvneshwar Kumar':{wickets:17,economy:9.3,average:28.4}};
    const key=p.name.trim();const base=Number(p.base_price)||0.3;let value=sold2025[key]??(base>=2?Math.min(4.5,base*1.5):base<=0.3?0.3:Math.min(2.5,base*1.35));
    const perf=performance2025[key];if(perf){if(perf.runs)value*=Math.min(1.28,Math.max(0.9,0.92+perf.runs/2200+(perf.sr>170?0.04:0)));if(perf.wickets)value*=Math.min(1.3,Math.max(0.92,0.9+perf.wickets/150+(perf.economy<=8?0.05:0)));}
    let performanceFactor=0.88;if(perf){if(perf.runs){performanceFactor=Math.min(1.22,Math.max(0.78,0.78+perf.runs/2600+(perf.avg>=45?0.06:0)+(perf.sr>=170?0.04:0)));}else if(perf.wickets){performanceFactor=Math.min(1.24,Math.max(0.78,0.82+perf.wickets/180+(perf.economy<=8?0.05:0)));}}const marketAdjustment=0.82;value*=marketAdjustment*performanceFactor;return Math.max(base,Number(value.toFixed(2)));
  }
  function botMax(team,p,g){const role=normalRole(p.role);const need=team.needs?.[role]||0;const minSlotsLeft=Math.max(0,Number(g.rules.min_squad_size)-team.squad.length);const overseas=isOverseas(p);const overseasLeft=Number(g.rules.max_overseas_players)-team.overseas;const slotsLeft=Number(g.rules.max_squad_size)-team.squad.length;if(slotsLeft<=0||(overseas&&overseasLeft<=0))return 0;
    const reserve=minimumFutureReserve(team,p,g);const spendable=Math.max(0,team.purse-reserve);const market=playerMarketValue(p);const roleNeed=need>=5?1.2:need>=3?1.1:need>=1?1:0.72;const overseasTarget=Math.min(7,Number(g.rules.max_overseas_players));const overseasDeficit=Math.max(0,overseasTarget-team.overseas);const overseasPressure=overseas&&overseasDeficit>0?1.18:(!overseas&&overseasDeficit>0?0.78:1);const personality=1;const cap=market*roleNeed*overseasPressure*personality;return Number(Math.min(spendable,team.purse,cap).toFixed(2));}

  function nextLot(g){let idx=g.currentIndex+1;while(idx<g.queue.length){const p=g.players.find(x=>x.id===g.queue[idx]);if(p&&p.status==='Available')break;idx++;}g.currentIndex=idx;g.currentBid=0;g.highestTeam=null;g.currentPlayer=g.players.find(x=>x.id===g.queue[idx])||null;if(!g.currentPlayer){g.status='completed';logEvent(g,'Auction completed. All available players have been processed.');}else{g.status='live';logEvent(g,`LOT ${idx+1}: ${g.currentPlayer.name} enters at ${money(g.currentPlayer.base_price)}.`);}return g;}
  function beginAuction(){if(!game)return;const g=structuredClone(game);if(g.status==='paused')g.status='live';if(!g.currentPlayer)nextLot(g);else logEvent(g,'Auction resumed.');saveGame(g);}
  function placeBid(teamCode,amount,byBot=false){if(!game||!currentPlayer)return;const g=structuredClone(game);const team=g.teams.find(t=>t.code===teamCode);const bidIncrement = (amount) => amount >= 10 ? 1 : amount >= 5 ? 0.5 : amount >= 2 ? 0.2 : 0.1;
    const min=Math.max(currentBid?currentBid+bidIncrement(currentBid):currentPlayer.base_price,currentPlayer.base_price);const value=Number(amount.toFixed(2));if(!team||value+1e-6<min||value>team.purse||!availableFor(team,currentPlayer,g)){if(!byBot)setError('That bid is not valid for this franchise.');return;}g.currentBid=value;g.highestTeam=teamCode;g.bidHistory.push({playerId:currentPlayer.id,team:teamCode,amount:value,time:new Date().toISOString(),bot:byBot});logEvent(g,`${team.code} ${byBot?'(AI) ':''}bids ${money(value)} for ${currentPlayer.name}.`);saveGame(g);setError('');}
  function botResponseFor(g){
    const p=g.currentPlayer;if(!p)return g;
    const bidIncrement = (amount) => amount >= 10 ? 1 : amount >= 5 ? 0.5 : amount >= 2 ? 0.2 : 0.1;
    const nextMin=g.currentBid?g.currentBid+bidIncrement(g.currentBid):p.base_price;
    const candidates=g.teams.filter(t=>t.control==='bot'&&t.code!==g.highestTeam&&availableFor(t,p,g)&&botMax(t,p,g)>=nextMin);
    if(!candidates.length){ return g; }
    candidates.sort((a,b)=>(botMax(b,p,g)-g.currentBid)-(botMax(a,p,g)-g.currentBid));
    const bidder=candidates[0];const increment=bidIncrement(g.currentBid);const offer=Number((g.currentBid?g.currentBid+increment:p.base_price).toFixed(2));
    if(offer>botMax(bidder,p,g))return g;
    g.currentBid=offer;g.highestTeam=bidder.code;g.bidHistory.push({playerId:p.id,team:bidder.code,amount:offer,time:new Date().toISOString(),bot:true});logEvent(g,`${bidder.code} (AI) bids ${money(offer)} for ${p.name}.`);return g;
  }
  function runBots(){if(!game||!currentPlayer)return;const g=botResponseFor(structuredClone(game));saveGame(g);}
  function allocateSkippedPlayer(g,p){
    const candidates=g.teams.filter(t=>t.control==='bot'&&availableFor(t,p,g)&&t.squad.length<Number(g.rules.max_squad_size)&&(!(isOverseas(p))||t.overseas<Number(g.rules.max_overseas_players))).map(t=>({team:t,need:t.needs?.[normalRole(p.role)]||0,ceiling:botMax(t,p,g)})).filter(x=>x.need>0&&x.ceiling>=p.base_price);
    if(!candidates.length){p.status='Skipped';logEvent(g,p.name+' skipped by the human team; no AI franchise had sufficient need and budget, so the player remains unsold.');return g;}
    candidates.sort((a,b)=>b.need-a.need||b.ceiling-a.ceiling||b.team.purse-a.team.purse);
    const chosen=candidates[0];
    const price=Math.min(chosen.ceiling,Math.max(p.base_price,Math.round(chosen.ceiling*0.95*10)/10));
    const winner=chosen.team;
    winner.purse=Number((winner.purse-price).toFixed(2));
    winner.squad.push({...p,status:'Sold',sold_price:price,sold_to:winner.code,allocatedAfterSkip:true});
    if(isOverseas(p))winner.overseas++;
    p.status='Sold';p.sold_to=winner.code;p.sold_price=price;p.allocatedAfterSkip=true;
    winner.needs=analyseNeeds(winner,g.rules);
    g.results.push({player:p.name,team:winner.code,price,allocatedAfterSkip:true});
    logEvent(g,p.name+' passed by the human team and allocated to '+winner.code+' for '+money(price)+' based on player value, squad need and available purse.');
    return g;
  }
  function sellCurrent(){if(!game||!currentPlayer)return;let g=structuredClone(game);if(g.highestTeam){const winner=g.teams.find(t=>t.code===g.highestTeam);const p=g.players.find(x=>x.id===g.currentPlayer.id);winner.purse=Number((winner.purse-g.currentBid).toFixed(2));winner.squad.push({...p,sold_price:g.currentBid});if(isOverseas(p))winner.overseas++;p.status='Sold';p.sold_to=winner.code;p.sold_price=g.currentBid;g.results.push({player:p.name,team:winner.code,price:g.currentBid});winner.needs=analyseNeeds(winner,g.rules);logEvent(g,`${p.name} SOLD to ${winner.code} for ${money(g.currentBid)}.`);}else{const p=g.players.find(x=>x.id===g.currentPlayer.id);p.status='Unsold';logEvent(g,`${p.name} goes UNSOLD.`);}g=nextLot(g);saveGame(g);}
  function endAuctionAndCompleteSquads(){
    if(!game||!humanTeam||humanTeam.squad.length<Number(game.rules.min_squad_size)||humanTeam.squad.length>Number(game.rules.max_squad_size))return;
    const g=structuredClone(game);const min=Number(g.rules.min_squad_size);const max=Number(g.rules.max_squad_size);
    if(g.currentPlayer){
      const livePlayer=g.players.find(p=>p.id===g.currentPlayer.id);
      if(g.highestTeam){const winner=g.teams.find(t=>t.code===g.highestTeam);if(winner&&livePlayer){winner.purse=Number((winner.purse-g.currentBid).toFixed(2));winner.squad.push({...livePlayer,status:'Sold',sold_price:g.currentBid,sold_to:winner.code});if(isOverseas(livePlayer))winner.overseas++;livePlayer.status='Sold';livePlayer.sold_to=winner.code;livePlayer.sold_price=g.currentBid;g.results.push({player:livePlayer.name,team:winner.code,price:g.currentBid});logEvent(g,livePlayer.name+' sold to '+winner.code+' for '+money(g.currentBid)+' as the auction was ended.');}}
      else if(livePlayer&&livePlayer.status==='Available'){livePlayer.status='Unsold';logEvent(g,livePlayer.name+' marked unsold when the auction was ended.');}
    }
    const overseasTarget=Math.min(7,Number(g.rules.max_overseas_players));
    const shuffled=a=>a.map(x=>({x,k:Math.random()})).sort((a,b)=>a.k-b.k).map(o=>o.x);
    for(const team of g.teams.filter(t=>t.code!==g.humanTeam)){
      team.needs=analyseNeeds(team,g.rules);
      let safety=0;
      while((team.squad.length<min||team.overseas<overseasTarget)&&team.squad.length<max&&safety++<max*2){
        const overseasNeeded=team.overseas<overseasTarget;
        const slotsAfter=Math.max(0,min-team.squad.length-1);
        const overseasAfter=Math.max(0,overseasTarget-team.overseas-(overseasNeeded?1:0));
        const reserve=Math.max(slotsAfter,overseasAfter)*0.3;
        let pool=g.players.filter(p=>p.status==='Available'&&availableFor(team,p,g)&&team.purse-(p.base_price||0)>=reserve);
        if(overseasNeeded){
          const overseasPool=pool.filter(p=>isOverseas(p));
          if(overseasPool.length)pool=overseasPool;
        }
        if(!pool.length)break;
        const needs=analyseNeeds(team,g.rules);
        const ranked=pool.map(p=>({p,need:needs[normalRole(p.role)]||0,market:playerMarketValue(p)}));
        ranked.sort((a,b)=>b.need-a.need||b.market-a.market);
        const topNeed=ranked[0].need;
        const candidates=ranked.filter(x=>x.need>=Math.max(0,topNeed-1)).slice(0,Math.min(12,ranked.length));
        const chosen=shuffled(candidates)[0];const p=chosen.p;
        const base=Number(p.base_price)||0.3;
        const estimated=Math.max(base,Math.min(chosen.market,Math.max(base,0.6)));
        const price=Number(Math.min(team.purse-reserve,estimated).toFixed(2));
        if(price+1e-6<base)break;
        team.purse=Number((team.purse-price).toFixed(2));
        team.squad.push({...p,status:'Sold',sold_price:price,sold_to:team.code,autoFilled:true});
        if(isOverseas(p))team.overseas++;
        p.status='Sold';p.sold_to=team.code;p.sold_price=price;p.autoFilled=true;
        g.results.push({player:p.name,team:team.code,price,autoFilled:true});
        team.needs=analyseNeeds(team,g.rules);
      }
    }
    g.status='completed';g.currentPlayer=null;g.currentBid=0;g.highestTeam=null;
    const summaries=g.teams.map(t=>t.code+': '+t.squad.length+'/'+max+' players, '+t.overseas+'/'+g.rules.max_overseas_players+' overseas, '+money(t.purse)+' remaining').join(' | ');
    logEvent(g,'Human ended the auction. AI squads auto-completed using role needs, remaining purse, squad capacity and overseas limits. '+summaries);
    saveGame(g);
  }
  function pauseGame(){if(!game)return;const g=structuredClone(game);g.status='paused';logEvent(g,'Auction paused and saved.');saveGame(g);}
  function humanBid(){if(!humanTeam||!currentPlayer)return;const inc=currentBid>=10?1:currentBid>=5?0.5:currentBid>=2?0.2:0.1;const val=Number((currentBid?currentBid+inc:currentPlayer.base_price).toFixed(2));placeBid(humanTeam.code,val,false);}
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
        <label className="field-label">IPL season<select value={auctionYear} onChange={e=>changeAuctionYear(e.target.value)}>{Object.keys(HISTORICAL_RETENTIONS).sort().map(y=><option key={y} value={y}>{y}</option>)}</select></label><div className="source-note"><Sparkles size={16}/><span>Season-specific retained players are preloaded. Upload that season’s auction PDF/CSV before creating the room; the 2025 demo player pool is never reused for another year. Historical purse balances are used only where verified.</span></div><label className="field-label">Auction name<input value={form.name} onChange={e=>update('name',e.target.value)} minLength="3" maxLength="120" required/></label>
        <div className="two-cols"><label className="field-label">Auction format<select value={form.auction_type} onChange={e=>update('auction_type',e.target.value)}><option value="mini">Mini auction</option><option value="mega">Mega auction</option></select></label><label className="field-label">Purse per franchise (Cr)<input type="number" min="1" step="0.05" value={form.total_purse} onChange={e=>update('total_purse',Number(e.target.value))}/></label></div>
        <div className="section-title"><div><h3>Choose franchises</h3><p>Select 2–10 teams for this auction.</p></div><b>{selected.length}/10</b></div><div className="team-grid">{franchises.map(t=><button type="button" key={t.short_name} className={`team-chip ${selected.includes(t.short_name)?'selected':''}`} onClick={()=>toggleTeam(t.short_name)}><span className="team-code" style={{background:t.color||'#344054'}}>{t.short_name}</span><span>{t.name}</span><span className="check">{selected.includes(t.short_name)?'✓':'+'}</span></button>)}</div>
        <div className="section-title"><div><h3>Human-controlled franchises</h3><p>Each remaining franchise is managed by an AI bot.</p></div><b>{humans.filter(h=>selected.includes(h)).length} human · {botCount} bots</b></div><div className="human-list">{selectedTeams.map(t=><label key={t.short_name} className="human-option"><input type="checkbox" checked={humans.includes(t.short_name)} onChange={()=>toggleHuman(t.short_name)}/><span>{t.name}</span><small>{humans.includes(t.short_name)?'HUMAN':'AI BOT'}</small></label>)}</div>
        <div className="section-title"><div><h3>Squad and auction rules</h3><p>Configure the limits for every franchise.</p></div></div><div className="two-cols"><label className="field-label">Minimum squad size<input type="number" min="1" max="50" value={form.min_squad_size} onChange={e=>update('min_squad_size',Number(e.target.value))}/></label><label className="field-label">Maximum squad size<input type="number" min="5" max="50" value={form.max_squad_size} onChange={e=>update('max_squad_size',Number(e.target.value))}/></label><label className="field-label">Maximum overseas players<input type="number" min="0" max="25" value={form.max_overseas_players} onChange={e=>update('max_overseas_players',Number(e.target.value))}/></label><label className="field-label">Bid timer (seconds)<input type="number" min="5" max="120" value={form.bid_timer_seconds} onChange={e=>update('bid_timer_seconds',Number(e.target.value))}/></label></div>
        <div className="two-cols"><label className="field-label">AI difficulty<select value={form.difficulty} onChange={e=>update('difficulty',e.target.value)}><option value="realistic">Realistic</option><option value="advanced">Advanced</option></select></label><label className="field-label">Default bot personality<select value={form.personality} onChange={e=>update('personality',e.target.value)}><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option><option value="conservative">Conservative</option><option value="value">Value hunter</option></select></label></div>
        <div className="switch-row"><div><b>Automatic auctioneer</b><small>Automatically advances to the next player after each sale.</small></div><input type="checkbox" checked={form.automatic_auctioneer} onChange={e=>update('automatic_auctioneer',e.target.checked)}/></div><div className="switch-row"><div><b>Save and resume</b><small>Store this auction in this browser automatically.</small></div><input type="checkbox" checked={form.allow_pause_resume} onChange={e=>update('allow_pause_resume',e.target.checked)}/></div>
        <div className="source-note"><Sparkles size={16}/><span><b>Demo player pool loaded.</b> These are sample entries, not a verified official auction list. Import your own CSV before a real-world simulation.</span></div>{error&&<div className="error">{error}</div>}<button className="primary-btn" type="submit"><Play size={17}/> Create auction room</button></form>
        <aside className="side-column"><div className="panel summary-panel"><div className="eyebrow">LIVE CONFIGURATION</div><h2>Room overview</h2><div className="metric"><Users/><div><strong>{selected.length}</strong><span>Franchises selected</span></div></div><div className="metric"><Bot/><div><strong>{botCount}</strong><span>AI-controlled franchises</span></div></div><div className="metric"><Wallet/><div><strong>{money(form.total_purse)}</strong><span>Starting purse per franchise</span></div></div><div className="metric"><Activity/><div><strong>{form.auction_type.toUpperCase()}</strong><span>Auction format</span></div></div><div className="note"><b>AI squad planning</b><p>Each bot tracks role coverage, remaining budget, overseas availability and squad size. Its maximum bid changes with its needs.</p></div></div><div className="panel import-card"><div className="eyebrow">CUSTOM PLAYER POOL</div><h3>Bring your own auction list</h3><p>Upload PDF, XLSX or CSV. The backend extracts player fields into a reviewable pool; CSV also has an offline browser fallback.</p><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import player file</button><input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf,text/csv,application/pdf" hidden onChange={e=>importFile(e.target.files?.[0])}/>{uploadMessage&&<p className="upload-message">{uploadMessage}</p>}</div></aside></div>}
      {tab==='players'&&<div className="panel pool-panel"><div className="panel-heading"><div><div className="eyebrow">PLAYER DATABASE</div><h2>Available player pool</h2><p>{players.length} players · Demo dataset or your imported CSV</p></div><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import player file</button><input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf,text/csv,application/pdf" hidden onChange={e=>importFile(e.target.files?.[0])}/></div><div className="searchbar"><Search size={17}/><input placeholder="Search player name" value={search} onChange={e=>setSearch(e.target.value)}/></div>{uploadMessage&&<div className="source-note">{uploadMessage}</div>}<div className="table-wrap"><table><thead><tr><th>PLAYER NAME</th><th>BASE PRICE</th></tr></thead><tbody>{filteredPlayers.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{money(p.base_price)}</td></tr>)}</tbody></table></div><p className="muted small">Official IPL 2025 mega-auction player pool. Prices are displayed in crore (₹ Cr); nationality and role are retained internally for auction eligibility and squad rules.</p></div>}
      {tab==='room'&&game&&<AuctionRoom game={game} currentPlayer={currentPlayer} currentBid={currentBid} highestTeam={highestTeam} humanTeam={humanTeam} bidAmount={bidAmount} setBidAmount={setBidAmount} onStart={beginAuction} onBid={humanBid} onBotRound={runBots} onSell={sellCurrent} onEndAuction={endAuctionAndCompleteSquads} onSkip={()=>{if(!game||!currentPlayer)return;const g=structuredClone(game);const p=g.players.find(x=>x.id===g.currentPlayer.id);allocateSkippedPlayer(g,p);saveGame(nextLot(g));}} onPause={pauseGame} onRefresh={()=>{const g=readStore().find(x=>x.id===game.id);if(g)setGame(g);}} onBack={()=>setTab('saved')} error={error} setError={setError}/>}
      {tab==='saved'&&<div className="panel saved-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR AUCTIONS</div><h2>Saved auction rooms</h2><p>Games are saved automatically in this browser.</p></div></div>{games.length===0?<div className="empty-state"><Trophy size={30}/><h3>No saved auctions yet</h3><p>Create an auction to see it here.</p><button className="primary-btn" onClick={()=>setTab('setup')}>Create first auction</button></div>:<div className="saved-list">{games.map(g=><div className="saved-item" key={g.id}><div className="saved-icon"><Gavel/></div><div className="saved-info"><b>{g.name}</b><span>{g.format.toUpperCase()} · {g.teams.length} teams · {g.results.length} purchases · {new Date(g.createdAt).toLocaleString()}</span></div><span className={`game-status ${g.status}`}>{g.status}</span><button className="secondary-btn compact" onClick={()=>openSaved(g)}>Open <ChevronRight size={14}/></button><button className="icon-btn" title="Delete" onClick={()=>{if(confirm('Delete this saved auction?')){setGames(old=>old.filter(x=>x.id!==g.id));deleteGameSnapshot(g.id).catch(()=>{});}}}><X size={16}/></button></div>)}</div>}</div>}
    </main><footer><span>AUCTION ARENA</span><span>Demo build · v0.2.0 · Browser autosave</span></footer>
  </div>;
}

function AuctionRoom({game,currentPlayer,currentBid,highestTeam,humanTeam,bidAmount,setBidAmount,onStart,onBid,onBotRound,onSell,onEndAuction,onSkip,onPause,onBack,error,setError}) {
  const [showSquads,setShowSquads] = useState(false);
  const [showSoldPlayers,setShowSoldPlayers] = useState(true);
  const [activity,setActivity] = useState(true);
  const [showTeams,setShowTeams] = useState(false);
  const [flashCountdown,setFlashCountdown] = useState(false);
  const [secondsLeft,setSecondsLeft] = useState(Number(game.rules.bid_timer_seconds || 20));
  useEffect(() => {
    if (game.status !== 'live' || !currentPlayer || !game.rules.automatic_auctioneer) return;
    setSecondsLeft(Number(game.rules.bid_timer_seconds || 20));
    const interval = setInterval(() => setSecondsLeft(value => {
      if (value <= 1) { clearInterval(interval); onSell(); return 0; }
      if (value <= 4) setFlashCountdown(true); else setFlashCountdown(false);
      return value - 1;
    }), 1000);
    return () => clearInterval(interval);
  }, [game.currentPlayer?.id, currentBid, game.status, game.rules.automatic_auctioneer, game.rules.bid_timer_seconds]);
  useEffect(() => {
    if (game.status !== 'live' || !currentPlayer || !game.rules.automatic_auctioneer) return;
    const timer = setTimeout(() => onBotRound(), 1200);
    return () => clearTimeout(timer);
  }, [game.status, currentPlayer?.id, currentBid, highestTeam?.code, humanTeam?.code, game.rules.automatic_auctioneer]);
  function assessTeam(t){
    const s=t.squad||[],c={Batter:0,'Fast bowler':0,'All-rounder':0,Wicketkeeper:0,Spinner:0};
    s.forEach(p=>{const r=/keeper/i.test(p.role||'')?'Wicketkeeper':/all/i.test(p.role||'')?'All-rounder':/spin|leg|off/i.test(p.role||'')?'Spinner':/bowl|pace|fast|medium/i.test(p.role||'')?'Fast bowler':'Batter';c[r]++;});
    const targets={Batter:5,'Fast bowler':5,'All-rounder':2,Wicketkeeper:2,Spinner:2};
    const strengths=[];if(c.Batter>=6)strengths.push('Batting depth');if(c['Fast bowler']>=5)strengths.push('Pace bowling depth');if(c.Spinner>=2)strengths.push('Spin options');if(c['All-rounder']>=3)strengths.push('All-rounder flexibility');if(c.Wicketkeeper>=2)strengths.push('Keeper backup');if(t.overseas>=7)strengths.push('Overseas balance');
    const weaknesses=[];if(c.Batter<5)weaknesses.push('Batting depth');if(c['Fast bowler']<5)weaknesses.push('Fast-bowling backup');if(c.Spinner<2)weaknesses.push('Spin backup');if(c['All-rounder']<2)weaknesses.push('All-rounder options');if(c.Wicketkeeper<2)weaknesses.push('Second wicketkeeper');if(t.overseas<7)weaknesses.push('Overseas balance: '+t.overseas+'/7');
    const form={'Sai Sudharsan':1,'Suryakumar Yadav':1,'Virat Kohli':0.95,'Shubman Gill':0.95,'Shreyas Iyer':1,'KL Rahul':0.9,'Jos Buttler':0.95,'Nicholas Pooran':1,'Heinrich Klaasen':0.95,'Abhishek Sharma':0.9,'Prasidh Krishna':1,'Noor Ahmad':0.95,'Josh Hazlewood':0.95,'Arshdeep Singh':0.95,'Jasprit Bumrah':1,'Varun Chakaravarthy':0.9,'Trent Boult':0.9};
    const q=s.length?s.reduce((v,p)=>v+Math.min(1.15,0.58+Math.min(1,Math.log1p(Number(p.sold_price||p.base_price||0.3))/Math.log(16))*0.35+(form[p.name]||0)*0.18),0)/s.length:0;
    const role=Object.keys(targets).reduce((v,r)=>v+Math.min(1,c[r]/targets[r]),0)/5;const backup=Object.keys(targets).reduce((v,r)=>v+(c[r]>=targets[r]+2?1:c[r]>=targets[r]?0.65:c[r]>=targets[r]-1?0.3:0),0)/5;
    const rating=Math.max(2.5,Math.min(9.8,10*(0.34*role+0.24*q+0.18*Math.min(1,s.length/18)+0.12*Math.min(1,t.overseas/7)+0.12*backup)));
    if(!strengths.length)strengths.push('No standout unit yet');if(!weaknesses.length)weaknesses.push('No major role gap; monitor form and workload');
    const top=s.slice().sort((a,b)=>((form[b.name]||0)+(Number(b.sold_price)||0)/30)-((form[a.name]||0)+(Number(a.sold_price)||0)/30)).slice(0,3).map(p=>p.name);return {rating,strengths,weaknesses,top};
  }
  const topBids = game.bidHistory.slice(-8).reverse();
  const bidIncrement = (amount) => amount >= 10 ? 1 : amount >= 5 ? 0.5 : amount >= 2 ? 0.2 : 0.1;
  const minBid = currentBid ? currentBid + bidIncrement(currentBid) : (currentPlayer?.base_price || 0);
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
          <><div className="auction-placeholder"><Trophy size={42}/><h2>Auction completed</h2><p>{game.results.length} players sold. Your results are saved.</p><button className="secondary-btn" onClick={onBack}>View saved auctions</button></div>
          <div className="team-squad-grid">{game.teams.map(t=>{const a=assessTeam(t);return <div className="squad-card" key={t.code}><div className="squad-head"><b>{t.name}</b><strong>{a.rating.toFixed(1)}/10</strong></div><p><b>Strengths:</b> {a.strengths.join(", ")}</p><p><b>Weaknesses:</b> {a.weaknesses.join(", ")}</p><p><b>Players to watch:</b> {a.top.join(", ")||"No purchases yet"}</p><p><b>Squad:</b> {t.squad.length} players · {t.overseas} overseas · {money(t.purse)} left</p></div>;})}</div></>
        ) : (
          <>
            <div className="lot-label"><span>LOT {game.currentIndex + 1}</span><span>{game.rules.automatic_auctioneer ? `BID CLOSES IN ${secondsLeft}s` : 'MANUAL LOT CONTROL'}</span><span>{game.queue.length - game.currentIndex - 1} players after this</span></div>
            {flashCountdown && <div className="countdown-flash" key={secondsLeft}>{secondsLeft <= 3 ? secondsLeft : "SELLING SOON"}</div>}
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
              <div className="bid-entry"><label>YOUR NEXT BID</label><div className="bid-input-wrap"><button className="primary-btn bid-now" onClick={onBid} disabled={!humanTeam || highestTeam?.code === humanTeam.code || !currentPlayer || humanTeam?.purse < minBid}>BID {money(minBid)}</button><button className="secondary-btn" onClick={onSkip}><SkipForward size={15}/> Skip player</button></div><small>One tap bids the next valid increment automatically.</small></div>
              <div className="auction-actions"><button className="secondary-btn" onClick={onPause}><Pause size={15}/> Pause auction</button>{humanTeam && humanTeam.squad.length>=Number(game.rules.min_squad_size) && humanTeam.squad.length<=Number(game.rules.max_squad_size) && <button className="primary-btn" onClick={onEndAuction}><Trophy size={15}/> End auction &amp; complete AI squads</button>}</div>
            </div>
            {error && <div className="error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
          </>
        )}
        <div className="room-bottom"><button className="text-btn" onClick={() => setShowSquads(!showSquads)}><Users size={15}/>{showSquads ? 'Hide' : 'View'} squads and needs</button><button className="text-btn" onClick={() => setShowTeams(!showTeams)}><Users size={15}/>{showTeams ? "Hide" : "View"} all team squads</button><button className="text-btn" onClick={() => setShowSoldPlayers(!showSoldPlayers)}><Trophy size={15}/>{showSoldPlayers ? 'Hide' : 'View'} sold players ({game.results.length})</button><button className="text-btn" onClick={() => setActivity(!activity)}><Activity size={15}/>{activity ? 'Hide' : 'Show'} bid history</button></div>
        {showSoldPlayers && <div className="sold-players-panel">
          <div className="section-title"><div><h3>Sold players</h3><p>Completed purchases in this auction</p></div><b>{game.results.length} sold</b></div>
          {game.results.length ? <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>FRANCHISE</th><th>SOLD PRICE</th></tr></thead><tbody>{game.results.slice().reverse().map((r,i)=>{const player=game.players.find(p=>p.name===r.player);const team=game.teams.find(t=>t.code===r.team);return <tr key={`${r.player}-${i}`}><td><b>{r.player}</b><small className="sold-role">{player?.role || '—'}</small></td><td><span className="franchise-badge sold-team-badge" style={{background:team?.color || '#344054'}}>{r.team}</span> {team?.name || r.team}</td><td><b className="sold-price">{money(r.price)}</b></td></tr>;})}</tbody></table></div> : <div className="sold-empty">No players have been sold yet. Completed purchases will appear here automatically.</div>}
        </div>}
        {(showSquads || showTeams) && <div className="team-squad-grid">{game.teams.map(t => (
          <div className="squad-card" key={t.code}>
            <div className="squad-head"><b>{t.code}</b><span>{money(t.purse)}</span></div>
            <small>{t.squad.length} players · {t.overseas} overseas · {t.control === 'bot' ? 'AI' : 'Human'}</small>
            <div className="squad-names">{t.squad.length ? t.squad.map(p => <span key={p.id}>{p.name}{isOverseas(p) && <Plane size={12} title='Overseas player'/>}<i>{p.retained ? 'Retained' : money(p.sold_price)}</i></span>) : <em>No purchases yet</em>}</div>
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
