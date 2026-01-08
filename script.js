// =========================================
// 1. GLOBAL CONFIG & FIREBASE SETUP
// =========================================
const accTypes = ["වත්කම්", "වගකීම්", "හිමිකම්", "ආදායම්", "වියදම්"];
const savedPinKey = "user_pin";
const colorModeKey = "ColorMode";
let currentPin = "", state = 0, tempNewPin = "";

// Firebase Config
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
    app = firebase.initializeApp(firebaseConfig); 
    auth = firebase.auth(); 
    db = firebase.database();
} catch (e) { console.error("Firebase Init Error:", e); }

// =========================================
// 2. INITIALIZATION
// =========================================
window.addEventListener("load", function() {
    let savedScale = localStorage.getItem("app_scale");
    if(savedScale) try { updateFontPreview(savedScale); } catch(e){}
    
    // Auto Backup Switch State UI Sync
    let isBackupOn = localStorage.getItem("auto_backup_enabled") !== "false";
    let switchEl = document.getElementById("autoBackupSwitch");
    if(switchEl) switchEl.checked = isBackupOn;

    fixDataIntegrity(); 
    
    // Check Auth & Trigger Auto Backup / Notifications
    if(auth) {
        auth.onAuthStateChanged(user => {
            if(user) {
                listenForAdminMessages(user.uid);
                performCloudBackup(user.uid); // ✅ Daily Backup Check on Load
            }
        });
    }

    setTimeout(function() {
        const splash = document.getElementById("splash-screen");
        if(splash) { splash.style.display = "none"; splash.classList.remove("active-screen"); }
        navigateToPassword();
    }, 2000);
});

function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fixDataIntegrity() {
    try {
        let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
        let acc = JSON.parse(localStorage.getItem("accounts") || "{}");
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
            if(d !== t.dr_acc || c !== t.cr_acc) { t.dr_acc = d; t.cr_acc = c; changed = true; }
            return t;
        });

        if(changed) {
            localStorage.setItem("transactions", JSON.stringify(tr));
            localStorage.setItem("accounts", JSON.stringify(acc));
        }
    } catch(e) {}
}

function navigateTo(name) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    
    let id = name + "-screen";
    if (name === 'accounts') id = "account-screen";
    if (name === 'new-settings') id = "new-settings-screen";

    let el = document.getElementById(id);
    if (el) {
        el.style.display = (name === 'password') ? 'flex' : 'block';
        
        // Apply Theme Background Logic
        let savedMode = localStorage.getItem(colorModeKey);
        let isColorful = savedMode !== "false";
        
        if(name !== 'password' && name !== 'splash') {
            if(isColorful) {
                el.style.background = "linear-gradient(135deg, #E0F7FA 0%, #F3E5F5 100%)";
            } else {
                el.style.background = "#f5f7fa";
            }
        }

        if (name === 'home') initHomeScreen();
        if (name === 'settings') initSettingsScreen();
        if (name === 'accounts') initAccountScreen();
        if (name === 'reports') initReportsScreen();
        if (name === 'charts') loadCharts();
        if (name === 'new-settings') initNewSettingsScreen();
    }
}

// =========================================
// 3. ADMIN MESSAGES
// =========================================
function listenForAdminMessages(uid) {
    const ref = db.ref('users/' + uid + '/notifications');
    ref.limitToLast(1).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg) {
            document.getElementById("adminMsgTitle").innerText = msg.title || "New Message";
            let bodyText = msg.body || "";
            if(msg.url) bodyText += `<br><br><a href="${msg.url}" target="_blank" style="color:blue; text-decoration:underline;">Click Here to Open Link</a>`;
            
            document.getElementById("adminMsgBody").innerHTML = bodyText;
            document.getElementById("adminMsgModal").style.display = "flex";
            
            snapshot.ref.remove(); 
        }
    });
}

// =========================================
// 4. PASSWORD & UI THEME
// =========================================
function navigateToPassword() {
    let el = document.getElementById("password-screen"); 
    el.style.display = "flex";
    
    let savedMode = localStorage.getItem(colorModeKey);
    let isColorful = savedMode !== "false"; 
    
    document.getElementById("colorModeSwitch").checked = isColorful;
    applyGlobalTheme(isColorful);

    let stored = localStorage.getItem(savedPinKey);
    state = !stored ? 2 : 0; 
    updatePasswordUI();
}

function toggleColorMode() { 
    let isChecked = document.getElementById("colorModeSwitch").checked;
    localStorage.setItem(colorModeKey, isChecked); 
    applyGlobalTheme(isChecked);
}

function applyGlobalTheme(isColorful) {
    // 1. Apply to Password Screen
    let passScreen = document.getElementById("password-screen");
    let passTitle = document.getElementById("passTitle");
    let passSub = document.getElementById("passSub");
    let backBtn = document.querySelector(".keypad-grid button[onclick*='back']");
    
    if (isColorful) {
        passScreen.style.background = "linear-gradient(to bottom, #18FFFF, #E040FB, #000000, #E040FB, #76FF03)";
        passTitle.style.color = "white";
        passSub.style.color = "#f0f0f0";
        if(backBtn) backBtn.style.color = "white";
        document.querySelectorAll(".keypad-grid button").forEach(btn => {
            btn.style.background = "rgba(255,255,255,0.2)"; btn.style.color = "white";
        });
    } else {
        passScreen.style.background = "#f5f5f5";
        passTitle.style.color = "#333";
        passSub.style.color = "#666";
        if(backBtn) backBtn.style.color = "#333";
        document.querySelectorAll(".keypad-grid button").forEach(btn => {
            btn.style.background = "white"; btn.style.color = "#333";
        });
    }

    // 2. Apply to other screens if they are currently visible
    document.querySelectorAll('.screen').forEach(sc => {
        if(sc.id !== "password-screen" && sc.id !== "splash-screen" && sc.style.display !== 'none') {
             sc.style.background = isColorful ? "linear-gradient(135deg, #E0F7FA 0%, #F3E5F5 100%)" : "#f5f7fa";
        }
    });
}

function updatePasswordUI() {
    currentPin = ""; updateDots(); 
    let t = document.getElementById("passTitle"), s = document.getElementById("passSub"), b = document.getElementById("btnChangePin");
    
    let isColorful = document.getElementById("colorModeSwitch").checked;
    t.style.color = isColorful ? "white" : "#333";

    if(state==0){ t.innerText="Welcome Back"; s.innerText="Enter PIN"; b.style.display="block"; }
    if(state==1){ t.innerText="Security Check"; s.innerText="Enter OLD PIN"; b.style.display="none"; }
    if(state==2){ t.innerText="Set New PIN"; s.innerText="New 6-digit PIN"; b.style.display="none"; }
    if(state==3){ t.innerText="Confirm PIN"; s.innerText="Confirm PIN"; b.style.display="none"; }
}

function pressKey(k) { 
    if(k=='back') currentPin=currentPin.slice(0,-1); else if(currentPin.length<6) currentPin+=k; 
    updateDots(); if(currentPin.length==6) handlePinSubmit(); 
}

function updateDots() { 
    let isColorful = document.getElementById("colorModeSwitch").checked;
    let dotColor = isColorful ? "white" : "#2196F3";
    document.querySelectorAll(".dot").forEach((d,i)=>{ 
        d.style.borderColor = dotColor;
        if(i<currentPin.length) { d.classList.add("filled"); d.style.background = dotColor; } 
        else { d.classList.remove("filled"); d.style.background = "transparent"; }
    }); 
}

function handlePinSubmit() {
    let stored = localStorage.getItem(savedPinKey);
    setTimeout(() => {
        if(state==0) { 
            if(currentPin==stored) { 
                applyGlobalTheme(document.getElementById("colorModeSwitch").checked); 
                navigateTo('home'); 
            } else { showAlert("Error","Wrong PIN!"); updatePasswordUI(); } 
        }
        else if(state==1) { if(currentPin==stored) { state=2; updatePasswordUI(); } else { showAlert("Error","Wrong Old PIN!"); updatePasswordUI(); } }
        else if(state==2) { tempNewPin=currentPin; state=3; updatePasswordUI(); }
        else if(state==3) { if(currentPin==tempNewPin) { localStorage.setItem(savedPinKey, currentPin); showAlert("Success","PIN Set!"); navigateTo('home'); } else { showAlert("Error","Mismatch!"); state=2; updatePasswordUI(); } }
    }, 200);
}
function startChangePin() { state=1; updatePasswordUI(); }

// =========================================
// 5. TRANSACTIONS & HOME
// =========================================
function initHomeScreen() {
    let d=document.getElementById("spinDrType"), c=document.getElementById("spinCrType"); d.innerHTML=""; c.innerHTML="";
    accTypes.forEach(t => { d.innerHTML+=`<option>${t}</option>`; c.innerHTML+=`<option>${t}</option>`; });
    updateAccountList('dr'); updateAccountList('cr');
    setupLongPress();
}

function updateAccountList(s) {
    let t = document.getElementById(s=='dr'?"spinDrType":"spinCrType").value;
    let a = document.getElementById(s=='dr'?"spinDrAcc":"spinCrAcc"); a.innerHTML="";
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    let h = JSON.parse(localStorage.getItem("hidden_accounts") || "[]");
    if(all[t]) all[t].forEach(n => { if(!h.includes(n)) a.innerHTML+=`<option>${n}</option>`; });
}

function saveTransaction() {
    let dt=document.getElementById("spinDrType").value, da=document.getElementById("spinDrAcc").value;
    let ct=document.getElementById("spinCrType").value, ca=document.getElementById("spinCrAcc").value;
    let am=document.getElementById("edAmt").value, de=document.getElementById("edDesc").value;
    
    if(!da || !ca || !am) { showAlert("Error", "Missing Data!"); return; }
    
    let tr={
        year: new Date().getFullYear().toString(), 
        month: (new Date().getMonth()+1).toString(), 
        date: getLocalTodayDate(),
        dr_type:dt, dr_acc:da.trim(), 
        cr_type:ct, cr_acc:ca.trim(), 
        amount:am, desc:de
    };
    
    let arr = JSON.parse(localStorage.getItem("transactions") || "[]");
    arr.push(tr); 
    localStorage.setItem("transactions", JSON.stringify(arr));
    
    showAlert("Success", "Saved! ✅"); 
    document.getElementById("edAmt").value=""; document.getElementById("edDesc").value="";
    
    // Attempt Backup on Save (Respects daily limit inside function)
    if(auth && auth.currentUser) performCloudBackup(auth.currentUser.uid);
}

function setupLongPress() {
    let btn=document.getElementById("btnSave"); let timer;
    btn.addEventListener("touchstart", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("touchend", ()=>{ clearTimeout(timer); });
    btn.addEventListener("mousedown", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("mouseup", ()=>{ clearTimeout(timer); });
}

// =========================================
// 6. SETTINGS (ACCOUNTS & BACKUP UI)
// =========================================
function initSettingsScreen() {
    let c=document.getElementById("setSpinType"), d=document.getElementById("delSpinType"); c.innerHTML=""; d.innerHTML="";
    accTypes.forEach(t => { c.innerHTML+=`<option>${t}</option>`; d.innerHTML+=`<option>${t}</option>`; });
    updateDelList();
    let sc = localStorage.getItem("app_scale") || "10"; document.getElementById("fontSlider").value = sc; updateFontPreview(sc);

    // Auto Backup Switch State
    let isAutoBackup = localStorage.getItem("auto_backup_enabled") !== "false"; 
    document.getElementById("autoBackupSwitch").checked = isAutoBackup;
}

function createAccount() {
    let t = document.getElementById("setSpinType").value;
    let n = document.getElementById("setAccName").value.trim();
    if(!n) { showAlert("Error", "Please enter a name!"); return; }
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    if(!all[t]) all[t] = [];
    if(all[t].includes(n)) { showAlert("Error", "Exists!"); return; }
    all[t].push(n);
    localStorage.setItem("accounts", JSON.stringify(all));
    showAlert("Success", "Created!");
    document.getElementById("setAccName").value = "";
    updateDelList();
}

function updateDelList() {
    let t = document.getElementById("delSpinType").value;
    let s = document.getElementById("delSpinAcc"); s.innerHTML="";
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    if(all[t]) all[t].forEach(n => s.innerHTML += `<option>${n}</option>`);
}

function deleteAccount() {
    let t = document.getElementById("delSpinType").value;
    let n = document.getElementById("delSpinAcc").value;
    if(!n) return;
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    if(tr.some(x => x.dr_acc === n || x.cr_acc === n)) {
        showAlert("Error", "Cannot delete! Account used."); return;
    }
    showAlert("Confirm", "Delete '" + n + "'?", true, function() {
        let all = JSON.parse(localStorage.getItem("accounts") || "{}");
        all[t] = all[t].filter(x => x !== n);
        localStorage.setItem("accounts", JSON.stringify(all));
        showAlert("Success", "Deleted!");
        updateDelList();
    });
}

function toggleAutoBackup() {
    let isEnabled = document.getElementById("autoBackupSwitch").checked;
    localStorage.setItem("auto_backup_enabled", isEnabled);
    showAlert("Settings", isEnabled ? "Auto Backup Enabled! ✅" : "Auto Backup Disabled! ❌");
}

// =========================================
// 7. BACKUP LOGIC (DAILY LIMIT & DATE FIX)
// =========================================
function initFirebaseAndBackup() { 
    let u=auth.currentUser; 
    if(u) {
        // For manual backup, we bypass the date check or just call performCloudBackup 
        // Note: performCloudBackup enforces daily limit. 
        // If you want manual override, we'd need a separate function or flag.
        // For now, it respects the rule.
        performCloudBackup(u.uid); 
    }
    else document.getElementById("loginModal").style.display="flex"; 
}

function firebaseLogin() { 
    auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value)
    .then(u => { 
        document.getElementById("loginModal").style.display = "none"; 
        showAlert("Success", "Logged In!"); 
        if(localStorage.getItem("auto_backup_enabled") !== "false") performCloudBackup(u.user.uid);
    }).catch(e => showAlert("Error", e.message)); 
}

function firebaseRegister() { 
    auth.createUserWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value)
    .then(u => { 
        document.getElementById("loginModal").style.display = "none"; 
        showAlert("Success", "Registered!"); 
        if(localStorage.getItem("auto_backup_enabled") !== "false") performCloudBackup(u.user.uid);
    }).catch(e => showAlert("Error", e.message)); 
}

function performCloudBackup(uid) {
    // 1. Check if Switch is OFF
    if (localStorage.getItem("auto_backup_enabled") === "false") return;

    // 2. Daily Limit Check
    let now = new Date();
    let todayDate = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
    let lastBackup = localStorage.getItem("last_backup_date_log");

    if (todayDate === lastBackup) {
        console.log("Backup skipped: Already backed up today.");
        return; 
    }

    // 3. Prepare Data
    let data = { 
        transactions: localStorage.getItem("transactions") || "[]", 
        accounts: localStorage.getItem("accounts") || "{}", 
        hidden_accounts: localStorage.getItem("hidden_accounts") || "[]" 
    };
    
    let ts = Date.now();
    // ✅ Date Label Fix: Show full date & time in list
    let displayDate = now.toLocaleString('en-GB', { hour12: true }); 

    db.ref('users/' + uid + '/backups').push({ 
        data: JSON.stringify(data), 
        timestamp: ts, 
        date_label: displayDate // Fixes "Unknown" issue
    }).then(() => {
        // Save today's date to local storage to enforce daily limit
        localStorage.setItem("last_backup_date_log", todayDate);
        
        // Cleanup old backups
        db.ref('users/' + uid + '/backups').once('value').then(snap => {
            if(snap.numChildren() > 10) { 
                let keys = Object.keys(snap.val()); 
                db.ref('users/' + uid + '/backups/' + keys[0]).remove(); 
            }
        });
        showAlert("Success", "Auto Backup Complete! ☁");
    }).catch(e => console.error("Backup Failed", e));
}

function restoreFromCloud() {
    let u = auth.currentUser;
    if (!u) { showAlert("Error", "Please Login first!"); return; }
    
    document.getElementById("restoreModal").style.display = "flex";
    const listDiv = document.getElementById("restoreList");
    listDiv.innerHTML = "<p style='text-align:center'>Loading backups...</p>";

    // Query එක සරල කළා (orderByChild ඉවත් කළා - දෝෂ මගහරවා ගැනීමට)
    db.ref('users/' + u.uid + '/backups').limitToLast(15).once('value')
    .then(snapshot => {
        listDiv.innerHTML = "";
        
        if (!snapshot.exists()) { 
            listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>"; 
            return; 
        }
        
        // දත්ත Array එකකට ගැනීම (අලුත් ඒවා උඩට එන ලෙස Reverse කිරීම)
        let backups = [];
        snapshot.forEach(child => { 
            backups.unshift({ key: child.key, val: child.val() }); 
        });
        
        backups.forEach(item => {
            let val = item.val;
            let btn = document.createElement("button"); 
            btn.className = "action-btn btn-indigo"; 
            btn.style.marginBottom = "8px";
            btn.style.textAlign = "left"; // අකුරු වම් පැත්තට

            // --- 🛠️ දිනය සොයා ගැනීමේ Logic එක (ROBUST DATE FINDER) ---
            let displayLabel = "📅 Unknown Date";

            if (val.date_label) {
                // 1. Web/App එකෙන් එන සම්මත නම
                displayLabel = "📅 " + val.date_label;
            } 
            else if (val.date) {
                // 2. සමහර පැරණි සංස්කරණ වල 'date' ලෙස තිබිය හැක
                displayLabel = "📅 " + val.date;
            } 
            else if (val.timestamp) {
                // 3. නමක් නැත්නම් Timestamp එක දිනයක් බවට හරවන්න
                try {
                    let d = new Date(val.timestamp);
                    displayLabel = "📅 " + d.toLocaleDateString() + " " + d.toLocaleTimeString();
                } catch (e) { 
                    displayLabel = "📅 Time Error"; 
                }
            } 
            else {
                // 4. කිසිවක් නැත්නම් Key එකෙන් කොටසක් පෙන්වන්න
                displayLabel = "📅 Backup ID: " + item.key.substring(0, 6);
            }

            btn.innerText = displayLabel;
            
            // Backup එක Click කළාම Restore වෙන්න
            btn.onclick = () => confirmRestore(val.data);
            
            listDiv.appendChild(btn);
        });
    })
    .catch(error => {
        listDiv.innerHTML = "<p style='color:red; text-align:center'>Error: " + error.message + "</p>";
    });
}

function confirmRestore(rawData) {
    showAlert("Confirm", "Restore this backup?", true, function() {
        try {
            let d = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;
            if(typeof d === 'string') d = JSON.parse(d); 
            localStorage.setItem("transactions", d.transactions);
            localStorage.setItem("accounts", d.accounts);
            if(d.hidden_accounts) localStorage.setItem("hidden_accounts", d.hidden_accounts);
            fixDataIntegrity();
            showAlert("Success", "Restored! Reloading...");
            setTimeout(() => location.reload(), 2000);
        } catch(e) { showAlert("Error", "Restore Failed!"); }
    });
}

function downloadBackup() {
    let d={accounts:localStorage.getItem("accounts"), transactions:localStorage.getItem("transactions"), hidden_accounts:localStorage.getItem("hidden_accounts")};
    let b=new Blob([JSON.stringify(d)],{type:"application/json"});
    let a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="Backup.txt"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function restoreBackup(i) {
    let f=i.files[0]; if(!f) return; let r=new FileReader();
    r.onload=e=>{ try{ confirmRestore(e.target.result); }catch(x){showAlert("Error","Invalid File!");} };
    r.readAsText(f);
}

// =========================================
// 8. ACCOUNTS VIEW & LOGIC
// =========================================
function initAccountScreen() {
    let t=document.getElementById("accTypeSelect"), y=document.getElementById("yearSelect"); t.innerHTML=""; y.innerHTML="";
    accTypes.forEach(x=>t.innerHTML+=`<option>${x}</option>`);
    for(let i=2024;i<=2050;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("monthSelect").value=new Date().getMonth()+1; updateAccountFilterList();
}
function updateAccountFilterList() {
    let t=document.getElementById("accTypeSelect").value, s=document.getElementById("accSelect"); s.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts")||"{}"), h=JSON.parse(localStorage.getItem("hidden_accounts")||"[]");
    if(all[t]) all[t].forEach(n=>{ if(!h.includes(n)) s.innerHTML+=`<option>${n}</option>`; });
}

function showAccountDetails() {
    let ac=document.getElementById("accSelect").value, yr=document.getElementById("yearSelect").value, mo=document.getElementById("monthSelect").value;
    let type=document.getElementById("accTypeSelect").value;
    let monthlyMode = document.getElementById("accModeSwitch").checked;
    
    if(!ac) return; 
    document.getElementById("tAccTitle").innerText = ac + (monthlyMode ? " (Monthly Mode)" : "");
    let dr=document.getElementById("drContent"), cr=document.getElementById("crContent"); dr.innerHTML=""; cr.innerHTML="";
    let tr=JSON.parse(localStorage.getItem("transactions")||"[]");
    let td=0, tc=0, ob=0;
    
    // B/F Logic
    let isNominal = (type === "ආදායම්" || type === "වියදම්");
    if (monthlyMode && isNominal) { ob = 0; } 
    else {
        tr.forEach(x => { 
            let tY=parseInt(x.year), tM=parseInt(x.month), sY=parseInt(yr), sM=parseInt(mo);
            if (tY < sY || (tY == sY && tM < sM)) { 
                let a=parseFloat(x.amount); if (x.dr_acc.trim()==ac) ob+=a; if (x.cr_acc.trim()==ac) ob-=a; 
            } 
        });
        if (monthlyMode && type === "හිමිකම්") {
            let retained = 0;
            tr.forEach(x => {
                let tY=parseInt(x.year), tM=parseInt(x.month), sY=parseInt(yr), sM=parseInt(mo);
                if (tY < sY || (tY == sY && tM < sM)) {
                    let a=parseFloat(x.amount);
                    if (x.cr_type === "ආදායම්") retained += a; if (x.dr_type === "ආදායම්") retained -= a;
                    if (x.dr_type === "වියදම්") retained -= a; if (x.cr_type === "වියදම්") retained += a;
                }
            });
            ob -= retained;
        }
    }

    if(ob!=0) { 
        let d=document.createElement("div"); d.className="t-item t-bf"; 
        d.innerText="B/F : "+Math.abs(ob).toFixed(2); 
        if(ob>0){dr.appendChild(d); td+=ob;} else{cr.appendChild(d); tc+=Math.abs(ob);} 
    }

    tr.forEach(x=>{ 
        if(x.year==yr && x.month==mo) { 
            let a=parseFloat(x.amount); let d=document.createElement("div"); d.className="t-item"; 
            d.onclick=()=>showAlert("Details", x.desc); 
            if(x.dr_acc.trim()==ac){ d.innerText=`${x.date} | ${x.cr_acc} : ${a}`; dr.appendChild(d); td+=a; }
            else if(x.cr_acc.trim()==ac){ d.innerText=`${x.date} | ${x.dr_acc} : ${a}`; cr.appendChild(d); tc+=a; } 
        } 
    });

    document.getElementById("drTotal").innerText=td.toFixed(2); document.getElementById("crTotal").innerText=tc.toFixed(2);
    let b=td-tc, bb=document.getElementById("finalBalanceBox"); 
    bb.innerText="Balance c/d: "+Math.abs(b).toFixed(2) + (b>=0?" (Dr)":" (Cr)");
    bb.style.backgroundColor=b>=0?"#4CAF50":"#F44336";
}

// =========================================
// 9. FULL REPORT (SUMMARY)
// =========================================
function initReportsScreen() {
    let y=document.getElementById("repYear"); y.innerHTML=""; for(let i=2024;i<=2050;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("repMonth").value=new Date().getMonth()+1;
}

function generateReport() {
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let isYearly = document.getElementById("reportYearlySwitch").checked;
    let output = document.getElementById("report-output");
    
    let tr=JSON.parse(localStorage.getItem("transactions")||"[]");
    let accounts=JSON.parse(localStorage.getItem("accounts")||"{}");
    let hidden=JSON.parse(localStorage.getItem("hidden_accounts")||"[]");
    let periodStr = isYearly ? `Year: ${sY}` : `Month: ${sY}-${sM}`;
    let primaryCapital = "Capital";

    let html = `<div style="text-align:center; margin-bottom:20px;"><h2>MY LEDGER - FULL REPORT</h2><p>${periodStr}</p></div><hr>`;

    // --- 1. TRIAL BALANCE ---
    html += `<div class="report-section"><h3 class="text-center">1. TRIAL BALANCE</h3><table class="tb-table"><thead><tr><th>Account Name</th><th>Dr</th><th>Cr</th></tr></thead><tbody>`;
    let totTbDr = 0, totTbCr = 0, allAccNames = [];
    Object.keys(accounts).forEach(type => { accounts[type].forEach(acc => { if(!hidden.includes(acc)) allAccNames.push({name: acc, type: type}); }); });
    allAccNames.sort((a,b) => a.name.localeCompare(b.name));

    allAccNames.forEach(item => {
        let acc = item.name, type = item.type;
        let bal = 0;
        let isNominal = (type === "ආදායම්" || type === "වියදම්");

        tr.forEach(t => {
            let tY = parseInt(t.year), tM = parseInt(t.month);
            let inc = false;
            if(isYearly) { if(!isNominal) { if(tY <= sY) inc=true; } else { if(tY == sY) inc=true; } }
            else { if(!isNominal) { if(tY < sY || (tY == sY && tM <= sM)) inc=true; } else { if(tY == sY && tM == sM) inc=true; } }
            
            if(inc) {
                let a = parseFloat(t.amount);
                if (t.dr_acc.trim() == acc) bal += a; if (t.cr_acc.trim() == acc) bal -= a;
            }
        });

        if(acc === primaryCapital) {
            let ret = 0;
            tr.forEach(t => {
                let tY=parseInt(t.year), tM=parseInt(t.month);
                let isPast = isYearly ? (tY < sY) : (tY < sY || (tY == sY && tM < sM));
                if(isPast) {
                    let a = parseFloat(t.amount);
                    if(t.cr_type==="ආදායම්") ret+=a; if(t.dr_type==="ආදායම්") ret-=a;
                    if(t.dr_type==="වියදම්") ret-=a; if(t.cr_type==="වියදම්") ret+=a;
                }
            });
            bal -= ret;
        }

        if (Math.abs(bal) > 0.01) {
            if (bal > 0) totTbDr += bal; else totTbCr += Math.abs(bal);
            html += `<tr><td>${acc}</td><td style="text-align:right">${bal > 0 ? bal.toFixed(2) : ""}</td><td style="text-align:right">${bal < 0 ? Math.abs(bal).toFixed(2) : ""}</td></tr>`;
        }
    });
    html += `<tr style="background:#f0f0f0; font-weight:bold;"><td>TOTALS</td><td style="text-align:right">${totTbDr.toFixed(2)}</td><td style="text-align:right">${totTbCr.toFixed(2)}</td></tr></tbody></table></div>`;

    // --- 2. GENERAL LEDGER ---
    html += `<div class="print-page-break"></div><h3 class="text-center" style="margin-top:20px;">2. GENERAL LEDGER</h3>`;
    allAccNames.forEach(item => {
        let acc = item.name, type = item.type;
        let isNominal = (type === "ආදායම්" || type === "වියදම්");
        let openBal = 0;

        if(!isNominal) {
            tr.forEach(t => {
                let tY=parseInt(t.year), tM=parseInt(t.month);
                let isPast = isYearly ? (tY < sY) : (tY < sY || (tY == sY && tM < sM));
                if (isPast) { 
                    let a = parseFloat(t.amount); 
                    if (t.dr_acc.trim() == acc) openBal += a; if (t.cr_acc.trim() == acc) openBal -= a; 
                }
            });
            if(acc === primaryCapital) {
                let ret = 0;
                tr.forEach(t => {
                    let tY=parseInt(t.year), tM=parseInt(t.month);
                    let isPast = isYearly ? (tY < sY) : (tY < sY || (tY == sY && tM < sM));
                    if(isPast) {
                        let a=parseFloat(t.amount);
                        if(t.cr_type==="ආදායම්") ret+=a; if(t.dr_type==="ආදායම්") ret-=a;
                        if(t.dr_type==="වියදම්") ret-=a; if(t.cr_type==="වියදම්") ret+=a;
                    }
                });
                openBal -= ret;
            }
        }

        let drHtml = "", crHtml = "", monthDr = 0, monthCr = 0, hasTrans = false;
        if (openBal !== 0) {
            let bfRow = `<div class="t-item t-bf">B/F: ${Math.abs(openBal).toFixed(2)}</div>`;
            if (openBal > 0) { drHtml += bfRow; monthDr += openBal; } else { crHtml += bfRow; monthCr += Math.abs(openBal); }
        }

        tr.forEach(t => {
            let tY=parseInt(t.year), tM=parseInt(t.month);
            let isCurrent = isYearly ? (tY == sY) : (tY == sY && tM == sM);
            if (isCurrent) {
                let a = parseFloat(t.amount);
                if (t.dr_acc.trim() == acc) { drHtml += `<div class="t-item">${t.date} | ${t.cr_acc} : ${a}</div>`; monthDr += a; hasTrans = true; }
                else if (t.cr_acc.trim() == acc) { crHtml += `<div class="t-item">${t.date} | ${t.dr_acc} : ${a}</div>`; monthCr += a; hasTrans = true; }
            }
        });

        if (openBal !== 0 || hasTrans) {
            let finalBal = monthDr - monthCr;
            html += `<div class="t-account-container"><div style="background:#ddd; padding:5px; font-weight:bold; border-bottom:1px solid #000; text-align:center;">${acc} (${type})</div><div class="t-body"><div class="t-col-content" style="border-right:1px solid #000;">${drHtml}</div><div class="t-col-content">${crHtml}</div></div><div class="t-footer"><div class="t-total" style="border-right:1px solid #000; text-align:center;">${monthDr.toFixed(2)}</div><div class="t-total" style="text-align:center;">${monthCr.toFixed(2)}</div></div><div style="padding:5px; font-weight:bold; border-top:1px solid #000; text-align:center;">Balance c/d: ${Math.abs(finalBal).toFixed(2)} ${finalBal>=0?"(Dr)":"(Cr)"}</div></div>`;
        }
    });

    // --- 3. FINANCIAL STATEMENTS ---
    html += `<div class="print-page-break"></div><h3 class="text-center" style="margin-top:20px;">3. FINANCIAL STATEMENTS</h3>`;
    let ta=0, tl=0, te=0, ti=0, tx=0;
    tr.forEach(t => {
        let tY=parseInt(t.year), tM=parseInt(t.month);
        let inPeriod = isYearly ? (tY == sY) : (tY == sY && tM == sM);
        if(inPeriod) {
            let a = parseFloat(t.amount);
            if(t.cr_type=="ආදායම්") ti+=a; if(t.dr_type=="ආදායම්") ti-=a;
            if(t.dr_type=="වියදම්") tx+=a; if(t.cr_type=="වියදම්") tx-=a;
        }
        let inCumulative = isYearly ? (tY <= sY) : (tY < sY || (tY == sY && tM <= sM));
        if(inCumulative) {
            let a = parseFloat(t.amount);
            if(t.dr_type=="වත්කම්") ta+=a; if(t.cr_type=="වත්කම්") ta-=a;
            if(t.cr_type=="වගකීම්") tl+=a; if(t.dr_type=="වගකීම්") tl-=a;
            if(t.cr_type=="හිමිකම්") te+=a; if(t.dr_type=="හිමිකම්") te-=a;
        }
    });

    let retainedProfit = 0;
    tr.forEach(t => {
        let tY=parseInt(t.year), tM=parseInt(t.month);
        let isPast = isYearly ? (tY < sY) : (tY < sY || (tY == sY && tM < sM));
        if(isPast) {
            let a = parseFloat(t.amount);
            if(t.cr_type=="ආදායම්") retainedProfit+=a; if(t.dr_type=="ආදායම්") retainedProfit-=a;
            if(t.dr_type=="වියදම්") retainedProfit-=a; if(t.cr_type=="වියදම්") retainedProfit+=a;
        }
    });

    let netAssets = ta - tl, netProfit = ti - tx, capitalBF = te + retainedProfit, trueEquity = capitalBF + netProfit;
    
    html += `<div style="border:1px solid #000; padding:15px; font-family:monospace; line-height:1.6;">
        <div style="border-bottom:1px dashed #ccc; padding-bottom:10px; margin-bottom:10px;">
            <strong>INCOME STATEMENT</strong><br>
            Total Income: <span style="float:right">${ti.toFixed(2)}</span><br>
            Total Expenses: <span style="float:right">(${tx.toFixed(2)})</span><br>
            <strong>NET PROFIT: <span style="float:right; border-top:1px solid #000; border-bottom:3px double #000;">${netProfit.toFixed(2)}</span></strong>
        </div>
        <div style="border-bottom:1px dashed #ccc; padding-bottom:10px; margin-bottom:10px;">
            <strong>FINANCIAL POSITION</strong><br>
            Total Assets: <span style="float:right">${ta.toFixed(2)}</span><br>
            (-) Liabilities: <span style="float:right">(${tl.toFixed(2)})</span><br>
            <strong>NET ASSETS: <span style="float:right; border-top:1px solid #000; border-bottom:3px double #000;">${netAssets.toFixed(2)}</span></strong>
        </div>
        <div>
            <strong>EQUITY CHECK</strong><br>
            Capital B/F: <span style="float:right">${capitalBF.toFixed(2)}</span><br>
            (+) Net Profit: <span style="float:right">${netProfit.toFixed(2)}</span><br>
            <strong>TOTAL EQUITY: <span style="float:right; border-top:1px solid #000; border-bottom:3px double #000;">${trueEquity.toFixed(2)}</span></strong>
        </div>
    </div>`;

    output.innerHTML = html;
}

// =========================================
// 10. CHARTS
// =========================================
function loadCharts() {
    let mode = parseInt(document.getElementById("chartModeSelect").value);
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    let container = document.getElementById("chartsContainer");
    container.innerHTML = "";

    // Data Processing
    let totInc=0, totExp=0, totAsset=0, totLiab=0;
    let trendNet=[], labels=[], trendAsset=[];
    let mapExp={};
    let runBal=0;

    tr.forEach(t => {
        let tY=parseInt(t.year), tM=parseInt(t.month);
        let a = parseFloat(t.amount);
        let include = (mode === 0) ? (tY == sY && tM == sM) : (mode === 1) ? (tY == sY) : true;

        if (include) {
            if(t.cr_type=="ආදායම්") totInc+=a; if(t.dr_type=="ආදායම්") totInc-=a;
            if(t.dr_type=="වියදම්") { totExp+=a; mapExp[t.dr_acc]=(mapExp[t.dr_acc]||0)+a; } if(t.cr_type=="වියදම්") totExp-=a;
            if(t.dr_type=="වත්කම්") totAsset+=a; if(t.cr_type=="වත්කම්") totAsset-=a;
            if(t.cr_type=="වගකීම්") totLiab+=a; if(t.dr_type=="වගකීම්") totLiab-=a;

            let net = (t.cr_type=="ආදායම්"?a:0) - (t.dr_type=="වියදම්"?a:0);
            runBal += net;
            labels.push(t.date); trendNet.push(runBal);
        }
    });

    const createChart = (id, type, label, data, colors) => {
        let d = document.createElement("div"); d.className = "settings-card";
        d.innerHTML = `<h3>${label}</h3><canvas id="${id}"></canvas>`;
        container.appendChild(d);
        new Chart(document.getElementById(id), { type: type, data: data, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
    };

    createChart("c1", "pie", "Income vs Expense", { labels: ['Income','Expense'], datasets: [{ data: [totInc, totExp], backgroundColor: ['#4CAF50','#F44336'] }] });
    createChart("c2", "line", "Net Balance Trend", { labels: labels, datasets: [{ label: 'Net', data: trendNet, borderColor: '#673AB7', fill: true }] });
    createChart("c3", "bar", "Top Expenses", { labels: Object.keys(mapExp), datasets: [{ label: 'Expense', data: Object.values(mapExp), backgroundColor: '#F44336' }] });
    createChart("c4", "doughnut", "Assets vs Liabilities", { labels: ['Assets','Liabilities'], datasets: [{ data: [totAsset, totLiab], backgroundColor: ['#2196F3','#FFC107'] }] });
    
    document.getElementById("chartTitle").innerText = "Displaying Key Financial Charts";
}

function updateFontPreview(v) { let s=v/10; document.body.style.zoom=s; document.getElementById("fontStatus").innerText="Scale: "+s+"x"; }
function saveFontSettings() { localStorage.setItem("app_scale", document.getElementById("fontSlider").value); showAlert("Success","Saved!"); }
function showAlert(title, message, isConfirm = false, onYes = null) {
    const modal = document.getElementById("customAlert");
    document.getElementById("alertTitle").innerText = title; document.getElementById("alertMessage").innerText = message;
    const btnOk = document.getElementById("btnAlertOk"); const btnCancel = document.getElementById("btnAlertCancel");
    if (isConfirm) { btnCancel.style.display = "block"; btnOk.innerText = "Yes"; btnOk.onclick = function() { modal.style.display = "none"; if (onYes) onYes(); }; } 
    else { btnCancel.style.display = "none"; btnOk.innerText = "OK"; btnOk.onclick = () => modal.style.display = "none"; }
    modal.style.display = "flex";
}
function closeCustomAlert() { document.getElementById("customAlert").style.display = "none"; }
function printReport() { alert("Print PDF is optimized for Android App. On web, use browser Print (Ctrl+P)."); }

// Advanced Settings Helpers
function initNewSettingsScreen() { renderTodayTransactions(); }
function openHideAccountsDialog() { document.getElementById("hideAccModal").style.display="flex"; filterHideList(); }
function filterHideList() {
    let s=document.getElementById("accSearch").value.toLowerCase(), l=document.getElementById("hideAccList"); l.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts")||"{}"), h=JSON.parse(localStorage.getItem("hidden_accounts")||"[]");
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
    let a=cb.value, h=JSON.parse(localStorage.getItem("hidden_accounts")||"[]");
    if(cb.checked) { if(!h.includes(a)) h.push(a); } else { h=h.filter(x=>x!==a); }
    localStorage.setItem("hidden_accounts", JSON.stringify(h));
}
function saveHiddenAccounts() { showAlert("Success","Saved!"); document.getElementById("hideAccModal").style.display="none"; }
function renderTodayTransactions() {
    let l=document.getElementById("todayTransList"); l.innerHTML="";
    let tr=JSON.parse(localStorage.getItem("transactions")||"[]");
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
        let tr=JSON.parse(localStorage.getItem("transactions")||"[]");
        tr.splice(idx,1);
        localStorage.setItem("transactions", JSON.stringify(tr)); 
        renderTodayTransactions(); showAlert("Success","Deleted!");
    });
}
