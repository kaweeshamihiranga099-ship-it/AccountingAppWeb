// =========================================
// 1. GLOBAL CONFIG & FIREBASE SETUP
// =========================================

const accTypes = ["වත්කම්", "වගකීම්", "හිමිකම්", "ආදායම්", "වියදම්"];
const savedPinKey = "user_pin";
const colorModeKey = "ColorMode";

let currentPin = "", state = 0, tempNewPin = "";

// Global Variables for Dynamic Rows
let drRows = [];
let crRows = [];
let currentCalcTargetId = ""; // කැල්කියුලේටරය සඳහා target ID එක

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
                performCloudBackup(user.uid); 
            }
        });
    }

    setTimeout(function() {
        const splash = document.getElementById("splash-screen");
        if(splash) { splash.style.display = "none"; splash.classList.remove("active-screen"); }
        navigateToPassword();
    }, 2000);
});

// ✅ DATE HELPER
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
        
        let savedMode = localStorage.getItem(colorModeKey);
        let isColorful = savedMode !== "false";
        
        if(name !== 'password' && name !== 'splash') {
            if(isColorful) {
                el.style.background = "linear-gradient(135deg, #E0F7FA 0%, #F3E5F5 100%)";
            } else {
                el.style.background = "#f5f7fa";
            }
        }
        
        if (name === 'limits') initLimitsScreen();
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

// ==========================================
// 5. DYNAMIC TRANSACTION LOGIC (HOME)
// ==========================================
function initHomeScreen() {
    let drCont = document.getElementById("drContainer");
    let crCont = document.getElementById("crContainer");
    
    if(!drCont || !crCont) return;

    drCont.innerHTML = "";
    crCont.innerHTML = "";
    
    drRows = [];
    crRows = [];
    
    addRow('dr');
    addRow('cr');
    
    if(document.getElementById("edCommonAmt")) document.getElementById("edCommonAmt").value = "";
    if(document.getElementById("edCommonDesc")) document.getElementById("edCommonDesc").value = "";
    
    renderTodayTransactions();
    setupLongPress(); 
    renderBudgetAlerts();
}

// ✅ UPDATED ADD ROW FUNCTION (With Calculator Support)
function addRow(side) {
    let container = document.getElementById(side + "Container");
    if(!container) return;

    let rowId = Date.now() + Math.random(); 
    let inputId = "amt_" + rowId.toString().replace('.',''); // Unique ID

    let div = document.createElement("div");
    div.className = "trans-row";
    div.id = "row_" + rowId;
    
    // 1. Type Select
    let selType = document.createElement("select");
    selType.style.flex = "1.2";
    accTypes.forEach(t => {
        let opt = document.createElement("option");
        opt.value = t; opt.innerText = t;
        selType.appendChild(opt);
    });
    
    // 2. Account Select
    let selAcc = document.createElement("select");
    selAcc.style.flex = "1.5";

    // 3. Amount Input Group (Input + Calc Button)
    let amountWrapper = document.createElement("div");
    amountWrapper.className = "input-group";
    amountWrapper.style.flex = "1"; 

    let inpAmt = document.createElement("input");
    inpAmt.type = "number";
    inpAmt.placeholder = "0.00";
    inpAmt.className = "row-amt-input"; 
    inpAmt.id = inputId; // Unique ID set here
    inpAmt.onkeyup = updateUIMode; 
    
    // Calc Button for this row
    let btnCalc = document.createElement("button");
    btnCalc.innerText = "🧮";
    btnCalc.className = "mini-calc-btn";
    btnCalc.onclick = function() { openCalculator(inputId); }; 

    amountWrapper.appendChild(inpAmt);
    amountWrapper.appendChild(btnCalc);
    
    // 4. Delete Button
    let btnDel = document.createElement("button");
    btnDel.innerText = "X";
    btnDel.className = "btn-del";
    btnDel.onclick = function() { removeRow(side, rowId); };

    // Append All Elements
    div.appendChild(selType);
    div.appendChild(selAcc);
    div.appendChild(amountWrapper); 
    div.appendChild(btnDel);
    container.appendChild(div);

    let rowObj = { id: rowId, el: div, type: selType, acc: selAcc, amt: inpAmt, btn: btnDel };
    if(side === 'dr') drRows.push(rowObj); else crRows.push(rowObj);

    selType.onchange = function() { updateRowAccList(selType, selAcc); };
    updateRowAccList(selType, selAcc);
    updateUIMode();
}

function removeRow(side, id) {
    let list = (side === 'dr') ? drRows : crRows;
    if(list.length <= 1) return; 
    let idx = list.findIndex(r => r.id === id);
    if(idx > -1) {
        list[idx].el.remove();
        list.splice(idx, 1);
    }
    updateUIMode();
}

function updateRowAccList(selType, selAcc) {
    let type = selType.value;
    selAcc.innerHTML = "";
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    let h = JSON.parse(localStorage.getItem("hidden_accounts") || "[]");
    if(all[type]) {
        all[type].forEach(n => {
            if(!h.includes(n)) {
                let opt = document.createElement("option");
                opt.value = n; opt.innerText = n;
                selAcc.appendChild(opt);
            }
        });
    }
}

function updateUIMode() {
    let isSplit = (drRows.length > 1 || crRows.length > 1);
    let commonAmtBox = document.getElementById("edCommonAmt");
    let totDr = 0, totCr = 0;

    drRows.forEach(r => {
        if(!isSplit && drRows.length === 1) { r.amt.style.display = "none"; r.btn.style.display = "none"; } 
        else { r.amt.style.display = "block"; r.btn.style.display = "block"; }
        let val = parseFloat(r.amt.value);
        if(!isNaN(val)) totDr += val;
    });

    crRows.forEach(r => {
        if(!isSplit && crRows.length === 1) { r.amt.style.display = "none"; r.btn.style.display = "none"; } 
        else { r.amt.style.display = "block"; r.btn.style.display = "block"; }
        let val = parseFloat(r.amt.value);
        if(!isNaN(val)) totCr += val;
    });

    if(isSplit) {
        if(commonAmtBox) commonAmtBox.style.display = "none";
    } else {
        if(commonAmtBox) {
            commonAmtBox.style.display = "block";
            let commonVal = parseFloat(commonAmtBox.value);
            if(!isNaN(commonVal)) { totDr = commonVal; totCr = commonVal; }
        }
    }

    let lblDr = document.getElementById("txtTotalDr");
    let lblCr = document.getElementById("txtTotalCr");
    if(lblDr) lblDr.innerText = "Total Dr: " + totDr.toFixed(2);
    if(lblCr) lblCr.innerText = "Total Cr: " + totCr.toFixed(2);

    let colorGreen = "#4CAF50", colorWarning = "#FFC107";
    if(Math.abs(totDr - totCr) < 0.01 && totDr > 0) {
        if(lblDr) lblDr.style.color = colorGreen; if(lblCr) lblCr.style.color = colorGreen;
    } else {
        if(isSplit) { if(lblDr) lblDr.style.color = colorWarning; if(lblCr) lblCr.style.color = colorWarning; }
    }
}



function saveTransaction() {
    // 1. හර සහ බැර පේළි ගණන සහ වටිනාකම් ලබා ගැනීම
    let isSplit = (drRows.length > 1 || crRows.length > 1);
    let totDr = 0, totCr = 0;
    let commonBox = document.getElementById("edCommonAmt");
    let commonAmt = commonBox ? (parseFloat(commonBox.value) || 0) : 0;

    // Totals Calculation
    if(isSplit) {
        drRows.forEach(r => { let v = parseFloat(r.amt.value); if(!isNaN(v)) totDr += v; });
        crRows.forEach(r => { let v = parseFloat(r.amt.value); if(!isNaN(v)) totCr += v; });
    } else {
        totDr = commonAmt; totCr = commonAmt;
    }

    // Auto-fill logic for single empty field in split mode
    if(drRows.length > 1 && crRows.length === 1 && totCr === 0) totCr = totDr;
    else if(crRows.length > 1 && drRows.length === 1 && totDr === 0) totDr = totCr;

    // Validation (වටිනාකම් පරීක්ෂා කිරීම)
    // Javascript Floating Point දෝෂ මග හැරීමට 0.001 වෙනසක් සලකමු
    if(Math.abs(totDr - totCr) > 0.001) { openErrorModal("හර සහ බැර වටිනාකම් සමාන නොවේ! (Dr: " + totDr + " | Cr: " + totCr + ")"); return; }
    if(totDr === 0) { openErrorModal("කරුණාකර වටිනාකමක් (Amount) ඇතුළත් කරන්න."); return; }

    // Data Loading
    let trArray = JSON.parse(localStorage.getItem("transactions") || "[]");
    let desc = document.getElementById("edCommonDesc").value;
    let now = new Date();
    let dateStr = getLocalTodayDate(); // ඔබේ කේතයේ ඇති පරිදි

    let commonData = {
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString(),
        date: dateStr,
        desc: desc
    };

    // --- SAVE LOGIC START ---
    if(isSplit) {
        
        // ✅ NEW LOGIC: Many-to-Many Handling (හර සහ බැර දෙපැත්තේම ගිණුම් 1 ට වඩා වැඩි නම්)
        if (drRows.length > 1 && crRows.length > 1) {
            
            let crIndex = 0;
            let crRem = parseFloat(crRows[0].amt.value) || 0; // පළමු බැර ගිණුමේ ශේෂය

            // හර ගිණුම් එකින් එක ලූප් කිරීම
            drRows.forEach(dr => {
                let drRem = parseFloat(dr.amt.value) || 0; // හර ගිණුමේ වටිනාකම

                // මෙම හර ගිණුමේ මුදල පියවෙන තුරු බැර ගිණුම් වලින් අඩු කිරීම
                while (drRem > 0.001 && crIndex < crRows.length) {
                    let matchAmt = Math.min(drRem, crRem); // කුඩා වටිනාකම තෝරා ගැනීම

                    if (matchAmt > 0) {
                        trArray.push({ 
                            ...commonData, 
                            dr_type: dr.type.value, 
                            dr_acc: dr.acc.value, 
                            cr_type: crRows[crIndex].type.value, 
                            cr_acc: crRows[crIndex].acc.value, 
                            amount: matchAmt.toFixed(2) 
                        });
                    }

                    drRem -= matchAmt;
                    crRem -= matchAmt;

                    // වත්මන් බැර ගිණුම ඉවර නම් ඊළඟ එකට මාරු වීම
                    if (crRem < 0.001) {
                        crIndex++;
                        if (crIndex < crRows.length) {
                            crRem = parseFloat(crRows[crIndex].amt.value) || 0;
                        }
                    }
                }
            });

        } else {
            // EXISTING LOGIC: One-to-Many or Many-to-One
            if(drRows.length >= crRows.length) {
                // හර ගිණුම් කිහිපයක් -> එක බැර ගිණුමක්
                let crType = crRows[0].type.value, crAcc = crRows[0].acc.value;
                drRows.forEach(dr => {
                    let amt = parseFloat(dr.amt.value) || 0;
                    if(amt > 0) trArray.push({ ...commonData, dr_type: dr.type.value, dr_acc: dr.acc.value, cr_type: crType, cr_acc: crAcc, amount: amt.toString() });
                });
            } else {
                // බැර ගිණුම් කිහිපයක් -> එක හර ගිණුමක්
                let drType = drRows[0].type.value, drAcc = drRows[0].acc.value;
                crRows.forEach(cr => {
                    let amt = parseFloat(cr.amt.value) || 0;
                    if(amt > 0) trArray.push({ ...commonData, dr_type: drType, dr_acc: drAcc, cr_type: cr.type.value, cr_acc: cr.acc.value, amount: amt.toString() });
                });
            }
        }

    } else {
        // Single Entry
        trArray.push({ ...commonData, dr_type: drRows[0].type.value, dr_acc: drRows[0].acc.value, cr_type: crRows[0].type.value, cr_acc: crRows[0].acc.value, amount: commonAmt.toString() });
    }
    // --- SAVE LOGIC END ---

    // Finalize
    localStorage.setItem("transactions", JSON.stringify(trArray));
    openSuccessModal();
    if(typeof renderBudgetAlerts === "function") renderBudgetAlerts(); 
    
    // Clear Inputs
    if(commonBox) commonBox.value = "";
    document.getElementById("edCommonDesc").value = "";
    
    // Reset Rows (UI Reset Logic - ඔබේ කේතයේ initHomeScreen මගින් මෙය සිදුවේ යැයි සිතමි)
    if(typeof initHomeScreen === "function") initHomeScreen();
    
    // Cloud Backup
    if(typeof auth !== 'undefined' && auth.currentUser && typeof performCloudBackup === "function") {
        performCloudBackup(auth.currentUser.uid);
    }
}










function openSuccessModal() { document.getElementById("successModal").style.display = "flex"; }
function closeSuccessModal() { document.getElementById("successModal").style.display = "none"; }
function openErrorModal(msg) { document.getElementById("errorMsgBody").innerText = msg; document.getElementById("errorModal").style.display = "flex"; }
function closeErrorModal() { document.getElementById("errorModal").style.display = "none"; }

function setupLongPress() {
    let btn=document.getElementById("btnSave"); if(!btn) return;
    let timer;
    btn.addEventListener("touchstart", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("touchend", ()=>{ clearTimeout(timer); });
    btn.addEventListener("mousedown", ()=>{ timer=setTimeout(()=>{navigateTo('new-settings')},1000); });
    btn.addEventListener("mouseup", ()=>{ clearTimeout(timer); });
}

// =========================================
// 6. SETTINGS
// =========================================

function initSettingsScreen() {
    let c=document.getElementById("setSpinType"), d=document.getElementById("delSpinType"); c.innerHTML=""; d.innerHTML="";
    accTypes.forEach(t => { c.innerHTML+=`<option>${t}</option>`; d.innerHTML+=`<option>${t}</option>`; });
    updateDelList();
    let sc = localStorage.getItem("app_scale") || "10"; document.getElementById("fontSlider").value = sc; updateFontPreview(sc);
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
    let t = document.getElementById("delSpinType").value, s = document.getElementById("delSpinAcc"); s.innerHTML="";
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    if(all[t]) all[t].forEach(n => s.innerHTML += `<option>${n}</option>`);
}

function deleteAccount() {
    let t = document.getElementById("delSpinType").value, n = document.getElementById("delSpinAcc").value;
    if(!n) return;
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    if(tr.some(x => x.dr_acc === n || x.cr_acc === n)) { showAlert("Error", "Cannot delete! Account used."); return; }
    showAlert("Confirm", "Delete '" + n + "'?", true, function() {
        let all = JSON.parse(localStorage.getItem("accounts") || "{}");
        all[t] = all[t].filter(x => x !== n);
        localStorage.setItem("accounts", JSON.stringify(all));
        showAlert("Success", "Deleted!"); updateDelList();
    });
}

function toggleAutoBackup() {
    let isEnabled = document.getElementById("autoBackupSwitch").checked;
    localStorage.setItem("auto_backup_enabled", isEnabled);
    showAlert("Settings", isEnabled ? "Auto Backup Enabled! ✅" : "Auto Backup Disabled! ❌");
}

function initFirebaseAndBackup() { if(auth.currentUser) performCloudBackup(auth.currentUser.uid, true); else document.getElementById("loginModal").style.display="flex"; }
function firebaseLogin() { auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; showAlert("Success", "Logged In!"); if(localStorage.getItem("auto_backup_enabled")!=="false") performCloudBackup(u.user.uid); }).catch(e=>showAlert("Error", e.message)); }
function firebaseRegister() { auth.createUserWithEmailAndPassword(document.getElementById("loginEmail").value, document.getElementById("loginPass").value).then(u=>{ document.getElementById("loginModal").style.display="none"; showAlert("Success", "Registered!"); if(localStorage.getItem("auto_backup_enabled")!=="false") performCloudBackup(u.user.uid); }).catch(e=>showAlert("Error", e.message)); }

function performCloudBackup(uid, isManual = false) {
    if (!isManual && localStorage.getItem("auto_backup_enabled") === "false") return;
    let data = { transactions: localStorage.getItem("transactions") || "[]", accounts: localStorage.getItem("accounts") || "{}", hidden_accounts: localStorage.getItem("hidden_accounts") || "[]" };
    let now = new Date();
    let displayDate = now.toISOString().replace("T"," ").substring(0,19);
    db.ref('users/' + uid + '/backups').push({ data: JSON.stringify(data), timestamp: Date.now(), date_label: displayDate }).then(() => { if (isManual) showAlert("Success", "Manual Backup Successful! ☁✅"); });
}

function restoreFromCloud() {
    if (!auth.currentUser) { showAlert("Error", "Please Login first!"); return; }
    document.getElementById("restoreModal").style.display = "flex";
    const listDiv = document.getElementById("restoreList"); listDiv.innerHTML = "<p style='text-align:center'>Loading backups...</p>";
    db.ref('users/' + auth.currentUser.uid + '/backups').limitToLast(15).once('value').then(snapshot => {
        listDiv.innerHTML = ""; if (!snapshot.exists()) { listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>"; return; }
        let backups = []; snapshot.forEach(child => { backups.unshift({ key: child.key, val: child.val() }); });
        backups.forEach(item => {
            let btn = document.createElement("button"); btn.className = "action-btn btn-indigo"; btn.style.marginBottom = "8px"; btn.style.textAlign = "left"; 
            btn.innerText = "📅 " + (item.val.date_label || new Date(item.val.timestamp).toLocaleString());
            btn.onclick = () => confirmRestore(item.val.data); listDiv.appendChild(btn);
        });
    });
}





// =========================================
// UPDATE 3: UNIVERSAL RESTORE (FIX FOR APP & WEB BACKUPS)
// =========================================
function confirmRestore(rawData) {
    showAlert("Confirm", "Restore this backup? (Current data will be replaced)", true, function() {
        try {
            // 1. දත්ත JSON ද String ද කියා බලා Parse කරගැනීම
            let d;
            if (typeof rawData === 'string') {
                try { d = JSON.parse(rawData); } catch(e) { d = rawData; }
            } else {
                d = rawData;
            }

            // සමහර විට App එකෙන් එන දත්ත දෙපාරක් Stringify වී තිබිය හැක, එය නිවැරදි කිරීම
            if (typeof d === 'string') {
                try { d = JSON.parse(d); } catch(e) {} 
            }

            // 2. අදාළ කොටස් වෙන් කර ගැනීම
            let transData = d.transactions;
            let accData = d.accounts;
            let hiddenData = d.hidden_accounts;

            // 3. App එකේ SQLite Backup එකේදී transactions Array එක String එකක් ලෙස පැමිණිය හැක
            if (typeof transData === 'string') {
                try { transData = JSON.parse(transData); } catch(e) {}
            }
            if (typeof accData === 'string') {
                try { accData = JSON.parse(accData); } catch(e) {}
            }

            // 4. LocalStorage වෙත Save කිරීම (String ලෙස)
            if(transData) localStorage.setItem("transactions", typeof transData === 'object' ? JSON.stringify(transData) : transData);
            if(accData) localStorage.setItem("accounts", typeof accData === 'object' ? JSON.stringify(accData) : accData);
            if(hiddenData) localStorage.setItem("hidden_accounts", typeof hiddenData === 'object' ? JSON.stringify(hiddenData) : hiddenData);

            // 5. අවසන් කිරීම
            fixDataIntegrity(); 
            showAlert("Success", "Restored Successfully! Reloading..."); 
            setTimeout(() => location.reload(), 2000);

        } catch(e) { 
            console.error(e); 
            showAlert("Error", "Restore Failed! Invalid Format."); 
        }
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
// 8. ACCOUNTS VIEW & LOGIC (WITH SEARCH)
// =========================================

function initAccountScreen() {
    let t=document.getElementById("accTypeSelect"), y=document.getElementById("yearSelect"); t.innerHTML=""; y.innerHTML="";
    accTypes.forEach(x=>t.innerHTML+=`<option>${x}</option>`);
    for(let i=2024;i<=2050;i++) y.innerHTML+=`<option ${i==new Date().getFullYear()?'selected':''}>${i}</option>`;
    document.getElementById("monthSelect").value=new Date().getMonth()+1; 
    updateAccountFilterList();
    
    // Search Listener
    let searchBox = document.getElementById("ledgerSearchInput");
    if(searchBox) {
        searchBox.removeEventListener("keyup", showAccountDetails); // Avoid duplicates
        searchBox.addEventListener("keyup", showAccountDetails);
    }
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
    
    // Search Text
    let searchEl = document.getElementById("ledgerSearchInput");
    let searchText = searchEl ? searchEl.value.toLowerCase().trim() : "";

    if(!ac) return; 
    document.getElementById("tAccTitle").innerText = ac + (monthlyMode ? " (Monthly Mode)" : "");
    let dr=document.getElementById("drContent"), cr=document.getElementById("crContent"); dr.innerHTML=""; cr.innerHTML="";
    let tr=JSON.parse(localStorage.getItem("transactions")||"[]");
    let td=0, tc=0, ob=0;
    
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
            let contraName = "";
            if (x.dr_acc.trim() == ac) contraName = x.cr_acc;
            else if (x.cr_acc.trim() == ac) contraName = x.dr_acc;
            else return; 
            
            let searchMatch = true;
            if (searchText) {
                let descStr = (x.desc || "").toLowerCase();
                let dateStr = x.date.toLowerCase();
                let amtStr = x.amount.toString();
                let contraStr = contraName.toLowerCase();

                if (!descStr.includes(searchText) && 
                    !dateStr.includes(searchText) && 
                    !contraStr.includes(searchText) &&
                    !amtStr.includes(searchText)) {
                    searchMatch = false;
                }
            }

            if (searchMatch) {
                let a=parseFloat(x.amount); let d=document.createElement("div"); d.className="t-item"; 
                d.onclick=()=>showAlert("Details", x.desc); 
                if(x.dr_acc.trim()==ac){ d.innerText=`${x.date} | ${x.cr_acc} : ${a}`; dr.appendChild(d); td+=a; }
                else if(x.cr_acc.trim()==ac){ d.innerText=`${x.date} | ${x.dr_acc} : ${a}`; cr.appendChild(d); tc+=a; } 
            }
        } 
    });

    document.getElementById("drTotal").innerText=td.toFixed(2); document.getElementById("crTotal").innerText=tc.toFixed(2);
    let b=td-tc, bb=document.getElementById("finalBalanceBox"); 
    bb.innerText="Balance c/d: "+Math.abs(b).toFixed(2) + (b>=0?" (Dr)":" (Cr)");
    bb.style.backgroundColor=b>=0?"#4CAF50":"#F44336";
}

// =========================================
// 9. REPORTS
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





function loadCharts() {
    let mode = parseInt(document.getElementById("chartModeSelect").value);
    let sY = parseInt(document.getElementById("repYear").value);
    let sM = parseInt(document.getElementById("repMonth").value);
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    let container = document.getElementById("chartsContainer");
    container.innerHTML = "";

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

function showAlert(title, message, isConfirm, onYes) {
    const modal = document.getElementById("customAlert");
    document.getElementById("alertTitle").innerText = title; document.getElementById("alertMessage").innerText = message;
    const btnOk = document.getElementById("btnAlertOk"); const btnCancel = document.getElementById("btnAlertCancel");
    if (isConfirm) { btnCancel.style.display = "block"; btnOk.innerText = "Yes"; btnOk.onclick = function() { modal.style.display = "none"; if (onYes) onYes(); }; } 
    else { btnCancel.style.display = "none"; btnOk.innerText = "OK"; btnOk.onclick = () => modal.style.display = "none"; }
    modal.style.display = "flex";
}

function closeCustomAlert() { document.getElementById("customAlert").style.display = "none"; }
function printReport() { alert("Print PDF is Android Only."); }
function initNewSettingsScreen() { renderTodayTransactions(); }
function openHideAccountsDialog() { document.getElementById("hideAccModal").style.display="flex"; filterHideList(); }

function filterHideList() {
    let s=document.getElementById("accSearch").value.toLowerCase(), l=document.getElementById("hideAccList"); l.innerHTML="";
    let all=JSON.parse(localStorage.getItem("accounts")||"{}"), h=JSON.parse(localStorage.getItem("hidden_accounts")||"[]");
    Object.keys(all).forEach(k=>all[k].forEach(a=>{ if(a.toLowerCase().includes(s)) l.innerHTML+=`<div><input type="checkbox" value="${a}" ${h.includes(a)?"checked":""} onchange="toggleHiddenAccount(this)"> ${a}</div>`; }));
}

function toggleHiddenAccount(cb) { let h=JSON.parse(localStorage.getItem("hidden_accounts")||"[]"); if(cb.checked) h.push(cb.value); else h=h.filter(x=>x!==cb.value); localStorage.setItem("hidden_accounts",JSON.stringify(h)); }
function saveHiddenAccounts() { showAlert("Success","Saved!"); document.getElementById("hideAccModal").style.display="none"; }



// =========================================
// UPDATE 1: ADD EDIT BUTTON TO LIST
// =========================================
function renderTodayTransactions() { 
    let l = document.getElementById("todayTransList");
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    
    // NewSettings screen එකේ Date Picker එකේ අගය ගැනීම
    let datePicker = document.getElementById("manageTransDate");
    let selectedDate = datePicker ? datePicker.value : getLocalTodayDate();

    if(!l) return;
    
    l.innerHTML = ""; 
    let found = false;

    tr.forEach((t, i) => { 
        // දිනය ගැලපේ නම් පමණක් පෙන්වන්න
        if (t.date === selectedDate) {
            found = true;
            l.innerHTML += `
            <div style="background:white; padding:12px; margin-bottom:8px; border-radius:8px; border-left:4px solid #009688; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="font-weight:bold; color:#00796B;">Rs. ${parseFloat(t.amount).toFixed(2)}</span>
                    <span style="font-size:12px; color:#555;">${t.desc || ''}</span>
                </div>
                <div style="font-size:12px; color:#757575;">
                    Dr: ${t.dr_acc} | Cr: ${t.cr_acc}
                </div>
                <div style="margin-top:8px; text-align:right;">
                    <button class="mini-btn" style="width:auto; color:#2196F3; border-color:#2196F3; margin-right:5px;" onclick="openEditModal(${i})">Edit ✏️</button>
                    <button class="mini-btn" style="width:auto; color:#F44336; border-color:#F44336;" onclick="deleteTransaction(${i})">Del 🗑️</button>
                </div>
            </div>`; 
        }
    });

    if (!found) {
        l.innerHTML = "<p style='text-align:center;color:#888;margin-top:10px;'>No transactions found for this date.</p>";
    }
}

// Date Picker එක වෙනස් කරන විට List එක Refresh වීමට මෙය එක් කරන්න
// (මෙය script.js එකේ අගටම දැමුවත් කමක් නැත)
function loadTodayTransactions() {
    renderTodayTransactions();
}








function deleteTransaction(idx) { showAlert("Confirm","Delete?",true,()=>{ let tr=JSON.parse(localStorage.getItem("transactions")||"[]"); tr.splice(idx,1); localStorage.setItem("transactions",JSON.stringify(tr)); renderTodayTransactions(); }); }




// =========================================
// UPDATE 2: EDIT TRANSACTION LOGIC
// =========================================


// =========================================
// UPDATE: EDIT LOGIC WITH TYPE FILTER
// =========================================
let editingIndex = -1;

function openEditModal(idx) {
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    let t = tr[idx];
    editingIndex = idx;

    document.getElementById("editTransId").value = idx;
    document.getElementById("editTransAmt").value = t.amount;
    document.getElementById("editTransDesc").value = t.desc || "";
    
    // Select Elements
    let drTypeSelect = document.getElementById("editTransDrType");
    let crTypeSelect = document.getElementById("editTransCrType");
    let drAccSelect = document.getElementById("editTransDr");
    let crAccSelect = document.getElementById("editTransCr");

    // 1. Populate Types
    drTypeSelect.innerHTML = ""; crTypeSelect.innerHTML = "";
    accTypes.forEach(type => {
        drTypeSelect.add(new Option(type, type));
        crTypeSelect.add(new Option(type, type));
    });

    // 2. Set Selected Types (Use saved type OR auto-detect)
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    let findType = (name) => {
        for(let k in all) if(all[k].includes(name)) return k;
        return accTypes[0]; // Default
    };

    // පරණ දත්ත වල Type එක නැත්නම් නම මගින් සොයාගැනීම
    let currentDrType = t.dr_type || findType(t.dr_acc);
    let currentCrType = t.cr_type || findType(t.cr_acc);

    drTypeSelect.value = currentDrType;
    crTypeSelect.value = currentCrType;

    // 3. Populate Accounts based on Type & Set Value
    updateEditAccList('dr'); // Fill Dr Accounts
    updateEditAccList('cr'); // Fill Cr Accounts

    // ගිණුම හරියටම select වී ඇත්දැයි බැලීම (Timeout එකක් දාන්නේ List එක render වෙන්න කාලය දීමට)
    setTimeout(() => {
        drAccSelect.value = t.dr_acc;
        crAccSelect.value = t.cr_acc;
    }, 50);
    
    document.getElementById("editTransModal").style.display = "flex";
}

function closeEditModal() { 
    document.getElementById("editTransModal").style.display = "none"; 
}

function saveEditedTransaction() {
    let tr = JSON.parse(localStorage.getItem("transactions") || "[]");
    let idx = editingIndex;
    
    if(idx > -1 && tr[idx]) {
        let amt = document.getElementById("editTransAmt").value;
        let desc = document.getElementById("editTransDesc").value;
        
        let drType = document.getElementById("editTransDrType").value;
        let drAcc = document.getElementById("editTransDr").value;
        
        let crType = document.getElementById("editTransCrType").value;
        let crAcc = document.getElementById("editTransCr").value;
        
        if(!amt || !drAcc || !crAcc) { alert("Please fill amount and select accounts"); return; }
        
        // Update Data
        tr[idx].amount = amt;
        tr[idx].desc = desc;
        
        tr[idx].dr_type = drType; // Save Type explicitly
        tr[idx].dr_acc = drAcc;
        
        tr[idx].cr_type = crType; // Save Type explicitly
        tr[idx].cr_acc = crAcc;
        
        localStorage.setItem("transactions", JSON.stringify(tr));
        
        closeEditModal();
        renderTodayTransactions();
        showAlert("Success", "Transaction Updated! ✅");
        
        if(auth && auth.currentUser) performCloudBackup(auth.currentUser.uid);
    }
}





// ==========================================
// 11. BUDGET LIMITS LOGIC
// ==========================================

function initLimitsScreen() { 
    let container = document.getElementById("limitsContainer"); container.innerHTML = "";
    let accounts = JSON.parse(localStorage.getItem("accounts") || "{}");
    let limits = JSON.parse(localStorage.getItem("limit_data") || "{}");
    let expAccs = accounts["වියදම්"] || [];

    expAccs.forEach(acc => {
        let idD = `lim_daily_${acc}`, idW = `lim_weekly_${acc}`, idM = `lim_monthly_${acc}`;
        container.innerHTML += `<div class="limit-card"><h4>${acc}</h4><div class="limit-row"><label>Daily:</label><input type="number" id="${idD}" value="${limits[idD]||''}"></div><div class="limit-row"><label>Weekly:</label><input type="number" id="${idW}" value="${limits[idW]||''}"></div><div class="limit-row"><label>Monthly:</label><input type="number" id="${idM}" value="${limits[idM]||''}"></div></div>`;
    });
} 

function saveLimits() { 
    let limits = {}, accounts = JSON.parse(localStorage.getItem("accounts") || "{}");
    let expAccs = accounts["වියදම්"] || [];
    expAccs.forEach(acc => {
        let vD = document.getElementById(`lim_daily_${acc}`).value, vW = document.getElementById(`lim_weekly_${acc}`).value, vM = document.getElementById(`lim_monthly_${acc}`).value;
        if(vD) limits[`lim_daily_${acc}`]=vD; if(vW) limits[`lim_weekly_${acc}`]=vW; if(vM) limits[`lim_monthly_${acc}`]=vM;
    });
    localStorage.setItem("limit_data", JSON.stringify(limits)); alert("Saved"); navigateTo('settings');
}

function renderBudgetAlerts() {
    let container = document.getElementById("budgetAlertContainer"); if(!container) return; container.innerHTML = "";
    let limits = JSON.parse(localStorage.getItem("limit_data")||"{}"), trans = JSON.parse(localStorage.getItem("transactions")||"[]");
    let todayStr = getLocalTodayDate();
    let hasAlerts = false;
    let spentDay={}, spentWeek={}, spentMonth={};
    let now = new Date(); let curMonth=(now.getMonth()+1).toString(), curYear=now.getFullYear().toString(), curWeek=getWeekNumber(now);

    trans.forEach(t => {
        if(t.dr_type === "වියදම්") {
            let acc = t.dr_acc, amt = parseFloat(t.amount), tDate = new Date(t.date);
            if(t.date === todayStr) spentDay[acc] = (spentDay[acc] || 0) + amt;
            if(t.year == curYear && t.month == curMonth) spentMonth[acc] = (spentMonth[acc] || 0) + amt;
            if(t.year == curYear && getWeekNumber(tDate) == curWeek) spentWeek[acc] = (spentWeek[acc] || 0) + amt;
        }
    });

    Object.keys(limits).forEach(key => {
        let acc = key.split("_")[2], type = key.split("_")[1], limit = parseFloat(limits[key]);
        let spent = (type=="daily"?spentDay[acc]:(type=="weekly"?spentWeek[acc]:spentMonth[acc]))||0;
        if(limit>0) {
            let pct = (spent/limit)*100;
            if(pct>=75) { hasAlerts=true; container.innerHTML += `<div class="alert-card ${pct>=100?'alert-critical':'alert-warning'}"><span class="alert-title">${acc} (${type})</span><span class="alert-desc">${pct>=100?'Exceeded':'Remaining'}: ${Math.abs(limit-spent).toFixed(2)}</span></div>`; }
        }
    });
    container.style.display = hasAlerts ? "block" : "none";
}

function getWeekNumber(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7)); var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7); }

// =========================================
// 12. CALCULATOR LOGIC (Consolidated)
// =========================================

let calcExpression = "";

function openCalculator(targetInputId) {
    if (!targetInputId) targetInputId = "edCommonAmt";
    currentCalcTargetId = targetInputId; // Save the ID globally
    calcExpression = "";
    
    let display = document.getElementById("calcDisplay");
    if(display) {
        display.innerText = "0";
        document.getElementById("calcModal").style.display = "flex";
    } else {
        console.error("Calculator display element not found!");
    }
}

function calcCmd(val) {
    let display = document.getElementById("calcDisplay");
    
    if (val === 'C') {
        calcExpression = "";
        display.innerText = "0";
    } else if (val === 'back') {
        calcExpression = calcExpression.slice(0, -1);
        display.innerText = calcExpression || "0";
    } else {
        let lastChar = calcExpression.slice(-1);
        if (['+', '-', '*', '/', '.'].includes(val) && ['+', '-', '*', '/', '.'].includes(lastChar)) {
            return;
        }
        calcExpression += val;
        display.innerText = calcExpression;
    }
}

function calcApply() {
    try {
        let result = new Function('return ' + calcExpression)();
        result = Math.round(result * 100) / 100;
        
        if(currentCalcTargetId) {
            let targetField = document.getElementById(currentCalcTargetId);
            if(targetField) {
                targetField.value = result;
                if(typeof updateUIMode === "function") updateUIMode();
            } else {
                console.error("Target Input not found: " + currentCalcTargetId);
            }
        }
        document.getElementById("calcModal").style.display = "none";
    } catch (e) {
        document.getElementById("calcDisplay").innerText = "Error";
        calcExpression = "";
    }
}



// =========================================
// HELPER: UPDATE EDIT MODAL LISTS
// =========================================
function updateEditAccList(side) {
    let typeEl = document.getElementById(side === 'dr' ? "editTransDrType" : "editTransCrType");
    let accEl = document.getElementById(side === 'dr' ? "editTransDr" : "editTransCr");
    
    let type = typeEl.value;
    accEl.innerHTML = "";
    
    let all = JSON.parse(localStorage.getItem("accounts") || "{}");
    let h = JSON.parse(localStorage.getItem("hidden_accounts") || "[]");
    
    if(all[type]) {
        all[type].forEach(n => {
            // Edit කරන විට Hidden ගිණුම් පවා පෙන්විය යුතුය (Select කිරීමට)
            let opt = document.createElement("option"); 
            opt.value = n; 
            opt.innerText = n; 
            accEl.appendChild(opt);
        });
    }
}


