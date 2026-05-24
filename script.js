/**
 * Proje: Bir Ada - Şehir, Ticaret ve Hayatta Kalma Simülasyonu
 */

const gameState = {
    username: '',
    balance: 28000,
    age: 18,
    accountAgeMonths: 0,
    isAdmin: false, // Default false, server will verify
    time: { year: 1, month: 1, day: 1, phase: 0 }, // phase: 0=Sabah, 1=Öğle, 2=Akşam
    
    // Hayatta Kalma
    survival: {
        health: 100,
        morale: 100,
        foodStock: 15, // Başlangıçta 5 günlük erzak (15 öğün)
        starvationDays: 0
    },

    // Eğitim ve Kariyer
    isStudent: false,
    hasDiploma: false,
    universityMonths: 0, // 2 Yıllık Okul Sayacı
    jobType: null, 
    experience: 0,
    employedMonths: 0,
    joblessMonths: 0,
    jobSkill: 0,         // Mesleki Yetenek (Sertifika Puanı)
    activeOrders: [],    // Günlük Vardiya Kriz/Sipariş Dizisi
    monthlyCompletedAcademicTasks: 0, // Aylık tamamlanan akademik görev sayısı
    activeAcademicTasks: [],         // Günlük üniversite ödev/proje/sınav görevleri dizisi
    careerHistory: [],   // İş Geçmişi / Özgeçmiş Listesi
    jobApplications: [], // Admin paneline düşen CV başvuruları
    jobApplicationCooldown: 0, // Reddedilirse 2 ay bekleme süresi
    socialMessages: [],  // Ada Sosyal Mesajları
    friends: [],         // Sosyal Arkadaş Listesi
    friendRequests: [],  // Bekleyen Arkadaş İstekleri
    highLevelManagerCount: Math.floor(Math.random() * (15 - 12 + 1) + 12), // Maks 17 olabilir
    
    // Emlak ve Barınma
    housing: 'hotel', 
    hotelPrice: 1000, 
    
    // İşletme ve İhaleler
    universityOpen: true, // Baştan açık
    businesses: [], 
    hr: {
        cafe: { hasWorker: false, workerHappiness: 100, salary: 28000, workedMonths: 0, monthsSinceLastRaise: 999 },
        butik: { hasWorker: false, workerHappiness: 100, salary: 28000, workedMonths: 0, monthsSinceLastRaise: 999 },
        firin: { hasWorker: false, workerHappiness: 100, salary: 28000, workedMonths: 0, monthsSinceLastRaise: 999 },
        restoran: { hasWorker: false, workerHappiness: 100, salary: 56000, workedMonths: 0, monthsSinceLastRaise: 999 }
    },
    
    // Finans & Adliye & Harcama İadesi
    activeLoans: [],
    activeDeposits: [],
    checkupMonths: 0,
    loansToBots: [],     
    systemSpendTrack: 0, 
    
    transactions: [],
    debtsGiven: [],
    debtsTaken: [],
    lawsuits: [],
    debtRequests: [],
    notificationHistory: [],
    unreadNotifications: 0,
    bankBlocked: false,
    garnishmentActive: false,
    inBankruptcyEvent: false,
    
    financeHistory: { labels: [], income: [], expense: [] },
    marketHistory: { labels: [], cafe: [], butik: [], pastane: [], restoran: [] },
    currentMonthIncome: 0,
    currentMonthExpense: 0,
    totalIncome: 0,
    totalExpense: 0
};

// 1 Ay = 24 Gerçek Saat. Demek ki 30 Oyun Günü = 24 Saat.
// 1 Oyun Günü = 48 Dakika. Gün 3 Faza bölündüğüne göre 1 Faz = 16 Dakika.
// 16 Dakika = 960.000 ms.
// ONLINE GERÇEK ZAMAN MODU AKTİF: 1 Ay = 24 Saat
const MS_PER_PHASE = 960000; 
let isInitialSync = true;

const elm = {
    dashboard: document.getElementById('dashboard'),
    usernameInput: document.getElementById('username'),
    displayName: document.getElementById('display-name'),
    avatarInitial: document.getElementById('avatar-initial'),
    balanceAmount: document.getElementById('balance-amount'),
    eduStatus: document.getElementById('edu-status'),
    jobStatus: document.getElementById('job-status'),
    housingStatus: document.getElementById('housing-status'),
    fullDateDisplay: document.getElementById('full-date-display'),
    phaseDisplay: document.getElementById('time-phase'),
    ageDisplay: document.getElementById('age-display'),
    healthBar: document.getElementById('health-bar'),
    healthValue: document.getElementById('health-value'),
    foodBar: document.getElementById('food-bar'),
    foodValue: document.getElementById('food-value'),
    moraleBar: document.getElementById('morale-bar'),
    moraleValue: document.getElementById('morale-value'),
    transactions: document.getElementById('transaction-list'),
    notifications: document.getElementById('notifications-area')
};

function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
    if(id === 'modal-shift' && typeof renderShiftOrders === 'function') renderShiftOrders();
    if(id === 'modal-social') {
        if(typeof renderFriends === 'function') renderFriends();
    }
    if(id === 'modal-city' && typeof renderCityVenues === 'function') renderCityVenues();
    
    // Grafikleri yeniden boyutlandır ve çiz
    if(id === 'modal-bank' && personalChartInstance) {
        setTimeout(() => {
            personalChartInstance.resize();
            personalChartInstance.update();
        }, 50);
    }
    if(id === 'modal-borsa' && marketChartInstance) {
        setTimeout(() => {
            marketChartInstance.resize();
            marketChartInstance.update();
        }, 50);
    }
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function switchTab(btnElem, tabId) {
    const tabs = btnElem.closest('.modal-content').querySelectorAll('.tab-btn');
    const contents = btnElem.closest('.modal-content').querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    btnElem.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // SOCKET BAĞLANTISI BAŞLAT
    if (typeof io !== 'undefined') {
        window.socket = io();
        
        window.socket.on('broadcast_notification', (data) => {
            if (typeof notify !== 'undefined') notify(data.msg, data.type || 'info');
        });
        
        let currentPhaseCount = null;
        let pendingServerTime = null;
        let pendingSavedState = null;
        let gameFullyLoaded = false;

        function checkInitialLoad() {
            if (pendingServerTime && pendingSavedState) {
                if (pendingSavedState !== "NEW_PLAYER") {
                    let oldTotalPhases = pendingSavedState.time ? pendingSavedState.time.totalPhases : 0;
                    Object.assign(gameState, pendingSavedState);
                    if(gameState.monthlyCompletedAcademicTasks === undefined) gameState.monthlyCompletedAcademicTasks = 0;
                    if(!gameState.activeAcademicTasks) gameState.activeAcademicTasks = [];
                    notify("Kayıtlı oyununuz sunucudan başarıyla yüklendi!", "success");
                    
                    let currentTarget = pendingServerTime.totalPhases;
                    if (currentTarget > oldTotalPhases) {
                        let missed = currentTarget - oldTotalPhases;
                        if (missed > 90) missed = 90; // Max 1 Ay (90 faz)
                        for (let i = 0; i < missed; i++) {
                            oldTotalPhases++;
                            let phase = oldTotalPhases % 3;
                            let totalDays = Math.floor(oldTotalPhases / 3);
                            let day = (totalDays % 30) + 1;
                            let totalMonths = Math.floor(totalDays / 30);
                            let month = (totalMonths % 12) + 1;
                            let year = Math.floor(totalMonths / 12) + 1;
                            syncTimePhase({ phase, day, month, year, totalPhases: oldTotalPhases });
                        }
                    }
                } else {
                    gameState.time = pendingServerTime;
                    saveGame(true);
                }
                
                currentPhaseCount = pendingServerTime.totalPhases;
                gameFullyLoaded = true;
                
                // Tam yükleme bittikten sonra ekranı geçiş yap
                document.getElementById('login-screen').classList.remove('active');
                elm.dashboard.classList.add('active');
                
                if (typeof updateUI === 'function') updateUI();
                if (typeof updateTimeUI === 'function') updateTimeUI();
                if (typeof updateSurvivalUI === 'function') updateSurvivalUI();
                
                // Grafikleri yüklenen verilerle görünür canvasta başlat
                initCharts();
                
                pendingServerTime = null;
                pendingSavedState = null;
            }
        }

        window.socket.on('sync_time', (data) => {
            console.log("Sunucudan zaman senkronu geldi:", data);
            
            if (!gameFullyLoaded) {
                pendingServerTime = data;
                checkInitialLoad();
                return;
            }
            
            let targetPhaseCount = data.totalPhases;
            if (currentPhaseCount !== null && targetPhaseCount > currentPhaseCount) {
                let missed = targetPhaseCount - currentPhaseCount;
                if (missed > 90) missed = 90; 
                
                for (let i = 0; i < missed; i++) {
                    currentPhaseCount++;
                    let phase = currentPhaseCount % 3;
                    let totalDays = Math.floor(currentPhaseCount / 3);
                    let day = (totalDays % 30) + 1;
                    let totalMonths = Math.floor(totalDays / 30);
                    let month = (totalMonths % 12) + 1;
                    let year = Math.floor(totalMonths / 12) + 1;
                    
                    syncTimePhase({ phase, day, month, year, totalPhases: currentPhaseCount });
                }
            } else {
                syncTimePhase(data);
            }
        });

        window.socket.on('login_response', (data) => {
            gameState.isAdmin = data.isAdmin;
            if (data.isAdmin) {
                notify("Sistem Yönetici Yetkileri (Admin) Aktif Edildi.", "success");
            }
            if (typeof updateUI === 'function') updateUI();
        });

        window.socket.on('admin_error', (data) => {
            notify(data.msg, "error");
        });

        window.socket.on('load_game_state', (savedState) => {
            pendingSavedState = savedState;
            checkInitialLoad();
        });

        window.socket.on('new_player_setup', () => {
            pendingSavedState = "NEW_PLAYER";
            checkInitialLoad();
        });

        window.socket.on('incoming_transfer', (data) => {
            let amount = data.amount;
            let sender = data.sender;
            updateBalance(amount, `${sender} Kişisinden Gelen P2P Transfer`, true);
            notify(`[Banka] ${sender} adlı oyuncu size ${amount} 🪙 gönderdi!`, "success");
            updateUI();
        });

        window.socket.on('p2p_transfer_response', (data) => {
            if (data.success) {
                notify(data.msg, "success");
                updateBalance(-data.amount, "Banka P2P Transfer İşlemi", false);
                if (data.debtsGiven) gameState.debtsGiven = data.debtsGiven;
                updateUI();
                saveGame(true);
            } else {
                notify(data.msg, "error");
            }
        });

        window.socket.on('online_players_list', (data) => {
            if (Array.isArray(data)) {
                window.onlinePlayersList = data.filter(p => p !== gameState.username);
                window.cityVenueData = null;
                window.uniStudentsList = [];
            } else {
                window.onlinePlayersList = data.list.filter(p => p !== gameState.username);
                window.cityVenueData = data.venueData;
                window.uniStudentsList = data.students || [];
            }
            renderCityVenuesReal(); // Gerçek render fonksiyonu
            if (typeof renderUniStudents === 'function') renderUniStudents();
        });

        window.socket.on('incoming_friend_request', (data) => {
            if (!gameState.friendRequests) gameState.friendRequests = [];
            if (!gameState.friendRequests.includes(data.sender)) {
                gameState.friendRequests.push(data.sender);
                notify(`[Sosyal Ağ] ${data.sender} size arkadaşlık isteği gönderdi!`, 'info');
                if (typeof renderFriends === 'function') renderFriends();
            }
        });

        window.socket.on('friend_request_response', (data) => {
            if (data.success) {
                notify(data.msg, "success");
                if (data.target) {
                    if (!gameState.sentRequests) gameState.sentRequests = [];
                    if (!gameState.sentRequests.includes(data.target)) {
                        gameState.sentRequests.push(data.target);
                    }
                    if (typeof renderFriends === 'function') renderFriends();
                    saveGame(true);
                }
            } else {
                notify(data.msg, "error");
            }
        });

        window.socket.on('friend_accepted', (data) => {
            if (!gameState.friends) gameState.friends = [];
            if (!gameState.friends.includes(data.newFriend)) {
                gameState.friends.push(data.newFriend);
            }
            if (gameState.sentRequests) {
                gameState.sentRequests = gameState.sentRequests.filter(req => req !== data.newFriend);
            }
            notify(`[Sosyal Ağ] ${data.newFriend} arkadaşlık isteğinizi kabul etti!`, 'success');
            if (typeof renderFriends === 'function') renderFriends();
            saveGame(true);
        });

        window.socket.on('friend_accepted_response', (data) => {
            if (data.success) {
                if (!gameState.friends) gameState.friends = [];
                if (!gameState.friends.includes(data.newFriend)) gameState.friends.push(data.newFriend);
                notify(data.msg, "success");
                if (typeof renderFriends === 'function') renderFriends();
                saveGame(true);
            }
        });

        window.socket.on('incoming_dm', (data) => {
            notify(`[DM] ${data.sender}: ${data.msg.substring(0,20)}...`, 'info');
            
            if (!gameState.chats) gameState.chats = {};
            if (!gameState.chats[data.sender]) gameState.chats[data.sender] = [];
            gameState.chats[data.sender].push(data);
            
            let dmDropdown = document.getElementById('dm-target');
            if (dmDropdown) {
                // Eğer dropdown boşsa veya zaten bu kişideysek, otomatik seç ve render et
                if (dmDropdown.value === "" || dmDropdown.value === data.sender) {
                    // Sadece listede bu kişi varsa seçebiliriz
                    let optionExists = Array.from(dmDropdown.options).some(opt => opt.value === data.sender);
                    if (optionExists) {
                        dmDropdown.value = data.sender;
                    }
                    if (typeof renderDMHistory === 'function') renderDMHistory();
                }
            }
        });

        window.socket.on('lawsuit_response', (data) => {
            if (data.success) {
                notify(data.msg, data.won ? 'success' : 'error');
                if (data.won && data.penalty) {
                    updateBalance(data.penalty, "Dava İcrası", true);
                } else if (!data.won && data.penalty) {
                    updateBalance(-data.penalty, "Asılsız Dava Cezası", false);
                }
                if (data.debtsGiven !== undefined) gameState.debtsGiven = data.debtsGiven;
                if (data.lawsuits !== undefined) gameState.lawsuits = data.lawsuits;
                if (typeof renderLawsuitsHistory === 'function') renderLawsuitsHistory();
                updateUI();
                saveGame(true);
            } else {
                notify(data.msg, 'error');
            }
        });

        window.socket.on('lawsuit_lost', (data) => {
            notify(data.msg, 'error');
            if (data.penalty) updateBalance(-data.penalty, "Dava Kaybı İcra Cezası", false);
            if (data.debtsTaken !== undefined) gameState.debtsTaken = data.debtsTaken;
            if (data.lawsuits !== undefined) gameState.lawsuits = data.lawsuits;
            if (typeof renderLawsuitsHistory === 'function') renderLawsuitsHistory();
            if (typeof renderLawsuit === 'function') renderLawsuit();
            updateUI();
            saveGame(true);
        });

        window.socket.on('lawsuit_sync', (data) => {
            if (data.lawsuits !== undefined) gameState.lawsuits = data.lawsuits;
            if (typeof renderLawsuitsHistory === 'function') renderLawsuitsHistory();
        });

        window.socket.on('burs_deposit_response', (data) => {
            if (data.success) {
                notify(data.msg, 'success');
                if (data.amount) updateBalance(-data.amount, "Üniversite Burs Bağışı", false);
                updateUI();
                saveGame(true);
            } else {
                notify(data.msg, 'error');
            }
        });

        window.socket.on('burs_received_live', (data) => {
            if (data.share) updateBalance(data.share, `Burs (${data.sender} Fonu)`, true);
            notify(`[Üniversite] ${data.sender} adlı oyuncu üniversite fonuna burs yatırdı! Payınıza ${data.share} 🪙 yansıdı!`, 'success');
            updateUI();
            saveGame(true);
        });

        window.socket.on('admin_balance_gift', (data) => {
            let amount = data.amount;
            if (amount > 0) {
                updateBalance(amount, "Şehir Yönetimi Para Yardımı", true);
                notify(`[Yönetim] Şehir Yönetimi hesabınıza ${amount} 🪙 yatırdı!`, "success");
            } else {
                updateBalance(Math.abs(amount), "Şehir Yönetimi Bakiye Kesintisi", false);
                notify(`[Yönetim] Şehir Yönetimi hesabınızdan ${Math.abs(amount)} 🪙 kesinti yaptı!`, "error");
            }
            updateUI();
            saveGame(true);
        });

        window.socket.on('admin_edit_balance_response', (data) => {
            if (data.success) {
                notify(data.msg, "success");
                if (data.target === gameState.username) {
                    gameState.balance = data.newBalance;
                    updateUI();
                }
                setTimeout(() => {
                    if (window.socket) window.socket.emit('get_admin_player_data');
                }, 500);
            } else {
                notify(data.msg, "error");
            }
        });

        window.socket.on('incoming_debt_request', (data) => {
            notify(`[Banka] ${data.sender} sizden ${data.term} ay vadeli ${data.amount} 🪙 borç talep etti!`, "info");
        });

        window.socket.on('debt_request_sync', (data) => {
            if (data.debtRequests !== undefined) {
                gameState.debtRequests = data.debtRequests;
                if (typeof renderLawsuit === 'function') renderLawsuit();
            }
        });

        window.socket.on('request_debt_response', (data) => {
            if (data.success) {
                notify(data.msg, "success");
            } else {
                notify(data.msg, "error");
            }
        });

        window.socket.on('reject_debt_request_response', (data) => {
            if (data.success) {
                notify(data.msg, "success");
                if (data.id) {
                    gameState.debtRequests = (gameState.debtRequests || []).filter(r => r.id !== data.id);
                    if (typeof renderLawsuit === 'function') renderLawsuit();
                }
            } else {
                notify(data.msg, "error");
            }
        });

        window.socket.on('notification_sync', (data) => {
            gameState.notificationHistory = data.history || [];
            gameState.unreadNotifications = data.unread || 0;
            updateUI();
        });

        window.socket.on('pay_back_debt_response', (data) => {
            if (data.success) {
                notify(data.msg, 'success');
                if (data.debtsTaken !== undefined) gameState.debtsTaken = data.debtsTaken;
                if (data.amount) updateBalance(-data.amount, "Borç Geri Ödemesi", false);
                if (typeof renderLawsuit === 'function') renderLawsuit();
                updateUI();
                saveGame(true);
            } else {
                notify(data.msg, 'error');
            }
        });

        window.socket.on('debt_repaid_live', (data) => {
            if (data.debtsGiven !== undefined) gameState.debtsGiven = data.debtsGiven;
            if (data.amount) updateBalance(data.amount, `${data.debtor} Kişisinden Geri Ödeme`, true);
            notify(`[Banka] ${data.debtor} adlı oyuncu size olan ${data.amount} 🪙 borcunu geri ödedi!`, "success");
            if (typeof renderLawsuit === 'function') renderLawsuit();
            updateUI();
            saveGame(true);
        });

        window.socket.on('global_news_response', (data) => {
            if (data.success) {
                notify(data.msg, 'success');
                let cost = gameState.isAdmin ? 0 : 50;
                if (cost > 0) {
                    updateBalance(-cost, "Haber Bülteni Yayını", false);
                }
                updateUI();
                saveGame(true);
            } else {
                notify(data.msg, 'error');
            }
        });

        window.socket.on('admin_player_data_response', (playerList) => {
            const tbody = document.getElementById('admin-players-body');
            if(!tbody) return;

            if(playerList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:10px; color:var(--clr-text-muted);">Sunucuda kayıtlı başka oyuncu bulunmuyor.</td></tr>`;
                return;
            }

            let html = '';
            playerList.forEach(p => {
                html += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:10px;">${p.name}</td>
                        <td style="padding:10px;">${p.age}</td>
                        <td style="padding:10px;">${Math.floor(p.balance).toLocaleString("tr-TR")} 🪙</td>
                        <td style="padding:10px;">${p.job}</td>
                        <td style="padding:10px;">${p.housing}</td>
                        <td style="padding:10px;">${p.edu}</td>
                        <td style="padding:10px;">${p.jobSkill}</td>
                        <td style="padding:10px;">${p.socialScore} Arkadaş</td>
                        <td style="padding:10px; color:${p.isOnline ? 'var(--clr-success)' : 'var(--clr-danger)'};">${p.isOnline ? '🟢 Online' : '🔴 Offline'}</td>
                        <td style="padding:10px;">
                            <button class="btn-primary" style="padding:3px 8px; font-size:0.75rem; border-radius:5px; background:var(--clr-success); margin-right:5px;" onclick="adminSendMoney('${p.name}')">💸 Para Gönder</button>
                            ${p.name !== gameState.username && !window.systemBotNames.includes(p.name) ? `<button class="btn-danger" style="padding:3px 8px; font-size:0.75rem; border-radius:5px;" onclick="adminDeletePlayer('${p.name}')">🗑️ Sil</button>` : ''}
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        });

        window.socket.on('cv_result', (data) => {
            if(data.success) notify(data.msg, "success");
            else notify(data.msg, "error");
        });

        window.socket.on('cv_list_response', (cvList) => {
            const cvListEl = document.getElementById('admin-cv-list');
            if(!cvListEl) return;
            
            if(cvList.length === 0) {
                cvListEl.innerHTML = `<div style="padding:10px; background:rgba(0,0,0,0.5); border-radius:8px;">Şu an bekleyen herhangi bir Müdürlük başvurusu (CV) bulunmamaktadır.</div>`;
            } else {
                cvListEl.innerHTML = cvList.map((app) => {
                    return `
                    <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="margin:0; color:#3b82f6;">Aday: ${app.username}</h3>
                            <span style="background:#3b82f6; color:white; padding:3px 8px; border-radius:5px; font-size:0.8rem;">Tecrübe: ${app.exp} Ay</span>
                        </div>
                        <div style="display:flex; gap:10px; margin-top:15px;">
                            <button class="btn-primary" style="flex:1; background:var(--clr-success);" onclick="resolveJobApplication('${app.username}', true)">İşe Al (Onayla)</button>
                            <button class="btn-danger" style="flex:1;" onclick="resolveJobApplication('${app.username}', false)">Reddet</button>
                        </div>
                    </div>`;
                }).join('');
            }
        });

        window.socket.on('cv_approved_live', (data) => {
            notify(data.msg, "success");
            gameState.jobType = 'high-level';
            gameState.employedMonths = 0;
            gameState.jobApplicationCooldown = 0;
            document.getElementById('job-resign').style.display = 'block';
            addCareerLog("Yönetim Onayıyla Üst Düzey Yönetici olarak atandı.");
            updateUI();
            saveGame(true);
        });

        window.socket.on('cv_rejected_live', (data) => {
            notify(data.msg, "error");
            gameState.jobApplicationCooldown = 2;
            saveGame(true);
        });

        window.socket.on('global_news_sync', (newsList) => {
            let ticker = document.getElementById('global-news-ticker');
            if (ticker) {
                let defaultHtml = `<span style="display:inline-block; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:4px 12px; border-radius:20px; margin-right:20px; font-size:0.85rem; color:#94a3b8;">📢 Sayın ada sakinleri, "Dilek/Şikayet Kutusuna" adada olmasını istediğiniz yeni özellikleri veya çalışmayan özellikleri bizlere bildirebilirsiniz.</span>`;
                if (!newsList || newsList.length === 0) {
                    ticker.innerHTML = defaultHtml;
                } else {
                    let newsHtml = newsList.map((n, idx) => {
                        let deleteBtn = gameState.isAdmin 
                            ? `<span style="color:#ef4444; cursor:pointer; margin-left:6px; font-weight:bold;" onclick="deleteGlobalNews(${idx})">🗑️</span>` 
                            : "";
                        return `<span style="display:inline-block; background:rgba(167, 139, 250, 0.12); border:1px solid rgba(167, 139, 250, 0.25); padding:4px 12px; border-radius:20px; margin-right:20px; font-size:0.85rem; color:#f8fafc;"><strong style="color:#c084fc;">[${n.sender}]</strong>: ${n.msg}${deleteBtn}</span>`;
                    }).join('');
                    ticker.innerHTML = defaultHtml + newsHtml;
                }
            }
        });

        window.socket.on('force_logout', (data) => {
            alert(data.msg);
            let defaultAuth = { "rana deniz": "19052005", "rana deni̇z": "19052005" };
            let userAuth = JSON.parse(localStorage.getItem('userAuth') || JSON.stringify(defaultAuth));
            delete userAuth[gameState.username.toLowerCase()];
            localStorage.setItem('userAuth', JSON.stringify(userAuth));
            location.reload();
        });

        window.socket.on('feedback_response', (data) => {
            notify(data.msg, data.success ? "success" : "error");
            if (data.success) {
                document.getElementById('feedback-text').value = '';
                closeModal('modal-feedback');
            }
        });

        window.socket.on('feedbacks_response', (feedbacks) => {
            const listEl = document.getElementById('admin-feedbacks-list');
            if (!listEl) return;
            
            if (feedbacks.length === 0) {
                listEl.innerHTML = `<div style="padding:10px; background:rgba(0,0,0,0.5); border-radius:8px;">Henüz hiç geri bildirim yok.</div>`;
            } else {
                listEl.innerHTML = feedbacks.slice().reverse().map(fb => {
                    let d = new Date(fb.date);
                    return `
                    <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                            <strong style="color:var(--clr-primary);">Gönderen: ${fb.sender}</strong>
                            <small style="color:var(--clr-text-muted);">${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR')}</small>
                        </div>
                        <p style="font-size:0.9rem; color:white; line-height:1.5;">${fb.message}</p>
                    </div>`;
                }).join('');
            }
        });

        window.socket.on('leaderboard_response', (leaderboard) => {
            const listEl = document.getElementById('leaderboard-list');
            if (!listEl) return;
            
            if (leaderboard.length === 0) {
                listEl.innerHTML = `<div style="padding:10px; background:rgba(0,0,0,0.5); border-radius:8px;">Henüz kimse adaya yerleşmemiş.</div>`;
            } else {
                let html = '';
                leaderboard.forEach((player, index) => {
                    let rankBadge = `${index + 1}.`;
                    let rankStyle = "color:var(--clr-text-muted); font-weight:bold;";
                    if (index === 0) { rankBadge = "👑 1."; rankStyle = "color:#fbbf24; font-weight:900; font-size:1.2rem;"; }
                    else if (index === 1) { rankBadge = "🥈 2."; rankStyle = "color:#94a3b8; font-weight:bold; font-size:1.1rem;"; }
                    else if (index === 2) { rankBadge = "🥉 3."; rankStyle = "color:#b45309; font-weight:bold; font-size:1.05rem;"; }
                    
                    let bgStyle = player.name === gameState.username ? "background:rgba(59, 130, 246, 0.15); border:1px solid rgba(59, 130, 246, 0.5);" : "background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);";

                    html += `
                    <div style="${bgStyle} border-radius:10px; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <span style="${rankStyle} width:35px;">${rankBadge}</span>
                            <div>
                                <strong style="font-size:1.1rem; display:flex; align-items:center; gap:5px;">
                                    ${player.name}
                                    ${player.isBot ? '<span style="background:var(--clr-primary); color:white; font-size:0.6rem; padding:2px 5px; border-radius:4px; margin-left:5px;">SİSTEM</span>' : ''}
                                </strong>
                                <div style="font-size:0.8rem; color:var(--clr-text-muted);">${player.job} | ${player.isOnline ? '🟢 Oyunda' : '🔴 Çevrimdışı'}</div>
                            </div>
                        </div>
                        <div style="font-weight:900; color:#fbbf24; font-size:1.1rem; text-align:right;">
                            ${Math.floor(player.balance).toLocaleString('tr-TR')} 🪙
                        </div>
                    </div>`;
                });
                listEl.innerHTML = html;
            }
        });
    }

    window.systemBotNames = ["Mert_14", "Zeynep_K", "Kaan01", "Esra_M", "Emir_A", "Yolcu_Mühendis", "CoolGamer44", "Ada_Star", "Deniz_Kaptan", "Borsa_Kurtlari", "Berkcan99"];

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = elm.usernameInput.value.trim();
        const pass = document.getElementById('password').value.trim();
        if(user.length < 2 || pass.length < 1) return;
        
        if (pass.length < 4) {
            alert("Sistem Koruması: Olası siber hırsızlıkları engellemek için şifreniz çok kısa olamaz. Lütfen en az 4 haneli (veya karakterli) güçlü bir şifre belirleyin.");
            return;
        }

        let defaultAuth = { "rana deniz": "19052005", "rana deni̇z": "19052005" };
        let userAuth = JSON.parse(localStorage.getItem('userAuth') || JSON.stringify(defaultAuth));
        let lowerUser = user.toLowerCase();

        if (userAuth[lowerUser]) {
            // Eski kullanıcı, şifresi doğru mu?
            if (userAuth[lowerUser] !== pass) {
                alert("Sistem Koruması: Bu kullanıcı adı için yanlış şifre girdiniz!");
                return;
            }
        } else {
            // Yeni kullanıcı, şifre başkası tarafından kullanılıyor mu?
            if (Object.values(userAuth).includes(pass)) {
                alert("Sistem Koruması: Bu şifre başka bir oyuncu tarafından sistemde zaten kullanılıyor! Lütfen tamamen benzersiz (sadece size özel) farklı bir şifre belirleyin.");
                return;
            }
            // Şifre sorunsuz, kaydet
            userAuth[lowerUser] = pass;
            localStorage.setItem('userAuth', JSON.stringify(userAuth));
        }

        const botIdx = window.systemBotNames.findIndex(n => n.toLowerCase() === user.toLowerCase());
        if (botIdx !== -1) {
            // Kullanıcı botun requires ismini farketmeden 'aldı', botu sistemden sessizce imha et.
            window.systemBotNames.splice(botIdx, 1);
        }

        gameState.username = user;
        
        elm.displayName.textContent = user;
        elm.avatarInitial.textContent = user.charAt(0).toUpperCase();
        
        let loginBtn = document.querySelector('#login-form button');
        if (loginBtn) {
            loginBtn.textContent = 'Giriş Yapılıyor...';
            loginBtn.disabled = true;
        }
        
        if (window.socket) {
            window.socket.emit('player_login', { username: user, password: pass });
        }
        
        notify(`Adaya hoş geldin, ${user}! Sunucu ile senkronize olunuyor...`);
    });

    function getFoodPrice(base) {
        return gameState.isStudent ? Math.floor(base * 0.7) : base;
    }

    // Hayatta Kalma / Market / Hastane
    document.getElementById('btn-buy-food-15').onclick = () => { if(systemSpend(getFoodPrice(2500), '15 Öğünlük Erzak Paketi')) { gameState.survival.foodStock += 15; gameState.survival.morale = Math.min(100, gameState.survival.morale + 5); updateUI(); } };
    document.getElementById('btn-buy-food-30').onclick = () => { if(systemSpend(getFoodPrice(5000), '30 Öğünlük (10 Günlük) Erzak Paketi')) { gameState.survival.foodStock += 30; gameState.survival.morale = Math.min(100, gameState.survival.morale + 10); updateUI(); } };
    document.getElementById('btn-fast-heal').onclick = () => { 
        if(systemSpend(getFoodPrice(2500), 'Restoranda Lüks Şef Yemeği')) {
            gameState.survival.foodStock += 1;
            gameState.survival.health = Math.min(100, gameState.survival.health + 25);
            gameState.survival.morale = Math.min(100, gameState.survival.morale + 20);
            updateUI();
            notify("Güzel bir ziyafet çektin, canın %25 ve moralin +20 arttı!");
        }
    };

    document.getElementById('btn-checkup').onclick = () => { if(systemSpend(2000, 'Hastane Check-up')) gameState.checkupMonths = 0; };
    document.getElementById('btn-heal-hospital').onclick = () => { 
        if(systemSpend(2000, 'Hastane Tam Tedavi (Serum)')) {
            gameState.survival.health = 100;
            updateUI();
            notify("Kırmızı alanda serum takıldı, Can (Health) tekrar %100.");
        }
    };
    document.getElementById('btn-therapy').onclick = () => { 
        let cost = gameState.isStudent ? 2100 : 3000;
        let msg = gameState.isStudent ? 'Psikiyatri Klinik Terapi (Öğrenci %30 İndirimi)' : 'Psikiyatri Klinik Terapi';
        if(systemSpend(cost, msg)) {
            gameState.survival.morale = 100;
            updateUI();
            notify("Klinikte başarılı bir terapi süreci geçirdiniz. Moraliniz (Psikoloji) %100 oldu!", "success");
        }
    };
    
    // Banka
    // Banka Kredi Önizleme Mantığı
    function updateLoanPreview() {
        const val = parseInt(document.getElementById('loan-amount').value);
        const term = parseInt(document.getElementById('loan-term').value);
        const previewEl = document.getElementById('loan-preview');
        if (!previewEl) return;
        
        if (isNaN(val) || val <= 0) {
            previewEl.style.display = 'none';
            return;
        }
        
        let interestRate = 0.04;
        if (term === 3) interestRate = 0.055;
        else if (term === 6) interestRate = 0.075;
        else if (term === 12) interestRate = 0.09;
        
        const totalRepayment = val + (val * interestRate);
        const monthlyPayment = Math.floor(totalRepayment / term);
        
        document.getElementById('loan-preview-rate').textContent = `%${(interestRate * 100).toFixed(1)}`;
        document.getElementById('loan-preview-total').textContent = `${Math.floor(totalRepayment).toLocaleString('tr-TR')} 🪙`;
        document.getElementById('loan-preview-monthly').textContent = `${monthlyPayment.toLocaleString('tr-TR')} 🪙 / Ay`;
        previewEl.style.display = 'block';
    }

    const loanAmountInput = document.getElementById('loan-amount');
    const loanTermSelect = document.getElementById('loan-term');
    if (loanAmountInput) loanAmountInput.addEventListener('input', updateLoanPreview);
    if (loanTermSelect) loanTermSelect.addEventListener('change', updateLoanPreview);

    document.getElementById('btn-take-loan').onclick = () => {
        if(gameState.bankBlocked) return notify("Hesabınız BLOKELİ! Kredi çekilemez.", "error");
        if(gameState.isStudent) return notify("Öğrenciler kredi çekemez!", "error");
        if(!gameState.jobType && !gameState.businessOwned) return notify("Kredi çekebilmek için en az asgari ücretli bir işiniz veya işletmeniz olmalı.", "error");
        
        const val = parseInt(document.getElementById('loan-amount').value);
        const term = parseInt(document.getElementById('loan-term').value);
        if(val > 0) { 
            updateBalance(val, 'Kredi Çekimi (Gelir)', true);
            
            let interestRate = 0.04;
            if (term === 3) interestRate = 0.055;
            else if (term === 6) interestRate = 0.075;
            else if (term === 12) interestRate = 0.09;
            
            const totalRepayment = val + (val * interestRate); // Vadeye göre faiz
            const monthlyPayment = Math.floor(totalRepayment / term);
            
            gameState.activeLoans.push({
                principal: val,
                totalRepayment: totalRepayment,
                monthlyPayment: monthlyPayment,
                remainingMonths: term,
                targetDay: gameState.time.day
            });
            
            document.getElementById('loan-amount').value = ''; 
            const previewEl = document.getElementById('loan-preview');
            if (previewEl) previewEl.style.display = 'none';
            updateUI(); 
        }
    };
    document.getElementById('btn-put-deposit').onclick = () => {
        if(gameState.bankBlocked) return notify("Hesabınız BLOKELİ! İşlem yapılamaz.", "error");

        const val = parseInt(document.getElementById('deposit-amount').value);
        const term = parseInt(document.getElementById('deposit-term').value);
        
        if(val > 0 && val <= gameState.balance) { 
            updateBalance(-val, 'Mevduat Kilitlendi', false); 
            
            // %40 Yıllık = Aylık ~%3.33 ... Dönüş = VadeSonunda 40/12 * Ay
            const interestPercent = (40 / 12) * term; 
            const expectedReturn = val + Math.floor(val * (interestPercent / 100));
            
            gameState.activeDeposits.push({
                amount: val,
                expectedReturn: expectedReturn,
                remainingMonths: term,
                targetDay: gameState.time.day
            });
            
            document.getElementById('deposit-amount').value = ''; 
            updateUI(); 
        }
    };

    // Eğitim
    document.getElementById('btn-study-uni').onclick = () => { 
        if(!gameState.hasDiploma && !gameState.isStudent) { 
            gameState.isStudent = true; 
            gameState.monthlyCompletedAcademicTasks = 0;
            gameState.activeAcademicTasks = [];
            generateDailyAcademicTasks();
            notify("Okula kaydoldun. Temsili 2 yıl sürecek. Öğrenciyken Sadece Part-Time çalışabilirsin."); 
            updateUI(); 
        } 
    };
    
    document.getElementById('btn-buy-diploma').onclick = () => { 
        if(gameState.universityMonths >= 24 && !gameState.hasDiploma) {
            if(systemSpend(50000, 'Diploma Mezuniyet Harcı')) { 
                gameState.hasDiploma = true; 
                gameState.isStudent = false; 
                gameState.activeAcademicTasks = [];
                gameState.monthlyCompletedAcademicTasks = 0;
                notify("Tebrikler 2 Yılı Tamamladın ve 50.000🪙 ödeyip Diplomanı Aldın!"); 
                updateUI(); 
            }
        } else if (gameState.universityMonths < 24) {
            notify(`Diplomayı almak için ${24 - gameState.universityMonths} ay daha okumalısın!`, "error");
        }
    };

    document.getElementById('btn-checkup').onclick = () => {
        if(systemSpend(2000, 'Tam Kapsamlı Hastane Check-up')) {
            gameState.checkupMonths = 0;
            notify("Kapsamlı sağlık taramanız yapıldı. Hastalık riskiniz sıfırlandı.", "success");
            updateUI();
        }
    };
    
    // Kariyer Spesifikasyonları
    document.getElementById('job-asgari-cafe').onclick = () => { takeJob('asgari-cafe'); addCareerLog("Ada Kafe İşletmesi'nde Asgari İşçi olarak işe girdi."); };
    document.getElementById('job-asgari-restoran').onclick = () => { takeJob('asgari-restoran'); addCareerLog("Ada Restoran Lokantası'nda Asgari İşçi olarak işe girdi."); };
    document.getElementById('job-asgari-firin').onclick = () => { takeJob('asgari-firin'); addCareerLog("Ada Fırın İşletmesi'nde Asgari İşçi olarak işe girdi."); };
    document.getElementById('job-asgari-butik').onclick = () => { takeJob('asgari-butik'); addCareerLog("Ada Butik Mağazası'nda Asgari İşçi olarak işe girdi."); };
    
    document.getElementById('job-part').onclick = () => { 
        if(!gameState.isStudent) return notify("Üniversiteye kayıtlı bir öğrenci olmadan Part-Time çalışamazsınız!", "error");
        takeJob('part-time'); 
        addCareerLog("Öğrenci Part-Time görevine başladı.");
    };
    document.getElementById('job-high').onclick = () => { takeJob('high-level'); addCareerLog("Üst Düzey Yönetici olarak atandı."); };
    document.getElementById('job-resign').onclick = () => { 
        gameState.jobType = null; 
        addCareerLog("Kariyerdeki işinden istifa etti.");
        notify("İstifa ettin."); 
        document.getElementById('job-resign').style.display = 'none'; 
        updateUI(); 
    };

    // Emlak (48 Ay Kilidi Şartı - Aksi halde sadece otelde kalabilir)
    document.getElementById('btn-rent-house').onclick = () => { 

        
        if(gameState.balance >= 7500) { gameState.housing='rented'; notify("Kira kontratı yapıldı."); updateUI(); } 
    };
    
    document.getElementById('btn-buy-house').onclick = () => { 

        
        if(gameState.balance >= 1500000) { updateBalance(-1500000, 'Ev Satın Alma', false); gameState.housing='owned'; notify("Bir ev satın aldınız."); updateUI(); } 
    };

    // Adliye / Polis
    document.getElementById('btn-lend-money').onclick = sendP2PTransfer;
    document.getElementById('btn-file-lawsuit').onclick = fileLawsuit;

    // Sohbet
    document.getElementById('chat-header').onclick = () => document.getElementById('chat-widget').classList.toggle('expanded');
    document.getElementById('btn-chat-send').onclick = chatSimulate;
    document.getElementById('chat-input').addEventListener('keypress', function(e) {
        if(e.key === 'Enter') chatSimulate();
    });
    
    initCharts(); // Grafikleri Başlat
});

// --- CHART.JS ENTEGRASYONU ---
let personalChartInstance = null;
let marketChartInstance = null;

function initCharts() {
    // Kişisel Gelir/Gider Grafiği Başlat
    const ctxPersonal = document.getElementById('personalFinanceChart');
    if(ctxPersonal) {
        if (personalChartInstance) {
            personalChartInstance.destroy();
        }
        personalChartInstance = new Chart(ctxPersonal, {
            type: 'line',
            data: {
                labels: gameState.financeHistory.labels,
                datasets: [
                    { label: 'Aylık Gelir', data: gameState.financeHistory.income, borderColor: '#10b981', tension: 0.3, fill: false },
                    { label: 'Aylık Gider', data: gameState.financeHistory.expense, borderColor: '#ef4444', tension: 0.3, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, color: 'white', plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } } }
        });
    }

    // Borsa Piyasa Grafiği Başlat
    const ctxMarket = document.getElementById('marketChart');
    if(ctxMarket) {
        if (marketChartInstance) {
            marketChartInstance.destroy();
        }
        marketChartInstance = new Chart(ctxMarket, {
            type: 'line',
            data: {
                labels: gameState.marketHistory.labels,
                datasets: [
                    { label: '☕ Kafe Sektörü', data: gameState.marketHistory.cafe, borderColor: '#3b82f6', tension: 0.3 },
                    { label: '🎽 Butik Sektörü', data: gameState.marketHistory.butik, borderColor: '#f59e0b', tension: 0.3 },
                    { label: '🥐 Fırın Endeksi', data: gameState.marketHistory.pastane, borderColor: '#8b5cf6', tension: 0.3 },
                    { label: '🥩 Restoran Endeksi', data: gameState.marketHistory.restoran, borderColor: '#ef4444', tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, color: 'white', plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } } }
        });
    }
}

function startGameLoop() {
    // Lokal zaman motoru kapatıldı, artık sunucu üzerinden Socket.io ile sync_time dinleniyor.
}

function getDaysInMonth(month, year) {
    if(month === 2) return (year % 4 === 0) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function syncTimePhase(serverTime) {
    let phaseChanged = (gameState.time.phase !== serverTime.phase);
    let dayChanged = (gameState.time.day !== serverTime.day);
    let monthChanged = (gameState.time.month !== serverTime.month);
    
    let oldYear = gameState.time.year;
    let yearChanged = (oldYear !== serverTime.year);

    gameState.time = serverTime;

    if (phaseChanged || dayChanged || monthChanged || yearChanged) {
        // Öğün/Açlık Simülasyonu
        processSurvivalMeal();

        if(gameState.time.phase === 2) {
            // Akşam saatleri işten çıkış
            if (gameState.jobType !== null) {
                if(!gameState.salaryDeductions) gameState.salaryDeductions = 0;
                if(!gameState.monthlyCompletedTasks) gameState.monthlyCompletedTasks = 0;
                
                // Gün sonu sadece kalan siparişler silinir, ceza ay sonuna ertelendi.
                if(gameState.activeOrders && gameState.activeOrders.length > 0) {
                    notify("Mesai bitti! Kalan siparişler masaüstünden kaldırıldı, yarın yenileri gelecek.", "error");
                } else if(gameState.jobType !== 'part-time') {
                    notify("Mesai bitti! Harika bir gün geçirdiniz, akşamın tadını çıkarın.", "success");
                }
                
                gameState.activeOrders = [];
                if (typeof renderShiftOrders === 'function') renderShiftOrders();
            } 
        }
    }

    if(dayChanged) {
        generateDailyOrders();
        generateDailyAcademicTasks();
        
        if(gameState.checkupMonths >= 3) {
            gameState.survival.health -= 1; // Check-up ihmali hastalığı
            if(gameState.survival.health < 0) gameState.survival.health = 0;
        }
        
        // Günlük Moral Düşüşleri
        if (gameState.balance < 0) gameState.survival.morale -= 1; // Borç Stresi
        if (gameState.survival.health <= 50) gameState.survival.morale -= 1; // Hastalık Psikolojisi
        if (gameState.survival.morale < 0) gameState.survival.morale = 0;
        
        // Moral Çöküşü (Depresyon)
        if (gameState.survival.morale === 0) {
            gameState.survival.morale = 100;
            let expense = gameState.isStudent ? Math.floor(5000 * 0.7) : 5000;
            updateBalance(-expense, "Klinik Terapi Masrafı (Depresyon)", false);
            notify(`Ağır depresyona girdiniz, oyuna devam edebilmek için kliniğe yatırıldınız (-${expense} 🪙).`, "error");
        }
        
        // GÜN BİTİMİNDE OTOMATİK KAYIT
        saveGame(true);
    }

    if(monthChanged) {
        onNewMonth();
    }

    // Bireysel Doğum Günü ve Yaş Hesaplama (Oyuncunun adaya geliş tarihi)
    if (!gameState.joinDate || !gameState.joinDate._isFixed) {
        let monthsPlayed = gameState.accountAgeMonths || 0;
        let totalCurrentMonths = (serverTime.year - 1) * 12 + (serverTime.month - 1);
        let joinTotalMonths = totalCurrentMonths - monthsPlayed;
        if (joinTotalMonths < 0) joinTotalMonths = 0;
        
        let startYear = Math.floor(joinTotalMonths / 12) + 1;
        let startMonth = (joinTotalMonths % 12) + 1;
        
        gameState.joinDate = { year: startYear, month: startMonth, day: serverTime.day, _isFixed: true };
    }

    let calculatedAge = 18 + (serverTime.year - gameState.joinDate.year);
    if (serverTime.month < gameState.joinDate.month || 
       (serverTime.month === gameState.joinDate.month && serverTime.day < gameState.joinDate.day)) {
        calculatedAge--;
    }

    if (calculatedAge > gameState.age) {
        let yearsPassed = calculatedAge - gameState.age;
        gameState.age = calculatedAge;
        updateBalance(1000 * yearsPassed, "Doğum Günü Bonusu 🎂", true);
        notify(`Doğum Günün Kutlu Olsun! Adaya ayak basışının yıl dönümü ve sen ${gameState.age} yaşına bastın! Hükümetten sana ${1000 * yearsPassed} 🪙 hediye!`, "success");
    }

    if(yearChanged) {
        notify(`🎇 Şehir ${serverTime.year}. senesine girdi! Yeni Yıl Kutlu Olsun!`, "info");
    }

    updateTimeUI();
    updateSurvivalUI();
}

function processSurvivalMeal() {
    if(gameState.survival.foodStock > 0) {
        gameState.survival.foodStock--;
        gameState.survival.health = Math.min(100, gameState.survival.health + 2); // Yemek yemek canı +2 fuller
        gameState.survival.starvationDays = 0;
    } else {
        if(gameState.time.phase === 0) gameState.survival.starvationDays++; // Günde 1 kez artsın
        
        if (gameState.survival.starvationDays > 3) {
            gameState.survival.health -= 3; // Her fazda 3, günde toplam 9 erime
            if(gameState.survival.health <= 0 || gameState.survival.starvationDays >= 6) {
                gameState.survival.health = 100;
                gameState.survival.starvationDays = 0;
                let expense = gameState.isStudent ? Math.floor(5000 * 0.7) : 5000;
                updateBalance(-expense, "Acil Müdahale Masrafı (Açlık Krizi)", false);
                notify(`Açlıktan ve zafiyetten bayıldınız! Hastane zorlayıcı işlem yaptı (-${expense} 🪙).`, "error");
            } else if(gameState.survival.health === 25 || gameState.survival.starvationDays === 4) {
                notify("Kritik Açlık Uyarı! Erzak 4 gündür bitik, sağlığın çöküyor.", "error");
            }
        }
    }
    updateSurvivalUI();
}

function onNewMonth() {
    let totalMonths = (gameState.time.year - 1) * 12 + gameState.time.month;
    
    if (gameState.accountAgeMonths === undefined) gameState.accountAgeMonths = 0;
    gameState.accountAgeMonths++;

    // Doğum Günü Bonusu artık Yıl değişiminde (Yeni Yıl) veriliyor.
    
    // Her Ay İşçi Sayaçlarını Arttır
    ['cafe','butik','firin','restoran'].forEach(b => {
        if(gameState.businesses.includes(b) && gameState.hr[b].hasWorker) {
            gameState.hr[b].workedMonths++;
            gameState.hr[b].monthsSinceLastRaise++;
        }
    });

    checkHRDemands();

    if(gameState.jobApplicationCooldown > 0) gameState.jobApplicationCooldown--;

    // Üniversite Eğitimi
    if(gameState.isStudent && !gameState.hasDiploma) {
        if (!gameState.monthlyCompletedAcademicTasks) gameState.monthlyCompletedAcademicTasks = 0;
        if (gameState.monthlyCompletedAcademicTasks >= 30) {
            gameState.universityMonths++;
            notify(`Bu ayki akademik kotayı (${gameState.monthlyCompletedAcademicTasks}/30 Görev) başarıyla tamamladınız! Üniversite eğitiminiz ilerledi: (${gameState.universityMonths}/24 Ay)`, "success");
            if(gameState.universityMonths === 24) {
                notify("Üniversite eğitimini tamamladın! Diplomayı 50.000 🪙 karşılığında Üniversite binasından alabilirsin.", "success");
            }
        } else {
            notify(`Aylık akademik kotayı dolduramadınız (${gameState.monthlyCompletedAcademicTasks}/30 Görev)! Bu ayki eğitiminiz geçersiz sayıldı ve okulunuz 1 ay uzadı.`, "error");
        }
    }

    if(totalMonths === 6 && gameState.time.day === 1) {
        openAuctionSystem();
        notify("Kafe ve Butik Sektörleri (ve Tedarikçileri) ihaleye (Özelleştirmeye) çıkıyor!", "success");
    }

    if(totalMonths === 13 && gameState.time.day === 1) {
        openAuctionSystem();
        notify("Fırın ve Restoran ihaleleri açıldı.", "info");
    }

    // Otel fiyatı hesap yaşına göre güncellenir
    gameState.hotelPrice = (gameState.accountAgeMonths >= 12) ? 8000 : 1000;

    // ÜST DÜZEY YÖNETİM KURULU DEĞİŞİMİ (Her 24 Ayda Bir)
    if(totalMonths > 0 && totalMonths % 24 === 0 && gameState.time.day === 1) {
        gameState.highLevelManagerCount = Math.floor(Math.random() * (15 - 12 + 1) + 12);
        
        if(gameState.jobType === 'high-level') {
            gameState.jobType = null;
            gameState.employedMonths = 0;
            addCareerLog("2 Yıllık Yönetim Kurulu süreniz doldu ve kurul dağıtıldı.");
            notify("Dikkat! 17 Kişilik Üst Düzey Yönetici Kadrosu 2 yıllık görev süresini doldurduğu için DEĞİŞTİRİLDİ. Göreviniz sona erdi, yeniden başvurmalısınız.", "error");
            document.getElementById('job-resign').style.display = 'none';
        } else {
            notify("Ada Gündemi: 17 Kişilik Üst Düzey Yönetim Kadrosu 2 yıllık görev süresini doldurduğu için YENİLENDİ.", "info");
        }
        updateUI();
    }

    // İŞTEN KOVULMA SÜRECİ (30. AY - OYUNCUNUN KENDİ YAŞI)
    if(gameState.accountAgeMonths === 31 && gameState.time.day === 1) {
        if(!gameState.hasDiploma && gameState.jobType === 'asgari') {
            gameState.jobType = null;
            notify("Kritik Karar: DİPLOMASIZ ÇALIŞANLARIN DEVLET İŞİNDEN ATILMA VAKTİ GELDİ! İşten kovuldunuz.", "error");
        }
    }

    processSalariesAndTaxes();
    processBankAccounts();
    
    if(gameState.housing === 'hotel') {
        let actualHotelPrice = gameState.isStudent ? Math.floor(gameState.hotelPrice * 0.7) : gameState.hotelPrice;
        updateBalance(-actualHotelPrice, 'Otel Barınma Masrafı', false);
    }
    else if(gameState.housing === 'rented') {
        let rent = gameState.isStudent ? Math.floor(7500 * 0.7) : 7500;
        updateBalance(-rent, 'Emlak Ev Kirası', false);
    }

    gameState.checkupMonths++;
    if(gameState.checkupMonths >= 3) notify("Hastaneye Check-up'a gitmelisiniz! Gecikirse canınız azalır.", "error");
    
    if(gameState.jobType || gameState.businesses.length > 0) {
        gameState.experience++;
        gameState.employedMonths++;
    }

    // --- AYLIK FİNANS VE BORSA GRAFİĞİ GÜNCELLEMESİ ---
    let labelMonth = `${gameState.time.year}.Y ${gameState.time.month}.A`;
    
    // 1) Kişisel Finans Geçmişini Kaydet
    gameState.financeHistory.labels.push(labelMonth);
    gameState.financeHistory.income.push(gameState.currentMonthIncome);
    gameState.financeHistory.expense.push(gameState.currentMonthExpense);
    
    if(gameState.financeHistory.labels.length > 24) {
        gameState.financeHistory.labels.shift();
        gameState.financeHistory.income.shift();
        gameState.financeHistory.expense.shift();
    }
    
    // Gelecek ay için yığınları sıfırla
    gameState.currentMonthIncome = 0;
    gameState.currentMonthExpense = 0;
    if(personalChartInstance) personalChartInstance.update();
    
    // 2) Borsa Performansını Simüle Et
    simulateMarketPerformance(labelMonth);

    updateUI();
}

function getAcademicWeekStatus() {
    if (!gameState.isStudent || gameState.hasDiploma) return null;
    let month = gameState.time.month;
    let day = gameState.time.day;
    let isExamWeek = (day >= 22 && day <= 30) && (month === 3 || month === 6 || month === 9 || month === 12);
    
    if (isExamWeek) {
        if (month === 3) return { type: 'vize', label: '1. Dönem Vize Haftası', title: '1. Dönem Vize' };
        if (month === 6) return { type: 'final', label: '1. Dönem Final Haftası', title: '1. Dönem Final' };
        if (month === 9) return { type: 'vize', label: '2. Dönem Vize Haftası', title: '2. Dönem Vize' };
        if (month === 12) return { type: 'final', label: '2. Dönem Final Haftası', title: '2. Dönem Final' };
    }
    return null;
}

function generateDailyAcademicTasks() {
    if (!gameState.isStudent || gameState.hasDiploma) {
        gameState.activeAcademicTasks = [];
        return;
    }
    
    if (!gameState.activeAcademicTasks) gameState.activeAcademicTasks = [];
    
    let examStatus = getAcademicWeekStatus();
    let targetCount = 3; // Her zaman 3 ders görevi/sınavı aktif bulunsun
    
    let namesRoutine = [
        "Ödev: Mikroekonomi Analizi",
        "Proje: Ekonometrik Modelleme",
        "Ödev: Finansal Raporlama",
        "Ödev: Para Teorisi ve Politikası",
        "Proje: Arz-Talep Grafiği Çizimi",
        "Ödev: Enflasyon Tahmini",
        "Proje: Portföy Optimizasyonu",
        "Ödev: Kamu Maliyesi Analizi",
        "Ödev: Uluslararası İktisat Teorisi",
        "Ödev: Merkez Bankası Kararları",
        "Proje: Oyun Teorisi Analizi",
        "Ödev: Davranışsal İktisat"
    ];
    
    let namesExam = [];
    if (examStatus) {
        if (examStatus.type === 'vize') {
            namesExam = [
                "SINAV: Mikroiktisat Vizesi",
                "SINAV: Makroiktisat Vizesi",
                "SINAV: İktisadi Düşünceler Tarihi Vizesi",
                "SINAV: Para ve Banka Vizesi"
            ];
        } else {
            namesExam = [
                "SINAV: Mikroiktisat Finali",
                "SINAV: Makroiktisat Finali",
                "SINAV: Ekonometri Finali",
                "SINAV: Finansal İktisat Finali"
            ];
        }
    }
    
    // Aktif sınav haftasına girildiyse eski ödevleri, sınav haftası bittiyse eski sınavları temizle
    gameState.activeAcademicTasks = gameState.activeAcademicTasks.filter(t => {
        let isTaskExam = t.isExam;
        let shouldBeExam = !!examStatus;
        return isTaskExam === shouldBeExam;
    });
    
    // Sayıyı her zaman targetCount (3) seviyesinde tut
    while (gameState.activeAcademicTasks.length < targetCount) {
        let title = examStatus ? namesExam[Math.floor(Math.random() * namesExam.length)] : namesRoutine[Math.floor(Math.random() * namesRoutine.length)];
        let gameTypes = ['supply_demand', 'inflation_fight', 'budget_balance', 'opportunity_cost'];
        let gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
        
        gameState.activeAcademicTasks.push({
            id: 'acad-' + Math.random().toString(36).substr(2, 9),
            title: title,
            isExam: !!examStatus,
            examType: examStatus ? examStatus.type : null,
            gameType: gameType
        });
    }
    
    if (typeof renderAcademicTasks === 'function') renderAcademicTasks();
}

function renderAcademicTasks() {
    const list = document.getElementById('academic-tasks-list');
    if(!list) return;

    if(!gameState.isStudent || gameState.hasDiploma) {
        list.innerHTML = '';
        return;
    }

    if(!gameState.activeAcademicTasks || gameState.activeAcademicTasks.length === 0) {
        list.innerHTML = `<i style="color:var(--clr-text-muted); font-size:0.95rem;">Bugün için bekleyen ders ödevi veya sınavınız yok. Yarın yenileri yüklenecek.</i>`;
        return;
    }

    let html = '';
    gameState.activeAcademicTasks.forEach(t => {
        let isExam = t.isExam;
        let cardColor = isExam ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)';
        let borderClr = isExam ? '#ef4444' : '#10b981';
        let label = isExam ? 'Dönem Sonu Sınav Görevi' : 'Ders Çalışma / Ödev';
        
        let examLabel = isExam ? `<span style="color:var(--clr-danger); font-weight:bold;">[SINAV]</span>` : '';
        
        let typeInfo = '';
        if (t.gameType === 'supply_demand') typeInfo = 'Ekonomi: Arz-Talep Dengesi';
        else if (t.gameType === 'inflation_fight') typeInfo = 'Ekonomi: Enflasyonla Mücadele';
        else if (t.gameType === 'budget_balance') typeInfo = 'Ekonomi: Kamu Bütçesi Planlama';
        else if (t.gameType === 'opportunity_cost') typeInfo = 'Ekonomi: Fırsat Maliyeti Optimizasyonu';
        
        html += `
        <div style="background:${cardColor}; border-left:4px solid ${borderClr}; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 8px;">
            <div>
                <div style="font-size:0.75rem; color:${borderClr}; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">${label}</div>
                <strong style="font-size:0.95rem; display:block; margin:2px 0;">${examLabel} ${t.title}</strong>
                <div style="font-size:0.8rem; opacity:0.8; color:var(--clr-text-muted);">${typeInfo}</div>
            </div>
            <button class="${isExam ? 'btn-danger' : 'btn-primary'}" onclick="startAcademicMinigame('${t.id}')" style="padding: 8px 16px; font-size: 0.85rem; height: auto;">${isExam ? 'Sınava Gir' : 'Ders Çalış'}</button>
        </div>
        `;
    });
    list.innerHTML = html;
}

function generateDailyOrders() {
    // Aktif bir işte çalışıyorsa günlük vardiya görevleri gelsin
    if(gameState.jobType !== null) {
        // Eskileri temizle
        gameState.activeOrders = [];
        
        // 20 Görev kuralı için online simülasyonu: Görev sayısını arttır:
        let count = Math.floor(Math.random() * 5) + 21;
        for(let i = 0; i < count; i++) {
            let isCrisis = Math.random() < 0.20; // %20 Kriz vakası
            let type = isCrisis ? 'crisis' : 'routine';
            
            // Kariyer tipine göre görev şemaları belirleniyor:
            let jt = gameState.jobType;
            let namesRoutine = ["Standart Görev"];
            let namesCrisis = ["Genel Sistem Arızası (Tamir Et)"];
            
            if(jt === 'asgari-cafe') {
                namesRoutine = ["Müşteri - Filtre Kahve", "Masaları Sil", "Sıcak Çay Doldur", "Kasa Al", "Tatlı Vitrinini Düzelt"];
                namesCrisis = ["Kahve Makinesi Bozuldu!", "Süt Bitti (Depoya Koş!)", "Müşteri Siparişi Devrildi!"];
            } else if(jt === 'asgari-restoran') {
                namesRoutine = ["Müşteri - Çorba", "Şefin Tabağını Hazırla", "Adisyonu Kapat", "Salatayı Doğra", "Bulaşıkları Makineye At"];
                namesCrisis = ["Mutfakta Yangın Çıktı!", "Ocak Gaz Kaçırıyor!", "Bulaşık Makinesi Su Akıttı!"];
            } else if(jt === 'asgari-firin') {
                namesRoutine = ["Müşteri - Simit", "Poğaçaları Diz", "Ekmek Çıkart", "Hamur Yoğur", "Un Taşı"];
                namesCrisis = ["Fırın Derecesi Bozuldu!", "Hamur Taştı!", "Vitrin Camı Çatladı!"];
            } else if(jt === 'asgari-butik') {
                namesRoutine = ["Müşteri - Manken Giydir", "Kıyafet Katla", "Askıları Düzenle", "Kasa Girişi", "Depodan Beden Çıkar"];
                namesCrisis = ["Kasiyer Cihazı Dondu!", "Alarm Sistemi Çaldı!", "Raflar Devrildi!"];
            } else { // Part-time veya High-level
                namesRoutine = ["Dosyalama Yap", "Rapor Hazırla", "Toplantı Odasını Düzenle", "Mail Yanıtla", "Eksik Hesapları Kapat"];
                namesCrisis = ["Patron Acil İhtiyaç İstiyor!", "Bilgisayar Çöktü!", "Sunucu Bağlantısı Gitti!"];
            }
            
            let source = isCrisis ? namesCrisis : namesRoutine;
            let orderName = source[Math.floor(Math.random() * source.length)];
            let gameTypes = ['timing', 'spam', 'sequence', 'catch', 'memory', 'typing'];
            let gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];

            gameState.activeOrders.push({
                id: Math.random().toString(36).substr(2, 9),
                title: orderName,
                type: type,
                gameType: gameType,
                skillReward: isCrisis ? 3 : 1,
                tipReward: (!isCrisis && Math.random() > 0.5) ? (Math.floor(Math.random() * 200) + 50) : 0 // Sadece rutin ve %50 ihtimal
            });
        }
        
        // Eğer arayüz açıksa siparişleri listele
        if (typeof renderShiftOrders === 'function') renderShiftOrders();
        
        // Kullanıcıya siparişin geldiğini bildir (sadece çok boğmamak için %50 şansla bildirim atalım veya atmayalım)
        if(Math.random() > 0.5) notify("🏪 Vardiyanızda yeni siparişler/krizler var! Lütfen '🏬 Vardiyam' paneline bakın.", "success");
    }
}

function processSalariesAndTaxes() {
    let income = 0; let taxRate = 0; let desc = "";

    if(!gameState.jobType && gameState.businesses.length === 0) {
        if(gameState.joblessMonths < 3) { income = 13000; desc = "İşsizlik Maaşı"; gameState.joblessMonths++; }
        
        if(gameState.isStudent) {
            if (!gameState.monthlyCompletedAcademicTasks) gameState.monthlyCompletedAcademicTasks = 0;
            let missingAcademic = 30 - gameState.monthlyCompletedAcademicTasks;
            let bursaryEarned = 4000;
            if (missingAcademic > 0) {
                let penalty = missingAcademic * 200;
                bursaryEarned = Math.max(0, 4000 - penalty);
                desc += ` + Burs (${bursaryEarned} 🪙, -${penalty} Eksik Görev Cezası)`;
                notify(`Aylık 30 Akademik Görev kotanızı dolduramadınız! Eksik ${missingAcademic} görev için bursunuzdan ${penalty} 🪙 kesildi.`, 'error');
            } else {
                desc += " + Burs (4000 🪙)";
                notify(`Tebrikler! Aylık 30 Akademik Görev kotanızı doldurdunuz ve tam burs aldınız!`, 'success');
            }
            income += bursaryEarned;
        }
    } else {
        gameState.joblessMonths = 0; // Reset unemployment counter while employed
        if(gameState.jobType && gameState.jobType.startsWith('asgari')) { income = 28000; taxRate = 0.10; desc = "Memur Maaşı"; }
        if(gameState.jobType === 'part-time') { income = 14000; taxRate = 0.10; desc = "Öğrenci Part-Time"; }
        if(gameState.jobType === 'high-level') { income = 60000; taxRate = 0.25; desc = "Üst Düzey Yönetici"; }

        if(gameState.isStudent) {
            if (!gameState.monthlyCompletedAcademicTasks) gameState.monthlyCompletedAcademicTasks = 0;
            let missingAcademic = 30 - gameState.monthlyCompletedAcademicTasks;
            let bursaryEarned = 4000;
            if (missingAcademic > 0) {
                let penalty = missingAcademic * 200;
                bursaryEarned = Math.max(0, 4000 - penalty);
                desc += ` + Burs (${bursaryEarned} 🪙, -${penalty} Eksik Görev Cezası)`;
                notify(`Aylık 30 Akademik Görev kotanızı dolduramadınız! Eksik ${missingAcademic} görev için bursunuzdan ${penalty} 🪙 kesildi.`, 'error');
            } else {
                bursaryEarned = 4000;
                desc += " + Burs (4000 🪙)";
                notify(`Tebrikler! Aylık 30 Akademik Görev kotanızı doldurdunuz ve tam burs aldınız!`, 'success');
            }
            income += bursaryEarned;
            taxRate = 0; // ÖĞRENCİDEN VERGİ ALINMAZ
        }
        if(gameState.employedMonths < 5) { income += 5000; desc += " + Teşvik"; }
        
        // AYLIK MAAŞ KESİNTİSİ (Aylık 50 görev kotası)
        if(!gameState.monthlyCompletedTasks) gameState.monthlyCompletedTasks = 0;
        
        if(gameState.jobType && gameState.jobType.startsWith('asgari')) {
            if(gameState.monthlyCompletedTasks < 50) {
                let missing = 50 - gameState.monthlyCompletedTasks;
                let actualPenalty = missing * 500;
                // Ceza tavanı artık eksik görev * 500
                income -= actualPenalty;
                // Eksiye düşmemesi için
                if (income < 0) income = 0;
                desc += ` (-${actualPenalty} Kota Cezası)`;
                notify(`Aylık 50 görev kotanızı dolduramadınız! Eksik ${missing} görev için maaşınızdan ${actualPenalty} 🪙 kesinti yapıldı!`, 'error');
            } else {
                notify(`Tebrikler! Aylık 50 görev kotanızı başarıyla doldurdunuz ve tam maaşa hak kazandınız!`, 'success');
            }
        }
        
        gameState.monthlyCompletedTasks = 0; // Her ay sonu kotayı sıfırla
        gameState.monthlyCompletedAcademicTasks = 0; // Her ay sonu akademik kotayı sıfırla
        gameState.salaryDeductions = 0;
    }

    // AYLIK İŞLETME GİDERLERİ VE TEDARİK ZİNCİRİ HESABI
    if(gameState.businesses.length > 0) {
        let totalBusinessKâr = 0;
        taxRate = 0.15; // Şirket Kurumlar Vergisi
        
        // 1. KAFE
        if(gameState.businesses.includes('cafe')) {
            if(gameState.hr.cafe.hasWorker) {
                updateBalance(-gameState.hr.cafe.salary, "Kafe: Çalışan Maaşı", false);
                let hammadde = 0;
                hammadde += gameState.businesses.includes('kahve') ? 2000 : 15000;
                hammadde += gameState.businesses.includes('su') ? 1000 : 5000;
                hammadde += gameState.businesses.includes('cay') ? 2000 : 10000;
                updateBalance(-hammadde, "Kafe: Toplam Hammadde Masrafı", false);
                totalBusinessKâr += Math.floor(gameState.marketHistory.cafe[gameState.marketHistory.cafe.length - 1] * 280); 
            } else {
                updateBalance(0, "Kafe: İŞÇİSİZ - KÂR YOK", false);
            }
        }
        
        // 2. BUTİK
        if(gameState.businesses.includes('butik')) {
            if(gameState.hr.butik.hasWorker) {
                updateBalance(-gameState.hr.butik.salary, "Butik: Çalışan Maaşı", false);
                let hammadde = gameState.businesses.includes('tekstil') ? 5000 : 20000;
                updateBalance(-hammadde, "Butik: Tekstil Tedarik Gideri", false);
                totalBusinessKâr += Math.floor(gameState.marketHistory.butik[gameState.marketHistory.butik.length - 1] * 250);
            } else {
                updateBalance(0, "Butik: İŞÇİSİZ - KÂR YOK", false);
            }
        }

        // 3. FIRIN
        if(gameState.businesses.includes('firin')) {
            if(gameState.hr.firin.hasWorker) {
                updateBalance(-gameState.hr.firin.salary, "Fırın: Çalışan Maaşı", false);
                let hammadde = 0;
                hammadde += gameState.businesses.includes('un') ? 3000 : 12000;
                hammadde += gameState.businesses.includes('seker') ? 4000 : 14000;
                updateBalance(-hammadde, "Fırın: Un/Şeker Hammadde Masrafı", false);
                totalBusinessKâr += Math.floor(gameState.marketHistory.pastane[gameState.marketHistory.pastane.length - 1] * 320);
            } else {
                updateBalance(0, "Fırın: İŞÇİSİZ - KÂR YOK", false);
            }
        }

        // 4. RESTORAN
        if(gameState.businesses.includes('restoran')) {
            if(gameState.hr.restoran.hasWorker) {
                updateBalance(-gameState.hr.restoran.salary, "Restoran: Çalışan Maaşı", false);
                let hammadde = gameState.businesses.includes('et') ? 10000 : 40000;
                updateBalance(-hammadde, "Restoran: Et Tedarik Masrafı", false);
                totalBusinessKâr += Math.floor(gameState.marketHistory.restoran[gameState.marketHistory.restoran.length - 1] * 350);
            } else {
                updateBalance(0, "Restoran: İŞÇİSİZ - KÂR YOK", false);
            }
        }
        
        if(totalBusinessKâr > 0) { income += totalBusinessKâr; desc += " + İşletmeler Bilanço Kârı"; }
        else { updateBalance(totalBusinessKâr, "İşletmeler Bilanço Zararı", false); } 
    }

    if(income > 0) {
        if(gameState.garnishmentActive) {
            let kesinti = Math.floor(income * 0.75);
            let netIncome = income - kesinti;
            updateBalance(netIncome, desc + ' (%75 Hacizli)', true);
            updateBalance(-kesinti, 'Devlet Haciz Kesintisi', false);
        } else {
            updateBalance(income, desc, true);
            if(taxRate > 0) {
                let tax = Math.floor(income * taxRate);
                updateBalance(-tax, `Devlet Vergisi (%${taxRate*100})`, false);
            }
        }
    }

    // Haciz bitiş kontrolü
    if(gameState.garnishmentActive && gameState.balance >= 0) {
        gameState.garnishmentActive = false;
        notify("Borçlarınızı sıfırladınız! %75 Maaş Haczi kaldırıldı.", "success");
    }
}

function processBankAccounts() {
    // 1. Banka Kredileri (Loans) Taksit Kesimi
    if (gameState.activeLoans && gameState.activeLoans.length > 0) {
        for (let i = gameState.activeLoans.length - 1; i >= 0; i--) {
            let loan = gameState.activeLoans[i];
            updateBalance(-loan.monthlyPayment, "Banka Kredi Taksiti", false);
            loan.remainingMonths--;
            if (loan.remainingMonths <= 0) {
                gameState.activeLoans.splice(i, 1);
                notify("Bir banka kredinizin taksitleri bitti ve borcunuz kapandı!", "success");
            }
        }
    }

    // 2. Vadeli Mevduatlar (Deposits) Getirisi
    if (gameState.activeDeposits && gameState.activeDeposits.length > 0) {
        for (let i = gameState.activeDeposits.length - 1; i >= 0; i--) {
            let dep = gameState.activeDeposits[i];
            dep.remainingMonths--;
            if (dep.remainingMonths <= 0) {
                updateBalance(dep.expectedReturn, "Vadeli Mevduat Faiz Getirisi", true);
                gameState.activeDeposits.splice(i, 1);
                notify(`Vadeli mevduat süreniz doldu! ${dep.expectedReturn.toLocaleString('tr-TR')} 🪙 hesabınıza aktarıldı.`, "success");
            }
        }
    }
}

function simulateMarketPerformance(labelMonth) {
    // Şirketlerin kârı Milyon/Milyar bazlı oynaması (Rastgele varyans)
    let cafeVal = 100 + Math.floor(Math.random() * 80) - 30; // 70 - 150
    let butikVal = 180 + Math.floor(Math.random() * 100) - 50; // 130 - 230
    let pastaneVal = 250 + Math.floor(Math.random() * 150) - 50; // 200 - 400
    let restoranVal = 400 + Math.floor(Math.random() * 250) - 100; // 300 - 550

    if(gameState.time.month % 3 === 0) { pastaneVal -= 40; restoranVal -= 80; } // Dönemsel düşüş
    if(gameState.time.month === 6 || gameState.time.month === 7) cafeVal += 60; // Yaz sezonu
    if(gameState.time.month === 11 || gameState.time.month === 12) butikVal += 50; // Kış sezonu giyim

    gameState.marketHistory.labels.push(labelMonth);
    gameState.marketHistory.cafe.push(cafeVal);
    gameState.marketHistory.butik.push(butikVal);
    gameState.marketHistory.pastane.push(pastaneVal);
    gameState.marketHistory.restoran.push(restoranVal);
    
    if(gameState.marketHistory.labels.length > 24) {
        gameState.marketHistory.labels.shift();
        gameState.marketHistory.cafe.shift();
        gameState.marketHistory.butik.shift();
        gameState.marketHistory.pastane.shift();
        gameState.marketHistory.restoran.shift();
    }
    
    if(marketChartInstance) marketChartInstance.update();
}

function systemSpend(amount, msg) {
    if(gameState.balance >= amount) {
        updateBalance(-amount, msg, false);
        let totalMonths = (gameState.time.year - 1) * 12 + gameState.time.month;
        if(totalMonths > 12) {
            let isEligible = msg.includes('Öğün') || msg.includes('Yemeği') || msg.includes('Hastane') || msg.includes('Klinik') || msg.includes('Erzak');
            if (isEligible) {
                gameState.systemSpendTrack += amount;
                if(gameState.systemSpendTrack >= 10000) {
                    if (gameState.lastGrantMonth !== totalMonths) {
                        gameState.lastGrantMonth = totalMonths;
                        updateBalance(2000, "Hibe (Aylık 10.000'lik Sağlık/Erzak Teşviki)", true);
                    }
                    // Fazla harcamalar sonraki hibe için birikir, ancak ayda sadece 1 kez verilir
                    gameState.systemSpendTrack %= 10000;
                }
            }
        }
        return true;
    } else {
        notify(`${msg} için yeterli bakiye yok!`, 'error');
        return false;
    }
}

function generateAuctionButton(id, title, price, isSupplier) {
    if(gameState.businesses.includes(id)) {
        return `<button class="btn-secondary" disabled style="opacity:0.5; margin-bottom:5px;">✅ Zaten Sizin: ${title}</button>`;
    }
    return `<button class="btn-${isSupplier ? 'secondary' : 'primary'}" style="margin-bottom:5px;" onclick="buyBusiness('${id}', ${price})">${title} (-${(price/1000).toLocaleString('tr-TR')} M/B)</button>`;
}

function openAuctionSystem() {
    const list = document.getElementById('auction-list');
    let html = '';
    let totalMonths = (gameState.time.year - 1) * 12 + gameState.time.month;
    
    if(totalMonths >= 6) {
        html += `<h4 style="margin:5px 0 5px; color:#3b82f6;">☕ KAFE SEKTÖRÜ (6. Ay)</h4>`;
        html += generateAuctionButton('cafe', 'Ada Kafe İşletmesi (Zorunlu İşçi)', 400000, false);
        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:15px; padding:10px; background:rgba(0,0,0,0.2); border-radius:5px;">`;
        html += generateAuctionButton('kahve', 'Ada Kahve Üreticisi', 150000, true);
        html += generateAuctionButton('su', 'Ada Su Üreticisi', 50000, true);
        html += generateAuctionButton('cay', 'Ada Çay Üreticisi', 100000, true);
        html += `</div>`;
        
        html += `<h4 style="margin:5px 0 5px; color:#f59e0b;">🎽 BUTİK SEKTÖRÜ (6. Ay)</h4>`;
        html += generateAuctionButton('butik', 'Ada Butik Mağazası (Zorunlu İşçi)', 500000, false);
        html += `<div style="display:grid; grid-template-columns:1fr; gap:5px; margin-bottom:15px; padding:10px; background:rgba(0,0,0,0.2); border-radius:5px;">`;
        html += generateAuctionButton('tekstil', 'Ada Tekstil Fabrikası', 200000, true);
        html += `</div>`;
    }
    
    if(totalMonths >= 12) {
        html += `<h4 style="margin:5px 0 5px; color:#8b5cf6;">🥐 FIRIN / PASTANE SEKTÖRÜ (12. Ay)</h4>`;
        html += generateAuctionButton('firin', 'Ada Fırın İşletmesi (Zorunlu İşçi)', 800000, false);
        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:15px; padding:10px; background:rgba(0,0,0,0.2); border-radius:5px;">`;
        html += generateAuctionButton('un', 'Ada Un Değirmeni', 250000, true);
        html += generateAuctionButton('seker', 'Ada Şeker Tesisi', 250000, true);
        html += `</div>`;
        
        html += `<h4 style="margin:5px 0 5px; color:#ef4444;">🥩 RESTORAN SEKTÖRÜ (12. Ay)</h4>`;
        html += generateAuctionButton('restoran', 'Ada Restoran Lokantası (2 İşçi)', 1000000, false);
        html += `<div style="display:grid; grid-template-columns:1fr; gap:5px; margin-bottom:15px; padding:10px; background:rgba(0,0,0,0.2); border-radius:5px;">`;
        html += generateAuctionButton('et', 'Ada Et Entegre Tesisi', 400000, true);
        html += `</div>`;
    }
    
    if(html === '') html = `<div style="padding:10px; background:rgba(0,0,0,0.5); border-radius:8px;">İhaleler Henüz Açılmadı...</div>`;
    list.innerHTML = html;
}

function buyBusiness(kind, price) {
    if(gameState.businesses.includes(kind)) return notify("Zaten bu yetkiye sahipsiniz!", "error");
    if(gameState.balance >= price) {
        updateBalance(-price, `İhale Alımı: ${kind.toUpperCase()}`, false);
        gameState.businesses.push(kind);
        
        if(['cafe','butik','firin','restoran'].includes(kind)) {
            gameState.jobType = null; 
            gameState.hr[kind].hasWorker = true;
            gameState.hr[kind].workedMonths = 0;
            gameState.hr[kind].monthsSinceLastRaise = 999;
            gameState.survival.morale = Math.min(100, gameState.survival.morale + 30);
            notify(`Müthiş! Bir ${kind.toUpperCase()} zinciri kurdunuz. İşçi maaşları otomatik kesilecek.`);
            if (typeof renderHRPanel === 'function') renderHRPanel();
        } else {
            notify(`${kind.toUpperCase()} üretim hakkını aldınız. Kalem maliyetiniz min değerlere düştü!`);
        }
        
        openAuctionSystem(); // Ekranı arayüzü yenile
        updateUI();
    } else notify("Kasanızda bu dev şirket için yeterli para yok.", "error");
}

function takeJob(type) {
    if(gameState.businesses.some(b => ['cafe','butik','firin','restoran'].includes(b))) return notify("Siz bir perakende patronsunuz, asgari ücretli devlette memur olamazsınız.", "error");
    let totalMonths = (gameState.time.year - 1) * 12 + gameState.time.month;
    
    if(totalMonths > 30 && type.startsWith('asgari') && !gameState.hasDiploma) return notify("Artık devlet işleri için DİPLOMA şarttır (30 Ay).", "error");
    if(type === 'high-level') {
        if(!gameState.hasDiploma) return notify("Üst düzey yöneticilik için DİPLOMA şarttır.", "error");
        if(totalMonths <= 36) return notify("Oyunun ilk 3 yılı (36 Ay) dolmadan kimse Üst Düzey Yönetici olamaz.", "error");
        if(gameState.experience < 12) return notify("Üst düzey yöneticilik için en az 12 ay (1 yıl) çalışma tecrübesi şarttır.", "error");
        
        if(gameState.jobApplicationCooldown > 0) return notify(`Önceki başvurunuz reddedildiği için ${gameState.jobApplicationCooldown} ay daha beklemelisiniz.`, "error");
        
        if (window.socket) {
            window.socket.emit('submit_cv', { exp: gameState.experience, hasDiploma: gameState.hasDiploma });
            gameState.jobApplicationCooldown = 2; // Başvuru kitlenir (cooldown), ret yediğinde tekrar kalır, onaylandığında kalkar.
            saveGame(true);
        } else {
            notify("Sunucu bağlantısı yok.", "error");
        }
        return;
    }

    if(gameState.isStudent && type !== 'part-time') return notify("Öğrenciyken sadece Part-Time çalışabilirsiniz! Tam zamanlı memuriyet için okulu bitirmelisiniz.", "error");

    gameState.jobType = type;
    gameState.employedMonths = 0;
    
    document.getElementById('job-resign').style.display = 'block';
    
    let jobLabels = {'asgari-cafe':'Ada Kafe İşletmesi', 'asgari-butik':'Ada Butik Mağazası', 'asgari-firin':'Ada Fırın İşletmesi', 'asgari-restoran':'Ada Restoran Lokantası', 'part-time':'Part-Time Öğrenci', 'high-level':'Müdür'};
    notify(`İş ataması yapıldı: ${jobLabels[type] || type}`, "success");
    updateUI();
}

function sendP2PTransfer() {
    let receiver = document.getElementById('loan-receiver').value.trim();
    let amount = parseInt(document.getElementById('p2p-loan-amount').value);
    let term = parseInt(document.getElementById('p2p-loan-term').value);

    if (!receiver || isNaN(amount) || amount <= 0) {
        notify("Lütfen geçerli bir alıcı kullanıcı adı ve miktar girin.", "error");
        return;
    }

    if (window.socket) {
        window.socket.emit('p2p_transfer', { target: receiver, amount: amount, term: term, year: gameState.time.year, month: gameState.time.month });
        document.getElementById('loan-receiver').value = '';
        document.getElementById('p2p-loan-amount').value = '';
    } else {
        notify("Sunucu bağlantısı yok. Transfer yapılamıyor.", "error");
    }
}

function renderLawsuit() {
    const list = document.getElementById('active-debts');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Gelen Borç Talepleri
    let requestsHtml = '<div style="margin-bottom:15px;"><h4 style="color:#a78bfa; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; font-size:0.85rem;">Bana Gelen Borç Talepleri</h4>';
    if (!gameState.debtRequests || gameState.debtRequests.length === 0) {
        requestsHtml += '<div style="color:var(--clr-text-muted); font-size:0.8rem; padding:5px 0;">Gelen aktif borç talebi yok.</div>';
    } else {
        gameState.debtRequests.forEach((req) => {
            requestsHtml += `<div style="padding:8px; background:rgba(255,255,255,0.02); border-left:3px solid #a78bfa; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                <div>
                    <strong>Kimden:</strong> ${req.sender} <br>
                    <strong>Miktar:</strong> ${req.amount.toLocaleString('tr-TR')} 🪙 <br>
                    <strong>Vade:</strong> ${req.term} Ay
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-primary" style="padding:4px 10px; font-size:0.75rem; border-radius:5px; background:var(--clr-success); box-shadow:none;" onclick="acceptDebtRequest('${req.sender}', ${req.amount}, ${req.term})">Borç Ver</button>
                    <button class="btn-danger" style="padding:4px 10px; font-size:0.75rem; border-radius:5px; box-shadow:none;" onclick="rejectDebtRequest('${req.id}')">Reddet</button>
                </div>
            </div>`;
        });
    }
    requestsHtml += '</div>';

    // Verdiğim Borçlar (Alacaklarım)
    let givenHtml = '<div style="margin-bottom:15px;"><h4 style="color:var(--clr-success); margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; font-size:0.85rem;">Verdiğim Borçlar (Alacaklarım)</h4>';
    if (!gameState.debtsGiven || gameState.debtsGiven.length === 0) {
        givenHtml += '<div style="color:var(--clr-text-muted); font-size:0.8rem; padding:5px 0;">Gönderilmiş aktif borcunuz yok.</div>';
    } else {
        gameState.debtsGiven.forEach((debt) => {
            let monthsPassed = ((gameState.time.year - debt.startYear) * 12) + (gameState.time.month - debt.startMonth);
            let isOverdue = monthsPassed >= debt.term;
            let color = isOverdue ? "var(--clr-danger)" : "var(--clr-warning)";
            let status = isOverdue ? "Vadesi Doldu! İcra takibi (dava) başlatabilirsiniz." : `Beklemede (${monthsPassed}/${debt.term} Ay)`;
            
            givenHtml += `<div style="padding:8px; background:rgba(255,255,255,0.02); border-left:3px solid ${color}; margin-bottom:5px; border-radius:4px; font-size:0.8rem;">
                <strong>Kime:</strong> ${debt.target} <br>
                <strong>Miktar:</strong> ${debt.amount.toLocaleString('tr-TR')} 🪙 <br>
                <span style="font-size:0.75rem; color:${color};">${status}</span>
            </div>`;
        });
    }
    givenHtml += '</div>';

    // Aldığım Borçlar (Borçlarım)
    let takenHtml = '<div><h4 style="color:var(--clr-danger); margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; font-size:0.85rem;">Aldığım Borçlar (Borçlarım)</h4>';
    if (!gameState.debtsTaken || gameState.debtsTaken.length === 0) {
        takenHtml += '<div style="color:var(--clr-text-muted); font-size:0.8rem; padding:5px 0;">Aldığınız aktif borç yok.</div>';
    } else {
        gameState.debtsTaken.forEach((debt) => {
            let monthsPassed = ((gameState.time.year - debt.startYear) * 12) + (gameState.time.month - debt.startMonth);
            let isOverdue = monthsPassed >= debt.term;
            let color = isOverdue ? "var(--clr-danger)" : "var(--clr-warning)";
            let status = isOverdue ? "Vadesi Geçti!" : `Kalan Vade: ${debt.term - monthsPassed} Ay`;
            
            takenHtml += `<div style="padding:8px; background:rgba(255,255,255,0.02); border-left:3px solid ${color}; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                <div>
                    <strong>Kimden:</strong> ${debt.creditor} <br>
                    <strong>Miktar:</strong> ${debt.amount.toLocaleString('tr-TR')} 🪙 <br>
                    <span style="font-size:0.75rem; color:${color};">${status}</span>
                </div>
                <button class="btn-primary" style="padding:4px 10px; font-size:0.75rem; border-radius:5px; background:var(--clr-success); box-shadow:none;" onclick="payBackDebt('${debt.creditor}', ${debt.amount})">Öde</button>
            </div>`;
        });
    }
    takenHtml += '</div>';

    list.innerHTML = requestsHtml + givenHtml + takenHtml;
}

function fileLawsuit() {
    let targetUser = document.getElementById('lawsuit-target').value.trim();
    let reason = document.getElementById('lawsuit-reason').value.trim();
    
    if(!targetUser || !reason) {
        notify("Lütfen davalı adını ve dava sebebini doldurun.", "error");
        return;
    }
    
    if(systemSpend(3000, 'Dava Açılış Harcı')) {
        if (window.socket) {
            window.socket.emit('file_p2p_lawsuit', { target: targetUser, reason: reason });
            document.getElementById('lawsuit-target').value = '';
            document.getElementById('lawsuit-reason').value = '';
            notify(`[Adliye] ${targetUser} adlı oyuncuya karşı davanız sunucuya iletildi. Yargıç logları inceliyor...`, "info");
        } else {
            notify("Sunucu bağlantısı yok.", "error");
        }
    }
}

function returnToHotel() {
    if(gameState.housing === 'hotel') return notify('Zaten otelde kalıyorsunuz.', 'error');
    if(gameState.housing === 'owned') {
        updateBalance(750000, "Ev Satışı (Yarı Fiyatı)", true);
        notify("Kendi evinizi yarı fiyatına satıp Otele taşındınız.", "success");
    } else if(gameState.housing === 'rented') {
        notify("Ev kira sözleşmenizi feshedip Otele döndünüz.", "success");
    }
    gameState.housing = 'hotel';
    updateUI();
}



function addCareerLog(msg) {
    let ts = `[${gameState.time.year}.Yıl ${gameState.time.month}.Ay]`;
    gameState.careerHistory.unshift(`${ts} ${msg}`);
}

function updateBalance(num, desc, isIncome) {
    if(!isIncome && gameState.isStudent && num < 0 && desc !== "Emlak Ev Kirası" && desc !== "Otel Barınma Masrafı") {
        // Genel öğrenci indirimleri (kira/otel hariç, onlar özel hesaplanıyor)
        if(["Hastane", "Check-up", "Erzak", "Kariyer"].some(kl => desc.includes(kl) || desc.includes("Müze") || desc.includes("Sinema") || desc.includes("Yemek"))) {
            num = Math.floor(num * 0.7);
            desc += " (%30 Öğrenci)";
        }
    }

    gameState.balance += num;
    addTransaction(isIncome ? 'income' : 'expense', Math.abs(num), desc);
    elm.balanceAmount.textContent = gameState.balance.toLocaleString('tr-TR');
    
    // Grafikler için aylık yığın (Toplanan Para) ve kümülatif toplamlar
    if(isIncome) {
        gameState.currentMonthIncome += Math.abs(num);
        gameState.totalIncome = (gameState.totalIncome || 0) + Math.abs(num);
    } else {
        gameState.currentMonthExpense += Math.abs(num);
        gameState.totalExpense = (gameState.totalExpense || 0) + Math.abs(num);
    }
    
    // ZORUNLU MEVDUAT KURTARMASI
    if(gameState.balance <= -28000 && gameState.activeDeposits.length > 0) {
        let totalDeposit = 0;
        gameState.activeDeposits.forEach(d => totalDeposit += d.amount);
        gameState.activeDeposits = [];
        
        gameState.balance += totalDeposit;
        addTransaction('income', totalDeposit, "Kilitli Mevduat Zorunlu Bozum");
        elm.balanceAmount.textContent = gameState.balance.toLocaleString('tr-TR');
        notify(`Bakiye eksiye düştüğü için devlet mevduat hesabınızdaki ${totalDeposit} 🪙 ana parayı bozup borcunuzu kapattı!`, "error");
    }

    // Kritik İflas Kontrolü
    if(gameState.balance <= -100000 && !gameState.inBankruptcyEvent) {
        gameState.inBankruptcyEvent = true;
        openModal('modal-bankruptcy');
    }
}

function executeBankruptcy(type) {
    const debt = Math.abs(gameState.balance);
    
    if(type === 'hapis') {
        gameState.businesses = [];
        gameState.housing = 'hotel';
        gameState.jobType = null;
        gameState.hasDiploma = false;
        gameState.isStudent = false;
        gameState.universityMonths = 0;
        gameState.activeAcademicTasks = [];
        gameState.monthlyCompletedAcademicTasks = 0;
        gameState.balance = 0;
        notify("Tüm haklarınız elinizden alındı. Sıfırdan bir hayata başlıyorsunuz...", "error");
    } 
    else if(type === 'haciz') {
        let satisGeliri = 0;
        if(gameState.businesses.length > 0) {
            satisGeliri += gameState.businesses.length * 300000;
            gameState.businesses = [];
            notify("Tüm işletme ve tedarik ağınız yarı fiyatına satılıp borcunuzdan düşüldü.", "success");
        }
        if(gameState.housing === 'owned') { satisGeliri += 1200000; gameState.housing = 'hotel'; notify("Eviniz yarı fiyatına satıldı. Otele çıkarıldınız.", "success"); }
        
        if(satisGeliri > 0) {
            updateBalance(satisGeliri, "Varlık Zorunlu Haciz Satışı", true);
        } else {
            notify("Satılacak hiçbir mal varlığınız yok! Devlet asgari ücrete el koyma işlemine hazırlık yapıyor.", "error");
        }
        
        // Satıştan sonra hala borçluysa asgari ücretli yap
        if(gameState.balance < 0) {
            gameState.jobType = 'asgari';
            notify("Borcunuz devam ediyor. Zorunlu kamu hizmetine atandınız.", "error");
        }
    }
    else if(type === 'maas') {
        gameState.garnishmentActive = true;
        notify("Hesabınıza SÜRESİZ MAAŞ HACZİ getirildi. Tüm gelirinizin %75'i devlet tarafından kesilecek.", "error");
    }
    
    closeModal('modal-bankruptcy');
    gameState.inBankruptcyEvent = false;
    updateUI();
}

function submitFeedback() {
    const textEl = document.getElementById('feedback-text');
    const msg = textEl.value.trim();
    if (msg.length < 10) {
        notify("Lütfen daha detaylı bir açıklama yazın (En az 10 karakter).", "error");
        return;
    }
    if (window.socket) {
        window.socket.emit('submit_feedback', { msg: msg });
        // The modal will be closed and text cleared upon success response
    } else {
        notify("Sunucu bağlantısı yok.", "error");
    }
}

function adminDeletePlayer(targetName) {
    if(confirm(`${targetName} adlı oyuncunun hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
        if(window.socket) {
            window.socket.emit('admin_delete_player', { target: targetName });
            setTimeout(() => { window.socket.emit('get_admin_player_data'); }, 500);
        }
    }
}

function addTransaction(type, amount, desc) {
    const dateStr = `${gameState.time.year}.Y ${gameState.time.month}.A ${gameState.time.day}.G ${['(Sabah)', '(Öğle)', '(Akşam)'][gameState.time.phase]}`;
    gameState.transactions.unshift({ type, amount, desc, dateStr });
    if(gameState.transactions.length > 50) gameState.transactions.pop();
}

function updateSurvivalUI() {
    elm.healthValue.textContent = `${gameState.survival.health}%`;
    elm.healthBar.style.width = `${gameState.survival.health}%`;
    
    // UI Renklendirme
    if(gameState.survival.health > 50) elm.healthBar.style.background = 'var(--clr-success)';
    else if(gameState.survival.health > 20) elm.healthBar.style.background = '#fbbf24';
    else elm.healthBar.style.background = 'var(--clr-danger)';

    elm.foodValue.textContent = `${gameState.survival.foodStock} Öğün`;
    let stPct = Math.min(100, (gameState.survival.foodStock / 30) * 100);
    elm.foodBar.style.width = `${stPct}%`;
    
    if (elm.moraleValue && elm.moraleBar) {
        elm.moraleValue.textContent = `${gameState.survival.morale}%`;
        elm.moraleBar.style.width = `${gameState.survival.morale}%`;
        if(gameState.survival.morale > 60) elm.moraleBar.style.background = 'var(--clr-success)';
        else if(gameState.survival.morale > 30) elm.moraleBar.style.background = 'var(--clr-warning)';
        else elm.moraleBar.style.background = 'var(--clr-danger)';
    }
}

function updateUI() {
    if(elm.ageDisplay) elm.ageDisplay.textContent = gameState.age;
    if(elm.balanceAmount) elm.balanceAmount.textContent = Math.floor(gameState.balance).toLocaleString('tr-TR');

    let adminBtn = document.getElementById('btn-admin-panel');
    if(adminBtn) adminBtn.style.display = gameState.isAdmin ? 'flex' : 'none';

    if(gameState.hasDiploma) {
        elm.eduStatus.textContent = "Mezun (Diplomalı)";
    } else if(gameState.isStudent) {
        elm.eduStatus.textContent = `Okuyor (${gameState.universityMonths}/24 Ay)`;
    } else {
        elm.eduStatus.textContent = "Lise";
    }

    elm.jobStatus.textContent = gameState.businesses.length > 0 ? "İş İnsanı" : (gameState.jobType || "İşsiz");
    elm.housingStatus.textContent = gameState.housing === 'hotel' ? `Otel (${gameState.hotelPrice})` : (gameState.housing === 'rented' ? 'Kiralık Ev' : 'Kendi Evi');
    
    // Üniversite UI Güncellemesi
    if(gameState.universityMonths >= 24 && !gameState.hasDiploma) {
        document.getElementById('btn-buy-diploma').style.display = 'block';
        document.getElementById('btn-study-uni').style.display = 'none';
    } else if(gameState.isStudent) {
        document.getElementById('btn-study-uni').textContent = `Eğitim Devam Ediyor (${gameState.universityMonths}/24)`;
        document.getElementById('btn-buy-diploma').style.display = 'none';
        document.getElementById('btn-study-uni').disabled = true;
    } else if(gameState.hasDiploma) {
        document.getElementById('btn-study-uni').style.display = 'none';
        document.getElementById('btn-buy-diploma').style.display = 'none';
    } else {
        document.getElementById('btn-buy-diploma').style.display = 'none';
        document.getElementById('btn-study-uni').style.display = 'block';
        document.getElementById('btn-study-uni').disabled = false;
        document.getElementById('btn-study-uni').textContent = "Ücretsiz Kaydol (Aylık Part-Time Çalışırken Burs Alırsın)";
    }
    
    // Academic Tab ve Bölüm Güncellemeleri
    const tabAcademic = document.getElementById('tab-uni-academic');
    if (tabAcademic) {
        if (gameState.isStudent && !gameState.hasDiploma) {
            tabAcademic.style.display = 'inline-block';
            let completedDisp = document.getElementById('academic-completed-tasks');
            if (completedDisp) completedDisp.textContent = gameState.monthlyCompletedAcademicTasks || 0;
            
            let examStatus = getAcademicWeekStatus();
            let badge = document.getElementById('academic-badge');
            if (badge) {
                if (examStatus) {
                    badge.textContent = examStatus.label;
                    badge.style.background = 'var(--clr-danger)';
                    badge.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                } else {
                    badge.textContent = 'Normal Hafta';
                    badge.style.background = 'var(--clr-primary)';
                    badge.style.boxShadow = 'none';
                }
            }
            if (typeof renderAcademicTasks === 'function') renderAcademicTasks();
        } else {
            tabAcademic.style.display = 'none';
            // Eğer aktif sekme uni-academic ise ve öğrencilik bittiyse info sekmesine geri dön
            if (document.getElementById('uni-academic').classList.contains('active')) {
                document.getElementById('uni-academic').classList.remove('active');
                document.getElementById('uni-info').classList.add('active');
                
                // Tab butonlarını güncelle
                const uniTabs = document.getElementById('modal-uni').querySelectorAll('.tab-btn');
                uniTabs.forEach(t => t.classList.remove('active'));
                uniTabs[0].classList.add('active');
            }
        }
    }
    
    // Kariyer Geçmişi Render Eklemesi
    const chList = document.getElementById('career-history-list');
    if(chList) {
        if(gameState.careerHistory.length === 0) {
            chList.innerHTML = `<i style="color:var(--clr-text-muted);">Henüz bir özgeçmiş kaydı bulunmuyor.</i>`;
        } else {
            chList.innerHTML = gameState.careerHistory.map(log => 
                `<div style="border-bottom:1px solid rgba(255,255,255,0.1); padding:4px 0;">📜 ${log}</div>`
            ).join('');
        }
    }
    // UI Dinamik Fiyat Güncellemeleri (Öğrenci %30 İndirimi yansıtması)
    let f15 = gameState.isStudent ? Math.floor(2500 * 0.7) : 2500;
    let f30 = gameState.isStudent ? Math.floor(5000 * 0.7) : 5000;
    let fRest = gameState.isStudent ? Math.floor(2500 * 0.7) : 2500;
    let otelP = gameState.isStudent ? Math.floor(gameState.hotelPrice * 0.7) : gameState.hotelPrice;

    document.getElementById('btn-buy-food-15').innerHTML = `15 Öğünlük Erzak Paketi (-${f15.toLocaleString('tr-TR')} 🪙)`;
    document.getElementById('btn-buy-food-30').innerHTML = `30 Öğünlük (10 Günlük) Aile Paketi (-${f30.toLocaleString('tr-TR')} 🪙)`;
    document.getElementById('btn-fast-heal').innerHTML = `Restoranda Lüks Şef Yemeği Ye (-${fRest.toLocaleString('tr-TR')} 🪙) <small>[+25% Can + 1 Öğün]</small>`;
    
    document.getElementById('hotel-price').textContent = `${otelP.toLocaleString('tr-TR')} 🪙`;
    let remainingCheckup = Math.max(0, 3 - gameState.checkupMonths);
    document.getElementById('checkup-counter').textContent = remainingCheckup;
    
    // Banka Güncellemeleri
    let totalDebt = gameState.activeLoans.reduce((sum, loan) => sum + (loan.monthlyPayment * loan.remainingMonths), 0);
    document.getElementById('current-debt').textContent = totalDebt.toLocaleString('tr-TR');
    
    let loansHTML = gameState.activeLoans.map(l => `<div style="border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">Taksit: ${l.monthlyPayment.toLocaleString('tr-TR')} 🪙 (Kalan: ${l.remainingMonths} Ay)</div>`).join('');
    document.getElementById('active-loans-list').innerHTML = loansHTML || 'Krediniz Bulunmamaktadır.';

    let totalDeposit = gameState.activeDeposits.reduce((sum, dep) => sum + dep.amount, 0);
    document.getElementById('current-deposit').textContent = totalDeposit.toLocaleString('tr-TR');

    let depositsHTML = gameState.activeDeposits.map(d => `<div style="border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">Yatan: ${d.amount.toLocaleString('tr-TR')} 🪙 | Gelecek: ${d.expectedReturn.toLocaleString('tr-TR')} 🪙 (Kalan: ${d.remainingMonths} Ay)</div>`).join('');
    document.getElementById('active-deposits-list').innerHTML = depositsHTML || 'Mevduatınız Bulunmamaktadır.';


    elm.transactions.innerHTML = '';
    gameState.transactions.forEach(t => {
        elm.transactions.innerHTML += `<div class="transaction-item ${t.type}"><div class="info"><strong>${t.desc}</strong><small>${t.dateStr}</small></div><div class="amount">${t.amount.toLocaleString('tr-TR')}</div></div>`;
    });
    
    let totInc = gameState.totalIncome || 0;
    let totExp = gameState.totalExpense || 0;
    document.getElementById('financial-flow').textContent = `Toplam Gider: ${totExp.toLocaleString('tr-TR')} 🪙 | Gelir: ${totInc.toLocaleString('tr-TR')} 🪙`;
    
    // Bildirim okunmamış sayısı badge güncellemesi
    const badge = document.getElementById('unread-count');
    if (badge) {
        if (gameState.unreadNotifications > 0) {
            badge.textContent = gameState.unreadNotifications;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Aktif borçları ve alacakları listele
    if (typeof renderLawsuit === 'function') {
        renderLawsuit();
    }

    updateTimeUI();
    updateSurvivalUI();
}

function updateTimeUI() {
    const d = String(gameState.time.day).padStart(2, '0');
    const m = String(gameState.time.month).padStart(2, '0');
    const y = String(gameState.time.year).padStart(4, '0');
    if (elm.fullDateDisplay) elm.fullDateDisplay.textContent = `${d}.${m}.${y}`;
    else {
        let fallback = document.getElementById('full-date-display');
        if (fallback) fallback.textContent = `${d}.${m}.${y}`;
    }
    elm.phaseDisplay.textContent = ['🌅 Sabah', '☀️ Öğle', '🌙 Akşam'][gameState.time.phase];
}

function notify(message, type = 'success') {
    const n = document.createElement('div');
    n.className = 'notification glass-card';
    n.style.borderLeftColor = type === 'error' ? 'var(--clr-danger)' : 'var(--clr-success)';
    n.innerHTML = `<span>${type === 'error' ? '❌' : '🔔'}</span> <div>${message}</div>`;
    elm.notifications.appendChild(n);
    setTimeout(() => { n.style.animation = 'fadeOut 0.4s ease forwards'; setTimeout(() => n.remove(), 400); }, 5000);

    // Bildirim Geçmişine ve Okunmamışlara Ekle
    const dateStr = `${gameState.time.year}.Y ${gameState.time.month}.A ${gameState.time.day}.G ${['(Sabah)', '(Öğle)', '(Akşam)'][gameState.time.phase]}`;
    gameState.notificationHistory.unshift({ message, type, dateStr });
    if(gameState.notificationHistory.length > 30) gameState.notificationHistory.pop();
    
    gameState.unreadNotifications++;
    const badge = document.getElementById('unread-count');
    if(badge) {
        badge.textContent = gameState.unreadNotifications;
        badge.style.display = 'flex';
        badge.classList.remove('pulse-minus');
        void badge.offsetWidth; // trigger reflow
        badge.classList.add('pulse-minus');
    }
}

function openHistoryModal() {
    gameState.unreadNotifications = 0;
    const badge = document.getElementById('unread-count');
    if(badge) badge.style.display = 'none';
    
    const list = document.getElementById('notification-history-list');
    list.innerHTML = '';
    
    if(gameState.notificationHistory.length === 0) {
        list.innerHTML = '<div style="padding:10px; background:rgba(0,0,0,0.5); border-radius:8px;">Henüz bildirim bulunmamaktadır...</div>';
    } else {
        gameState.notificationHistory.forEach(n => {
            const color = n.type === 'error' ? 'var(--clr-danger)' : 'var(--clr-success)';
            const icon = n.type === 'error' ? '❌' : '🔔';
            list.innerHTML += `<div style="padding:10px; background:rgba(0,0,0,0.3); border-left:4px solid ${color}; border-radius:8px; display:flex; gap:10px; align-items:start;">
                <div>${icon}</div>
                <div><div style="font-size:0.75rem; color:var(--clr-text-muted); margin-bottom:4px;">${n.dateStr}</div><div style="font-size:0.9rem;">${n.message}</div></div>
            </div>`;
        });
    }
    openModal('modal-history');
}

async function chatSimulate() {
    const inputEl = document.getElementById('chat-input');
    let w = inputEl.value.trim();
    if(!w) return;
    
    const chatBody = document.getElementById('chat-body');
    chatBody.insertAdjacentHTML('beforeend', `<div class="chat-message user">${w}</div>`);
    inputEl.value = '';
    chatBody.scrollTop = 9999;
    
    // Yazıyor... (Typing Indicator) Ekle
    const typingId = "typing-" + Date.now();
    chatBody.innerHTML += `
        <div id="${typingId}" class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatBody.scrollTop = 9999;
    
    // Gelişmiş NLP Niyet Analizi ve Yaratıcı Cevap Üretimi
    setTimeout(async () => {
        let lw = w.toLowerCase();
        let r = "";
        
        // 1. Canlı Bağlam Okuma (Context Awareness)
        if(lw.includes('durum') || lw.includes('nasıls') || lw.includes('param') || lw.includes('bakiye') || lw.includes('analiz') || lw.includes('ne kadar')) {
            r = `<b>📊 [Yapay Zeka Canlı Okuma Modülü]</b><br>Şu an oyunda <b>${gameState.age} yaşındasınız.</b> Banka Defterine göre Güncel Bakiyeniz: <b>${Math.floor(gameState.balance).toLocaleString("tr-TR")} 🪙</b>.<br><br>`;
            
            if(gameState.balance < 0) r += `<span style="color:#ef4444;">🚨 Ciddi bir borç krizindesiniz! Bakiyeniz ekside, bu durum her gün psikoloji barınızı (Moral) çökertecek.</span><br>`;
            else if(gameState.balance < 15000) r += `<span style="color:#f59e0b;">⚠️ Maddi durumunuz pek parlak sayılmaz. Harcamalarınızı kısmanızı öneririm.</span><br>`;
            else r += `<span style="color:#10b981;">✅ Finansal durumunuz stabil gözüküyor. Sermayenizi korumaya devam edin.</span><br>`;
            
            if(gameState.survival.health < 40) r += `<br>⚠️ Sağlığınız kritik seviyede (%${gameState.survival.health}). Acilen hastaneye veya kaliteli bir restorana gitmelisiniz!<br>`;
            if(gameState.survival.foodStock < 3) r += `⚠️ Kilerinizde sadece <b>${gameState.survival.foodStock} öğün</b> yiyecek kalmış. Aç kalırsanız bedelini ağır ödersiniz.<br>`;
            
            if(gameState.jobType) r += `<br>Kariyer/Meslek Durumu: Mevcut işinizde yoruluyor lakin mesleki yetenek (${gameState.jobSkill}) kazanıyorsunuz.`;
            else if(gameState.businesses.length>0) r += `<br>Kariyer/Meslek Durumu: İş insanısınız. Aylık personel maaşınızı ödemeyi unutmayın.`;
            else r += `<br>Kariyer/Meslek Durumu: Şu an İŞSİZ statüsündesiniz.`;
        }
        else if (lw.includes('yemek') || lw.includes('açlık') || lw.includes('erzak')) {
            r = "<b>Açlık ve Erzak Sistemi:</b><br>- Günde 3 öğün tüketilmesi zorunludur. Market üzerinden erzak paketi temin edilmelidir.<br>- 3 günden fazla devam eden iflah olmaz açlıkta, zorunlu tıbbi müdahale uygulanır ve adınıza devasa bir can kurtarma faturası (-5.000 🪙) kesilir.";
        } else if (lw.includes('ev') || lw.includes('araba') || lw.includes('emlak') || lw.includes('kira') || lw.includes('otel')) {
            r = "<b>Barınma ve Emlak Piyasası:</b><br>- İlk 1 yıl boyunca aylık otel ücreti sadece 1.000 🪙 tutarındadır. Lakin 12. ay dolduğu an gece yarısı otel kirası inanılmaz bir enflasyon şoku yiyerek aylık 8.000 🪙'ye yükselir.";
        } else if (lw.includes('kariyer') || lw.includes('iş ') || lw.includes('işe') || lw.includes('meslek') || lw.includes('çalış')) {
            r = "<b>Kariyer ve İş Sistemi:</b><br>- Hayatta kalmak için Kariyer Merkezi'nden (🏢) hemen işe girmelisiniz. <b>Kafe, Fırın, Restoran</b> gibi yerlerde işçi olabilirsiniz.<br>- İlerleyen yıllarda şirketinizi kurup Patron olabilir veya 24 Aylık Üniversiteyi bitirip 17 kişilik <b>'Üst Düzey Yönetici'</b> kotasına CV göndererek şansınızı deneyebilirsiniz.";
        } else if (lw.includes('maaş') || lw.includes('asgari') || lw.includes('askari') || lw.includes('kota') || lw.includes('mesai')) {
            r = "<b>Asgari Ücret ve Kota Sistemi:</b><br>- Asgari maaşları (28.000 🪙) hak edebilmek için her ay (gerçekte 1 gün) en az <b>50 Görev Kotası (Müşteri)</b> tamamlanmalıdır.<br>- Eksik bırakılan her bir görev kotası için ay sonunda otomatik -500 🪙 maaş kesintisi uygulanır.";
        } else if (lw.includes('yorgunluk') || lw.includes('fiziksel') || lw.includes('can') || lw.includes('sağlık')) {
            r = "<b>Fiziksel Yorgunluk ve Sağlık:</b><br>- Vardiyadaki görevlerinizi çözerken harcadığınız yoğun efor, size her defasında <b>-2 Sağlık (Can) ve -1 Moral Puanı</b> kaybettirir. Dinlenmeniz şarttır.";
        } else if (lw.includes('okul') || lw.includes('üniversite') || lw.includes('diploma') || lw.includes('öğrenci')) {
            r = "<b>Akademik Gelişim Merkezi:</b><br>- Öğrencilikte sağlık, market ve otel harcamalarında devlet %30 indirim tanımlar. Mezuniyet harcı 50.000 🪙'dir ve 2 yıl sürer.";
        } else if (lw.includes('iflas') || lw.includes('borç') || lw.includes('kritik') || lw.includes('kırmızı')) {
            r = "<b>Kritik İflas ve Mahşer Günü:</b><br>- Borç limitleriniz <b>-100.000 🪙</b> barajını aştığı anda oyun kilitlenir ve Kırmızı Kapanmaz bir İflas Ekranıyla yüzleşirsiniz. Hapis veya %75 ağır haciz seçmek zorunda kalırsınız.";
        } else if (lw.includes('arkadaş') || lw.includes('sosyal') || lw.includes('dm') || lw.includes('mekanlar') || lw.includes('ağ') || lw.includes('check')) {
             r = "<b>Şehir Mekanları, Sosyal Ağ ve Arkadaşlık:</b><br>- Şehirdeki mekanlara girdiğinizde içerideki patronları ve diğer lobi müşterilerini görebilir, ➕ butonuna tıklayarak arkadaşlık isteği atabilirsiniz. Sonrasında onlarla DM atışabilirsiniz.";
        } else if (lw.includes('yönetici') || lw.includes('müdür') || lw.includes('cv') || lw.includes('17')) {
            r = "<b>17 Kişilik Üst Düzey Yönetici Zirvesi:</b><br>- Adada sadece <b>Maksimum 17 Yönetici</b> olabilir (Kota).<br>- Yöneticiliği kapanlar bile sonsuza dek rahat edemezler. <b>17 kişilik dev kadro, her 2 Yılda Bir (24 Ayda) topluca şutlanır</b> ve yepyeni seçimler yapılarak koltuklar sıfırlanır!";
        } else if (lw.includes('borsa') || lw.includes('ihale') || lw.includes('şirket') || lw.includes('patron')) {
            r = "<b>Şirketler ve Vergi:</b><br>- Şirket ihalelerine katılabilirsiniz. Kendi mekanınıza dinlenmeye giderseniz <b>%40 Kurum VIP İndirimiyle</b> cebiniz korumaya alınır.";
        } else if (lw.includes('moral') || lw.includes('psikoloji') || lw.includes('depresyon')) {
             r = "<b>Moral Modülü:</b><br>- Psikolojiniz 0 seviyesini görürse devlet ağır bir <b>Klinik Terapi Masrafını (5.000 🪙)</b> hesabınızdan çat diye çeker!";
        } else {
             r = "<b>Pseudo-GPT Sistemi:</b><br>Kurduğunuz bu karmaşık cümlede aradığım niyet ağını (intent) bulamadım. Lütfen <i>kariyer, meslek, ev, maaş, şirket, görev, arkadaşlık, durumum ne, sağlık</i> gibi anahtar kelimelerden bahsediniz.";
        }

        // Typing Effect Uygula
        const tInd = document.getElementById(typingId);
        if(tInd) tInd.remove();
        
        let msgId = "msg-" + Date.now();
        chatBody.insertAdjacentHTML('beforeend', `<div id="${msgId}" class="chat-message bot" style="min-height:24px;"></div>`);
        const msgDiv = document.getElementById(msgId);
        
        // Simüle Edilmiş Markdown Parser (HTML içeren stringleri bozmamak için direkt split yazılmaz lakin basitleştirilmiş bir innerHTML interval kuracağız.)
        // Normal text typing:
        let buffer = "";
        let isTag = false;
        let index = 0;
        
        function typeNext() {
            if (index < r.length) {
                if (r.charAt(index) === '<') {
                    // Hata: Tarayıcı yarım HTML etiketlerini (<b, <span vs.) kendisi kapatmaya çalışıp kayma yapar.
                    // Çözüm: Tüm etiketi (tag) bekletmeden tek seferde çekip string'e ekle.
                    let tag = "";
                    while (index < r.length && r.charAt(index) !== '>') {
                        tag += r.charAt(index);
                        index++;
                    }
                    tag += '>'; // Kapanış (>) dahil et
                    index++;
                    buffer += tag;
                    
                    msgDiv.innerHTML = buffer + (index < r.length ? "<span style='opacity:0.5'>█</span>" : "");
                    setTimeout(typeNext, 0); // Etiketlerde bekleme süresi 0
                } else {
                    buffer += r.charAt(index);
                    index++;
                    msgDiv.innerHTML = buffer + (index < r.length ? "<span style='opacity:0.5'>█</span>" : "");
                    chatBody.scrollTop = 9999;
                    setTimeout(typeNext, Math.random() * 15 + 5);
                }
            } else {
                msgDiv.innerHTML = buffer; // İşlem bitince cursor silinsin
            }
        }
        typeNext();
        
    }, 1200); // Gerçeklik hissi (1.2 saniye düşünsün)
}

const st = document.createElement('style');
st.innerHTML = `@keyframes fadeOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(100%); } }`;
document.head.appendChild(st);

function receiveSocialMessage(sender, msg) {
    if(!gameState.socialMessages) gameState.socialMessages = [];
    gameState.socialMessages.unshift({sender, msg, time: `${gameState.time.day}.G ${['Sabah','Öğle','Akşam'][gameState.time.phase]}`});
    if(gameState.socialMessages.length > 20) gameState.socialMessages.pop();
    
    notify(`Ada Sosyal: @${sender} sana bir mesaj gönderdi!`, "success");
    renderSocialMessages();
}

function renderSocialMessages() {
    // Eski sosyal mesaj sistemi iptal edildi. Yeni DM sistemi (renderDMHistory) kullanılıyor.
    // Bu fonksiyon arayüzdeki DM araçlarını ezmemesi için boş bırakıldı.
}

// --- HR & İNSAN KAYNAKLARI ---
let currentDemandBiz = null;

function addWorkerMessage(kind, msg) {
    if(!gameState.hr[kind].messages) gameState.hr[kind].messages = [];
    gameState.hr[kind].messages.unshift(msg);
    if(gameState.hr[kind].messages.length > 30) gameState.hr[kind].messages.pop();
}

function checkHRDemands() {
    let biz = ['cafe','butik','firin','restoran'].filter(b => gameState.businesses.includes(b) && gameState.hr[b].hasWorker);
    if(biz.length > 0 && Math.random() < 0.15) {
        let chosen = biz[Math.floor(Math.random() * biz.length)];
        
        // İşçi en az 1 yıl çalışmamışsa zam isteyemez
        if(gameState.hr[chosen].workedMonths < 12) return;
        
        // İşçi zaten son 1 yıl içinde zam aldıysa otomatik ret sistemi
        if(gameState.hr[chosen].monthsSinceLastRaise < 12) {
            const names = {cafe: 'Kafe', butik: 'Butik', firin: 'Fırın', restoran: 'Restoran'};
            addWorkerMessage(chosen, "Bu yıl zam aldınız o nedenle zam talep edemezsiniz.");
            notify(`${names[chosen]} işçiniz zam istedi. Ancak talebi reddedildi.`, "success");
            renderHRPanel();
            return;
        }

        triggerHRDemand(chosen);
    }
}

function triggerHRDemand(kind) {
    currentDemandBiz = kind;
    const names = {cafe: 'Kafe', butik: 'Butik', firin: 'Fırın', restoran: 'Restoran'};
    let askAmo = kind === 'restoran' ? 8000 : 4000;
    document.getElementById('hr-demand-text').innerHTML = `Patron, piyasa şartları zor! <strong>${names[kind]}</strong> işletmesindeki çalışanlarınız maaşlarına <strong>+${askAmo.toLocaleString('tr-TR')} 🪙</strong> zam istiyorlar.`;
    
    if(timeInterval) clearInterval(timeInterval);
    openModal('modal-hr-demand');
}

function manualRaise(kind) {
    let askAmo = kind === 'restoran' ? 8000 : 4000;
    gameState.hr[kind].salary += askAmo;
    gameState.hr[kind].monthsSinceLastRaise = 0;
    addWorkerMessage(kind, `Patronunuz zam isteğinizi beklemeden gönüllü zam yaptı! (+${askAmo} 🪙)`);
    notify(`Kendi inisiyatifinizle patron olarak ${kind.toUpperCase()} çalışanlarına zam yaptınız (+${askAmo} 🪙)! Mükemmel bir tablosunuz.`, "success");
    renderHRPanel();
}

function renderHRPanel() {
    const list = document.getElementById('hr-panel');
    if (!list) return;
    
    let html = '';
    const names = {cafe: 'Kafe', butik: 'Butik', firin: 'Fırın', restoran: 'Restoran'};
    
    ['cafe','butik','firin','restoran'].forEach(b => {
        if(gameState.businesses.includes(b)) {
            let hrInfo = gameState.hr[b];
            if(hrInfo.hasWorker) {
                let rAmount = b === 'restoran' ? 8000 : 4000;
                let msgs = hrInfo.messages && hrInfo.messages.length > 0 ? hrInfo.messages.map(m => `<div style="font-size:0.75rem; background:rgba(255,255,255,0.2); padding:4px; border-radius:3px; margin-top:3px;">📩 ${m}</div>`).join('') : '<div style="font-size:0.75rem; opacity:0.6;">Mesaj yok</div>';
                
                html += `<div style="background:var(--clr-success); color:black; padding:10px; border-radius:5px; margin-bottom:5px;">
                    <strong>${names[b]} Yönetimi</strong><br>
                    Durum: Çalışıyor (Üretim Aktif)<br>
                    Güncel Maaş: ${hrInfo.salary.toLocaleString('tr-TR')} 🪙<br>
                    Çalışma: ${hrInfo.workedMonths} Ay<br>
                    <button style="margin-top:5px; margin-bottom:5px; padding:5px; font-weight:bold; background:white; color:black; border:none; border-radius:4px; cursor:pointer;" onclick="manualRaise('${b}')">Gönüllü Zam Yap (+${rAmount} 🪙)</button>
                    <div style="background:rgba(0,0,0,0.4); color:white; padding:6px; border-radius:5px; margin-top:5px; max-height:120px; overflow-y:auto;">
                        <span style="font-size:0.8rem; font-weight:bold;">Çalışan Bildirim Kutusu:</span>
                        ${msgs}
                    </div>
                </div>`;
            } else {
                html += `<div style="background:var(--clr-danger); color:white; padding:10px; border-radius:5px; margin-bottom:5px;">
                    <strong>${names[b]} Yönetimi</strong><br>
                    Durum: İŞÇİSİZ - KÂR YOK!<br>
                    <button style="margin-top:5px; padding:5px; font-weight:bold; background:white; color:black; border:none; border-radius:4px; cursor:pointer;" onclick="hireWorker('${b}')">İşçi Bul (-10.000 🪙 Danışmanlık Ücreti)</button>
                </div>`;
            }
        }
    });
    if(html === '') html = '<i style="color:var(--clr-text-muted);">Henüz perakende işletmeniz bulunmuyor.</i>';
    list.innerHTML = html;
}

function hireWorker(kind) {
    if(systemSpend(10000, `${kind.toUpperCase()} İK/İşe Alım Gideri`)) {
        gameState.hr[kind].hasWorker = true;
        gameState.hr[kind].salary = kind === 'restoran' ? 56000 : 28000;
        gameState.hr[kind].workedMonths = 0;
        gameState.hr[kind].monthsSinceLastRaise = 999;
        notify(`${kind.toUpperCase()} işletmeniz için işçi bulundu! Üretim başladı.`, "success");
        renderHRPanel();
    }
}

function renderShiftOrders() {
    const list = document.getElementById('shift-orders-list');
    if(!list) return;

    let skillDisp = document.getElementById('job-skill-display');
    if(skillDisp) skillDisp.textContent = gameState.jobSkill;
    
    let quotaDisp = document.getElementById('monthly-quota-display');
    if(quotaDisp) quotaDisp.textContent = gameState.monthlyCompletedTasks || 0;

    if(!gameState.jobType) {
        list.innerHTML = `<i style="color:var(--clr-danger);">Herhangi bir Kariyer/Mesaili işiniz olmadığı için Vardiya çalışmıyorsunuz! Önce bir iş bulun.</i>`;
        return;
    }

    if(gameState.activeOrders.length === 0) {
        list.innerHTML = `<i style="color:var(--clr-text-muted);">Şu an aktif sipariş veya kriz yok. Gün içi vardiyanızda rastgele çıkacak.</i>`;
        return;
    }

    let html = '';
    let totalMonths = (gameState.time.year - 1) * 12 + gameState.time.month;
    
    gameState.activeOrders.forEach(o => {
        let isRealPlayer = totalMonths > 30 && Math.random() < 0.50; // 30. aydan sonra online hissi
        let cardColor = isRealPlayer ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'; 
        let borderClr = isRealPlayer ? '#f59e0b' : '#3b82f6';
        let label = isRealPlayer ? 'Talebi (Altın Müşteri - Online)' : 'Talebi (Sistem Müşterisi)';
        
        let crisisLabel = o.type === 'crisis' ? `<span style="color:var(--clr-danger); font-weight:bold;">[KRİZ]</span>` : '';
        
        html += `
        <div style="background:${cardColor}; border-left:4px solid ${borderClr}; padding:10px; border-radius:5px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-size:0.8rem; color:${borderClr};">${label}</div>
                <strong>${crisisLabel} ${o.title}</strong>
                <div style="font-size:0.8rem; opacity:0.8;">Ödül: +${o.skillReward} Yetenek, ${o.tipReward} 🪙 Bahşiş</div>
            </div>
            <button class="${o.type === 'crisis' ? 'btn-danger' : 'btn-primary'}" onclick="startMinigame('${o.id}')">Hemen Yap</button>
        </div>
        `;
    });
    list.innerHTML = html;
}

// --- MİNİ OYUN (Mesai / Kriz Yönetimi) ---
let minigameActive = false;
let currentMGOrder = null;

window.startAcademicMinigame = function(taskId) {
    let taskIndex = gameState.activeAcademicTasks.findIndex(t => t.id === taskId);
    if(taskIndex === -1) return;
    
    let task = gameState.activeAcademicTasks[taskIndex];
    currentMGOrder = { ...task, isAcademic: true };
    minigameActive = true;
    let gameWon = false;
    
    const ui = document.getElementById('minigame-area');
    document.getElementById('mg-title').textContent = task.isExam ? "Akademik Sınav Veriyorsunuz!" : "Akademik Görev Çalışılıyor...";
    
    const container = document.getElementById('mg-dynamic-container');
    if (!container) return;
    
    container.innerHTML = '';
    ui.style.display = 'flex';

    if(task.gameType === 'supply_demand') {
        let targetPrice = Math.floor(Math.random() * 50) + 25; // 25-75 arası denge fiyatı
        let playerPrice = Math.random() > 0.5 ? 10 : 90;
        let margin = task.isExam ? 1 : 3;

        function getSDValues(price) {
            let demand = Math.round(Math.max(0, Math.min(100, 100 - (price - targetPrice + 50))));
            let supply = Math.round(Math.max(0, Math.min(100, price - targetPrice + 50)));
            return { demand, supply };
        }

        function updateSDUI() {
            let vals = getSDValues(playerPrice);
            document.getElementById('sd-price').textContent = playerPrice + ' 🪙';
            document.getElementById('sd-demand').textContent = vals.demand + ' adet';
            document.getElementById('sd-supply').textContent = vals.supply + ' adet';
            document.getElementById('sd-demand-bar').style.width = vals.demand + '%';
            document.getElementById('sd-supply-bar').style.width = vals.supply + '%';
            
            let hint = '';
            if (playerPrice > targetPrice + margin) {
                hint = '<span style="color:#ef4444; font-weight:bold;">⚠️ Fiyat çok yüksek! Talep yetersiz, stok birikiyor.</span>';
            } else if (playerPrice < targetPrice - margin) {
                hint = '<span style="color:#ef4444; font-weight:bold;">⚠️ Fiyat çok düşük! Yoğun talep var ancak üretici mal satmıyor.</span>';
            } else {
                hint = '<span style="color:#10b981; font-weight:bold;">Piyasa Dengede! (Dengeyi Kur butonuna basabilirsin) ✅</span>';
            }
            document.getElementById('sd-hint').innerHTML = hint;
        }

        container.innerHTML = `
            <p style="color:white; text-align:center; font-size:0.95rem; margin-bottom:15px; width:100%;">Fiyatı ayarlayarak <strong>Arz (Kırmızı)</strong> ve <strong>Talep (Mavi)</strong> miktarlarını denge fiyatında eşitle!</p>
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; width:100%; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>Ürün Fiyatı:</span>
                    <strong id="sd-price" style="color:var(--clr-warning); font-size:1.2rem;">${playerPrice} 🪙</strong>
                </div>
                
                <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                        <span>📉 Alıcı Talebi:</span>
                        <span id="sd-demand" style="font-weight:bold;"></span>
                    </div>
                    <div style="width:100%; height:15px; background:rgba(255,255,255,0.1); border-radius:8px; overflow:hidden;">
                        <div id="sd-demand-bar" style="height:100%; background:#3b82f6; width:0%;"></div>
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                        <span>📈 Satıcı Arzı:</span>
                        <span id="sd-supply" style="font-weight:bold;"></span>
                    </div>
                    <div style="width:100%; height:15px; background:rgba(255,255,255,0.1); border-radius:8px; overflow:hidden;">
                        <div id="sd-supply-bar" style="height:100%; background:#ef4444; width:0%;"></div>
                    </div>
                </div>
                
                <div id="sd-hint" style="font-size:0.85rem; text-align:center; min-height:20px; margin-top:10px;"></div>
            </div>
            
            <div style="display:flex; gap:15px; width:100%; justify-content:center; margin-bottom:15px;">
                <button id="sd-btn-down" class="btn-secondary" style="padding:10px 20px; font-size:1.1rem; flex:1;">⬇️ Fiyatı Düşür</button>
                <button id="sd-btn-up" class="btn-secondary" style="padding:10px 20px; font-size:1.1rem; flex:1;">⬆️ Fiyatı Artır</button>
            </div>
            
            <button id="sd-btn-submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.1rem; background:var(--clr-success);">Dengeyi Kur</button>
        `;
        
        setTimeout(updateSDUI, 50);
        
        document.getElementById('sd-btn-down').onclick = function() {
            if (playerPrice > 1) { playerPrice -= 1; updateSDUI(); }
        };
        document.getElementById('sd-btn-up').onclick = function() {
            if (playerPrice < 150) { playerPrice += 1; updateSDUI(); }
        };
        document.getElementById('sd-btn-submit').onclick = function() {
            if (Math.abs(playerPrice - targetPrice) <= margin) {
                gameWon = true;
                this.style.background = 'var(--clr-success)';
                this.textContent = 'DENGE SAĞLANDI! UYGULANIYOR...';
                setTimeout(winMinigame, 500);
            } else {
                notify("Hatalı Fiyat! Piyasa henüz dengede değil.", "error");
            }
        };
    }
    else if(task.gameType === 'inflation_fight') {
        let interestRate = 5.0;
        let targetMinInf = task.isExam ? 3.5 : 3.0;
        let targetMaxInf = task.isExam ? 5.5 : 7.0;
        let maxUnemp = task.isExam ? 8.0 : 10.0;

        function getInflationStats(rate) {
            let inf = Math.max(1.5, 18.0 - (rate - 5.0) * 1.3);
            let unemp = Math.max(3.0, 4.0 + (rate - 5.0) * 0.5);
            return { inf: parseFloat(inf.toFixed(1)), unemp: parseFloat(unemp.toFixed(1)) };
        }

        function updateInflationUI() {
            let stats = getInflationStats(interestRate);
            document.getElementById('inf-rate').textContent = interestRate.toFixed(1) + '%';
            document.getElementById('inf-val').textContent = stats.inf + '%';
            document.getElementById('inf-unemp').textContent = stats.unemp + '%';
            
            let infStatus = '';
            if (stats.inf > targetMaxInf) {
                infStatus = '<span style="color:#ef4444; font-weight:bold;">⚠️ Yüksek Enflasyon! (Para Değersizleşiyor)</span>';
            } else if (stats.inf < targetMinInf) {
                infStatus = '<span style="color:#3b82f6; font-weight:bold;">⚠️ Deflasyon Riski! (Ekonomi Durgunlaşıyor)</span>';
            } else {
                infStatus = '<span style="color:#10b981; font-weight:bold;">Enflasyon Hedefte! ✅</span>';
            }
            
            let unempStatus = '';
            if (stats.unemp > maxUnemp) {
                unempStatus = `<span style="color:#ef4444; font-weight:bold;">⚠️ Kritik İşsizlik Oranı! (Maks: %${maxUnemp})</span>`;
            } else {
                unempStatus = 'İşsizlik Oranı Güvenli Bölgede ✅';
            }
            
            document.getElementById('inf-status').innerHTML = `${infStatus}<br>${unempStatus}`;
        }

        container.innerHTML = `
            <p style="color:white; text-align:center; font-size:0.95rem; margin-bottom:15px; width:100%;">Faiz oranını değiştirerek enflasyonu <strong>%${targetMinInf}-%${targetMaxInf}</strong> arasına çek, işsizliği <strong>%${maxUnemp}</strong> altında tut!</p>
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; width:100%; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                    <span>🏛️ Politika Faiz Oranı:</span>
                    <strong id="inf-rate" style="color:var(--clr-warning); font-size:1.2rem;">5.0%</strong>
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>💸 Yıllık Enflasyon Oranı:</span>
                    <strong id="inf-val" style="color:#ef4444; font-size:1.1rem;">18.0%</strong>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span>👥 İşsizlik Oranı:</span>
                    <strong id="inf-unemp" style="color:#3b82f6; font-size:1.1rem;">4.0%</strong>
                </div>
                
                <div id="inf-status" style="font-size:0.85rem; text-align:center; min-height:40px; margin-top:10px; background:rgba(255,255,255,0.05); padding:8px; border-radius:5px; line-height:1.4;"></div>
            </div>
            
            <div style="display:flex; gap:15px; width:100%; justify-content:center; margin-bottom:15px;">
                <button id="inf-btn-down" class="btn-secondary" style="padding:10px 20px; font-size:1.1rem; flex:1;">⬇️ Faizi Düşür (-1%)</button>
                <button id="inf-btn-up" class="btn-secondary" style="padding:10px 20px; font-size:1.1rem; flex:1;">⬆️ Faizi Artır (+1%)</button>
            </div>
            
            <button id="inf-btn-submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.1rem; background:var(--clr-success);">Politikayı Uygula</button>
        `;
        
        setTimeout(updateInflationUI, 50);

        document.getElementById('inf-btn-down').onclick = function() {
            if (interestRate > 0) { interestRate -= 1.0; updateInflationUI(); }
        };
        document.getElementById('inf-btn-up').onclick = function() {
            if (interestRate < 25.0) { interestRate += 1.0; updateInflationUI(); }
        };
        document.getElementById('inf-btn-submit').onclick = function() {
            let stats = getInflationStats(interestRate);
            if (stats.inf >= targetMinInf && stats.inf <= targetMaxInf && stats.unemp <= maxUnemp) {
                gameWon = true;
                this.style.background = 'var(--clr-success)';
                this.textContent = 'POLİTİKA BAŞARILI! YÜRÜRLÜKTE...';
                setTimeout(winMinigame, 500);
            } else {
                if (stats.inf > targetMaxInf) notify("Başarısız: Enflasyon hala çok yüksek! Faizi artırmalısın.", "error");
                else if (stats.inf < targetMinInf) notify("Başarısız: Deflasyon riski oluştu, ekonomi durgun! Faizi düşürmelisin.", "error");
                else if (stats.unemp > maxUnemp) notify(`Başarısız: İşsizlik sınırı aşıldı (%${maxUnemp})! Faizi düşürerek ekonomiyi canlandır.`, "error");
            }
        };
    }
    else if(task.gameType === 'budget_balance') {
        let opList = [
            { id: 0, text: "Gelir Vergisini Artır", budget: 3000, happiness: -15, active: false },
            { id: 1, text: "Lüks Tüketim Vergisi Getir", budget: 2500, happiness: -5, active: false },
            { id: 2, text: "Eğitim Bütçesini Kıs", budget: 1500, happiness: -20, active: false },
            { id: 3, text: "Kamuda Tasarruf Yap", budget: 2000, happiness: -5, active: false },
            { id: 4, text: "Altyapı Yatırımlarını Durdur", budget: 1000, happiness: -10, active: false }
        ];
        let minHapp = task.isExam ? 70 : 60;

        function updateBudgetUI() {
            let currentBudget = -5000;
            let currentHapp = 85;
            
            opList.forEach(o => {
                if (o.active) {
                    currentBudget += o.budget;
                    currentHapp += o.happiness;
                }
            });
            
            document.getElementById('bb-budget').textContent = (currentBudget >= 0 ? '+' : '') + currentBudget.toLocaleString('tr-TR') + ' 🪙';
            document.getElementById('bb-budget').style.color = currentBudget >= 0 ? 'var(--clr-success)' : '#ef4444';
            
            document.getElementById('bb-happ').textContent = currentHapp + '%';
            document.getElementById('bb-happ').style.color = currentHapp >= minHapp ? 'var(--clr-success)' : '#ef4444';
            
            let status = '';
            if (currentBudget < 0) {
                status += '<span style="color:#ef4444; font-weight:bold;">⚠️ Bütçe Açığı Var! Geliri artırmalı veya tasarruf yapmalısın.</span><br>';
            } else {
                status += '<span style="color:#10b981; font-weight:bold;">Bütçe Dengelendi! ✅</span><br>';
            }
            
            if (currentHapp < minHapp) {
                status += `<span style="color:#ef4444; font-weight:bold;">⚠️ Halk Memnuniyeti Çok Düşük! (En az %${minHapp} olmalı)</span>`;
            } else {
                status += 'Halk Memnuniyeti Güvenli Bölgede ✅';
            }
            
            document.getElementById('bb-status').innerHTML = status;
        }

        container.innerHTML = `
            <p style="color:white; text-align:center; font-size:0.95rem; margin-bottom:15px; width:100%;">Bütçe açığını kapat. Halk memnuniyetini <strong>%${minHapp}</strong> üzerinde tutarken bütçeyi pozitife çıkar!</p>
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; width:100%; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>📊 Devlet Bütçe Dengesi:</span>
                    <strong id="bb-budget" style="font-size:1.1rem;">-5.000 🪙</strong>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span>😊 Halk Memnuniyeti (Moral):</span>
                    <strong id="bb-happ" style="font-size:1.1rem;">85%</strong>
                </div>
                
                <div id="bb-status" style="font-size:0.85rem; text-align:center; min-height:40px; margin-top:10px; background:rgba(255,255,255,0.05); padding:8px; border-radius:5px; line-height:1.4;"></div>
            </div>
            
            <div id="bb-options" style="display:flex; flex-direction:column; gap:8px; width:100%; margin-bottom:15px; max-height:220px; overflow-y:auto;">
                ${opList.map(o => `
                    <button id="bb-opt-${o.id}" class="btn-secondary" style="display:flex; justify-content:space-between; align-items:center; text-align:left; padding:10px 15px; font-size:0.85rem; width:100%; border: 1px solid rgba(255,255,255,0.1);">
                        <span>${o.text}</span>
                        <span style="font-size:0.75rem; opacity:0.8; text-align:right;">Bütçe: +${o.budget} | Memnuniyet: ${o.happiness}%</span>
                    </button>
                `).join('')}
            </div>
            
            <button id="bb-btn-submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.1rem; background:var(--clr-success);">Bütçeyi Onayla</button>
        `;
        
        setTimeout(updateBudgetUI, 50);

        opList.forEach(o => {
            document.getElementById(`bb-opt-${o.id}`).onclick = function() {
                o.active = !o.active;
                if(o.active) {
                    this.style.background = 'rgba(59, 130, 246, 0.2)';
                    this.style.borderColor = '#3b82f6';
                } else {
                    this.style.background = 'var(--clr-primary)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
                updateBudgetUI();
            };
        });

        document.getElementById('bb-btn-submit').onclick = function() {
            let currentBudget = -5000;
            let currentHapp = 85;
            opList.forEach(o => {
                if (o.active) {
                    currentBudget += o.budget;
                    currentHapp += o.happiness;
                }
            });

            if (currentBudget >= 0 && currentHapp >= minHapp) {
                gameWon = true;
                this.style.background = 'var(--clr-success)';
                this.textContent = 'KABUL EDİLDİ! ONAYLANDI...';
                setTimeout(winMinigame, 500);
            } else {
                if (currentBudget < 0) notify("Başarısız: Bütçe açığı kapatılamadı!", "error");
                else if (currentHapp < minHapp) notify(`Başarısız: Halk isyanda, memnuniyet %${minHapp} altında!`, "error");
            }
        };
    }
    else if(task.gameType === 'opportunity_cost') {
        let opProj = [
            { id: 0, name: "A: Baraj İnşaatı", cost: 35, profit: 65, selected: false },
            { id: 1, name: "B: Teknoloji Ar-Ge", cost: 45, profit: 85, selected: false },
            { id: 2, name: "C: Turizm Altyapısı", cost: 25, profit: 40, selected: false },
            { id: 3, name: "D: Tarım Desteği", cost: 15, profit: 25, selected: false },
            { id: 4, name: "E: Eğitim Reformu", cost: 10, profit: 15, selected: false }
        ];
        let budgetLimit = 100;
        let targetProfit = task.isExam ? 170 : 150;

        function updateOCUI() {
            let currentCost = 0;
            let currentProfit = 0;
            
            opProj.forEach(p => {
                if (p.selected) {
                    currentCost += p.cost;
                    currentProfit += p.profit;
                }
            });
            
            document.getElementById('oc-cost').textContent = currentCost + ' / ' + budgetLimit;
            document.getElementById('oc-cost').style.color = currentCost <= budgetLimit ? 'var(--clr-success)' : '#ef4444';
            
            document.getElementById('oc-profit').textContent = currentProfit + ' / ' + targetProfit;
            document.getElementById('oc-profit').style.color = currentProfit >= targetProfit ? 'var(--clr-success)' : 'var(--clr-warning)';
            
            let status = '';
            if (currentCost > budgetLimit) {
                status += `<span style="color:#ef4444; font-weight:bold;">⚠️ Bütçe Sınırı Aşıldı! (${currentCost - budgetLimit}M fazla)</span><br>`;
            } else {
                status += 'Bütçe Sınırı Aşılmadı ✅<br>';
            }
            
            if (currentProfit < targetProfit) {
                status += `<span style="color:var(--clr-warning); font-weight:bold;">Hedef Kazanç Sağlanamadı (Gereken: ${targetProfit}M)</span>`;
            } else {
                status += 'Hedef Kazanç Sağlandı ✅';
            }
            
            document.getElementById('oc-status').innerHTML = status;
        }

        container.innerHTML = `
            <p style="color:white; text-align:center; font-size:0.95rem; margin-bottom:15px; width:100%;">Bütçeyi (${budgetLimit}M) aşmadan en yüksek getirili projeleri seçip en az <strong>${targetProfit}M</strong> getiri sağla!</p>
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; width:100%; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>💰 Toplam Yatırım Maliyeti:</span>
                    <strong id="oc-cost" style="font-size:1.1rem;">0 / 100</strong>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span>📈 Beklenen Toplam Getiri:</span>
                    <strong id="oc-profit" style="font-size:1.1rem;">0 / ${targetProfit}</strong>
                </div>
                
                <div id="oc-status" style="font-size:0.85rem; text-align:center; min-height:40px; margin-top:10px; background:rgba(255,255,255,0.05); padding:8px; border-radius:5px; line-height:1.4;"></div>
            </div>
            
            <div id="oc-options" style="display:flex; flex-direction:column; gap:8px; width:100%; margin-bottom:15px; max-height:220px; overflow-y:auto;">
                ${opProj.map(p => `
                    <button id="oc-proj-${p.id}" class="btn-secondary" style="display:flex; justify-content:space-between; align-items:center; text-align:left; padding:10px 15px; font-size:0.85rem; width:100%; border: 1px solid rgba(255,255,255,0.1);">
                        <span>${p.name}</span>
                        <span style="font-size:0.8rem; opacity:0.8;">Maliyet: ${p.cost}M | Getiri: ${p.profit}M</span>
                    </button>
                `).join('')}
            </div>
            
            <button id="oc-btn-submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.1rem; background:var(--clr-success);">Portföyü Onayla</button>
        `;
        
        setTimeout(updateOCUI, 50);

        opProj.forEach(p => {
            document.getElementById(`oc-proj-${p.id}`).onclick = function() {
                p.selected = !p.selected;
                if(p.selected) {
                    this.style.background = 'rgba(59, 130, 246, 0.2)';
                    this.style.borderColor = '#3b82f6';
                } else {
                    this.style.background = 'var(--clr-primary)';
                    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
                updateOCUI();
            };
        });

        document.getElementById('oc-btn-submit').onclick = function() {
            let currentCost = 0;
            let currentProfit = 0;
            opProj.forEach(p => {
                if (p.selected) {
                    currentCost += p.cost;
                    currentProfit += p.profit;
                }
            });

            if (currentCost <= budgetLimit && currentProfit >= targetProfit) {
                gameWon = true;
                this.style.background = 'var(--clr-success)';
                this.textContent = 'YATIRIM BAŞARILI! ONAYLANDI...';
                setTimeout(winMinigame, 500);
            } else {
                if (currentCost > budgetLimit) notify(`Başarısız: Bütçe aşıldı! En fazla ${budgetLimit} harcayabilirsin.`, "error");
                else if (currentProfit < targetProfit) notify(`Başarısız: Getiri hedefi yetersiz! En az ${targetProfit}M getiri gerekir.`, "error");
            }
        };
    }
};

function startMinigame(orderId) {
    let orderIndex = gameState.activeOrders.findIndex(o => o.id === orderId);
    if(orderIndex === -1) return;
    
    currentMGOrder = gameState.activeOrders[orderIndex];
    minigameActive = true;
    let gameWon = false;
    
    const ui = document.getElementById('minigame-area');
    document.getElementById('mg-title').textContent = currentMGOrder.type === 'crisis' ? "Acil Durum Müdahalesi!" : "Siparişi Hazırlıyorsunuz...";
    
    const container = document.getElementById('mg-dynamic-container');
    if (!container) return; // güvenlik
    
    container.innerHTML = '';
    ui.style.display = 'flex';

    if(currentMGOrder.gameType === 'timing') {
        container.innerHTML = `
            <p style="color:white; margin-bottom:15px; font-size:1rem;">Durdur butonuna basarak çubuğu <span style="color:var(--clr-success); font-weight:bold;">YEŞİL</span> bölgede tuttur!</p>
            <div id="timing-bg" style="width:100%; height:30px; background:rgba(255,255,255,0.2); position:relative; overflow:hidden; border-radius:15px; margin-bottom:10px;">
               <div id="timing-target" style="position:absolute; width:20%; height:30px; background:var(--clr-success); left:40%;"></div>
               <div id="timing-cursor" style="position:absolute; width:10px; height:30px; background:white; left:0%;"></div>
            </div>
            <button id="timing-btn" class="btn-primary" style="margin-top:20px; font-size:1.5rem; padding:15px; width:200px;">DURDUR</button>
        `;
        let timingDir = 1; let timingPos = 0; let timingActive = true;
        // FPS'i artırıp (30ms -> 10ms) hızı 3'e böldük, böylece çubuk takılmadan akıcı ilerleyecek.
        let timingSpeed = currentMGOrder.type === 'crisis' ? 1.33 : 0.66;
        let timingTargetPos = Math.random() * 70 + 10;
        document.getElementById('timing-target').style.left = timingTargetPos + '%';
        
        let timingHandle = setInterval(() => {
            if(!minigameActive) { clearInterval(timingHandle); return; }
            if(!timingActive) return; // Döngüyü kırma, sadece duraklat
            timingPos += timingDir * timingSpeed;
            if(timingPos >= 95) { timingPos = 95; timingDir = -1; }
            if(timingPos <= 0) { timingPos = 0; timingDir = 1; }
            document.getElementById('timing-cursor').style.left = timingPos + '%';
        }, 10);
        
        // Timeout iptali için ref referansı
        let timingTimeout = null;
        
        // Geç tepki sorununu çözmek için 'onclick' (tuşu bırakmayı bekler) yerine 
        // 'onpointerdown' (tuşa/ekrana basıldığı ilk milisaniye) kullanıldı.
        document.getElementById('timing-btn').onpointerdown = function(e) {
            e.preventDefault();
            if(!timingActive) return;
            timingActive = false;
            
            // Hedef width %20 olduğu için isabet aralığı [hedef, hedef + 20]
            let isHit = (timingPos >= timingTargetPos && timingPos <= timingTargetPos + 20);
            
            if(isHit) {
                if(gameWon) return; gameWon = true;
                this.style.background = 'var(--clr-success)';
                this.textContent = 'BAŞARILI';
                setTimeout(winMinigame, 500);
            } else {
                this.style.background = 'var(--clr-danger)';
                this.textContent = 'ISKALADIN!';
                if(timingTimeout) clearTimeout(timingTimeout);
                timingTimeout = setTimeout(() => { if(!minigameActive) return; timingPos = 0; timingActive = true; this.style.background = 'var(--clr-primary)'; this.textContent = 'DURDUR'; }, 800);
            }
        };
    }
    else if(currentMGOrder.gameType === 'spam') {
        container.innerHTML = `
            <p style="color:white; margin-bottom:15px; font-size:1rem;">Güç/İlerleme barını tamamen doldurmak için <span style="color:var(--clr-warning); font-weight:bold;">durmadan tıkla!</span></p>
            <div style="width:100%; height:30px; background:rgba(0,0,0,0.5); border-radius:15px; overflow:hidden;">
               <div id="spam-bar" style="width:0%; height:100%; background:var(--clr-warning); transition:width 0.1s;"></div>
            </div>
            <button id="spam-btn" class="btn-primary" style="margin-top:20px; font-size:2rem; width:150px; height:150px; border-radius:50%; transition:transform 0.05s;">POMPALA!</button>
        `;
        let spamVal = 0;
        let spamDecay = currentMGOrder.type === 'crisis' ? 2 : 1;
        let spamStep = 10;
        let spamHandle = setInterval(() => {
           if(!minigameActive) { clearInterval(spamHandle); return; }
           spamVal -= spamDecay;
           if(spamVal < 0) spamVal = 0;
           document.getElementById('spam-bar').style.width = Math.min(100, spamVal) + '%';
        }, 50);
        
        document.getElementById('spam-btn').onclick = function() {
            if (spamVal >= 100 || gameWon) return;
            spamVal += spamStep;
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { if(this) this.style.transform = 'scale(1)'; }, 50);
            if(spamVal >= 100 && !gameWon) {
                gameWon = true;
                clearInterval(spamHandle);
                this.style.background = 'var(--clr-success)';
                this.textContent = 'BİTTİ!';
                document.getElementById('spam-bar').style.background = 'var(--clr-success)';
                setTimeout(winMinigame, 500);
            }
        };
    }
    else if(currentMGOrder.gameType === 'sequence') {
        container.innerHTML = `
            <p style="color:white; margin-bottom:15px; font-size:1rem;">Sayıları olabildiğince hızlı, <span style="color:var(--clr-success); font-weight:bold;">KÜÇÜKTEN BÜYÜĞE</span> sıraya göre tıkla!</p>
            <div id="seq-area" style="position:relative; width:100%; height:250px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:10px;"></div>
        `;
        let seqArea = document.getElementById('seq-area');
        let seqCount = currentMGOrder.type === 'crisis' ? 7 : 5;
        let seqTarget = 1;

        for(let i=1; i<=seqCount; i++) {
           let btn = document.createElement('button');
           btn.className = 'btn-secondary';
           btn.style.position = 'absolute';
           btn.style.width = '55px'; btn.style.height = '55px';
           btn.style.borderRadius = '50%'; btn.style.fontSize = '1.2rem'; btn.style.fontWeight = 'bold';
           btn.style.left = (Math.random() * 80) + '%';
           btn.style.top = (Math.random() * 75) + '%';
           btn.textContent = i;
           btn.onclick = function() {
               if(!minigameActive) return;
               if(i === seqTarget) {
                   this.style.background = 'var(--clr-success)';
                   this.disabled = true;
                   seqTarget++;
                   if(seqTarget > seqCount) {
                       if(gameWon) return; gameWon = true;
                       setTimeout(winMinigame, 500);
                   }
               } else {
                   this.style.background = 'var(--clr-danger)';
                   Array.from(seqArea.children).forEach(c => c.disabled = true);
                   setTimeout(() => {
                       if(!minigameActive) return;
                       Array.from(seqArea.children).forEach(c => { c.style.background='var(--clr-primary)'; c.disabled=false; });
                       seqTarget = 1;
                   }, 500);
               }
           };
           seqArea.appendChild(btn);
        }
    }
    else if(currentMGOrder.gameType === 'catch') {
        let catchReq = currentMGOrder.type === 'crisis' ? 7 : 5;
        let iconsList = ['☕','📄','🥐','🍎','📦'];
        let targetIcon = iconsList[Math.floor(Math.random() * iconsList.length)];
        
        container.innerHTML = `
            <p style="color:white; margin-bottom:15px; font-size:1rem;">Aşağı düşen SADECE <b style="font-size:1.5rem; color:var(--clr-success);">${targetIcon}</b> ikonlarını yakalayın! Yanlış ikonda 1 eksilir! (<span id="catch-score" style="font-weight:bold; color:var(--clr-success)">0</span>/${catchReq})</p>
            <div id="catch-zone" style="position:relative; width:100%; height:250px; background:rgba(0,0,0,0.5); overflow:hidden; border-radius:10px; cursor:crosshair;">
               <div id="catch-basket" style="position:absolute; bottom:15px; left:40%; width:90px; height:15px; background:var(--clr-danger); border-radius:10px; z-index:2; box-shadow:0 0 10px rgba(255,0,0,0.8); pointer-events:none;"></div>
               <div id="catch-overlay" style="position:absolute; width:100%; height:100%; left:0; top:0; z-index:10; touch-action:none;"></div>
            </div>
        `;
        let catchZone = document.getElementById('catch-zone');
        let catchBasket = document.getElementById('catch-basket');
        let catchOverlay = document.getElementById('catch-overlay');
        
        let catchBx = catchZone.clientWidth / 2 - 45;
        let catchScore = 0; 
        let catchItems = [];
        let catchFrames = 0; let catchActive = true;

        const updateBasketPos = (xPos) => {
            catchBx = xPos - 45; // 90px tepsi merkezi
            if(catchBx < 0) catchBx = 0;
            if(catchBx > catchZone.clientWidth - 90) catchBx = catchZone.clientWidth - 90;
            catchBasket.style.left = catchBx + 'px';
        };

        catchOverlay.addEventListener('mousemove', (e) => {
            if(catchActive) updateBasketPos(e.offsetX);
        });
        catchOverlay.addEventListener('touchmove', (e) => {
            if(!catchActive) return;
            e.preventDefault();
            let rect = catchOverlay.getBoundingClientRect();
            updateBasketPos(e.touches[0].clientX - rect.left);
        }, {passive: false});

        const catchLoop = () => {
            if(!minigameActive || !catchActive) return;
            catchFrames++;
            // Sonsuz drop, kazanana kadar gelir
            if(catchFrames % 35 === 0) {
                let el = document.createElement('div');
                let isTarget = Math.random() < 0.4;
                let iconChar = isTarget ? targetIcon : iconsList[Math.floor(Math.random()*iconsList.length)];
                
                el.textContent = iconChar;
                el.style.position = 'absolute';
                el.style.fontSize = '2.2rem';
                el.style.left = (Math.random() * (catchZone.clientWidth - 40)) + 'px';
                el.style.top = '-40px';
                el.style.zIndex = '1';
                catchZone.appendChild(el);
                catchItems.push({el: el, x: parseFloat(el.style.left), y: -40, type: iconChar});
            }
            
            for(let i = catchItems.length-1; i>=0; i--) {
                let it = catchItems[i];
                it.y += currentMGOrder.type === 'crisis' ? 4 : 2.5;
                it.el.style.top = it.y + 'px';
                
                // Tepsi genelde Y ekseninde 220-235 arasındadır
                if(it.y > 195 && it.y < 235) {
                    if(Math.abs((it.x + 18) - (catchBx + 45)) < 65) {
                        if (it.type === targetIcon) {
                            catchScore++;
                            catchBasket.style.background = 'var(--clr-success)';
                            setTimeout(() => { if(!gameWon) catchBasket.style.background = 'var(--clr-danger)'; }, 200);
                        } else {
                            if (catchScore > 0) catchScore--;
                            catchBasket.style.background = 'white';
                            setTimeout(() => { if(!gameWon) catchBasket.style.background = 'var(--clr-danger)'; }, 200);
                        }
                        
                        document.getElementById('catch-score').textContent = catchScore;
                        it.el.remove();
                        catchItems.splice(i, 1);
                        
                        if(catchScore >= catchReq && !gameWon) {
                            gameWon = true;
                            catchActive = false;
                            catchBasket.style.background = 'var(--clr-success)';
                            setTimeout(winMinigame, 500);
                        }
                        continue;
                    }
                }
                if(it.y > 260) {
                    it.el.remove();
                    catchItems.splice(i, 1);
                }
            }
            if(catchActive) requestAnimationFrame(catchLoop);
        };
        requestAnimationFrame(catchLoop);
    }
    else if(currentMGOrder.gameType === 'memory') {
        container.innerHTML = `
            <p style="color:white; margin-bottom:15px; font-size:1rem;">HATA YOK! Kartları çevirerek <span style="color:var(--clr-success); font-weight:bold;">aynı ikilileri eşleştirin:</span></p>
            <div id="memory-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px;"></div>
        `;
        let memSymbols = ['🍎', '🍎', '🍌', '🍌', '🍉', '🍉', '🥥', '🥥'];
        if(currentMGOrder.type === 'crisis') memSymbols = ['🔧', '🔧', '🚨', '🚨', '🚒', '🚒', '🔥', '🔥'];
        memSymbols.sort(() => Math.random() - 0.5);
        
        let memGrid = document.getElementById('memory-grid');
        let memFlipped = [];
        let memMatched = 0;
        
        memSymbols.forEach((sym) => {
            let btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.height = '60px';
            btn.style.fontSize = '2rem';
            btn.style.borderRadius = '8px';
            btn.style.transition = '0.2s';
            btn.textContent = '❓';
            btn.dataset.sym = sym;
            btn.onclick = function() {
                if(!minigameActive || memFlipped.length >= 2 || this.textContent !== '❓') return;
                this.textContent = sym;
                this.style.background = 'white';
                this.style.transform = 'scale(1.05)';
                memFlipped.push(this);
                
                if(memFlipped.length === 2) {
                    if(memFlipped[0].dataset.sym === memFlipped[1].dataset.sym) {
                        memFlipped[0].style.background = 'var(--clr-success)';
                        memFlipped[1].style.background = 'var(--clr-success)';
                        memMatched += 2;
                        memFlipped = [];
                        if(memMatched >= memSymbols.length && !gameWon) {
                            gameWon = true;
                            setTimeout(winMinigame, 500);
                        }
                    } else {
                        setTimeout(() => {
                            if(!minigameActive) return;
                            memFlipped[0].textContent = '❓';
                            memFlipped[0].style.background = 'var(--clr-primary)';
                            memFlipped[0].style.transform = 'scale(1)';
                            memFlipped[1].textContent = '❓';
                            memFlipped[1].style.background = 'var(--clr-primary)';
                            memFlipped[1].style.transform = 'scale(1)';
                            memFlipped = [];
                        }, 700);
                    }
                }
            };
            memGrid.appendChild(btn);
        });
    }
    else if(currentMGOrder.gameType === 'typing') {
        let tpWords = ["RAPOR", "KAHVE", "HESAP", "SERVIS", "MUSTERI", "GUNLUK", "MESAJ"];
        if(currentMGOrder.type === 'crisis') tpWords = ["YANGIN", "BOZUK", "SIKAYET", "ACIL", "KRIZ", "MASRAF"];
        let tpTarget = tpWords[Math.floor(Math.random() * tpWords.length)];
        
        container.innerHTML = `
            <p style="color:white; margin-bottom:10px; font-size:1rem;">Aşağıdaki kelimeyi <span style="color:var(--clr-danger); font-weight:bold;">klavyeden veya kutucuğa</span> hızlıca yazarak görevi tamamla!</p>
            <div style="font-size:2.5rem; letter-spacing:8px; margin:20px 0; color:var(--clr-primary); font-weight:800; text-shadow:0 0 10px rgba(96,165,250,0.8);" id="type-word">${tpTarget}</div>
            <input type="text" id="type-hidden" autocomplete="off" placeholder="Tıkla & Yazmaya Başla..." style="padding:15px; font-size:1.5rem; text-transform:uppercase; width:80%; text-align:center; border-radius:5px; background:rgba(255,255,255,0.1); color:white; border:2px solid rgba(255,255,255,0.2); outline:none;">
        `;
        
        let typeInp = document.getElementById('type-hidden');
        typeInp.focus();
        typeInp.addEventListener('input', function() {
            let val = this.value.toUpperCase();
            this.value = val;
            if(val === tpTarget && !gameWon) {
                gameWon = true;
                document.getElementById('type-word').style.color = 'var(--clr-success)';
                document.getElementById('type-word').style.textShadow = '0 0 10px rgba(16,185,129,0.8)';
                this.style.background = 'rgba(16,185,129,0.2)';
                this.style.borderColor = 'var(--clr-success)';
                this.disabled = true;
                setTimeout(winMinigame, 500);
            } else if(!tpTarget.startsWith(val)) {
                this.value = "";
                this.style.background = 'rgba(239,68,68,0.3)';
                this.style.borderColor = 'var(--clr-danger)';
                setTimeout(()=> {
                    if(this.disabled) return;
                    this.style.background = 'rgba(255,255,255,0.1)';
                    this.style.borderColor = 'rgba(255,255,255,0.2)';
                }, 300);
            }
        });
    }
}

function cancelMinigame() {
    minigameActive = false;
    document.getElementById('minigame-area').style.display = 'none';
}

function winMinigame() {
    if (!minigameActive) return;
    minigameActive = false;
    document.getElementById('minigame-area').style.display = 'none';
    
    if (currentMGOrder && currentMGOrder.isAcademic) {
        if (gameState.monthlyCompletedAcademicTasks === undefined) gameState.monthlyCompletedAcademicTasks = 0;
        gameState.monthlyCompletedAcademicTasks++;
        
        // Zihinsel Yorgunluk: Tamamlanan her akademik görev karakterden -2 Moral ve -0.5 Can götürür.
        gameState.survival.health = Math.max(0, gameState.survival.health - 0.5);
        gameState.survival.morale = Math.max(0, gameState.survival.morale - 2);
        
        notify(`${currentMGOrder.title} başarıyla tamamlandı! Zihinsel Yorgunluk: -2 Moral, -0.5 Can`, "success");
        
        gameState.activeAcademicTasks = gameState.activeAcademicTasks.filter(t => t.id !== currentMGOrder.id);
        
        generateDailyAcademicTasks();
        if (typeof updateSurvivalUI === 'function') updateSurvivalUI();
        if (typeof updateUI === 'function') updateUI();
        saveGame(true);
        return;
    }
    
    gameState.jobSkill += currentMGOrder.skillReward;
    
    // Yorgunluk Mekaniği
    gameState.survival.health = Math.max(0, gameState.survival.health - 1);
    gameState.survival.morale = Math.max(0, gameState.survival.morale - 1);
    
    if(currentMGOrder.tipReward > 0) {
        updateBalance(currentMGOrder.tipReward, "Müşteri Sipariş Bahşişi", true);
    }
    notify(`${currentMGOrder.title} başarıyla tamamlandı! Yorgunluk: -1 Can`, "success");
    
    // NPC mesajları iptal edildi. (Kullanıcı isteğiyle yeni DM sistemi kuruldu)
    
    if (!gameState.monthlyCompletedTasks) gameState.monthlyCompletedTasks = 0;
    gameState.monthlyCompletedTasks++;
    
    gameState.activeOrders = gameState.activeOrders.filter(o => o.id !== currentMGOrder.id);
    renderShiftOrders();
    if(typeof updateSurvivalUI === 'function') updateSurvivalUI();
    saveGame(true);
}

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('btn-hr-accept').onclick = () => {
        if(currentDemandBiz) {
            let askAmo = currentDemandBiz === 'restoran' ? 8000 : 4000;
            gameState.hr[currentDemandBiz].salary += askAmo;
            gameState.hr[currentDemandBiz].monthsSinceLastRaise = 0; // SAYACI SIFIRLA
            addWorkerMessage(currentDemandBiz, "Patronunuz zam isteğinizi kabul etti.");
            notify(`${currentDemandBiz.toUpperCase()} işçilerine zam yapıldı. Mutlu çalışıyorlar!`, "success");
        }
        closeModal('modal-hr-demand');
        currentDemandBiz = null;
        renderHRPanel();
        startGameLoop();
    };

    document.getElementById('btn-hr-reject').onclick = () => {
        if(currentDemandBiz) {
            if(Math.random() < 0.60) {
                gameState.hr[currentDemandBiz].hasWorker = false;
                notify(`REST ÇEKTİNİZ! ${currentDemandBiz.toUpperCase()} işçisi İSTİFA ETTİ! Üretim durdu!`, "error");
            } else {
                addWorkerMessage(currentDemandBiz, "Patronunuz zam isteğinizi kabul etmedi.");
                notify(`REST ÇEKTİNİZ! İşçi mırın kırın etse de çalışmaya devam ediyor. Büyük patronsunuz.`, "success");
            }
        }
        closeModal('modal-hr-demand');
        currentDemandBiz = null;
        renderHRPanel();
        startGameLoop();
    };
});

window.renderAdminPanel = function() {
    const tbody = document.getElementById('admin-players-body');
    const cvList = document.getElementById('admin-cv-list');
    if(!tbody || !cvList) return;
    
    // 1. OYUNCU LİSTESİ TABLO RENDERI (SUNUCUDAN İSTENECEK)
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:10px; color:var(--clr-text-muted);">Sunucudan oyuncu listesi yükleniyor...</td></tr>`;
    if (window.socket) {
        window.socket.emit('get_admin_player_data');
    }

    // 2. CV VE İŞ BAŞVURUSU RENDERI
    cvList.innerHTML = `<div style="padding:10px; color:var(--clr-text-muted);">Sunucudan başvurular yükleniyor...</div>`;
    if (window.socket) {
        window.socket.emit('get_cv_list');
    }
};

window.resolveJobApplication = function(targetUsername, isApproved) {
    if (!window.socket) return notify("Sunucu bağlantısı yok.", "error");
    
    if (isApproved) {
        window.socket.emit('approve_cv', { username: targetUsername });
        notify(`${targetUsername} adlı adayı Müdür olarak işe aldınız.`, "success");
    } else {
        window.socket.emit('reject_cv', { username: targetUsername });
        notify(`${targetUsername} adlı adayın başvurusunu reddettiniz.`, "info");
    }
    
    // Listeyi yenile
    setTimeout(() => {
        window.socket.emit('get_cv_list');
    }, 500);
};

window.adminSendMoney = function(targetName) {
    let amountStr = prompt(`${targetName} adlı oyuncuya gönderilecek (veya kesilecek) para miktarını girin (Örn: Ekleme için 50000, kesinti için -20000):`);
    if (amountStr === null) return;
    let amount = parseInt(amountStr);
    if (isNaN(amount) || amount === 0) {
        notify("Lütfen geçerli bir miktar girin.", "error");
        return;
    }
    if (window.socket) {
        window.socket.emit('admin_edit_balance', { target: targetName, amount: amount });
    }
};

// Hooking modal open to render
const oldOpenModal = window.openModal;
if (oldOpenModal && !oldOpenModal.hasAdminHook) {
    window.openModal = function(id) {
        if(id === 'modal-admin' && window.renderAdminPanel) window.renderAdminPanel();
        if(id === 'modal-uni' && window.socket) window.socket.emit('get_online_players');
        if(id === 'modal-police' && window.renderLawsuitsHistory) window.renderLawsuitsHistory();
        oldOpenModal(id);
    };
    window.openModal.hasAdminHook = true;
}

window.renderLawsuitsHistory = function() {
    const list = document.getElementById('lawsuit-history-list');
    if (!list) return;
    
    list.innerHTML = '';
    let lawsuits = gameState.lawsuits || [];
    
    if (lawsuits.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--clr-text-muted); padding:20px 0;">Dahil olduğunuz herhangi bir dava geçmişi bulunmamaktadır.</div>';
        return;
    }
    
    let html = '';
    let reversedLawsuits = [...lawsuits].reverse();
    
    reversedLawsuits.forEach(law => {
        let typeColor = law.type === 'Hakaret' ? '#f43f5e' : (law.type === 'İcra (Borç)' ? '#f59e0b' : '#3b82f6');
        let outcomeColor = law.outcome.includes('Kazanıldı') ? 'var(--clr-success)' : (law.outcome.includes('Kaybedildi') ? 'var(--clr-danger)' : 'var(--clr-text-muted)');
        
        html += `<div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-left:4px solid ${typeColor}; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:0.75rem; color:var(--clr-text-muted);">${law.dateStr}</span>
                <span style="font-size:0.8rem; font-weight:bold; color:${typeColor}; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${law.type}</span>
            </div>
            <div style="font-size:0.85rem; margin-bottom:6px;">
                <strong>Davacı:</strong> ${law.plaintiff} &nbsp;|&nbsp; <strong>Davalı:</strong> ${law.defendant}
            </div>
            <div style="font-size:0.85rem; color:var(--clr-text-muted); line-height:1.4; margin-bottom:6px;">
                ${law.msg}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px; margin-top:6px;">
                <span>Durum: <strong style="color:${outcomeColor};">${law.outcome}</strong></span>
                ${law.penalty > 0 ? `<span style="font-weight:bold; color:#fbbf24;">${law.penalty.toLocaleString('tr-TR')} 🪙</span>` : ''}
            </div>
        </div>`;
    });
    
    list.innerHTML = html;
};

window.renderUniStudents = function() {
    const list = document.getElementById('uni-students-list');
    if(!list) return;
    let students = [...(window.uniStudentsList || [])];
    if(gameState.isStudent && !students.includes(gameState.username)) students.push(gameState.username);
    
    if(students.length === 0) {
        list.innerHTML = '<i style="color:var(--clr-text-muted);">Şu an üniversitede okuyan kimse yok.</i>';
        return;
    }
    
    let html = '';
    students.forEach(s => {
        let isMe = (s === gameState.username);
        html += `<div style="padding:5px; background:rgba(0,0,0,0.3); border-radius:5px; border-left:3px solid ${isMe ? 'var(--clr-success)' : 'var(--clr-primary)'};">
            ${isMe ? '🎓 Siz' : '🎓 ' + s}
        </div>`;
    });
    list.innerHTML = html;
};

window.renderCityVenues = function() {
    window.currentVisitedVenues = []; // Reset when modal opens
    // Önce sunucudan güncel online listesini iste
    if (window.socket) {
        window.socket.emit('get_online_players');
    } else {
        window.onlinePlayersList = window.systemBotNames;
        renderCityVenuesReal();
    }
};

window.renderCityVenuesReal = function() {
    const list = document.getElementById('city-venues-container');
    if(!list) return;
    
    // Mekanlar ve fiyatları
    const venues = [
        { id: 'cafe', title: 'Ada Kafe', desc: 'Kahve İç & Dinlen', cost: 500, morale: 10, health: 0, icon: '☕', defaultPatron: 'Mert_14', defaultWorker: 'Zeynep_K' },
        { id: 'firin', title: 'Ada Fırın', desc: 'Tatlı Molası', cost: 700, morale: 10, health: 5, icon: '🥐', defaultPatron: 'Kaan01', defaultWorker: 'Esra_M' },
        { id: 'butik', title: 'Ada Butik', desc: 'Alışveriş Terapisi', cost: 1500, morale: 40, health: 0, icon: '🎽', defaultPatron: 'Ada_Star', defaultWorker: 'Berkcan99' },
        { id: 'restoran', title: 'Ada Restoran', desc: 'Lüks Akşam Yemeği', cost: 2000, morale: 15, health: 25, icon: '🥩', defaultPatron: 'Deniz_Kaptan', defaultWorker: 'Borsa_Kurtlari' },
        { id: 'ofis', title: 'Ada Ofis', desc: 'Part-Time Merkezi', cost: 1000, morale: 20, health: 0, icon: '🏢', defaultPatron: 'Sistem_Müdürü', defaultWorker: 'Stajyer_Bot' }
    ];
    
    let html = '';
    let availablePlayers = [...(window.onlinePlayersList || [])];
    
    venues.forEach(v => {
        let isPatron = gameState.businesses.includes(v.id);
        let isWorker = (v.id === 'ofis') ? (gameState.jobType === 'part-time') : (gameState.jobType === ('asgari-' + v.id));
        let finalCost = (isPatron || isWorker) ? Math.floor(v.cost * 0.6) : v.cost;
        let discountMsg = (isPatron || isWorker) ? `<span style="color:var(--clr-success); font-weight:bold; font-size:0.8rem;">(%40 İndirimli)</span>` : '';
        
        let serverPatrons = window.cityVenueData && window.cityVenueData[v.id] && window.cityVenueData[v.id].patrons ? [...window.cityVenueData[v.id].patrons] : [];
        let serverWorkers = window.cityVenueData && window.cityVenueData[v.id] && window.cityVenueData[v.id].workers ? [...window.cityVenueData[v.id].workers] : [];
        
        if (isPatron && !serverPatrons.includes(gameState.username)) serverPatrons.push(gameState.username);
        if (isWorker && !serverWorkers.includes(gameState.username)) serverWorkers.push(gameState.username);

        let patronsList = serverPatrons.map(p => p === gameState.username ? "Siz (Patron)" : p);
        let workersList = serverWorkers.map(w => w === gameState.username ? "Siz (Çalışan)" : w);

        if (patronsList.length === 0) { patronsList.push(v.defaultPatron); serverPatrons.push(v.defaultPatron); }
        if (workersList.length === 0) { workersList.push(v.defaultWorker); serverWorkers.push(v.defaultWorker); }
        
        let numCustomers = Math.floor(Math.random() * 3) + 1; // 1-3 Müşteri
        let customerHtml = '';
        
        if (availablePlayers.length === 0) {
            customerHtml = '<div style="font-size:0.8rem; color:var(--clr-text-muted); padding:5px;">Şu an mekanda başka online oyuncu yok...</div>';
        } else {
            for(let i=0; i<numCustomers; i++) {
                if(availablePlayers.length === 0) break;
                // Rastgele bir oyuncu seç
                let randIdx = Math.floor(Math.random() * availablePlayers.length);
                let pName = availablePlayers.splice(randIdx, 1)[0];
                
                customerHtml += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:4px 8px; border-radius:4px; margin-bottom:2px;">
                    <span>👤 ${pName}</span>
                    <button onclick="sendFriendRequest('${pName}', '${v.id}')" style="background:var(--clr-success); border:none; color:white; border-radius:3px; cursor:pointer;" title="İstek At">➕</button>
                </div>`;
            }
        }

        html += `
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); text-align:center;">
            <div style="font-size:2rem; margin-bottom:5px;">${v.icon}</div>
            <h3 style="margin:5px 0;">${v.title}</h3>
            <p style="font-size:0.85rem; color:var(--clr-text-muted);">${v.desc}</p>
            <p style="font-size:0.8rem; margin:5px 0;">Kazanım: ${v.health>0 ? '+'+Math.floor(v.health)+' Can, ' : ''}+${v.morale} Moral</p>
            
            <details style="margin:10px 0; background:rgba(0,0,0,0.3); border-radius:5px; padding:5px; text-align:left; font-size:0.8rem;">
                <summary style="cursor:pointer; color:var(--clr-primary);">Şu an Mekandakiler ⏷</summary>
                <div style="margin-top:5px;">
                    ${patronsList.map((pName, idx) => {
                        let actualName = serverPatrons[idx];
                        let btn = (actualName !== gameState.username && actualName !== v.defaultPatron) ? `<button onclick="sendFriendRequest('${actualName}', '${v.id}')" style="float:right; background:var(--clr-success); color:white; border:none; border-radius:3px; cursor:pointer;">➕</button>` : '';
                        return `<div style="margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:2px;"><strong>Patron:</strong> ${pName} ${btn}</div>`;
                    }).join('')}
                    ${workersList.map((wName, idx) => {
                        let actualName = serverWorkers[idx];
                        let btn = (actualName !== gameState.username && actualName !== v.defaultWorker) ? `<button onclick="sendFriendRequest('${actualName}', '${v.id}')" style="float:right; background:var(--clr-success); color:white; border:none; border-radius:3px; cursor:pointer;">➕</button>` : '';
                        return `<div style="margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:2px;"><strong>Çalışan:</strong> ${wName} ${btn}</div>`;
                    }).join('')}
                    <div style="margin-top:5px; color:var(--clr-text-muted);">Müşteriler:</div>
                    ${customerHtml}
                </div>
            </details>

            <button class="btn-primary" style="width:100%; margin-top:5px; background:${(isWorker || isPatron) ? 'var(--clr-success)' : 'var(--clr-primary)'}; color:${(isWorker || isPatron) ? 'black' : 'white'};" onclick="visitCityVenue('${v.id}', ${finalCost}, ${v.morale}, ${v.health})">
                Harcama Yap (-${finalCost.toLocaleString('tr-TR')} 🪙) <br>${discountMsg}
            </button>
        </div>`;
    });
    list.innerHTML = html;
};

window.visitCityVenue = function(id, cost, moraleGain, healthGain) {
    if(systemSpend(cost, `Şehir Mekanı Ziyareti (${id.toUpperCase()})`)) {
        window.currentVisitedVenues = window.currentVisitedVenues || [];
        window.currentVisitedVenues.push(id);
        gameState.survival.morale = Math.min(100, gameState.survival.morale + moraleGain);
        if(healthGain > 0) {
            gameState.survival.health = Math.min(100, gameState.survival.health + healthGain);
        }
        let isWorkerOrBoss = gameState.businesses.includes(id) || gameState.jobType === ('asgari-' + id);
        notify(`${id.toUpperCase()} mekanına gittiniz. Eksi bakiye yansıtıldı!` + (isWorkerOrBoss ? " Kendi bünyenizdeki indirim uygulandı!" : ""), "success");
        updateSurvivalUI();
    }
};

window.sendFriendRequest = function(name, venueId) {
    if(venueId) {
        if(!window.currentVisitedVenues || !window.currentVisitedVenues.includes(venueId)) {
            notify("Mekana adım atmadan ve oturup 'Harcama Yap' butonunu kullanmadan masadaki insanlarla tanışamazsınız!", "error");
            return;
        }
    }
    
    let isSelf = (gameState.username || 'Oyuncu') === name || name.includes('Siz');
    if (isSelf) {
        notify("Kendi kendinize arkadaşlık isteği gönderemezsiniz!", "error");
        return;
    }
    
    if (window.socket) {
        window.socket.emit('send_friend_request', { target: name });
    } else {
        notify("Sunucu bağlantısı yok. İstek atılamaz.", "error");
    }
};

window.acceptFriendRequest = function(sender) {
    if (window.socket) {
        window.socket.emit('accept_friend_request', { sender: sender });
    }
};

window.addFriendManual = function() {
    let inp = document.getElementById('friend-username');
    let name = inp.value.trim();
    if (name.length < 3) {
        notify("Lütfen geçerli bir kullanıcı adı girin.", "error"); return;
    }
    sendFriendRequest(name, null);
    inp.value = "";
};

window.renderFriends = function() {
    let reqHtml = '';
    
    // Gelen İstekler
    if(gameState.friendRequests && gameState.friendRequests.length > 0) {
        reqHtml += `<div style="color:var(--clr-success); margin-bottom:5px; font-weight:bold;">📥 Bana Gelen İstekler</div>`;
        gameState.friendRequests.forEach(r => {
            reqHtml += `<div style="padding:5px; background:rgba(0,0,0,0.2); margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <span>👤 ${r}</span>
                <button onclick="acceptFriendRequest('${r}')" style="background:var(--clr-success); border:none; color:white; border-radius:3px; padding:2px 8px; cursor:pointer;">Kabul Et</button>
            </div>`;
        });
    }

    // Giden İstekler
    if(gameState.sentRequests && gameState.sentRequests.length > 0) {
        reqHtml += `<div style="color:var(--clr-primary); margin-top:10px; margin-bottom:5px; font-weight:bold;">📤 Gönderdiğim İstekler</div>`;
        gameState.sentRequests.forEach(r => {
            reqHtml += `<div style="padding:5px; background:rgba(0,0,0,0.2); margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <span>⏳ ${r}</span>
                <span style="font-size:0.75rem; color:var(--clr-text-muted);">Cevap Bekleniyor</span>
            </div>`;
        });
    }

    if(reqHtml === '') {
        reqHtml = "Hiç bekleyen isteğiniz yok.";
    }
    
    let reqList = document.getElementById('friend-requests-list');
    if (reqList) reqList.innerHTML = reqHtml;

    let html = '';
    let dmDropdownHtml = '<option value="" style="color:black;">-- Konuşulacak Arkadaşı Seç --</option>';
    
    if(!gameState.friends || gameState.friends.length === 0) {
        html = "Hiç arkadaşınız yok. Şehir meydanına inip yeni insanlarla tanışmaya başlayın!";
    } else {
        gameState.friends.forEach(f => {
            let isOnline = (window.onlinePlayersList || []).includes(f);
            let statusLog = isOnline ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı';
            html += `<div style="padding:10px; background:rgba(0,0,0,0.3); margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between;">
                <strong>${f}</strong>
                <span style="font-size:0.8rem; color:${isOnline ? 'var(--clr-success)' : 'var(--clr-danger)'}">${statusLog}</span>
            </div>`;
            dmDropdownHtml += `<option value="${f}" style="color:black;">${f}</option>`;
        });
    }
    
    let fList = document.getElementById('friends-list');
    if (fList) fList.innerHTML = html;
    
    let dropdown = document.getElementById('dm-target');
    if (dropdown) dropdown.innerHTML = dmDropdownHtml;
    
    if (typeof renderDMHistory === 'function') renderDMHistory();
};

window.sendDirectMessage = function() {
    let target = document.getElementById('dm-target').value;
    let msg = document.getElementById('dm-message').value.trim();
    if(!target) {
        notify("Lütfen önce listeden bir arkadaş seçin!", "error"); return;
    }
    if(!msg) {
        notify("Boş mesaj gönderemezsiniz.", "error"); return;
    }
    
    if (window.socket) {
        window.socket.emit('send_dm', { target: target, message: msg });
        
        if (!gameState.chats) gameState.chats = {};
        if (!gameState.chats[target]) gameState.chats[target] = [];
        gameState.chats[target].push({ sender: gameState.username, msg: msg, time: new Date().toISOString() });
        
        if (typeof renderDMHistory === 'function') renderDMHistory();
        
        document.getElementById('dm-message').value = "";
    } else {
        notify("Sunucu bağlantısı yok.", "error");
    }
};

window.renderDMHistory = function() {
    let target = document.getElementById('dm-target') ? document.getElementById('dm-target').value : null;
    let listEl = document.getElementById('social-dm-list');
    if (!listEl) return;
    
    if(!target) {
        listEl.innerHTML = `<div style="text-align:center; color:var(--clr-text-muted); margin-top:20px;">Lütfen mesajlaşmak için yukarıdan bir arkadaş seçin.</div>`;
        return;
    }
    
    if (!gameState.chats) gameState.chats = {};
    let history = gameState.chats[target] || [];
    
    if (history.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color:var(--clr-text-muted); margin-top:20px;">${target} ile hiç mesajınız yok. İlk mesajı siz gönderin!</div>`;
        return;
    }
    
    let html = '';
    history.forEach(chat => {
        let isMe = chat.sender === gameState.username;
        let color = isMe ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.4)';
        let border = isMe ? 'var(--clr-success)' : 'var(--clr-primary)';
        let title = isMe ? `Siz -> ${target}` : `${chat.sender} -> Siz`;
        
        let timeStr = "";
        if (chat.time) {
            let d = new Date(chat.time);
            timeStr = ` <span style="font-size:0.6rem; color:gray;">(${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')})</span>`;
        }

        html += `<div style="padding:8px; background:${color}; border-left:4px solid ${border}; border-radius:5px; margin-bottom:5px;">
            <div style="font-size:0.7rem; color:${isMe ? 'white' : 'var(--clr-primary)'};">${title}${timeStr}</div>
            <div style="font-size:0.9rem; word-break:break-word;">${chat.msg}</div>
        </div>`;
    });
    
    listEl.innerHTML = html;
    listEl.scrollTop = 9999;
};

window.publishGlobalNews = function() {
    let promptMsg = gameState.isAdmin 
        ? "Tüm adaya yayınlanacak mesajınızı yazın (Yönetici - Sınırsız karakter):"
        : "Tüm adaya yayınlanacak mesajınızı yazın (Ücret: 50 🪙, En fazla 100 karakter):";
    let msg = prompt(promptMsg);
    if (!msg || msg.trim() === '') return;
    
    if (!gameState.isAdmin && msg.length > 100) {
        notify("Mesajınız çok uzun! En fazla 100 karakter.", "error");
        return;
    }

    if (window.socket) {
        window.socket.emit('send_global_news', { message: msg.trim() });
    } else {
        notify("Sunucu bağlantısı yok.", "error");
    }
};

window.deleteGlobalNews = function(index) {
    if (confirm("Bu bülten mesajını silmek istediğinize emin misiniz?")) {
        if (window.socket) {
            window.socket.emit('delete_global_news', { index: index });
        } else {
            notify("Sunucu bağlantısı yok.", "error");
        }
    }
};

window.payBackDebt = function(creditor, amount) {
    if (confirm(`${creditor} adlı oyuncuya olan ${amount.toLocaleString('tr-TR')} 🪙 borcunuzu geri ödemek istiyor musunuz?`)) {
        if (gameState.balance < amount) {
            notify("Borcu ödemek için yeterli bakiyeniz bulunmamaktadır.", "error");
            return;
        }
        if (window.socket) {
            window.socket.emit('pay_back_debt', { creditor: creditor, amount: amount });
        } else {
            notify("Sunucu bağlantısı yok.", "error");
        }
    }
};

window.depositBurs = function() {
    let amountStr = prompt("Üniversite öğrencilerine yatırmak istediğiniz toplam burs miktarını girin:");
    if (amountStr === null) return;
    
    let amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
        notify("Lütfen geçerli ve pozitif bir burs miktarı yazın.", "error");
        return;
    }
    
    if (gameState.balance < amount) {
        notify("Bu miktarda burs yatırmak için bakiyeniz yetersiz.", "error");
        return;
    }
    
    if (window.socket) {
        window.socket.emit('deposit_burs', { amount: amount });
    } else {
        notify("Sunucu bağlantısı yok.", "error");
    }
};

window.saveGame = function(isAuto = false) {
    if (window.socket) {
        window.socket.emit('save_game_state', gameState);
        if(!isAuto) notify("Oyun durumu başarıyla sunucuya kaydedildi (Manuel).", "success");
    } else {
        if(!isAuto) notify("Sunucuya bağlanılamadığı için kayıt başarısız!", "error");
    }
};

// SÜREKLİ OTOMATİK KAYIT (Her 10 saniyede bir)
setInterval(() => {
    if (window.socket && gameState && gameState.username) {
        saveGame(true);
    }
}, 10000);

window.requestDebt = function() {
    let creditor = document.getElementById('debt-request-target').value.trim();
    let amount = parseInt(document.getElementById('debt-request-amount').value);
    let term = parseInt(document.getElementById('debt-request-term').value);

    if (!creditor || isNaN(amount) || amount <= 0) {
        notify("Lütfen geçerli bir alıcı kullanıcı adı ve miktar girin.", "error");
        return;
    }

    if (creditor.toLowerCase() === gameState.username.toLowerCase()) {
        notify("Kendinizden borç talep edemezsiniz.", "error");
        return;
    }

    if (window.socket) {
        window.socket.emit('request_debt', { target: creditor, amount: amount, term: term });
        document.getElementById('debt-request-target').value = '';
        document.getElementById('debt-request-amount').value = '';
    } else {
        notify("Sunucu bağlantısı yok. Talep gönderilemiyor.", "error");
    }
};

window.acceptDebtRequest = function(debtor, amount, term) {
    if (confirm(`${debtor} adlı oyuncunun ${amount.toLocaleString('tr-TR')} 🪙 tutarındaki ${term} ay vadeli borç talebini onaylıyor musunuz?`)) {
        if (gameState.balance < amount) {
            notify("Borç göndermek için yeterli bakiyeniz yok!", "error");
            return;
        }
        if (window.socket) {
            window.socket.emit('p2p_transfer', { target: debtor, amount: amount, term: term, year: gameState.time.year, month: gameState.time.month });
        }
    }
};

window.rejectDebtRequest = function(id) {
    if (confirm("Bu borç talebini reddetmek istediğinize emin misiniz?")) {
        if (window.socket) {
            window.socket.emit('reject_debt_request', { id: id });
        }
    }
};
