const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const CATEGORIES = {
  pengeluaran: [
    {id:'transportasi', label:'Transportasi', details:['Bensin','Parkir','Tol','Servis','Oli','Cuci Kendaraan','Pajak Kendaraan','Modifikasi']},
    {id:'makanan', label:'Makanan & Minuman', details:['Makan Berat','Jajan','Minuman','Delivery','Nongkrong']},
    {id:'rumah_tangga', label:'Rumah Tangga', details:['Deterjen','Sabun','Sampo','Pasta Gigi','Tisu','Pembersih Rumah','Peralatan Rumah']},
    {id:'tagihan', label:'Tagihan & Langganan', details:['Pulsa','Listrik','Air','Internet','Netflix','Spotify','Cloud Storage']},
    {id:'belanja', label:'Belanja', details:['Pakaian','Aksesoris','Elektronik','Hobi','Hadiah']},
    {id:'hiburan', label:'Hiburan', details:['Game','Bioskop','Wisata','Nongkrong','Event']},
    {id:'kesehatan', label:'Kesehatan', details:['Obat','Vitamin','Dokter','BPJS','Olahraga']},
    {id:'keuangan', label:'Keuangan', details:['Tabungan','Investasi','Dana Darurat','Cicilan','Hutang']}
  ],
  pemasukan: [
    {id:'pendapatan', label:'Pendapatan', details:['Gaji','Freelance','Bonus']},
    {id:'lainnya_in', label:'Lainnya', details:['Hadiah','Transfer Ortu','Hasil Jual','Dividen']}
  ]
};

const ALLOC_DEFAULTS = {
  transportasi:15, makanan:25, rumah_tangga:10, tagihan:15,
  belanja:10, hiburan:10, kesehatan:10, keuangan:5
};

const ALLOC_COLORS = ['#5C715E','#3a7d5e','#9DB5A3','#7aab8a','#2D3A2F','#CDE3D6','#4a6952','#b9d4c2'];

const now = new Date();
let curMonth = now.getMonth();
let curYear = now.getFullYear();
let allData = {};
let alloc = {...ALLOC_DEFAULTS};
let allocSaved = false;
let userName = '';
let chartCompare=null, chartPie=null, chartLine=null, chartAllocPie=null;

function key(m,y){ return y+'-'+String(m+1).padStart(2,'0') }
function getEntries(m,y){ return allData[key(m,y)] || [] }
function fmt(n){ return 'Rp '+Math.round(n).toLocaleString('id-ID') }
function fmtShort(n){
  if(n>=1000000) return 'Rp '+(n/1000000).toFixed(1)+'jt';
  if(n>=1000) return 'Rp '+(n/1000).toFixed(0)+'rb';
  return 'Rp '+Math.round(n);
}

// ============================================================
// BROWSER SAVE SYSTEM (localStorage)
// ============================================================
const STORAGE_KEY = 'bdgting_state_v1';

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userName, allData, alloc, allocSaved, curMonth, curYear
    }));
  }catch(err){
    console.error('Gagal simpan data ke browser:', err);
  }
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(!data || !data.userName) return false;
    userName   = data.userName;
    allData    = data.allData || {};
    alloc      = data.alloc || {...ALLOC_DEFAULTS};
    allocSaved = !!data.allocSaved;
    curMonth   = (typeof data.curMonth === 'number') ? data.curMonth : now.getMonth();
    curYear    = (typeof data.curYear === 'number') ? data.curYear : now.getFullYear();
    return true;
  }catch(err){
    console.error('Gagal load data dari browser:', err);
    return false;
  }
}

function resetState(){
  if(!confirm('Yakin mau hapus semua data dan mulai ulang dari awal? Aksi ini tidak bisa dibatalkan.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ============================================================
// MOBILE NAVIGATION — bottom tabs & form bottom-sheet
// (Tidak berpengaruh di tampilan PC, di sana semua section
//  selalu terlihat lewat CSS media query)
// ============================================================
let currentPage = 'beranda';

function showPage(name){
  currentPage = name;
  document.querySelectorAll('.page').forEach(p=>{
    p.classList.toggle('active', p.dataset.page === name);
  });
  document.querySelectorAll('.nav-item').forEach(b=>{
    b.classList.toggle('active', b.dataset.target === name);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

function openAddForm(){
  document.getElementById('add-form').classList.add('modal-open');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeAddForm(){
  document.getElementById('add-form').classList.remove('modal-open');
  document.getElementById('modal-overlay').classList.remove('active');
}


function startApp(){
  const name = document.getElementById('ob-name').value.trim();
  if(!name){ document.getElementById('ob-err').textContent='Isi namamu dulu ya 😊'; return; }
  userName = name;
  saveState();
  enterApp();
}
document.getElementById('ob-name').addEventListener('keydown',e=>{ if(e.key==='Enter') startApp(); });

function enterApp(){
  document.getElementById('onboarding').style.display='none';
  const appEl = document.getElementById('app');
  appEl.style.display='block';
  appEl.classList.add('app-enter');

  // greeting & date
  const hrs = now.getHours();
  const salam = hrs < 12 ? 'Selamat Pagi' : hrs < 15 ? 'Selamat Siang' : hrs < 18 ? 'Selamat Sore' : 'Selamat Malam';
  document.getElementById('greeting-text').textContent = salam+', '+userName+'! 👋';
  document.getElementById('greeting-date').textContent = DAYS[now.getDay()]+', '+now.getDate()+' '+MONTHS[now.getMonth()]+' '+now.getFullYear()+' ✦';

  buildAllocGrid();
  buildTicker();
  showPage('beranda'); // pastikan tab Beranda aktif (relevan di tampilan HP)

  // kalau alokasi udah pernah disimpan sebelumnya, tampilkan langsung
  if(allocSaved){
    renderAllocPie();
    document.getElementById('alloc-result').style.display='grid';
    document.getElementById('budget-bar-section').style.display='block';
    document.getElementById('alloc-btn-icon').textContent='✓';
  }

  refresh();
}

// ---- ALLOC GRID ----
function buildAllocGrid(){
  const grid = document.getElementById('alloc-grid');
  grid.innerHTML = CATEGORIES.pengeluaran.map(c=>`
    <div class="alloc-item">
      <div class="alloc-label">${c.label}</div>
      <div class="alloc-row">
        <input class="alloc-input" type="number" id="alloc-${c.id}" value="${alloc[c.id]||0}" min="0" max="100" oninput="updateAllocTotal()">
        <span class="alloc-pct">%</span>
      </div>
    </div>
  `).join('');
  updateAllocTotal();
}

function updateAllocTotal(){
  let total=0;
  CATEGORIES.pengeluaran.forEach(c=>{
    const v = parseFloat(document.getElementById('alloc-'+c.id)?.value)||0;
    total+=v;
  });
  const el = document.getElementById('alloc-total-val');
  el.textContent = total+'%';
  el.className = 'alloc-total-val '+(total===100?'alloc-ok':'alloc-warn');
}

function saveAlloc(){
  let total=0;
  CATEGORIES.pengeluaran.forEach(c=>{
    const v = parseFloat(document.getElementById('alloc-'+c.id)?.value)||0;
    alloc[c.id]=v; total+=v;
  });
  if(Math.round(total)!==100){
    alert('Total alokasi harus 100%. Sekarang: '+total+'%');
    return;
  }
  allocSaved=true;
  document.getElementById('budget-bar-section').style.display='block';
  document.getElementById('alloc-btn-icon').textContent='✓';

  // Tampilkan pie alokasi
  renderAllocPie();
  document.getElementById('alloc-result').style.display='grid';
  saveState();
  refresh();
}

function renderAllocPie(){
  const cats = CATEGORIES.pengeluaran;
  const labels = cats.map(c=>c.label);
  const vals = cats.map(c=>alloc[c.id]||0);
  const ctx = document.getElementById('chart-alloc-pie');
  if(chartAllocPie){chartAllocPie.destroy();chartAllocPie=null;}
  chartAllocPie = new Chart(ctx,{
    type:'doughnut',
    data:{
      labels,
      datasets:[{data:vals,backgroundColor:ALLOC_COLORS,borderColor:'#ffffff',borderWidth:2}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      cutout:'60%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>c.label+': '+c.raw+'%'}}
      },
      animation:{animateRotate:true,duration:600}
    }
  });

  // Legend
  const legend = document.getElementById('alloc-legend');
  legend.innerHTML = cats.map((c,i)=>`
    <div class="alloc-leg-item">
      <span class="alloc-leg-dot" style="background:${ALLOC_COLORS[i]}"></span>
      <span>${c.label}</span>
      <span class="alloc-leg-pct">${alloc[c.id]||0}%</span>
    </div>
  `).join('');
}

// ---- DATE INPUT ----
function setDateInput(){
  const d = document.getElementById('inp-date');
  const last = new Date(curYear, curMonth+1, 0).getDate();
  // clamp day to last day of month
  const todayDay = (curMonth===now.getMonth() && curYear===now.getFullYear()) ? now.getDate() : last;
  const useDay = Math.min(todayDay, last);
  d.value = curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(useDay).padStart(2,'0');
  d.min = curYear+'-'+String(curMonth+1).padStart(2,'0')+'-01';
  d.max = curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(last).padStart(2,'0');
}

function updateCategoryOpts(){
  const tp = document.getElementById('inp-type').value;
  const catSel = document.getElementById('inp-cat');
  const catGroup = document.getElementById('cat-group');
  if(tp==='pengeluaran'){
    catGroup.style.display='flex';
    catSel.innerHTML = CATEGORIES.pengeluaran.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  } else {
    catGroup.style.display='none';
  }
  updateDetailOpts();
}

function updateDetailOpts(){
  const tp = document.getElementById('inp-type').value;
  const detSel = document.getElementById('inp-detail');
  if(tp==='pemasukan'){
    const all = CATEGORIES.pemasukan.flatMap(c=>c.details);
    detSel.innerHTML = all.map(d=>`<option value="${d}">${d}</option>`).join('');
  } else {
    const catId = document.getElementById('inp-cat').value;
    const cat = CATEGORIES.pengeluaran.find(c=>c.id===catId);
    detSel.innerHTML = (cat?cat.details:[]).map(d=>`<option value="${d}">${d}</option>`).join('');
  }
}

function changeMonth(d){
  curMonth+=d;
  if(curMonth<0){curMonth=11;curYear--}
  if(curMonth>11){curMonth=0;curYear++}
  saveState();
  refresh();
}

// ---- ADD ENTRY ----
function formatAmountInput(el){
  // Ambil hanya angka
  let raw = el.value.replace(/\D/g,'');
  // Simpan raw value di dataset
  el.dataset.raw = raw;
  // Format dengan titik
  if(raw){
    el.value = parseInt(raw,10).toLocaleString('id-ID');
  }
}

function addEntry(){
  const dt = document.getElementById('inp-date').value;
  const tp = document.getElementById('inp-type').value;
  const catId = tp==='pengeluaran' ? document.getElementById('inp-cat').value : '';
  const catLabel = tp==='pengeluaran' ? (CATEGORIES.pengeluaran.find(c=>c.id===catId)?.label||'') : '';
  const det = document.getElementById('inp-detail').value;
  const amtInp = document.getElementById('inp-amount');
  // Baca dari dataset.raw (angka bersih) atau dari value
  const rawVal = amtInp.dataset.raw || amtInp.value.replace(/\D/g,'');
  const amt = parseFloat(rawVal);
  if(!dt||!amt||amt<=0){
    amtInp.classList.add('form-inp-err');
    setTimeout(()=>amtInp.classList.remove('form-inp-err'),600);
    return;
  }
  const k = key(curMonth, curYear);
  if(!allData[k]) allData[k]=[];
  const newEntry = {id:Date.now(),date:dt,type:tp,catId,catLabel,detail:det,amount:amt};
  allData[k].push(newEntry);
  allData[k].sort((a,b)=>a.date.localeCompare(b.date));
  amtInp.value='';
  amtInp.dataset.raw='';
  saveState();
  refresh();
  closeAddForm();
}

function deleteEntry(id){
  const k = key(curMonth, curYear);
  allData[k]=(allData[k]||[]).filter(e=>e.id!==id);
  saveState();
  refresh();
}

function calcTotals(entries){
  let ins=0,out=0,cnt_in=0,cnt_out=0;
  entries.forEach(e=>{
    if(e.type==='pemasukan'){ins+=e.amount;cnt_in++;}
    else{out+=e.amount;cnt_out++;}
  });
  return{ins,out,net:ins-out,cnt_in,cnt_out};
}

function spendByCategory(entries){
  const map={};
  CATEGORIES.pengeluaran.forEach(c=>map[c.id]=0);
  entries.filter(e=>e.type==='pengeluaran').forEach(e=>{ if(e.catId) map[e.catId]=(map[e.catId]||0)+e.amount; });
  return map;
}

function topCategory(entries){
  const spend = spendByCategory(entries);
  let top=null, topAmt=0;
  CATEGORIES.pengeluaran.forEach(c=>{ if((spend[c.id]||0)>topAmt){topAmt=spend[c.id];top=c.label;} });
  return top;
}

// ---- WARNINGS ----
function checkWarnings(entries, totalIn){
  if(!allocSaved||totalIn<=0) return [];
  const spend = spendByCategory(entries);
  const warns=[];
  CATEGORIES.pengeluaran.forEach(c=>{
    const budget = totalIn * (alloc[c.id]||0) / 100;
    const spent = spend[c.id]||0;
    if(budget>0 && spent>budget){
      warns.push({cat:c.label, spent, budget, pct:Math.round(spent/budget*100)});
    }
  });
  return warns;
}

// ---- INSIGHT ----
function renderInsight(entries, ins, out){
  const card = document.getElementById('insight-card');
  const icon = document.getElementById('insight-icon');
  const text = document.getElementById('insight-text');
  if(!entries.length){ card.style.display='none'; return; }
  card.style.display='flex';

  const savingsRate = ins>0 ? ((ins-out)/ins*100) : 0;
  const spend = spendByCategory(entries);
  const topCat = topCategory(entries);

  let msg='', ic='💡';
  if(ins===0 && out>0){
    ic='⚠️'; msg='Kamu belum catat pemasukan bulan ini. Jangan lupa tambahin ya!';
  } else if(savingsRate>=30){
    ic='🎉'; msg=`Mantap! Savings rate kamu bulan ini <strong>${savingsRate.toFixed(0)}%</strong> — udah di atas target ideal 30%. Pertahankan!`;
  } else if(savingsRate>0 && savingsRate<30){
    ic='📈'; msg=`Savings rate kamu <strong>${savingsRate.toFixed(0)}%</strong>. Target idealnya minimal 30% — masih bisa ditingkatin!`;
  } else if(out>ins && ins>0){
    ic='🚨'; msg=`Pengeluaran bulan ini melebihi pemasukan sebesar <strong>${fmt(out-ins)}</strong>. Yuk review pengeluaranmu!`;
  }

  if(topCat && msg){
    msg += ` Kategori terbesar: <strong>${topCat}</strong> (${fmt(spend[CATEGORIES.pengeluaran.find(c=>c.label===topCat)?.id]||0)}).`;
  }

  if(!msg && topCat){
    ic='📊'; msg=`Pengeluaran terbesar bulan ini di kategori <strong>${topCat}</strong>: ${fmt(spend[CATEGORIES.pengeluaran.find(c=>c.label===topCat)?.id]||0)}.`;
  }

  icon.textContent=ic;
  text.innerHTML=msg||'—';
}

// ---- RENDER ----
function renderBalance(){
  const entries = getEntries(curMonth, curYear);
  const {ins,out,net,cnt_in,cnt_out} = calcTotals(entries);

  // main bal
  document.getElementById('bal-in').textContent = fmt(ins);
  document.getElementById('bal-out').textContent = fmt(out);
  document.getElementById('bal-in-sub').textContent = cnt_in+' transaksi';
  document.getElementById('bal-out-sub').textContent = cnt_out+' transaksi';
  const netEl = document.getElementById('bal-net');
  netEl.textContent = (net>=0?'+':'')+fmt(net);
  netEl.className = 'bal-amount '+(net>=0?'bal-net-pos':'bal-net-neg');

  // savings rate badge
  const srBadge = document.getElementById('savings-rate-badge');
  const srVal = document.getElementById('savings-rate-val');
  if(ins>0){
    const sr = ((ins-out)/ins*100);
    srBadge.style.display='block';
    srVal.textContent = (sr>=0?'+':'')+sr.toFixed(1)+'%';
    srBadge.style.background = sr>=0 ? 'rgba(58,125,94,0.1)' : 'var(--red-bg)';
    srBadge.style.borderColor = sr>=0 ? 'var(--green)' : 'var(--red)';
    srVal.style.color = sr>=0 ? 'var(--green)' : 'var(--red)';
  } else {
    srBadge.style.display='none';
  }

  // quick strip
  const spend = spendByCategory(entries);
  const savedAmt = spend['keuangan'] || 0;
  document.getElementById('qs-in').textContent = fmtShort(ins);
  document.getElementById('qs-out').textContent = fmtShort(out);
  document.getElementById('qs-in-tx').textContent = cnt_in+' transaksi';
  document.getElementById('qs-out-tx').textContent = cnt_out+' transaksi';
  document.getElementById('qs-save').textContent = fmtShort(savedAmt);
  document.getElementById('qs-save-pct').textContent = ins>0 ? ((savedAmt/ins*100).toFixed(1)+'% dari pemasukan') : '—';
  document.getElementById('qs-total-tx').textContent = cnt_in+cnt_out;
  const tc = topCategory(entries);
  document.getElementById('qs-top-cat').textContent = tc ? ('🏆 '+tc) : 'belum ada data';

  // warnings
  const warns = checkWarnings(entries, ins);
  const wbox = document.getElementById('warn-box');
  const wlist = document.getElementById('warn-list');
  if(warns.length){
    wbox.classList.add('active');
    wlist.innerHTML = warns.map(w=>`<div class="warn-item">• <b>${w.cat}</b>: pengeluaran ${fmt(w.spent)} melebihi target ${fmt(w.budget)} (${w.pct}%)</div>`).join('');
  } else {
    wbox.classList.remove('active');
    wlist.innerHTML='';
  }

  // insight
  renderInsight(entries, ins, out);
}

function renderBudgetBars(){
  if(!allocSaved) return;
  const entries = getEntries(curMonth, curYear);
  const {ins} = calcTotals(entries);
  const spend = spendByCategory(entries);
  const bars = document.getElementById('budget-bars');
  bars.innerHTML = CATEGORIES.pengeluaran.map(c=>{
    const budget = ins * (alloc[c.id]||0) / 100;
    const spent = spend[c.id]||0;
    const pct = budget>0 ? Math.min((spent/budget)*100,100) : 0;
    const cls = pct>=100?'bbar-over':pct>=80?'bbar-warn':'bbar-ok';
    const realPct = budget>0 ? ((spent/budget)*100).toFixed(0) : 0;
    return `<div class="bbar-row">
      <div class="bbar-info">
        <span class="bbar-name">${c.label}</span>
        <span class="bbar-nums">${fmtShort(spent)} / ${fmtShort(budget)} &nbsp;·&nbsp; ${realPct}%</span>
      </div>
      <div class="bbar-track"><div class="bbar-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

function renderTable(){
  const entries = getEntries(curMonth, curYear);
  const {ins} = calcTotals(entries);
  const spend = spendByCategory(entries);
  const tbody = document.getElementById('entry-tbody');

  // last tx info
  const ltEl = document.getElementById('last-tx-info');
  if(entries.length){
    const last = entries[entries.length-1];
    ltEl.textContent = 'Transaksi terakhir: '+last.detail+' — '+fmt(last.amount);
  } else {
    ltEl.textContent='';
  }

  if(!entries.length){
    tbody.innerHTML=`<tr class="empty-row"><td colspan="7">Belum ada transaksi. Yuk mulai catat! ✦</td></tr>`;
    return;
  }
  tbody.innerHTML = [...entries].reverse().map(e=>{
    const isIn = e.type==='pemasukan';
    const [y,m,d]=e.date.split('-');
    const dLabel=d+'/'+m+'/'+y;
    let warnFlag='';
    if(!isIn && allocSaved && ins>0 && e.catId){
      const budget = ins*(alloc[e.catId]||0)/100;
      const spent = spend[e.catId]||0;
      if(spent>budget) warnFlag='<span class="td-warn">⚠ Over</span>';
    }
    return `<tr>
      <td class="td-date">${dLabel}</td>
      <td class="${isIn?'td-type-in':'td-type-out'}">${isIn?'↑ Masuk':'↓ Keluar'}</td>
      <td class="td-cat">${e.catLabel||'—'}</td>
      <td class="td-detail">${e.detail}</td>
      <td class="${isIn?'td-amount-in':'td-amount-out'}">${fmt(e.amount)}</td>
      <td>${warnFlag}</td>
      <td class="td-del"><button class="btn-del" onclick="deleteEntry(${e.id})" title="Hapus">✕</button></td>
    </tr>`;
  }).join('');
}

function renderCompareChart(){
  const curr = calcTotals(getEntries(curMonth,curYear));
  let pm=curMonth-1,py=curYear;
  if(pm<0){pm=11;py--}
  const prev = calcTotals(getEntries(pm,py));
  const ctx = document.getElementById('chart-compare');
  if(chartCompare){chartCompare.destroy();chartCompare=null;}
  chartCompare = new Chart(ctx,{
    type:'bar',
    data:{
      labels:['Pemasukan','Pengeluaran'],
      datasets:[
        {label:'Bulan Ini',data:[curr.ins,curr.out],backgroundColor:'rgba(92,113,94,0.85)',borderColor:'#5C715E',borderWidth:1,borderRadius:6},
        {label:'Bulan Lalu',data:[prev.ins,prev.out],backgroundColor:'rgba(205,227,214,0.8)',borderColor:'#9DB5A3',borderWidth:1,borderRadius:6}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmtShort(c.raw)}}},
      scales:{
        x:{ticks:{color:'#9DB5A3',font:{size:11}},grid:{color:'rgba(157,181,163,0.2)'},border:{color:'transparent'}},
        y:{ticks:{color:'#9DB5A3',font:{size:10},callback:v=>fmtShort(v)},grid:{color:'rgba(157,181,163,0.2)'},border:{color:'transparent'}}
      }
    }
  });
}

function renderPieChart(){
  const entries = getEntries(curMonth,curYear).filter(e=>e.type==='pengeluaran');
  const bycat={};
  entries.forEach(e=>{
    const lbl = e.catLabel||e.detail;
    bycat[lbl]=(bycat[lbl]||0)+e.amount;
  });
  const labels=Object.keys(bycat), vals=Object.values(bycat);
  const ctx=document.getElementById('chart-pie');
  if(chartPie){chartPie.destroy();chartPie=null;}
  if(!labels.length){
    chartPie=new Chart(ctx,{type:'doughnut',data:{labels:['Belum ada data'],datasets:[{data:[1],backgroundColor:['#EDF4F2'],borderColor:['#CDE3D6'],borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{display:false}}}});
    return;
  }
  chartPie=new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:ALLOC_COLORS.slice(0,labels.length),borderColor:'#ffffff',borderWidth:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'55%',
      plugins:{
        legend:{position:'right',labels:{color:'#5C715E',font:{size:10},boxWidth:10,padding:8}},
        tooltip:{callbacks:{label:c=>{
          const tot=vals.reduce((a,b)=>a+b,0);
          return c.label+': '+fmtShort(c.raw)+' ('+(tot>0?((c.raw/tot)*100).toFixed(1):'0')+'%)';
        }}}
      }
    }
  });
}

function renderLineChart(){
  const entries = getEntries(curMonth,curYear);
  const days = new Date(curYear,curMonth+1,0).getDate();
  const inD=Array(days).fill(0), outD=Array(days).fill(0);
  entries.forEach(e=>{
    const d=parseInt(e.date.split('-')[2])-1;
    if(d>=0 && d<days){
      if(e.type==='pemasukan') inD[d]+=e.amount;
      else outD[d]+=e.amount;
    }
  });
  const labels=Array.from({length:days},(_,i)=>String(i+1));
  const ctx=document.getElementById('chart-line');
  if(chartLine){chartLine.destroy();chartLine=null;}
  chartLine=new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Pemasukan',data:inD,borderColor:'#3a7d5e',backgroundColor:'rgba(58,125,94,0.07)',tension:0.4,fill:true,pointRadius:3,pointBackgroundColor:'#3a7d5e',borderWidth:2},
        {label:'Pengeluaran',data:outD,borderColor:'#b94040',backgroundColor:'rgba(185,64,64,0.07)',tension:0.4,fill:true,pointRadius:3,pointBackgroundColor:'#b94040',borderWidth:2,borderDash:[5,3]}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmtShort(c.raw)}}},
      scales:{
        x:{ticks:{color:'#9DB5A3',font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:15},grid:{color:'rgba(157,181,163,0.15)'},border:{color:'transparent'}},
        y:{ticks:{color:'#9DB5A3',font:{size:9},callback:v=>fmtShort(v)},grid:{color:'rgba(157,181,163,0.15)'},border:{color:'transparent'}}
      }
    }
  });
}

function refresh(){
  const label = MONTHS[curMonth]+' '+curYear;
  document.getElementById('disp-period').textContent = label;
  document.getElementById('period-label2').textContent = label;
  setDateInput();
  updateCategoryOpts();
  renderBalance();
  renderTable();
  renderBudgetBars();
  renderCompareChart();
  renderPieChart();
  renderLineChart();
}

// ============================================================
// MOTIVASI TICKER
// ============================================================
const MOTIVES = [
  {em:'💚', text:'<span class="motive-em">Satu ribu rupiah</span> yang ditabung hari ini adalah masa depan yang lebih tenang.'},
  {em:'🌿', text:'Pengeluaran kecil yang konsisten bikin <span class="motive-em">lubang besar</span> di dompet. Catat semua!'},
  {em:'⚡', text:'<span class="motive-em">10% dari gajimu</span> cukup untuk mulai investasi. Mulai sekarang ya!'},
  {em:'🎯', text:'Anggaran bukan penjara, tapi <span class="motive-em">peta menuju kebebasan finansial.</span>'},
  {em:'🌱', text:'Orang kaya bukan yang penghasilan besar, tapi yang <span class="motive-em">tahu ke mana uangnya pergi.</span>'},
  {em:'💡', text:'Catat dulu, beli kemudian — <span class="motive-em">kebiasaan kecil, dampak besar.</span>'},
  {em:'🔥', text:'<span class="motive-em">Dana darurat 3–6 bulan</span> pengeluaran = tidur nyenyak setiap malam.'},
  {em:'✨', text:'Setiap kali kamu menolak pengeluaran impulsif, kamu sedang <span class="motive-em">memilih versi terbaik dirimu.</span>'},
  {em:'🚀', text:'Investasi terbaik? <span class="motive-em">Dirimu sendiri.</span> Tapi nabung dulu sebelum belanja ya!'},
  {em:'💎', text:'Konsistensi mengalahkan motivasi — <span class="motive-em">catat transaksimu setiap hari.</span>'},
];

function buildTicker(){
  const ticker = document.getElementById('motive-ticker');
  if(!ticker) return;
  // Duplikat 2x untuk efek loop seamless
  const items = [...MOTIVES, ...MOTIVES];
  ticker.innerHTML = items.map(m=>`
    <span class="motive-item">
      <span>${m.em}</span>
      <span>${m.text}</span>
    </span>
  `).join('');
}

// ============================================================
// AI SARAN KEUANGAN
// ============================================================
let aiPanelOpen = false;

function toggleAiPanel(){
  aiPanelOpen = !aiPanelOpen;
  const body = document.getElementById('ai-suggest-body');
  const chev = document.getElementById('ai-chevron');
  body.classList.toggle('open', aiPanelOpen);
  chev.classList.toggle('open', aiPanelOpen);
}

async function runAiAnalysis(){
  const btn = document.getElementById('ai-trigger-btn');
  const out = document.getElementById('ai-output');
  btn.disabled = true;
  btn.textContent = '⏳ Menganalisa...';

  out.innerHTML = `<div class="ai-response-loading">
    <div class="ai-dots"><span></span><span></span><span></span></div>
    <span>AI lagi mikir kondisi keuanganmu...</span>
  </div>`;

  // Siapkan data ringkasan keuangan
  const entries = getEntries(curMonth, curYear);
  const {ins, out: totalOut, net} = calcTotals(entries);
  const spend = spendByCategory(entries);
  const savingsRate = ins > 0 ? ((ins - totalOut) / ins * 100).toFixed(1) : 0;

  // Ringkasan per kategori
  const catSummary = CATEGORIES.pengeluaran.map(c => {
    const spent = spend[c.id] || 0;
    const budget = ins > 0 && allocSaved ? (ins * (alloc[c.id] || 0) / 100) : null;
    const overBudget = budget !== null && spent > budget;
    return `- ${c.label}: ${fmt(spent)}${budget !== null ? ` (target: ${fmt(budget)}, ${overBudget ? '⚠ OVER' : 'OK'})` : ''}`;
  }).join('\n');

  const prompt = `Kamu adalah asisten keuangan personal yang santai dan suportif untuk pengguna Indonesia.

Data keuangan bulan ${MONTHS[curMonth]} ${curYear}:
- Pemasukan: ${fmt(ins)}
- Pengeluaran total: ${fmt(totalOut)}
- Saldo bersih: ${fmt(net)}
- Savings rate: ${savingsRate}%
- Alokasi anggaran sudah diset: ${allocSaved ? 'Ya' : 'Belum'}

Rincian pengeluaran per kategori:
${catSummary}

Berikan analisis singkat dan saran konkret dalam Bahasa Indonesia yang santai (pakai "kamu"). Fokus pada:
1. Kondisi keuangan bulan ini secara keseluruhan (1-2 kalimat)
2. Kategori yang perlu diperhatikan (kalau ada yang over budget atau terlalu besar proporsinya)
3. Satu saran actionable yang paling penting untuk bulan depan

Kalau datanya masih kosong atau pemasukan 0, minta user untuk mulai catat dulu.
Format: teks biasa tanpa markdown header, maks 150 kata, gunakan emoji secukupnya.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{role: 'user', content: prompt}]
      })
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || 'Gagal mendapat respons dari AI.';
    out.innerHTML = `<div class="ai-response">${text.replace(/\n/g,'<br>')}</div>`;
  } catch(err) {
    out.innerHTML = `<div class="ai-response" style="color:var(--red)">⚠ Gagal konek ke AI. Cek koneksi internet kamu.</div>`;
  }

  btn.disabled = false;
  btn.innerHTML = '🔄 Analisa Ulang';
}

// ============================================================
// INIT — cek apakah ada data tersimpan di browser, kalau ada langsung masuk app
// ============================================================
(function init(){
  if(loadState()){
    enterApp();
  }
})();
