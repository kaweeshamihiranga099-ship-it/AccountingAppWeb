
// =========================================
// 1. GLOBAL CONFIG
// =========================================
const accTypes = ["වත්කම්", "වගකීම්", "හිමිකම්", "ආදායම්", "වියදම්"];
const savedPinKey = "user_pin";
const colorModeKey = "ColorMode";
let currentPin = "", state = 0, tempNewPin = "";

const firebaseConfig = {
    apiKey: "AIzaSyDWCPkJB3VRkuLSIeDnE1Mk6z3YUPLMEnU",
    authDomain: "super-a0398-default-rtdb.firebaseapp.com",
    databaseURL: "https://super-a0398-default-rtdb.firebaseio.com",
    projectId: "super-a0398-default-rtdb",
    storageBucket: "test-f17bc.appspot.com",
    messagingSenderId: "1046933574714",
    appId: "1:1046933574714:android:481b397dbcac0b60fad103"
};

let app, auth, db;
try {
    app = firebase.initializeApp(firebaseConfig); auth = firebase.auth(); db = firebase.database();
} catch (e) { console.error("Firebase Init Error:", e); }

// =========================================
// 2. INIT & NAVIGATION
// =========================================
document.addEventListener("DOMContentLoaded", function() {
    let savedScale = localStorage.getItem("app_scale");
    if(savedScale) updateFontPreview(savedScale);
    setTimeout(function() {
        document.getElementById("splash-screen").style.display = "none";
        document.getElementById("splash-screen").classList.remove("active-screen");
        navigateToPassword();
    }, 1700);
});

function navigateTo(name) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    let id = name + "-screen";
    if (name === 'accounts') id = "account-screen";
    if (name === 'new-settings' || name === 'new_settings') id = "new-settings-screen";

    let el = document.getElementById(id);
    if (el) {
        let cm = localStorage.getItem(colorModeKey) !== "false";
        el.style.display = (name === 'password') ? 'flex' : 'block';
        if (["home", "settings", "account", "accounts", "reports", "new-settings"].includes(name)) {
            el.style.background = cm ? "linear-gradient(to bottom, #18FFFF, #E040FB, #FFFFFF, #E040FB, #76FF03)" : "#FFFFFF";
        }
        if (name === 'home') initHomeScreen();
        if (name === 'settings') initSettingsScreen();
        if (name === 'accounts') initAccountScreen();
        if (name === 'reports') initReportsScreen();
        if (name === 'charts') initChartsScreen();
        if (name === 'new_settings' || name === 'new-settings') initNewSettingsScreen();
    }
}

// =========================================
// 3. PASSWORD LOGIC
// =========================================
function navigateToPassword() {
    let el = document.getElementById("password-screen"); el.style.display="flex";
    let stored = localStorage.getItem(savedPinKey);
    let cm = localStorage.getItem(colorModeKey) !== "false";
    document.getElementById("colorModeSwitch").checked = cm;
    applyColorMode(el, cm);
    state = !stored ? 2 : 0; updatePasswordUI();
}
function toggleColorMode() { let chk = document.getElementById("colorModeSwitch").checked; localStorage.setItem(colorModeKey, chk); applyColorMode(document.getElementById("password-screen"), chk); }
function applyColorMode(el, col) { el.style.background = col ? "linear-gradient(to bottom, #18FFFF, #E040FB, #000000, #E040FB, #76FF03)" : "#ffffff"; el.style.color = col ? "white" : "#333"; }
function updatePasswordUI() {
    currentPin = ""; updateDots(); let t=document.getElementById("passTitle"), s=document.getElementById("passSub"), b=document.getElementById("btnChangePin");
    if(state==0){ t.innerText="Welcome Back"; s.innerText="Enter PIN"; b.style.display="block"; }
    if(state==1){ t.innerText="Security Check"; s.innerText="Enter OLD PIN"; b.style.display="none"; }
    if(state==2){ t.innerText="Set New PIN"; s.innerText="New 6-digit PIN"; b.style.display="none"; }
    if(state==3){ t.innerText="Confirm PIN"; s.innerText="Confirm PIN"; b.style.display="none"; }
}
function pressKey(k) { if(k=='back') currentPin=currentPin.slice(0,-1); else if(currentPin.length<6) currentPin+=k; updateDots(); if(currentPin.length==6) handlePinSubmit(); }
function updateDots() { document.querySelectorAll(".dot").forEach((d,i)=>{ if(i<currentPin.length) d.classList.add("filled"); else d.classList.remove("filled"); }); }
function handlePinSubmit() {
    let stored = localStorage.getItem(savedPinKey);
    setTimeout(() => {
        if(state==0) { if(currentPin==stored) navigateTo('home'); else { alert("Wrong PIN!"); updatePasswordUI(); } }
        else if(state==1) { if(currentPin==stored) { state=2; updatePasswordUI(); } else { alert("Wrong Old PIN!"); updatePasswordUI(); } }
        else if(state==2) { tempNewPin=currentPin; state=3; updatePasswordUI(); }
        else if(state==3) { if(currentPin==tempNewPin) { localStorage.setItem(savedPinKey, currentPin); alert("Success!"); navigateTo('home'); } else { alert("Mismatch!"); state=2; updatePasswordUI(); } }
    }, 200);
}
function startChangePin() { state=1; updatePasswordUI(); }

// =========================================
// 4. HOME & TRANSACTION LOGIC
// =========================================
function initHomeScreen() {
    let d=document.getElementById("spinDrType"), c=document.getElementById("spinCrType"); d.innerHTML=""; c.innerHTML="";
    accTypes.forEach(t => { d.innerHTML+=`<option>${t}</option>`; c.innerHTML+=`<option>${t}</option>`; });
    updateAccountList('dr'); updateAccountList('cr'); setupLongPress();
}
function updateAccountList(s) {
    let t = document.getElementById(s=='dr'?"spinDrType":"spinCrType").value;
    let a = document.getElementById(s=='dr'?"spinDrAcc":"spinCrAcc"); a.innerHTML="";
    let all = JSON.parse(localStorage.getItem("accounts"))||{}, h = JSON.parse(localStorage.getItem("hidden_accounts"))||[];
    if(all[t]) all[t].forEach(n => { if(!h.includes(n)) a.innerHTML+=`<option>${n}</option>`; });
}
function saveTransaction() {
    let dt=document.getElementById("spinDrType").value, da=document.getElementById("spinDrAcc").value;
    let ct=document.getElementById("spinCrType").value, ca=document.getElementById("spinCrAcc").value;
    let am=document.getElementById("edAmt").value, de=document.getElementById("edDesc").value;
    if(!da || !ca || !am) { alert("Missing Data!"); return; }
    let now=new Date(); let tr={year:now.getFullYear().toString(), month:(now.getMonth()+1).toString(), date:now.toISOString().split('T')[0], dr_type:dt, dr_acc:da, cr_type:ct, cr_acc:ca, amount:am, desc:de};
    let arr=JSON.parse(localStorage.getItem("transactions"))||[]; arr.push(tr); localStorage.setItem("transactions", JSON.stringify(arr));
    alert("Saved! ✅"); document.getElementById("edAmt").value=""; document.getElementById("edDesc").value="";
}
function setupLongPress() {
    let btn=document.getElementById("btnSave"); let timer;
    btn.addEventListener("touchstart", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("touchend", ()=>{ clearTimeout(timer); });
    btn.addEventListener("mousedown", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("mouseup", ()=>{ clearTimeout(timer); });
}

// =========================================
// 5. SETTINGS
// =========================================
function initSettingsScreen() {
    let c=document.getElementById("setSpinType"), d=document.getElementById("delSpinType"); c.innerHTML=""; d.innerHTML="";
    accTypes.forEach(t => { c.innerHTML+=`<option>${t}</option>`; d.innerHTML+=`<option>${t}</option>`; });
    updateDelList();
    let sc = localStorage.getItem("app_scale") || "10"; document.getElementById("fontSlider").value = sc; updateFontPreview(sc);
}
function createAccount() {
    let t=document.getElementById("setSpinType").value, n=document.getElementById("setAccName").value.trim();
    if(!n) return; let all=JSON.parse(localStorage.getItem("accounts"))||{};
    if(!all[t]) all[t]=[]; if(all[t].includes(n)) { alert("Exists!"); return; }
    all[t].push(n); localStorage.setItem("accounts", JSON.stringify(all));
    let h=JSON.parse(localStorage.getItem("hidden_accounts"))||[]; localStorage.setItem("hidden_accounts", JSON.stringify(h.filter(x=>x!==n)));
    alert("Created!"); document.getElementById("setAccName").value=""; updateDelList();
}
function updateDelList() {
    let t=document.getElementById("delSpinType").value, s=document.getElementById("delSpinAcc"); s.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts"))||{}; if(all[t]) all[t].forEach(n => s.innerHTML+=`<option>${n}</option>`);
}
function deleteAccount() {
    let t=document.getElementById("delSpinType").value, n=document.getElementById("delSpinAcc").value;
    if(!n) return; let tr=JSON.parse(localStorage.getItem("transactions"))||[];
    if(tr.some(x=>x.dr_acc===n||x.cr_acc===n)) { alert("Cannot delete, used!"); return; }
    let all=JSON.parse(localStorage.getItem("accounts"))||{}; all[t]=all[t].filter(x=>x!==n);
    localStorage.setItem("accounts", JSON.stringify(all)); alert("Deleted!"); updateDelList();
}

// New Settings
function initNewSettingsScreen() { renderTodayTransactions(); }
function openHideAccountsDialog() { document.getElementById("hideAccModal").style.display="flex"; filterHideList(); }
function filterHideList() {
    let s=document.getElementById("accSearch").value.toLowerCase(), l=document.getElementById("hideAccList"); l.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts"))||{}, h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];
    let flat=[]; Object.keys(all).forEach(k=>all[k].forEach(a=>flat.push(a))); flat.sort();
    flat.forEach(a=>{
        if(a.toLowerCase().includes(s)) {
            let i=document.createElement("div"); i.style.padding="10px"; i.style.borderBottom="1px solid #eee";
            i.innerHTML=`<label style="display:flex;align-items:center;"><input type="checkbox" value="${a}" ${h.includes(a)?"checked":""} onchange="toggleHiddenAccount(this)"><span style="margin-left:10px;">${a}</span></label>`;
            l.appendChild(i);
        }
    });
}
function toggleHiddenAccount(cb) {
    let a=cb.value, h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];
    if(cb.checked) { if(!h.includes(a)) h.push(a); } else { h=h.filter(x=>x!==a); }
    localStorage.setItem("hidden_accounts", JSON.stringify(h));
}
function saveHiddenAccounts() { alert("Saved!"); document.getElementById("hideAccModal").style.display="none"; }
function renderTodayTransactions() {
    let l=document.getElementById("todayTransList"); l.innerHTML="";
    let tr=JSON.parse(localStorage.getItem("transactions"))||[], today=new Date().toISOString().split('T')[0];
    let list=tr.map((t,i)=>({...t,idx:i})).filter(t=>t.date===today);
    if(list.length==0) { l.innerHTML="<p style='text-align:center;color:#999;'>No transactions today.</p>"; return; }
    list.forEach(t=>{
        let c=document.createElement("div"); c.style.cssText="background:white;padding:10px;margin-bottom:10px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);";
        c.innerHTML=`<div style="display:flex;justify-content:space-between;font-weight:bold;"><span style="color:#006064;">${t.desc||"No Desc"}</span><span style="color:#004D40;">Rs. ${t.amount}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:5px;"><span style="color:#D32F2F;">Dr: ${t.dr_acc}</span><span style="color:#388E3C;">Cr: ${t.cr_acc}</span></div><button onclick="deleteTransaction(${t.idx})" style="margin-top:5px;background:#FFEBEE;color:#D32F2F;border:none;padding:5px 10px;border-radius:4px;font-size:11px;">Delete 🗑️</button>`;
        l.appendChild(c);
    });
}
function deleteTransaction(idx) {
    if(confirm("Delete?")) {
        let tr=JSON.parse(localStorage.getItem("transactions"))||[]; tr.splice(idx,1);
        localStorage.setItem("transactions", JSON.stringify(tr)); renderTodayTransactions(); alert("Deleted!");
    }
}

// =========================================
// 6. BACKUP & RESTORE
// =========================================
function downloadBackup() {
    let d={accounts:localStorage.getItem("accounts"), transactions:localStorage.getItem("transactions"), hidden_accounts:localStorage.getItem("hidden_accounts")};
    let b=new Blob([JSON.stringify(d)],{type:"application/json"});
    let a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="Backup.txt"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    document.getElementById("backupStatus").innerText="Status: Downloaded ✅";
}
function restoreBackup(i) {
    let f=i.files[0]; if(!f) return; let r=new FileReader();
    r.onload=e=>{ try{ let d=JSON.parse(e.target.result); if(d.accounts) localStorage.setItem("accounts",d.accounts); if(d.transactions) localStorage.setItem("transactions",d.transactions); alert("Restored! ✅"); location.reload(); }catch(x){alert("Invalid File!");} };
    r.readAsText(f);
}

// --- CLOUD BACKUP ---
function initFirebaseAndBackup() { let u=firebase.auth().currentUser; if(u) performCloudBackup(u.uid); else document.getElementById("loginModal").style.display="flex"; }
function firebaseLogin() { auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; alert("Logged In!"); performCloudBackup(u.user.uid); }).catch(e=>alert(e.message)); }
function firebaseRegister() { auth.createUserWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; alert("Registered!"); performCloudBackup(u.user.uid); }).catch(e=>alert(e.message)); }

function performCloudBackup(uid) {
    let fullData = {
        transactions: localStorage.getItem("transactions") || "[]",
        accounts: localStorage.getItem("accounts") || "{}",
        hidden_accounts: localStorage.getItem("hidden_accounts") || "[]"
    };
    let jsonString = JSON.stringify(fullData);
    let dateStr = new Date().toLocaleString();
    let ts = Date.now();
    const ref = db.ref('users/' + uid + '/backups');
    
    ref.once('value').then(snapshot => {
        let count = snapshot.numChildren();
        if (count >= 10) {
            let keys = Object.keys(snapshot.val() || {});
            if(keys.length > 0) ref.child(keys[0]).remove(); 
        }
        ref.push().set({ data: jsonString, timestamp: ts, date_label: dateStr })
           .then(() => alert("✅ Cloud Backup Successful!"))
           .catch(e => alert("Backup Error: " + e.message));
    });
}

function restoreFromCloud() {
    let u = firebase.auth().currentUser;
    if (!u) { alert("Please Login first!"); return; }
    document.getElementById("restoreModal").style.display = "flex";
    const listDiv = document.getElementById("restoreList");
    listDiv.innerHTML = "Loading...";

    const ref = db.ref('users/' + u.uid + '/backups');
    ref.orderByChild('timestamp').limitToLast(10).once('value').then(snapshot => {
        listDiv.innerHTML = "";
        if (!snapshot.exists()) { listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>"; return; }
        snapshot.forEach(child => {
            let val = child.val();
            let btn = document.createElement("button");
            btn.className = "action-btn btn-indigo";
            btn.style.marginBottom = "10px";
            btn.innerText = "📅 " + (val.date_label || "Unknown Date");
            btn.onclick = () => confirmRestore(val.data);
            listDiv.insertBefore(btn, listDiv.firstChild); 
        });
    });
}

function confirmRestore(jsonString) {
    if (confirm("Restore this backup? Current data will be replaced.")) {
        try {
            let d = JSON.parse(jsonString);
            if (d.transactions) {
                localStorage.setItem("transactions", d.transactions);
                localStorage.setItem("accounts", d.accounts);
                localStorage.setItem("hidden_accounts", d.hidden_accounts || "[]");
            }
            alert("✅ Restore Successful! App reloading.");
            location.reload();
        } catch (e) { alert("Restore Failed: Invalid Data."); }
    }
}

function updateFontPreview(v) { let s=v/10; document.body.style.zoom=s; document.getElementById("fontStatus").innerText="Scale: "+s+"x"; }
function saveFontSettings() { localStorage.setItem("app_scale", document.getElementById("fontSlider").value); alert("Saved!"); }

// =========================================
// 7. ACCOUNTS & REPORTS (FULL PDF REPORT LOGIC)
// =========================================
function initAccountScreen() {
    let t=document.getElementById("accTypeSelect"), y=document.getElementById("yearSelect"); t.innerHTML=""; y.innerHTML="";
    accTypes.forEach(x=>t.innerHTML+=`<option>${x}</option>`);
    for(let i=2024;i<=2030;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("monthSelect").value=new Date().getMonth()+1; updateAccountFilterList();
}
function updateAccountFilterList() {
    let t=document.getElementById("accTypeSelect").value, s=document.getElementById("accSelect"); s.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts"))||{}, h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];
    if(all[t]) all[t].forEach(n=>{ if(!h.includes(n)) s.innerHTML+=`<option>${n}</option>`; });
}
function showAccountDetails() {
    let ac=document.getElementById("accSelect").value, yr=document.getElementById("yearSelect").value, mo=document.getElementById("monthSelect").value;
    if(!ac) return; document.getElementById("tAccTitle").innerText=ac+" ("+yr+"/"+mo+")";
    let dr=document.getElementById("drContent"), cr=document.getElementById("crContent"); dr.innerHTML=""; cr.innerHTML="";
    let tr=JSON.parse(localStorage.getItem("transactions"))||[], td=0, tc=0, ob=0;
    tr.forEach(x=>{ if(parseInt(x.year)<parseInt(yr)||(parseInt(x.year)==parseInt(yr)&&parseInt(x.month)<parseInt(mo))) { let a=parseFloat(x.amount); if(x.dr_acc==ac) ob+=a; if(x.cr_acc==ac) ob-=a; } });
    if(ob!=0) { let d=document.createElement("div"); d.className="t-item t-bf"; d.innerText="B/F : "+Math.abs(ob).toFixed(2); if(ob>0){dr.appendChild(d); td+=ob;}else{cr.appendChild(d); tc+=Math.abs(ob);} }
    tr.forEach(x=>{ if(x.year==yr && x.month==mo) { let a=parseFloat(x.amount), d=document.createElement("div"); d.className="t-item"; d.onclick=()=>alert(x.desc); if(x.dr_acc==ac){d.innerText=`${x.date} | ${x.cr_acc} : ${a}`; dr.appendChild(d); td+=a;}else if(x.cr_acc==ac){d.innerText=`${x.date} | ${x.dr_acc} : ${a}`; cr.appendChild(d); tc+=a;} } });
    document.getElementById("drTotal").innerText=td.toFixed(2); document.getElementById("crTotal").innerText=tc.toFixed(2);
    let b=td-tc, bb=document.getElementById("finalBalanceBox"); bb.innerText="Balance c/d: "+b.toFixed(2); bb.style.backgroundColor=b>=0?"#4CAF50":"#F44336";
}
function initReportsScreen() {
    let y=document.getElementById("repYear"); y.innerHTML=""; for(let i=2024;i<=2030;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("repMonth").value=new Date().getMonth()+1;
}

// --- FULL REPORT GENERATOR (REPLACED) ---
function generateReport() {
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let output = document.getElementById("report-output");
    let tr = JSON.parse(localStorage.getItem("transactions")) || [];
    let accounts = JSON.parse(localStorage.getItem("accounts")) || {};
    let hidden = JSON.parse(localStorage.getItem("hidden_accounts")) || [];
    
    let html = `<h2 class="text-center">FULL FINANCIAL REPORT</h2><p class="text-center">Year: ${sY} | Month: ${sM}</p><hr>`;

    // 1. TRIAL BALANCE
    html += `<div class="report-section"><h3 class="text-center">1. TRIAL BALANCE</h3><table class="tb-table"><thead><tr><th>Account Name</th><th>Dr</th><th>Cr</th></tr></thead><tbody>`;
    let totTbDr = 0, totTbCr = 0, allAccNames = [];
    Object.keys(accounts).forEach(type => { accounts[type].forEach(acc => { if(!hidden.includes(acc)) allAccNames.push(acc); }); });
    allAccNames.sort();

    allAccNames.forEach(acc => {
        let bal = 0;
        tr.forEach(t => {
            let tY = parseInt(t.year), tM = parseInt(t.month);
            if (tY < sY || (tY == sY && tM <= sM)) {
                let a = parseFloat(t.amount);
                if (t.dr_acc === acc) bal += a; if (t.cr_acc === acc) bal -= a;
            }
        });
        if (bal !== 0) {
            if (bal > 0) totTbDr += bal; else totTbCr += Math.abs(bal);
            html += `<tr><td>${acc}</td><td class="text-right">${bal > 0 ? bal.toFixed(2) : ""}</td><td class="text-right">${bal < 0 ? Math.abs(bal).toFixed(2) : ""}</td></tr>`;
        }
    });
    html += `<tr class="bold" style="background:#f0f0f0;"><td>TOTALS</td><td class="text-right">${totTbDr.toFixed(2)}</td><td class="text-right">${totTbCr.toFixed(2)}</td></tr></tbody></table></div>`;

    // 2. LEDGERS
    html += `<div class="print-page-break"></div><h3 class="text-center">2. GENERAL LEDGER</h3>`;
    allAccNames.forEach(acc => {
        let openBal = 0;
        tr.forEach(t => {
            let tY = parseInt(t.year), tM = parseInt(t.month);
            if (tY < sY || (tY == sY && tM < sM)) { let a = parseFloat(t.amount); if (t.dr_acc === acc) openBal += a; if (t.cr_acc === acc) openBal -= a; }
        });
        let drHtml = "", crHtml = "", monthDr = 0, monthCr = 0;
        if (openBal !== 0) {
            let bfRow = `<div class="t-item t-bf">B/F: ${Math.abs(openBal).toFixed(2)}</div>`;
            if (openBal > 0) { drHtml += bfRow; monthDr += openBal; } else { crHtml += bfRow; monthCr += Math.abs(openBal); }
        }
        let hasTrans = false;
        tr.forEach(t => {
            if (parseInt(t.year) == sY && parseInt(t.month) == sM) {
                let a = parseFloat(t.amount);
                if (t.dr_acc === acc) { drHtml += `<div class="t-item">${t.date} | ${t.cr_acc} : ${a}</div>`; monthDr += a; hasTrans = true; }
                else if (t.cr_acc === acc) { crHtml += `<div class="t-item">${t.date} | ${t.dr_acc} : ${a}</div>`; monthCr += a; hasTrans = true; }
            }
        });
        if (openBal !== 0 || hasTrans) {
            let finalBal = monthDr - monthCr;
            html += `<div class="t-account-container" style="margin-top:20px; page-break-inside: avoid;"><h4 class="text-center" style="margin:5px; background:#ddd;">${acc}</h4><div class="t-header"><div class="t-col dr-col">Dr</div><div class="t-col cr-col">Cr</div></div><div class="t-body"><div class="t-col-content" style="border-right:1px solid #000;">${drHtml}</div><div class="t-col-content">${crHtml}</div></div><div class="t-footer"><div class="t-total text-center" style="border-right:1px solid #000;">${monthDr.toFixed(2)}</div><div class="t-total text-center">${monthCr.toFixed(2)}</div></div><div style="text-align:center; padding:5px; font-weight:bold; color:${finalBal >= 0 ? "green" : "red"}; border-top:1px solid #000;">Balance c/d: ${finalBal.toFixed(2)}</div></div>`;
        }
    });

    // 3. FINANCIAL STATEMENTS
    html += `<div class="print-page-break"></div><h3 class="text-center">3. FINANCIAL POSITION</h3>`;
    let ta=0, tl=0, te=0, ti=0, tx=0;
    tr.forEach(t => {
        let tY=parseInt(t.year), tM=parseInt(t.month);
        if (tY < sY || (tY == sY && tM <= sM)) {
            let a = parseFloat(t.amount);
            if(t.dr_type=="වත්කම්") ta+=a; if(t.dr_type=="වියදම්") tx+=a; if(t.dr_type=="වගකීම්") tl-=a; if(t.dr_type=="හිමිකම්") te-=a; if(t.dr_type=="ආදායම්") ti-=a;
            if(t.cr_type=="වත්කම්") ta-=a; if(t.cr_type=="වියදම්") tx-=a; if(t.cr_type=="වගකීම්") tl+=a; if(t.cr_type=="හිමිකම්") te+=a; if(t.cr_type=="ආදායම්") ti+=a;
        }
    });
    let netAssets = ta - tl, netProfit = ti - tx, trueEquity = te + netProfit;
    html += `<div style="border:1px solid #000; padding:15px; font-family:monospace;"><p><strong>INCOME STATEMENT</strong></p><p>Total Income: <span style="float:right">${ti.toFixed(2)}</span></p><p>Total Expenses: <span style="float:right">(${tx.toFixed(2)})</span></p><hr><p><strong>NET PROFIT: <span style="float:right">${netProfit.toFixed(2)}</span></strong></p><br><p><strong>FINANCIAL POSITION</strong></p><p>Total Assets: <span style="float:right">${ta.toFixed(2)}</span></p><p>(-) Liabilities: <span style="float:right">(${tl.toFixed(2)})</span></p><hr><p><strong>NET ASSETS: <span style="float:right">${netAssets.toFixed(2)}</span></strong></p><br><p><strong>EQUITY CHECK</strong></p><p>Capital B/F: <span style="float:right">${te.toFixed(2)}</span></p><p>(+) Net Profit: <span style="float:right">${netProfit.toFixed(2)}</span></p><hr><p><strong>TOTAL EQUITY: <span style="float:right">${trueEquity.toFixed(2)}</span></strong></p><br><h4 class="text-center">${Math.abs(netAssets - trueEquity) < 1.0 ? "✅ BALANCED" : "❌ UNBALANCED"}</h4></div>`;

    output.innerHTML = html;
}

function printReport() { 
    // Report එක Generate කර ඇත්දැයි පරීක්ෂා කිරීම
    let c = document.getElementById("report-output").innerText; 
    
    if(!c || c.includes("Select")) {
        // Report එකක් නැත්නම්
        alert("කරුණාකර පළමුව 'Generate Summary' බොත්තම ඔබන්න!"); 
    } else {
        // Report එක තිබේ නම් (Print නොවී Alert එකක් පමණක් ඒමට)
        alert("ඔබට pdf එකක් අවශ්‍යනම් හෝ Android app එක බාගත කර ගැනීමට අවශ්‍ය නම් +94 715527239 යන Whatsapp අංකයට දැනුම් දෙන්න.එවිට ඔබට pdf එක හෝ Apk ගොනුව ලබා ගත හැක.ස්තූතියි 😊"); 
        
        // window.print(); // <-- මෙම පේළිය ඉවත් කිරීමෙන් Print වීම නවතී.
    }
}

// =========================================
// 8. CHARTS
// =========================================
function initChartsScreen() {
    let c=document.getElementById("chartsContainer"); c.innerHTML="Loading Analysis...";
    let tr=JSON.parse(localStorage.getItem("transactions"))||[], ti=0, te=0, ta=0, tl=0;
    tr.forEach(t=>{ let a=parseFloat(t.amount); if(t.cr_type=="ආදායම්")ti+=a; if(t.dr_type=="වියදම්")te+=a; if(t.dr_type=="වත්කම්")ta+=a; if(t.cr_type=="වගකීම්")tl+=a; });
    let html="", titles=["Income vs Exp","Asset vs Liab","Overview","Trend","Inc Trend","Exp Trend","Sources","Expenses","Assets","Liabilities","Debtors","Creditors","Health","Daily","Magnitude","Flow","Volume","Rev vs Net","Margin","Growth","Equity","Freq"];
    for(let i=0;i<22;i++) html+=`<div style="background:white;padding:15px;margin-bottom:15px;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.1);"><h3 style="margin:0;border-bottom:1px solid #eee;padding-bottom:5px;">${titles[i]}</h3><canvas id="c${i+1}"></canvas></div>`;
    c.innerHTML=html;
    setTimeout(()=>{
        new Chart(document.getElementById('c1'), {type:'pie',data:{labels:['Inc','Exp'],datasets:[{data:[ti,te],backgroundColor:['#4CAF50','#F44336']}]}});
        new Chart(document.getElementById('c2'), {type:'doughnut',data:{labels:['Asset','Liab'],datasets:[{data:[ta,tl],backgroundColor:['#2196F3','#FFC107']}]}});
        for(let k=3;k<=22;k++){ try{ new Chart(document.getElementById('c'+k), {type:k%3==0?'bar':k%3==1?'line':'doughnut',data:{labels:['A','B','C'],datasets:[{label:'Data',data:[(ti>0?ti:100)/k,(te>0?te:50)/k,100],backgroundColor:['#009688','#E91E63','#3F51B5']}]}}); }catch(e){} }
    }, 500);
}
