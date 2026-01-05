// =========================================
// 1. GLOBAL CONFIG & FIREBASE
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
// 2. INITIALIZATION & HELPER FUNCTIONS
// =========================================
window.addEventListener("load", function() {
    let savedScale = localStorage.getItem("app_scale");
    if(savedScale) try { updateFontPreview(savedScale); } catch(e){}

    fixDataIntegrity(); // Auto-fix spaces
    
    setTimeout(function() {
        const splash = document.getElementById("splash-screen");
        if(splash) { splash.style.display = "none"; splash.classList.remove("active-screen"); }
        navigateToPassword();
    }, 2000);
});

// ✅ CORRECT DATE FUNCTION (Fixes the "Today" missing issue)
function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fixDataIntegrity() {
    try {
        let trStr = localStorage.getItem("transactions");
        let accStr = localStorage.getItem("accounts");

        if (trStr && accStr) {
            let tr = JSON.parse(trStr) || [];
            let acc = JSON.parse(accStr) || {};
            let changed = false;

            for (let type in acc) {
                acc[type] = acc[type].map(name => {
                    let clean = name.trim();
                    if(clean !== name) changed = true;
                    return clean;
                });
            }

            tr = tr.map(t => {
                let d = t.dr_acc ? t.dr_acc.trim() : "";
                let c = t.cr_acc ? t.cr_acc.trim() : "";
                if(d !== t.dr_acc || c !== t.cr_acc) {
                    t.dr_acc = d; t.cr_acc = c; changed = true;
                }
                return t;
            });

            if(changed) {
                localStorage.setItem("transactions", JSON.stringify(tr));
                localStorage.setItem("accounts", JSON.stringify(acc));
            }
        }
    } catch(e) { console.error("Auto Fix Error:", e); }
}

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
        if(state==0) { if(currentPin==stored) navigateTo('home'); else { showAlert("Error","Wrong PIN!"); updatePasswordUI(); } }
        else if(state==1) { if(currentPin==stored) { state=2; updatePasswordUI(); } else { showAlert("Error","Wrong Old PIN!"); updatePasswordUI(); } }
        else if(state==2) { tempNewPin=currentPin; state=3; updatePasswordUI(); }
        else if(state==3) { if(currentPin==tempNewPin) { localStorage.setItem(savedPinKey, currentPin); showAlert("Success","PIN Set!"); navigateTo('home'); } else { showAlert("Error","Mismatch!"); state=2; updatePasswordUI(); } }
    }, 200);
}
function startChangePin() { state=1; updatePasswordUI(); }

// =========================================
// 4. HOME & TRANSACTIONS (UPDATED)
// =========================================
function initHomeScreen() {
    let d=document.getElementById("spinDrType"), c=document.getElementById("spinCrType"); d.innerHTML=""; c.innerHTML="";
    accTypes.forEach(t => { d.innerHTML+=`<option>${t}</option>`; c.innerHTML+=`<option>${t}</option>`; });
    updateAccountList('dr'); updateAccountList('cr'); setupLongPress();
}
function updateAccountList(s) {
    let t = document.getElementById(s=='dr'?"spinDrType":"spinCrType").value;
    let a = document.getElementById(s=='dr'?"spinDrAcc":"spinCrAcc"); a.innerHTML="";
    let all = {}; try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e) { all = {}; }
    let h = []; try { h = JSON.parse(localStorage.getItem("hidden_accounts")) || []; } catch(e) {}
    if(all[t]) all[t].forEach(n => { if(!h.includes(n)) a.innerHTML+=`<option>${n}</option>`; });
}

function saveTransaction() {
    let dt=document.getElementById("spinDrType").value, da=document.getElementById("spinDrAcc").value;
    let ct=document.getElementById("spinCrType").value, ca=document.getElementById("spinCrAcc").value;
    let am=document.getElementById("edAmt").value, de=document.getElementById("edDesc").value;
    
    if(!da || !ca || !am) { showAlert("Error", "Missing Data!"); return; }
    
    let now=new Date(); 
    let tr={
        year: now.getFullYear().toString(), 
        month: (now.getMonth()+1).toString(), 
        date: getLocalTodayDate(), // ✅ Using Local Date
        dr_type:dt, dr_acc:da.trim(), 
        cr_type:ct, cr_acc:ca.trim(), 
        amount:am, desc:de
    };
    
    let arr = []; try { arr = JSON.parse(localStorage.getItem("transactions")) || []; } catch(e) {}
    arr.push(tr); 
    localStorage.setItem("transactions", JSON.stringify(arr));
    
    showAlert("Success", "Saved! ✅"); 
    document.getElementById("edAmt").value=""; document.getElementById("edDesc").value="";
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
    if(!n) return; 
    let all = {}; try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e){}
    if(!all[t]) all[t]=[]; 
    if(all[t].includes(n)) { showAlert("Error","Exists!"); return; }
    all[t].push(n); 
    localStorage.setItem("accounts", JSON.stringify(all));
    showAlert("Success", "Created!"); 
    document.getElementById("setAccName").value=""; updateDelList();
}
function updateDelList() {
    let t=document.getElementById("delSpinType").value, s=document.getElementById("delSpinAcc"); s.innerHTML="";
    let all = {}; try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e){}
    if(all[t]) all[t].forEach(n => s.innerHTML+=`<option>${n}</option>`);
}
function deleteAccount() {
    let t=document.getElementById("delSpinType").value, n=document.getElementById("delSpinAcc").value;
    if(!n) return;
    let tr = []; try { tr = JSON.parse(localStorage.getItem("transactions")) || []; } catch(e){}
    if(tr.some(x=>x.dr_acc===n||x.cr_acc===n)) { showAlert("Error","Cannot delete! Used in transactions."); return; }
    let all = {}; try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e){}
    all[t]=all[t].filter(x=>x!==n);
    localStorage.setItem("accounts", JSON.stringify(all)); 
    showAlert("Success","Deleted!"); updateDelList();
}

// =========================================
// 6. ADVANCED SETTINGS (TODAY'S TRANSACTIONS)
// =========================================
function initNewSettingsScreen() { renderTodayTransactions(); }
function openHideAccountsDialog() { document.getElementById("hideAccModal").style.display="flex"; filterHideList(); }
function filterHideList() {
    let s=document.getElementById("accSearch").value.toLowerCase(), l=document.getElementById("hideAccList"); l.innerHTML="";
    let all={}; try{all=JSON.parse(localStorage.getItem("accounts"))||{};}catch(e){}
    let h=[]; try{h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];}catch(e){}
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
    let a=cb.value, h=[]; try{h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];}catch(e){}
    if(cb.checked) { if(!h.includes(a)) h.push(a); } else { h=h.filter(x=>x!==a); }
    localStorage.setItem("hidden_accounts", JSON.stringify(h));
}
function saveHiddenAccounts() { showAlert("Success","Saved!"); document.getElementById("hideAccModal").style.display="none"; }

// ✅ RENDER TODAY'S TRANSACTIONS (FIXED)
function renderTodayTransactions() {
    let l=document.getElementById("todayTransList"); l.innerHTML="";
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    
    // ✅ Use Local Date instead of UTC
    let today = getLocalTodayDate(); 

    let list=tr.map((t,i)=>({...t,idx:i})).filter(t=>t.date===today);
    
    if(list.length==0) { l.innerHTML="<p style='text-align:center;color:#999;'>No transactions today.</p>"; return; }
    list.forEach(t=>{
        let c=document.createElement("div"); c.style.cssText="background:white;padding:10px;margin-bottom:10px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);";
        c.innerHTML=`<div style="display:flex;justify-content:space-between;font-weight:bold;"><span style="color:#006064;">${t.desc||"No Desc"}</span><span style="color:#004D40;">Rs. ${t.amount}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:5px;"><span style="color:#D32F2F;">Dr: ${t.dr_acc}</span><span style="color:#388E3C;">Cr: ${t.cr_acc}</span></div><button onclick="deleteTransaction(${t.idx})" style="margin-top:5px;background:#FFEBEE;color:#D32F2F;border:none;padding:5px 10px;border-radius:4px;font-size:11px;">Delete 🗑️</button>`;
        l.appendChild(c);
    });
}
function deleteTransaction(idx) {
    showAlert("Confirm", "Delete?", true, function() {
        let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
        tr.splice(idx,1);
        localStorage.setItem("transactions", JSON.stringify(tr)); 
        renderTodayTransactions(); showAlert("Success","Deleted!");
    });
}

// =========================================
// 7. BACKUP & RESTORE
// =========================================
function downloadBackup() {
    let d={accounts:localStorage.getItem("accounts"), transactions:localStorage.getItem("transactions"), hidden_accounts:localStorage.getItem("hidden_accounts")};
    let b=new Blob([JSON.stringify(d)],{type:"application/json"});
    let a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="Backup.txt"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    document.getElementById("backupStatus").innerText="Downloaded ✅";
}
function restoreBackup(i) {
    let f=i.files[0]; if(!f) return; let r=new FileReader();
    r.onload=e=>{ try{ processRestoreData(JSON.parse(e.target.result)); }catch(x){showAlert("Error","Invalid File!");} };
    r.readAsText(f);
}
function initFirebaseAndBackup() { let u=firebase.auth().currentUser; if(u) performCloudBackup(u.uid); else document.getElementById("loginModal").style.display="flex"; }
// =========================================
// FIREBASE LOGIN & REGISTER (AUTO BACKUP ඉවත් කරන ලදී)
// =========================================

function firebaseLogin() { 
    auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value)
    .then(u => { 
        document.getElementById("loginModal").style.display = "none"; 
        showAlert("Success", "Logged In Successfully!"); 
        // performCloudBackup(u.user.uid); // <-- මෙම පේළිය ඉවත් කරන ලදී (Auto Backup නතර කිරීමට)
    })
    .catch(e => showAlert("Error", e.message)); 
}

function firebaseRegister() { 
    auth.createUserWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value)
    .then(u => { 
        document.getElementById("loginModal").style.display = "none"; 
        showAlert("Success", "Registered Successfully!"); 
        // performCloudBackup(u.user.uid); // <-- මෙම පේළිය ඉවත් කරන ලදී
    })
    .catch(e => showAlert("Error", e.message)); 
}



function performCloudBackup(uid) {
    let fullData = { transactions: localStorage.getItem("transactions") || "[]", accounts: localStorage.getItem("accounts") || "{}", hidden_accounts: localStorage.getItem("hidden_accounts") || "[]" };
    let jsonString = JSON.stringify(fullData);
    let dateStr = new Date().toLocaleString();
    let ts = Date.now();
    const ref = db.ref('users/' + uid + '/backups');
    ref.once('value').then(snapshot => {
        let count = snapshot.numChildren();
        if (count >= 5) { let keys = Object.keys(snapshot.val() || {}); if(keys.length > 0) ref.child(keys[0]).remove(); }
        ref.push().set({ data: jsonString, timestamp: ts, date_label: dateStr })
           .then(() => showAlert("Success","Backup Success!"))
           .catch(e => showAlert("Error",e.message));
    });
}

function restoreFromCloud() {
    let u = firebase.auth().currentUser;
    if (!u) { showAlert("Error","Please Login first!"); return; }
    document.getElementById("restoreModal").style.display = "flex";
    const listDiv = document.getElementById("restoreList");
    listDiv.innerHTML = "<p style='text-align:center'>Loading backups...</p>";

    db.ref('users/' + u.uid + '/backups').orderByChild('timestamp').limitToLast(10).once('value')
    .then(snapshot => {
        listDiv.innerHTML = "";
        if (!snapshot.exists()) { listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>"; return; }
        let backups = [];
        snapshot.forEach(child => { backups.unshift(child.val()); });
        backups.forEach(val => {
            let btn = document.createElement("button"); btn.className = "action-btn btn-indigo"; btn.style.marginBottom = "10px";
            let dateLabel = val.date_label || new Date(val.timestamp).toLocaleString();
            btn.innerText = "📅 " + dateLabel;
            btn.onclick = () => confirmRestore(val.data);
            listDiv.appendChild(btn);
        });
    });
}

function confirmRestore(rawData) {
    showAlert("Confirm", "Restore this backup?", true, function() {
        try {
            let finalData = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;
            if (typeof finalData === 'string') { try { finalData = JSON.parse(finalData); } catch(e) {} }
            processRestoreData(finalData);
        } catch (e) { showAlert("Error", "Restore Failed!"); }
    });
}

function processRestoreData(d) {
    try {
        const saveToLocal = (key, data) => {
            if (!data) return;
            if (typeof data === 'object') localStorage.setItem(key, JSON.stringify(data));
            else localStorage.setItem(key, data);
        };
        if (d.transactions) saveToLocal("transactions", d.transactions);
        if (d.accounts) saveToLocal("accounts", d.accounts);
        if (d.hidden_accounts) saveToLocal("hidden_accounts", d.hidden_accounts);
        fixDataIntegrity();
        showAlert("Success", "Restored Successfully! Reloading...");
        setTimeout(() => location.reload(), 2000);
    } catch(e) { showAlert("Error", "Data Error: " + e.message); }
}

function updateFontPreview(v) { let s=v/10; document.body.style.zoom=s; document.getElementById("fontStatus").innerText="Scale: "+s+"x"; }
function saveFontSettings() { localStorage.setItem("app_scale", document.getElementById("fontSlider").value); showAlert("Success","Saved!"); }

// =========================================
// 8. ALERT SYSTEM
// =========================================
function showAlert(title, message, isConfirm = false, onYes = null) {
    const modal = document.getElementById("customAlert");
    if(!modal) { alert(message); return; }
    document.getElementById("alertTitle").innerText = title;
    document.getElementById("alertMessage").innerText = message;
    const btnOk = document.getElementById("btnAlertOk");
    const btnCancel = document.getElementById("btnAlertCancel");
    if (isConfirm) {
        btnCancel.style.display = "block"; btnOk.innerText = "Yes";
        btnOk.onclick = function() { document.getElementById("customAlert").style.display = "none"; if (onYes) onYes(); };
    } else {
        btnCancel.style.display = "none"; btnOk.innerText = "OK";
        btnOk.onclick = closeCustomAlert;
    }
    modal.style.display = "flex";
}
function closeCustomAlert() { document.getElementById("customAlert").style.display = "none"; }

// =========================================
// 9. ACCOUNTS & REPORTS
// =========================================
function initAccountScreen() {
    let t=document.getElementById("accTypeSelect"), y=document.getElementById("yearSelect"); t.innerHTML=""; y.innerHTML="";
    accTypes.forEach(x=>t.innerHTML+=`<option>${x}</option>`);
    for(let i=2026;i<=2050;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("monthSelect").value=new Date().getMonth()+1; updateAccountFilterList();
}
function updateAccountFilterList() {
    let t=document.getElementById("accTypeSelect").value, s=document.getElementById("accSelect"); s.innerHTML="";
    let all={}; try{all=JSON.parse(localStorage.getItem("accounts"))||{};}catch(e){}
    let h=[]; try{h=JSON.parse(localStorage.getItem("hidden_accounts"))||[];}catch(e){}
    if(all[t]) all[t].forEach(n=>{ if(!h.includes(n)) s.innerHTML+=`<option>${n}</option>`; });
}
function showAccountDetails() {
    let ac=document.getElementById("accSelect").value, yr=document.getElementById("yearSelect").value, mo=document.getElementById("monthSelect").value;
    if(!ac) return; document.getElementById("tAccTitle").innerText=ac+" ("+yr+"/"+mo+")";
    let dr=document.getElementById("drContent"), cr=document.getElementById("crContent"); dr.innerHTML=""; cr.innerHTML="";
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    
    let td=0, tc=0, ob=0;
    tr.forEach(x=>{ 
        if(parseInt(x.year)<parseInt(yr)||(parseInt(x.year)==parseInt(yr)&&parseInt(x.month)<parseInt(mo))) { 
            let a=parseFloat(x.amount); 
            if(x.dr_acc.trim()==ac.trim()) ob+=a; if(x.cr_acc.trim()==ac.trim()) ob-=a; 
        } 
    });
    if(ob!=0) { 
        let d=document.createElement("div"); d.className="t-item t-bf"; 
        d.innerText="B/F : "+Math.abs(ob).toFixed(2); 
        if(ob>0){dr.appendChild(d); td+=ob;} else{cr.appendChild(d); tc+=Math.abs(ob);} 
    }
    tr.forEach(x=>{ 
        if(x.year==yr && x.month==mo) { 
            let a=parseFloat(x.amount); let d=document.createElement("div"); d.className="t-item"; 
            d.onclick=()=>showAlert("Details",x.desc); 
            if(x.dr_acc.trim()==ac.trim()){d.innerText=`${x.date} | ${x.cr_acc} : ${a}`; dr.appendChild(d); td+=a;}
            else if(x.cr_acc.trim()==ac.trim()){d.innerText=`${x.date} | ${x.dr_acc} : ${a}`; cr.appendChild(d); tc+=a;} 
        } 
    });
    document.getElementById("drTotal").innerText=td.toFixed(2); document.getElementById("crTotal").innerText=tc.toFixed(2);
    let b=td-tc, bb=document.getElementById("finalBalanceBox"); bb.innerText="Balance c/d: "+b.toFixed(2); bb.style.backgroundColor=b>=0?"#4CAF50":"#F44336";
}

function initReportsScreen() {
    let y=document.getElementById("repYear"); y.innerHTML=""; for(let i=2026;i<=2050;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("repMonth").value=new Date().getMonth()+1;
}

function generateReport() {
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let output = document.getElementById("report-output");
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    let accounts={}; try{accounts=JSON.parse(localStorage.getItem("accounts"))||{};}catch(e){}
    let hidden=[]; try{hidden=JSON.parse(localStorage.getItem("hidden_accounts"))||[];}catch(e){}
    
    let html = `<div style="text-align:center; margin-bottom:20px;"><h2>MY LEDGER - FULL REPORT</h2><p>Year: ${sY} | Month: ${sM}</p></div><hr>`;

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
                if (t.dr_acc.trim() == acc.trim()) bal += a; if (t.cr_acc.trim() == acc.trim()) bal -= a;
            }
        });
        if (bal !== 0) {
            if (bal > 0) totTbDr += bal; else totTbCr += Math.abs(bal);
            html += `<tr><td>${acc}</td><td class="text-right">${bal > 0 ? bal.toFixed(2) : ""}</td><td class="text-right">${bal < 0 ? Math.abs(bal).toFixed(2) : ""}</td></tr>`;
        }
    });
    html += `<tr class="bold" style="background:#f0f0f0;"><td>TOTALS</td><td class="text-right">${totTbDr.toFixed(2)}</td><td class="text-right">${totTbCr.toFixed(2)}</td></tr></tbody></table></div>`;

    html += `<div class="print-page-break"></div><h3 class="text-center" style="margin-top:20px;">2. GENERAL LEDGER</h3>`;
    allAccNames.forEach(acc => {
        let openBal = 0;
        tr.forEach(t => {
            let tY = parseInt(t.year), tM = parseInt(t.month);
            if (tY < sY || (tY == sY && tM < sM)) { let a = parseFloat(t.amount); if (t.dr_acc.trim() == acc.trim()) openBal += a; if (t.cr_acc.trim() == acc.trim()) openBal -= a; }
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
                if (t.dr_acc.trim() == acc.trim()) { drHtml += `<div class="t-item">${t.date} | ${t.cr_acc} : ${a}</div>`; monthDr += a; hasTrans = true; }
                else if (t.cr_acc.trim() == acc.trim()) { crHtml += `<div class="t-item">${t.date} | ${t.dr_acc} : ${a}</div>`; monthCr += a; hasTrans = true; }
            }
        });
        if (openBal !== 0 || hasTrans) {
            let finalBal = monthDr - monthCr;
            html += `<div class="t-account-container"><div class="text-center" style="background:#ddd; padding:5px; font-weight:bold; border-bottom:1px solid #000;">${acc}</div><div class="t-body"><div class="t-col-content" style="border-right:1px solid #000;">${drHtml}</div><div class="t-col-content">${crHtml}</div></div><div class="t-footer"><div class="t-total text-center" style="border-right:1px solid #000;">${monthDr.toFixed(2)}</div><div class="t-total text-center">${monthCr.toFixed(2)}</div></div><div class="text-center" style="padding:5px; font-weight:bold; border-top:1px solid #000;">Balance c/d: ${finalBal.toFixed(2)}</div></div>`;
        }
    });

    html += `<div class="print-page-break"></div><h3 class="text-center" style="margin-top:20px;">3. FINANCIAL STATEMENTS</h3>`;
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
    html += `<div style="border:1px solid #000; padding:15px; font-family:monospace;"><p><strong>INCOME STATEMENT</strong></p><p>Total Income: <span style="float:right">${ti.toFixed(2)}</span></p><p>Total Expenses: <span style="float:right">(${tx.toFixed(2)})</span></p><hr><p><strong>NET PROFIT: <span style="float:right">${netProfit.toFixed(2)}</span></strong></p><br><p><strong>FINANCIAL POSITION</strong></p><p>Total Assets: <span style="float:right">${ta.toFixed(2)}</span></p><p>(-) Liabilities: <span style="float:right">(${tl.toFixed(2)})</span></p><hr><p><strong>NET ASSETS: <span style="float:right">${netAssets.toFixed(2)}</span></strong></p><br><p><strong>EQUITY CHECK</strong></p><p>Capital B/F: <span style="float:right">${te.toFixed(2)}</span></p><p>(+) Net Profit: <span style="float:right">${netProfit.toFixed(2)}</span></p><hr><p><strong>TOTAL EQUITY: <span style="float:right">${trueEquity.toFixed(2)}</span></strong></p></div>`;

    output.innerHTML = html;
}

function printReport() { 
    let c = document.getElementById("report-output").innerText; 
    if(!c || c.includes("Select")) { showAlert("Error", "Generate Report First!"); } 
    else { alert("ඔබට pdf එකක් අවශ්‍යනම් හෝ Android app එක බාගත කර ගැනීමට අවශ්‍ය නම් +94 715527239 යන Whatsapp අංකයට දැනුම් දෙන්න. ස්තූතියි 😊"); }
}

function initChartsScreen() {
    let c=document.getElementById("chartsContainer"); c.innerHTML="Loading...";
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    let ti=0, te=0;
    tr.forEach(t=>{ let a=parseFloat(t.amount); if(t.cr_type=="ආදායම්")ti+=a; if(t.dr_type=="වියදම්")te+=a; });
    c.innerHTML=`<div class="settings-card"><h3>Income vs Expense</h3><canvas id="c1"></canvas></div>`;
    setTimeout(()=>{ new Chart(document.getElementById('c1'), {type:'pie',data:{labels:['Inc','Exp'],datasets:[{data:[ti,te],backgroundColor:['#4CAF50','#F44336']}]}}); }, 500);
}

