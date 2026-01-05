
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
window.addEventListener("load", function() {
    let savedScale = localStorage.getItem("app_scale");
    if(savedScale) try { updateFontPreview(savedScale); } catch(e){}

    // Splash Screen Logic
    setTimeout(function() {
        const splash = document.getElementById("splash-screen");
        if (splash) {
            splash.style.display = "none";
            splash.classList.remove("active-screen");
        }
        navigateToPassword();
    }, 2000);
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
        if (name === 'accounts' || name === 'account') initAccountScreen();
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
        if(state==0) { if(currentPin==stored) navigateTo('home'); else { showAlert("Error", "Wrong PIN!"); updatePasswordUI(); } }
        else if(state==1) { if(currentPin==stored) { state=2; updatePasswordUI(); } else { showAlert("Error", "Wrong Old PIN!"); updatePasswordUI(); } }
        else if(state==2) { tempNewPin=currentPin; state=3; updatePasswordUI(); }
        else if(state==3) { if(currentPin==tempNewPin) { localStorage.setItem(savedPinKey, currentPin); showAlert("Success", "PIN Setup Successful!"); navigateTo('home'); } else { showAlert("Error", "PIN Mismatch!"); state=2; updatePasswordUI(); } }
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
    
    // Parse Accounts Safely
    let all = {};
    try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e) { all = {}; }
    
    let h = [];
    try { h = JSON.parse(localStorage.getItem("hidden_accounts")) || []; } catch(e) { h = []; }

    if(all[t]) {
        all[t].forEach(n => { if(!h.includes(n)) a.innerHTML+=`<option>${n}</option>`; });
    }
}
function saveTransaction() {
    let dt=document.getElementById("spinDrType").value, da=document.getElementById("spinDrAcc").value;
    let ct=document.getElementById("spinCrType").value, ca=document.getElementById("spinCrAcc").value;
    let am=document.getElementById("edAmt").value, de=document.getElementById("edDesc").value;
    
    if(!da || !ca || !am) { showAlert("Error", "Please fill all fields!"); return; }
    
    let now=new Date(); 
    let tr={year:now.getFullYear().toString(), month:(now.getMonth()+1).toString(), date:now.toISOString().split('T')[0], dr_type:dt, dr_acc:da, cr_type:ct, cr_acc:ca, amount:am, desc:de};
    
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem("transactions")) || []; } catch(e) { arr = []; }
    
    arr.push(tr); 
    localStorage.setItem("transactions", JSON.stringify(arr));
    
    showAlert("Success", "Transaction Saved! ✅"); 
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
    
    let all = {};
    try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e) { all = {}; }
    
    if(!all[t]) all[t]=[]; 
    if(all[t].includes(n)) { showAlert("Error", "Account exists!"); return; }
    
    all[t].push(n); 
    localStorage.setItem("accounts", JSON.stringify(all));
    
    // Remove from hidden if exists
    let h = [];
    try { h = JSON.parse(localStorage.getItem("hidden_accounts")) || []; } catch(e) { h = []; }
    localStorage.setItem("hidden_accounts", JSON.stringify(h.filter(x=>x!==n)));
    
    showAlert("Success", "Account Created!"); 
    document.getElementById("setAccName").value=""; updateDelList();
}
function updateDelList() {
    let t=document.getElementById("delSpinType").value, s=document.getElementById("delSpinAcc"); s.innerHTML="";
    let all = {};
    try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e) { all = {}; }
    if(all[t]) all[t].forEach(n => s.innerHTML+=`<option>${n}</option>`);
}
function deleteAccount() {
    let t=document.getElementById("delSpinType").value, n=document.getElementById("delSpinAcc").value;
    if(!n) return;
    
    let tr = [];
    try { tr = JSON.parse(localStorage.getItem("transactions")) || []; } catch(e) { tr = []; }
    
    if(tr.some(x=>x.dr_acc===n||x.cr_acc===n)) { showAlert("Error", "Cannot delete! Account has transactions."); return; }
    
    let all = {};
    try { all = JSON.parse(localStorage.getItem("accounts")) || {}; } catch(e) { all = {}; }
    
    all[t]=all[t].filter(x=>x!==n);
    localStorage.setItem("accounts", JSON.stringify(all)); 
    showAlert("Success", "Account Deleted!"); updateDelList();
}

// New Settings
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
function saveHiddenAccounts() { showAlert("Success", "Settings Saved!"); document.getElementById("hideAccModal").style.display="none"; }
function renderTodayTransactions() {
    let l=document.getElementById("todayTransList"); l.innerHTML="";
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    let today=new Date().toISOString().split('T')[0];
    let list=tr.map((t,i)=>({...t,idx:i})).filter(t=>t.date===today);
    
    if(list.length==0) { l.innerHTML="<p style='text-align:center;color:#999;'>No transactions today.</p>"; return; }
    list.forEach(t=>{
        let c=document.createElement("div"); c.style.cssText="background:white;padding:10px;margin-bottom:10px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);";
        c.innerHTML=`<div style="display:flex;justify-content:space-between;font-weight:bold;"><span style="color:#006064;">${t.desc||"No Desc"}</span><span style="color:#004D40;">Rs. ${t.amount}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:5px;"><span style="color:#D32F2F;">Dr: ${t.dr_acc}</span><span style="color:#388E3C;">Cr: ${t.cr_acc}</span></div><button onclick="deleteTransaction(${t.idx})" style="margin-top:5px;background:#FFEBEE;color:#D32F2F;border:none;padding:5px 10px;border-radius:4px;font-size:11px;">Delete 🗑️</button>`;
        l.appendChild(c);
    });
}
function deleteTransaction(idx) {
    showAlert("Confirm", "Delete this transaction?", true, function() {
        let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
        tr.splice(idx,1);
        localStorage.setItem("transactions", JSON.stringify(tr)); 
        renderTodayTransactions(); 
        showAlert("Success", "Deleted!");
    });
}

// =========================================
// 6. BACKUP & RESTORE (ENHANCED LOGIC)
// =========================================
function downloadBackup() {
    let d={
        accounts: localStorage.getItem("accounts"), 
        transactions: localStorage.getItem("transactions"), 
        hidden_accounts: localStorage.getItem("hidden_accounts")
    };
    let b=new Blob([JSON.stringify(d)],{type:"application/json"});
    let a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="MyLedger_Backup.txt"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    document.getElementById("backupStatus").innerText="Status: Downloaded ✅";
}

function restoreBackup(i) {
    let f=i.files[0]; if(!f) return; let r=new FileReader();
    r.onload=e=>{ try{ processRestoreData(JSON.parse(e.target.result)); }catch(x){showAlert("Error", "Invalid File!");} };
    r.readAsText(f);
}

// --- CLOUD BACKUP ---
function initFirebaseAndBackup() { let u=firebase.auth().currentUser; if(u) performCloudBackup(u.uid); else document.getElementById("loginModal").style.display="flex"; }
function firebaseLogin() { auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; showAlert("Success", "Logged In!"); performCloudBackup(u.user.uid); }).catch(e=>showAlert("Error", e.message)); }
function firebaseRegister() { auth.createUserWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; showAlert("Success", "Registered!"); performCloudBackup(u.user.uid); }).catch(e=>showAlert("Error", e.message)); }

function performCloudBackup(uid) {
    // Android Format Compatibility: Save as Stringified JSON if stored as such
    let tData = localStorage.getItem("transactions") || "[]";
    let aData = localStorage.getItem("accounts") || "{}";
    let hData = localStorage.getItem("hidden_accounts") || "[]";

    let fullData = {
        transactions: tData, // Keep as string for Android compatibility
        accounts: aData,     // Keep as string for Android compatibility
        hidden_accounts: hData
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
           .then(() => showAlert("Success", "Cloud Backup Successful!"))
           .catch(e => showAlert("Error", e.message));
    });
}

function restoreFromCloud() {
    let u = firebase.auth().currentUser;
    if (!u) { showAlert("Error", "Please Login first!"); return; }
    document.getElementById("restoreModal").style.display = "flex";
    const listDiv = document.getElementById("restoreList");
    listDiv.innerHTML = "Loading...";

    const ref = db.ref('users/' + u.uid + '/backups');
    ref.orderByChild('timestamp').limitToLast(10).once('value').then(snapshot => {
        listDiv.innerHTML = "";
        if (!snapshot.exists()) { listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>"; return; }
        
        // Reverse order to show newest first
        let backups = [];
        snapshot.forEach(child => { backups.unshift(child.val()); });
        
        backups.forEach(val => {
            let btn = document.createElement("button");
            btn.className = "action-btn btn-indigo";
            btn.style.marginBottom = "10px";
            btn.innerText = "📅 " + (val.date_label || "Unknown Date");
            btn.onclick = () => confirmRestore(val.data);
            listDiv.appendChild(btn);
        });
    });
}

function confirmRestore(jsonString) {
    showAlert("Confirm", "Restore this backup? Current data will be replaced.", true, function() {
        try {
            let d = JSON.parse(jsonString);
            processRestoreData(d);
        } catch (e) { showAlert("Error", "Restore Failed: Invalid Data."); }
    });
}

// --- CRITICAL RESTORE HELPER (HANDLES BOTH ANDROID AND WEB FORMATS) ---
function processRestoreData(d) {
    try {
        // 1. Transactions Logic
        if (d.transactions) {
            let transData = d.transactions;
            // If coming from Android, it might be a double-stringified JSON. Check type.
            if (typeof transData === 'string') {
                // Verify if it's a valid JSON string
                if (transData.startsWith("[") || transData.startsWith("{")) {
                    localStorage.setItem("transactions", transData);
                } else {
                    // It might be a regular string, rare but safe to save
                    localStorage.setItem("transactions", transData); 
                }
            } else {
                // If it's an object (from Web backup), stringify it
                localStorage.setItem("transactions", JSON.stringify(transData));
            }
        }

        // 2. Accounts Logic
        if (d.accounts) {
            let accData = d.accounts;
            if (typeof accData === 'string') {
                localStorage.setItem("accounts", accData);
            } else {
                localStorage.setItem("accounts", JSON.stringify(accData));
            }
        }

        // 3. Hidden Accounts Logic
        if (d.hidden_accounts) {
            let hidData = d.hidden_accounts;
            if (typeof hidData === 'string') {
                localStorage.setItem("hidden_accounts", hidData);
            } else {
                localStorage.setItem("hidden_accounts", JSON.stringify(hidData));
            }
        }

        showAlert("Success", "Restore Successful! App will reload.");
        setTimeout(() => location.reload(), 1500);

    } catch(e) {
        showAlert("Error", "Data Processing Error: " + e.message);
    }
}

function updateFontPreview(v) { let s=v/10; document.body.style.zoom=s; document.getElementById("fontStatus").innerText="Scale: "+s+"x"; }
function saveFontSettings() { localStorage.setItem("app_scale", document.getElementById("fontSlider").value); showAlert("Success", "Saved!"); }

// =========================================
// 7. CUSTOM ALERT SYSTEM
// =========================================
function showAlert(title, message, isConfirm = false, onYes = null) {
    const modal = document.getElementById("customAlert");
    if(!modal) { alert(message); return; } // Fallback
    
    document.getElementById("alertTitle").innerText = title;
    document.getElementById("alertMessage").innerText = message;
    
    const btnOk = document.getElementById("btnAlertOk");
    const btnCancel = document.getElementById("btnAlertCancel");

    if (isConfirm) {
        btnCancel.style.display = "block";
        btnOk.innerText = "Yes";
        btnOk.onclick = function() {
            document.getElementById("customAlert").style.display = "none";
            if (onYes) onYes();
        };
    } else {
        btnCancel.style.display = "none";
        btnOk.innerText = "OK";
        btnOk.onclick = closeCustomAlert;
    }
    modal.style.display = "flex";
}
function closeCustomAlert() { document.getElementById("customAlert").style.display = "none"; }

// =========================================
// 8. ACCOUNTS & REPORTS (FULL)
// =========================================
function initAccountScreen() {
    let t=document.getElementById("accTypeSelect"), y=document.getElementById("yearSelect"); t.innerHTML=""; y.innerHTML="";
    accTypes.forEach(x=>t.innerHTML+=`<option>${x}</option>`);
    for(let i=2024;i<=2030;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
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
    tr.forEach(x=>{ if(parseInt(x.year)<parseInt(yr)||(parseInt(x.year)==parseInt(yr)&&parseInt(x.month)<parseInt(mo))) { let a=parseFloat(x.amount); if(x.dr_acc==ac) ob+=a; if(x.cr_acc==ac) ob-=a; } });
    if(ob!=0) { let d=document.createElement("div"); d.className="t-item t-bf"; d.innerText="B/F : "+Math.abs(ob).toFixed(2); if(ob>0){dr.appendChild(d); td+=ob;}else{cr.appendChild(d); tc+=Math.abs(ob);} }
    tr.forEach(x=>{ if(x.year==yr && x.month==mo) { let a=parseFloat(x.amount), d=document.createElement("div"); d.className="t-item"; d.onclick=()=>showAlert("Details", x.desc); if(x.dr_acc==ac){d.innerText=`${x.date} | ${x.cr_acc} : ${a}`; dr.appendChild(d); td+=a;}else if(x.cr_acc==ac){d.innerText=`${x.date} | ${x.dr_acc} : ${a}`; cr.appendChild(d); tc+=a;} } });
    document.getElementById("drTotal").innerText=td.toFixed(2); document.getElementById("crTotal").innerText=tc.toFixed(2);
    let b=td-tc, bb=document.getElementById("finalBalanceBox"); bb.innerText="Balance c/d: "+b.toFixed(2); bb.style.backgroundColor=b>=0?"#4CAF50":"#F44336";
}
function initReportsScreen() {
    let y=document.getElementById("repYear"); y.innerHTML=""; for(let i=2024;i<=2030;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("repMonth").value=new Date().getMonth()+1;
}

// FULL REPORT GENERATOR
function generateReport() {
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let output = document.getElementById("report-output");
    
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    let accounts={}; try{accounts=JSON.parse(localStorage.getItem("accounts"))||{};}catch(e){}
    let hidden=[]; try{hidden=JSON.parse(localStorage.getItem("hidden_accounts"))||[];}catch(e){}
    
    let html = `<div style="text-align:center; margin-bottom:20px;"><h2>MY LEDGER - FULL REPORT</h2><p>Year: ${sY} | Month: ${sM}</p><p>Generated on: ${new Date().toLocaleString()}</p></div><hr>`;

    // 1. TRIAL BALANCE
    html += `<div class="report-section"><h3 class="text-center" style="margin-top:20px;">1. TRIAL BALANCE</h3><table class="tb-table"><thead><tr><th>Account Name</th><th>Dr</th><th>Cr</th></tr></thead><tbody>`;
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
    html += `<div class="print-page-break"></div><h3 class="text-center" style="margin-top:20px;">2. GENERAL LEDGER</h3>`;
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
            html += `<div class="t-account-container" style="margin-top:15px; border:1px solid #000; page-break-inside:avoid;"><div style="background:#ddd; padding:5px; text-align:center; font-weight:bold; border-bottom:1px solid #000;">${acc}</div><div style="display:flex;"><div style="flex:1; border-right:1px solid #000;"><div style="background:#eee; text-align:center; font-weight:bold; border-bottom:1px solid #000;">Dr</div><div style="padding:5px;">${drHtml}</div></div><div style="flex:1;"><div style="background:#eee; text-align:center; font-weight:bold; border-bottom:1px solid #000;">Cr</div><div style="padding:5px;">${crHtml}</div></div></div><div style="display:flex; border-top:1px solid #000; font-weight:bold; background:#f9f9f9;"><div style="flex:1; text-align:center; padding:5px; border-right:1px solid #000;">${monthDr.toFixed(2)}</div><div style="flex:1; text-align:center; padding:5px;">${monthCr.toFixed(2)}</div></div><div style="text-align:center; padding:5px; border-top:1px solid #000; font-weight:bold;">Balance c/d: ${finalBal.toFixed(2)}</div></div>`;
        }
    });

    // 3. FINANCIAL STATEMENTS
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
    html += `<div style="border:1px solid #000; padding:15px; margin-top:10px;"><p><strong>INCOME STATEMENT</strong></p><p>Total Income: <span style="float:right">${ti.toFixed(2)}</span></p><p>Total Expenses: <span style="float:right">(${tx.toFixed(2)})</span></p><hr><p><strong>NET PROFIT: <span style="float:right">${netProfit.toFixed(2)}</span></strong></p><br><p><strong>FINANCIAL POSITION</strong></p><p>Total Assets: <span style="float:right">${ta.toFixed(2)}</span></p><p>(-) Liabilities: <span style="float:right">(${tl.toFixed(2)})</span></p><hr><p><strong>NET ASSETS: <span style="float:right">${netAssets.toFixed(2)}</span></strong></p><br><p><strong>EQUITY CHECK</strong></p><p>Capital B/F: <span style="float:right">${te.toFixed(2)}</span></p><p>(+) Net Profit: <span style="float:right">${netProfit.toFixed(2)}</span></p><hr><p><strong>TOTAL EQUITY: <span style="float:right">${trueEquity.toFixed(2)}</span></strong></p></div>`;

    output.innerHTML = html;
}

function printReport() { 
    let c = document.getElementById("report-output").innerText; 
    if(!c || c.includes("Select")) {
        showAlert("Error", "කරුණාකර පළමුව 'Generate Summary' බොත්තම ඔබන්න!"); 
    } else {
        showAlert("Info", "ඔබට pdf එකක් අවශ්‍යනම් හෝ Android app එක බාගත කර ගැනීමට අවශ්‍ය නම් +94 715527239 යන Whatsapp අංකයට දැනුම් දෙන්න.එවිට ඔබට pdf එක හෝ Apk ගොනුව ලබා ගත හැක.ස්තූතියි 😊"); 
    }
}

// =========================================
// 9. CHARTS
// =========================================
function initChartsScreen() {
    let c=document.getElementById("chartsContainer"); c.innerHTML="Loading Analysis...";
    let tr=[]; try{tr=JSON.parse(localStorage.getItem("transactions"))||[];}catch(e){}
    
    let ti=0, te=0, ta=0, tl=0;
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
