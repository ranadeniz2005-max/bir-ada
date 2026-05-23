const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Statik dosyaları sun (index.html, script.js, styles.css bu klasörde)
app.use(express.static(path.join(__dirname)));

// Aktif oyuncuların havuzu
const players = {};

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
let mongoClient = null;
let mongoCollection = null;
let isMongoActive = false;

// Veritabanı (Basit JSON dosyası)
const DB_FILE = path.join(__dirname, 'database.json');
let db = {};

// MongoDB veya Yerel Dosyaya veri kaydetme yardımcı fonksiyonları
async function saveDatabaseKey(key, value) {
    if (!key) return;
    db[key] = value;

    // Her zaman yerel database.json dosyasını da güncel tutalım (yedek ve lokal çalışma için)
    try {
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
        console.error("Yerel veritabanı yazma hatası:", e);
    }

    // MongoDB aktifse oraya da yaz
    if (isMongoActive && mongoCollection) {
        try {
            await mongoCollection.replaceOne(
                { key: key },
                { key: key, value: value },
                { upsert: true }
            );
        } catch (e) {
            console.error(`❌ MongoDB Atlas yazma hatası (Anahtar: ${key}):`, e);
        }
    }
}

async function saveDatabaseKeys(keysArray) {
    if (!Array.isArray(keysArray) || keysArray.length === 0) return;

    // Her zaman yerel database.json dosyasını güncel tut
    try {
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
        console.error("Yerel veritabanı yazma hatası:", e);
    }

    if (isMongoActive && mongoCollection) {
        try {
            const bulkOps = keysArray.map(key => ({
                replaceOne: {
                    filter: { key: key },
                    replacement: { key: key, value: db[key] },
                    upsert: true
                }
            }));
            await mongoCollection.bulkWrite(bulkOps);
        } catch (e) {
            console.error(`❌ MongoDB Atlas bulkWrite hatası (Anahtarlar: ${keysArray.join(', ')}):`, e);
        }
    }
}

function loadLocalDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            console.log("✅ Yerel veritabanı (database.json) başarıyla yüklendi.");
        } catch (e) {
            console.error("❌ Yerel veritabanı okuma hatası:", e);
        }
    }
}

const MS_PER_PHASE = 960000; // Gerçek Zamanlı (16 Dakika = 1 Faz)

function getCalculatedTime() {
    let startTimestamp = db['SERVER_TIME'] ? db['SERVER_TIME'].startTimestamp : Date.now();
    let elapsedMs = Date.now() - startTimestamp;
    let totalPhases = Math.floor(elapsedMs / MS_PER_PHASE);
    
    // 1 Yıl = 12 Ay | 1 Ay = 30 Gün | 1 Gün = 3 Faz
    let phase = totalPhases % 3;
    let totalDays = Math.floor(totalPhases / 3);
    let day = (totalDays % 30) + 1;
    let totalMonths = Math.floor(totalDays / 30);
    let month = (totalMonths % 12) + 1;
    let year = Math.floor(totalMonths / 12) + 1;

    return { phase, day, month, year, totalPhases };
}

let lastCalculatedPhase = 0;

io.on('connection', (socket) => {
    console.log(`[+] Yeni Bağlantı: ${socket.id}`);

    // Oyuncunun Login (Giriş) işlemi
    socket.on('player_login', (data) => {
        let isAdmin = false;
        
        // Admin yetkisi kontrolü
        if (data.username === 'Rana DENİZ' && data.password === '19052005') {
            isAdmin = true;
        }

        players[socket.id] = { username: data.username, isAdmin: isAdmin, isOnline: true };
        console.log(`[~] ${data.username} Adasına İniş Yaptı. Admin: ${isAdmin}`);
        
        // Tarayıcıya yetki cevabını dön
        socket.emit('login_response', { success: true, isAdmin: isAdmin });

        // Sunucuya yeni girene hesaplanan zamanı gönder
        let t = getCalculatedTime();
        socket.emit('sync_time', t);

        // Bülten verilerini gönder (Eskileri temizleyip yolla)
        let totalDays = Math.floor(t.totalPhases / 3);
        if (!db['SERVER_NEWS']) db['SERVER_NEWS'] = [];
        db['SERVER_NEWS'] = db['SERVER_NEWS'].filter(news => (totalDays - (news.publishTotalDays || 0)) <= 30);
        socket.emit('global_news_sync', db['SERVER_NEWS']);

        // Tüm sunucuya yeni bağlanan kişiyi bildir
        io.emit('broadcast_notification', { msg: `${data.username} şehre giriş yaptı!`, type: 'success' });
        
        // Veritabanında kaydı varsa oyuncuya gönder
        if (db[data.username]) {
            db[data.username].isAdmin = isAdmin; // Veritabanındaki eski yetki verisini ez
            socket.emit('load_game_state', db[data.username]);
        } else {
            // Veritabanında kaydı YOK, demek ki yeni oyuncu. İlk kaydını oluştursun diye bildir.
            socket.emit('new_player_setup');
        }
    });

    // Oyuncu oyunu kaydettiğinde
    socket.on('save_game_state', (clientState) => {
        if (players[socket.id]) {
            let username = players[socket.id].username;
            let serverState = db[username] || {};
            
            // Server-authoritative alanlar istemci tarafından EZİLEMEZ (Ancak Bakiye LOKAL hesaplandığı için istemciye güvenmek zorundayız)
            clientState.chats = serverState.chats || clientState.chats;
            clientState.debtsGiven = serverState.debtsGiven || clientState.debtsGiven;
            clientState.debtsTaken = serverState.debtsTaken || clientState.debtsTaken;
            clientState.friendRequests = serverState.friendRequests || clientState.friendRequests;
            clientState.sentRequests = serverState.sentRequests || clientState.sentRequests;
            clientState.friends = serverState.friends || clientState.friends;

            saveDatabaseKey(username, clientState);
        }
    });

    // P2P Para Transferi İşlemi
    socket.on('p2p_transfer', (data) => {
        if (!players[socket.id]) return;
        let sender = players[socket.id].username;
        let receiver = data.target;
        let amount = parseInt(data.amount);
        let term = parseInt(data.term) || 0;

        if (isNaN(amount) || amount <= 0) {
            socket.emit('p2p_transfer_response', { success: false, msg: 'Geçersiz miktar.' });
            return;
        }

        if (sender === receiver) {
            socket.emit('p2p_transfer_response', { success: false, msg: 'Kendinize para gönderemezsiniz.' });
            return;
        }

        if (!db[receiver]) {
            socket.emit('p2p_transfer_response', { success: false, msg: 'Alıcı bulunamadı. Lütfen kullanıcı adını tam yazın.' });
            return;
        }

        // Göndericinin bakiyesini kontrol et (db üzerinden)
        if (!db[sender] || db[sender].balance < amount) {
            socket.emit('p2p_transfer_response', { success: false, msg: 'Bakiyeniz yetersiz.' });
            return;
        }

        // Parayı transfer et
        db[sender].balance -= amount;
        db[receiver].balance += amount;

        // Vade varsa borç olarak kaydet
        if (term > 0) {
            if (!db[sender].debtsGiven) db[sender].debtsGiven = [];
            if (!db[receiver].debtsTaken) db[receiver].debtsTaken = [];

            db[sender].debtsGiven.push({ target: receiver, amount: amount, term: term, startYear: data.year, startMonth: data.month });
            db[receiver].debtsTaken.push({ creditor: sender, amount: amount, term: term, startYear: data.year, startMonth: data.month });
        }

        // Veritabanını güncelle
        saveDatabaseKeys([sender, receiver]);

        // Göndericiye başarılı yanıtını dön
        socket.emit('p2p_transfer_response', { success: true, msg: `${receiver} adlı oyuncuya ${amount} 🪙 gönderildi.`, amount: amount, debtsGiven: db[sender].debtsGiven });

        // Eğer alıcı o an aktif (Online) ise canlı bildirim gönder
        for (let id in players) {
            if (players[id].username === receiver) {
                io.to(id).emit('incoming_transfer', { sender: sender, amount: amount, newBalance: db[receiver].balance });
                break;
            }
        }
        console.log(`[💸 TRANSFER] ${sender} -> ${receiver} : ${amount} 🪙`);
    });

    // Online Oyuncuları İstemciye Gönderme
    socket.on('get_online_players', () => {
        let onlineList = Object.values(players).map(p => p.username);
        
        let venueData = { cafe: { patrons: [], workers: [] }, firin: { patrons: [], workers: [] }, butik: { patrons: [], workers: [] }, restoran: { patrons: [], workers: [] }, ofis: { patrons: [], workers: [] } };
        let students = [];
        for (let username in db) {
            if (username === 'ADMIN_SYSTEM' || username === 'SERVER_TIME') continue;
            let pData = db[username];
            ['cafe', 'firin', 'butik', 'restoran'].forEach(v => {
                if (pData.businesses && pData.businesses.includes(v)) venueData[v].patrons.push(username);
                if (pData.jobType === ('asgari-' + v)) venueData[v].workers.push(username);
            });
            if (pData.jobType === 'part-time') {
                venueData['ofis'].workers.push(username);
            }
            if (pData.isStudent) {
                students.push(username);
            }
        }
        
        socket.emit('online_players_list', { list: onlineList, venueData: venueData, students: students });
    });

    // Arkadaşlık İsteği Gönderme
    socket.on('send_friend_request', (data) => {
        if (!players[socket.id]) return;
        let sender = players[socket.id].username;
        let receiver = data.target;

        if (sender === receiver) {
            socket.emit('friend_request_response', { success: false, msg: 'Kendinize istek atamazsınız.' });
            return;
        }

        if (!db[receiver]) {
            socket.emit('friend_request_response', { success: false, msg: 'Böyle bir oyuncu bulunamadı.' });
            return;
        }

        // Alıcının friendRequests dizisini başlat
        if (!db[receiver].friendRequests) db[receiver].friendRequests = [];
        if (!db[receiver].friends) db[receiver].friends = [];

        if (db[receiver].friends.includes(sender)) {
            socket.emit('friend_request_response', { success: false, msg: 'Zaten arkadaşsınız.' });
            return;
        }

        if (db[receiver].friendRequests.includes(sender)) {
            socket.emit('friend_request_response', { success: false, msg: 'Zaten istek gönderilmiş.' });
            return;
        }

        db[receiver].friendRequests.push(sender);
        
        if (!db[sender].sentRequests) db[sender].sentRequests = [];
        if (!db[sender].sentRequests.includes(receiver)) db[sender].sentRequests.push(receiver);

        saveDatabaseKeys([sender, receiver]);

        socket.emit('friend_request_response', { success: true, target: receiver, msg: `${receiver} kişisine istek iletildi.` });

        // Alıcı online ise canlı bildir
        for (let id in players) {
            if (players[id].username === receiver) {
                io.to(id).emit('incoming_friend_request', { sender: sender });
                break;
            }
        }
    });

    // Arkadaşlık İsteği Kabul Etme
    socket.on('accept_friend_request', (data) => {
        if (!players[socket.id]) return;
        let receiver = players[socket.id].username; // İsteği kabul eden
        let sender = data.sender; // İsteği atan

        if (!db[receiver] || !db[sender]) return;

        if (!db[receiver].friends) db[receiver].friends = [];
        if (!db[sender].friends) db[sender].friends = [];

        // Her iki tarafın arkadaş listesine ekle
        if (!db[receiver].friends.includes(sender)) db[receiver].friends.push(sender);
        if (!db[sender].friends.includes(receiver)) db[sender].friends.push(receiver);

        // İsteği sil
        if (db[receiver].friendRequests) {
            db[receiver].friendRequests = db[receiver].friendRequests.filter(req => req !== sender);
        }
        
        if (db[sender].sentRequests) {
            db[sender].sentRequests = db[sender].sentRequests.filter(req => req !== receiver);
        }

        saveDatabaseKeys([sender, receiver]);

        // Gönderen online ise ona haber ver
        for (let id in players) {
            if (players[id].username === sender) {
                io.to(id).emit('friend_accepted', { newFriend: receiver });
                break;
            }
        }
        
        socket.emit('friend_accepted_response', { success: true, newFriend: sender, msg: `${sender} ile arkadaş oldunuz!` });
    });

    // P2P Gerçek Sohbet (DM)
    socket.on('send_dm', (data) => {
        if (!players[socket.id]) return;
        let sender = players[socket.id].username;
        let receiver = data.target;
        let message = data.message;

        if (!db[sender]) return;
        if (!db[receiver]) return;

        if (!db[sender].chats) db[sender].chats = {};
        if (!db[receiver].chats) db[receiver].chats = {};
        if (!db[sender].chats[receiver]) db[sender].chats[receiver] = [];
        if (!db[receiver].chats[sender]) db[receiver].chats[sender] = [];

        let chatEntry = { sender: sender, msg: message, time: new Date().toISOString() };
        db[sender].chats[receiver].push(chatEntry);
        db[receiver].chats[sender].push(chatEntry);

        saveDatabaseKeys([sender, receiver]);

        // Alıcı online ise canlı gönder
        for (let id in players) {
            if (players[id].username === receiver) {
                io.to(id).emit('incoming_dm', chatEntry);
                break;
            }
        }
    });

    // Otomatik Yargıç (Adliye)
    socket.on('file_p2p_lawsuit', (data) => {
        if (!players[socket.id]) return;
        let plaintiff = players[socket.id].username; // Davacı
        let defendant = data.target; // Davalı (Sanık)

        if (!db[plaintiff] || !db[defendant]) {
            socket.emit('lawsuit_response', { success: false, msg: 'Böyle bir sanık bulunamadı.' });
            return;
        }

        const insultWords = ["aptal", "salak", "gerizekalı", "hırsız", "dolandırıcı", "lan", "şerefsiz", "köpek", "mal", "küfür"];
        
        let chats = db[plaintiff].chats && db[plaintiff].chats[defendant] ? db[plaintiff].chats[defendant] : [];
        let hasInsult = false;
        
        // Sanığın (defendant) gönderdiği mesajları tara
        for (let msgObj of chats) {
            if (msgObj.sender === defendant) {
                let text = msgObj.msg.toLowerCase();
                for (let word of insultWords) {
                    if (text.includes(word)) {
                        hasInsult = true;
                        break;
                    }
                }
            }
            if (hasInsult) break;
        }

        if (hasInsult) {
            // Davacı kazanır. Sanıktan 10.000 🪙 tazminat kesilir.
            let penalty = 10000;
            db[defendant].balance -= penalty;
            db[plaintiff].balance += penalty;
            saveDatabaseKeys([plaintiff, defendant]);

            socket.emit('lawsuit_response', { success: true, won: true, penalty: penalty, msg: `Hakaret tespit edildi! Dava Kazanıldı. Sanıktan ${penalty} 🪙 tazminat alındı.` });
            
            for (let id in players) {
                if (players[id].username === defendant) {
                    io.to(id).emit('lawsuit_lost', { penalty: penalty, msg: `${plaintiff} size hakaret/küfür davası açtı ve KAZANDI. Adliye hesabınızdan ${penalty} 🪙 tazminat kesti.` });
                    break;
                }
            }
        } else {
            // Hakaret yoksa Borç var mı diye kontrol et
            let hasOverdueDebt = false;
            let debtIndex = -1;
            let debtAmount = 0;
            let debtExistsButNotOverdue = false;

            if (db[plaintiff].debtsGiven) {
                let t = getCalculatedTime();
                for (let i = 0; i < db[plaintiff].debtsGiven.length; i++) {
                    let d = db[plaintiff].debtsGiven[i];
                    if (d.target === defendant) {
                        let monthsPassed = ((t.year - d.startYear) * 12) + (t.month - d.startMonth);
                        if (monthsPassed >= d.term) {
                            hasOverdueDebt = true;
                            debtIndex = i;
                            debtAmount = d.amount;
                            break;
                        } else {
                            debtExistsButNotOverdue = true;
                        }
                    }
                }
            }

            if (hasOverdueDebt) {
                // Borç icrası (Faizli)
                let totalCollection = debtAmount + 5000; // Ana para + 5.000 İcra Faizi
                db[defendant].balance -= totalCollection;
                db[plaintiff].balance += totalCollection;

                // Borcu sil
                db[plaintiff].debtsGiven.splice(debtIndex, 1);
                if (db[defendant].debtsTaken) {
                    let tdIdx = db[defendant].debtsTaken.findIndex(d => d.creditor === plaintiff);
                    if (tdIdx > -1) db[defendant].debtsTaken.splice(tdIdx, 1);
                }

                saveDatabaseKeys([plaintiff, defendant]);

                socket.emit('lawsuit_response', { success: true, won: true, penalty: totalCollection, msg: `Kayıtlı borç tespit edildi! Sanıktan İcra yoluyla ${totalCollection} 🪙 (Faizli) zorla tahsil edildi.`, debtsGiven: db[plaintiff].debtsGiven });
                
                for (let id in players) {
                    if (players[id].username === defendant) {
                        io.to(id).emit('lawsuit_lost', { penalty: totalCollection, msg: `${plaintiff} ödenmemiş borç için İcra Davası açtı! Hesabınızdan faiziyle ${totalCollection} 🪙 kesildi.` });
                        break;
                    }
                }
            } else if (debtExistsButNotOverdue) {
                // Borç var ama vadesi dolmamış, reddet (Ceza yok)
                socket.emit('lawsuit_response', { success: true, won: false, msg: `Sanığın size borcu var ancak vadesi henüz dolmamış. Vadesi dolmadan icra davası açılamaz!` });
            } else {
                // Yalan beyan, davacı ceza yer
                let fakeClaimPenalty = 5000;
                db[plaintiff].balance -= fakeClaimPenalty;
                saveDatabaseKey(plaintiff, db[plaintiff]);
                socket.emit('lawsuit_response', { success: true, won: false, penalty: fakeClaimPenalty, msg: `Sanığın loglarında hakaret veya kayıtlı borç bulunamadı. Asılsız dava nedeniyle Adliye sizden ${fakeClaimPenalty} 🪙 ceza kesti.` });
            }
        }
    });

    // Ada Haber Bülteni (Global Broadcast)
    socket.on('send_global_news', (data) => {
        if (!players[socket.id]) return;
        let sender = players[socket.id].username;
        let message = data.message;
        let cost = 50;

        if (!db[sender] || db[sender].balance < cost) {
            socket.emit('global_news_response', { success: false, msg: 'Bülten yayını için 50 🪙 bakiyeniz yetersiz.' });
            return;
        }

        let time = getCalculatedTime();
        let totalDays = Math.floor(time.totalPhases / 3);
        
        if (!db['SERVER_NEWS']) db['SERVER_NEWS'] = [];
        db['SERVER_NEWS'].push({ sender: sender, msg: message, publishTotalDays: totalDays });
        
        db['SERVER_NEWS'] = db['SERVER_NEWS'].filter(news => (totalDays - (news.publishTotalDays || 0)) <= 30);

        db[sender].balance -= cost;
        saveDatabaseKeys(['SERVER_NEWS', sender]);
        
        socket.emit('global_news_response', { success: true, msg: 'Haber bültene başarıyla eklendi!', newBalance: db[sender].balance });
        io.emit('global_news_sync', db['SERVER_NEWS']);
    });

    // --- CV BAŞVURU SİSTEMİ ---
    socket.on('submit_cv', (data) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].username;
        
        let cvList = db['ADMIN_SYSTEM'].cvApplications || [];
        
        // Zaten başvuru var mı?
        if (cvList.some(app => app.username === username)) {
            socket.emit('cv_result', { success: false, msg: 'Zaten beklemede olan bir CV başvurunuz var!' });
            return;
        }

        cvList.push({
            username: username,
            exp: data.exp,
            hasDiploma: data.hasDiploma,
            date: new Date().toISOString()
        });

        saveDatabaseKey('ADMIN_SYSTEM', db['ADMIN_SYSTEM']);
        
        socket.emit('cv_result', { success: true, msg: "CV'niz başarıyla Yönetim Kurulu'na gönderildi. Lütfen Yönetim Panelinden (Admin) başvurunuzu takip edin." });
    });

    socket.on('get_cv_list', () => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return; // Sadece admin çekebilir
        let cvList = db['ADMIN_SYSTEM'].cvApplications || [];
        socket.emit('cv_list_response', cvList);
    });

    socket.on('approve_cv', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        let targetUser = data.username;
        
        let managerCount = 0;
        for (let username in db) {
            if (username === 'ADMIN_SYSTEM') continue;
            if (db[username].jobType === 'high-level') {
                managerCount++;
            }
        }
        
        if (managerCount >= 17) {
            socket.emit('admin_error', { msg: "Hata: Adadaki Üst Düzey Yönetici kotası (17/17) tamamen dolu! Başka birini onaylayamazsınız." });
            return;
        }

        let cvList = db['ADMIN_SYSTEM'].cvApplications || [];

        // CV'yi listeden çıkar
        db['ADMIN_SYSTEM'].cvApplications = cvList.filter(app => app.username !== targetUser);

        // Kullanıcıya mesleği ver
        if (db[targetUser]) {
            db[targetUser].jobType = 'high-level';
            db[targetUser].employedMonths = 0;
            // Cooldown kaldır
            db[targetUser].jobApplicationCooldown = 0;
        }

        saveDatabaseKeys(['ADMIN_SYSTEM', targetUser]);

        // Kullanıcı online ise canlı bildir
        for (let id in players) {
            if (players[id].username === targetUser) {
                io.to(id).emit('cv_approved_live', { msg: "Tebrikler! CV'niz Şehir Yönetimi tarafından onaylandı. Artık bir 'Üst Düzey Yönetici'siniz!" });
                break;
            }
        }
    });

    socket.on('reject_cv', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        let targetUser = data.username;
        let cvList = db['ADMIN_SYSTEM'].cvApplications || [];

        // CV'yi listeden çıkar
        db['ADMIN_SYSTEM'].cvApplications = cvList.filter(app => app.username !== targetUser);

        if (db[targetUser]) {
            db[targetUser].jobApplicationCooldown = 2; // 2 ay cooldown
        }

        saveDatabaseKeys(['ADMIN_SYSTEM', targetUser]);

        for (let id in players) {
            if (players[id].username === targetUser) {
                io.to(id).emit('cv_rejected_live', { msg: "Üzgünüz, CV'niz panelden REDDEDİLDİ. Şirket gerekliliklerini/tecrübenizi geliştirip 2 Ay sonra tekrar başvurunuz." });
                break;
            }
        }
    });

    // Admin Oyuncu Listesi
    socket.on('get_admin_player_data', () => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        
        let playerList = [];
        for (let username in db) {
            if (username === 'ADMIN_SYSTEM') continue;
            let pData = db[username];
            
            let jobStr = pData.jobType ? pData.jobType : "İşsiz";
            if (pData.businesses && pData.businesses.length > 0) jobStr = "Patron";
            
            let housingStr = (pData.inventory && pData.inventory.includes('villa')) ? "Villa" : 
                            (pData.housing === 'owned' ? "Sahip" : 
                            (pData.housing === 'rented' ? "Kiralık" : "Otel (Kira)"));
                            
            let eduStr = pData.isStudent ? "Okuyor" : (pData.hasDiploma ? "Mezun" : "Yok");

            playerList.push({
                name: username,
                age: pData.age || 18,
                balance: pData.balance || 0,
                job: jobStr,
                housing: housingStr,
                edu: eduStr,
                jobSkill: pData.jobSkill || 0,
                socialScore: pData.friends ? pData.friends.length : 0,
                isOnline: Object.values(players).some(pl => pl.username === username)
            });
        }
        
        socket.emit('admin_player_data_response', playerList);
    });

    socket.on('get_leaderboard', () => {
        if (!players[socket.id]) return;
        let leaderboard = [];
        for (let username in db) {
            if (username === 'ADMIN_SYSTEM' || username === 'SERVER_TIME' || username === 'SERVER_NEWS') continue;
            let pData = db[username];
            let isBot = ["Mert_14", "Zeynep_K", "Kaan01", "Esra_M", "Emir_A", "Yolcu_Mühendis", "CoolGamer44", "Ada_Star", "Deniz_Kaptan", "Borsa_Kurtlari", "Berkcan99"].includes(username);
            let jobStr = pData.jobType ? pData.jobType : "İşsiz";
            if (pData.businesses && pData.businesses.length > 0) jobStr = "Patron";
            leaderboard.push({
                name: username,
                balance: pData.balance || 0,
                job: jobStr,
                isOnline: Object.values(players).some(pl => pl.username === username),
                isBot: isBot
            });
        }
        // Sıralama (Büyükten küçüğe bakiye)
        leaderboard.sort((a, b) => b.balance - a.balance);
        // İlk 20
        socket.emit('leaderboard_response', leaderboard.slice(0, 20));
    });

    socket.on('admin_delete_player', (data) => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        let target = data.target;
        if (target === 'ADMIN_SYSTEM' || target === 'SERVER_TIME' || target === players[socket.id].username) return;
        
        if (db[target]) {
            delete db[target];
            
            // Sildiğimiz oyuncuyu diğer tüm oyuncuların arkadaş listesinden de sil
            let modifiedKeys = [];
            for (let u in db) {
                if (db[u] && db[u].friends && Array.isArray(db[u].friends)) {
                    let oldLen = db[u].friends.length;
                    db[u].friends = db[u].friends.filter(f => f !== target);
                    if (db[u].friends.length !== oldLen) {
                        modifiedKeys.push(u);
                    }
                }
            }

            // Yerel veritabanı kaydı
            try {
                const tempFile = DB_FILE + '.tmp';
                fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
                fs.renameSync(tempFile, DB_FILE);
            } catch (e) {
                console.error("Yerel veritabanı yazma hatası:", e);
            }

            // MongoDB'den silme işlemi
            if (isMongoActive && mongoCollection) {
                mongoCollection.deleteOne({ key: target }).catch(e => console.error(`❌ MongoDB silme hatası (${target}):`, e));
            }

            // Değişen arkadaş listelerini MongoDB'ye yaz
            if (modifiedKeys.length > 0) {
                saveDatabaseKeys(modifiedKeys);
            }
            
            // Eğer sildiğimiz kullanıcı o an aktif/online ise oyundan at:
            for (let id in players) {
                if (players[id].username === target) {
                    io.to(id).emit('force_logout', { msg: "Hesabınız Şehir Yönetimi tarafından tamamen silindi!" });
                    io.sockets.sockets.get(id)?.disconnect(true);
                    break;
                }
            }
        }
    });

    socket.on('submit_feedback', (data) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].username;
        let dateStr = new Date().toISOString();
        
        db['ADMIN_SYSTEM'].feedbacks.push({
            sender: username,
            message: data.msg,
            date: dateStr
        });
        
        saveDatabaseKey('ADMIN_SYSTEM', db['ADMIN_SYSTEM']);
        
        socket.emit('feedback_response', { success: true, msg: 'Dilek/Şikayetiniz yönetime başarıyla iletildi. Teşekkür ederiz!' });
    });

    socket.on('get_feedbacks', () => {
        if (!players[socket.id] || !players[socket.id].isAdmin) return;
        socket.emit('feedbacks_response', db['ADMIN_SYSTEM'].feedbacks || []);
    });

    socket.on('disconnect', () => {
        if(players[socket.id]) {
            console.log(`[-] Kopma: ${players[socket.id].username}`);
            io.emit('broadcast_notification', { msg: `${players[socket.id].username} şehirden ayrıldı.`, type: 'error' });
            delete players[socket.id];
        }
    });
});

// SUNUCU SAATİ (GERÇEK DÜNYA SENKRONİZASYONU)
// Her 10 saniyede bir saati kontrol et, eğer yeni bir faza (16 dk'lık dilime) girildiyse herkese duyur!
setInterval(() => {
    let t = getCalculatedTime();
    
    if (t.totalPhases > lastCalculatedPhase) {
        lastCalculatedPhase = t.totalPhases;
        
        console.log(`[Gerçek Zaman İlerledi] Yıl: ${t.year}, Ay: ${t.month}, Gün: ${t.day}, Faz: ${t.phase}`);
        
        io.emit('sync_time', { 
            phase: t.phase, 
            day: t.day, 
            month: t.month, 
            year: t.year,
            totalPhases: t.totalPhases
        });
    }
}, 10000);

async function initDatabase() {
    if (MONGODB_URI) {
        console.log("⏳ MongoDB Atlas'a bağlanılıyor...");
        try {
            mongoClient = new MongoClient(MONGODB_URI);
            await mongoClient.connect();
            const database = mongoClient.db("bir_ada_game");
            mongoCollection = database.collection("game_data");
            isMongoActive = true;
            console.log("✅ MongoDB Atlas bağlantısı başarılı.");

            // MongoDB'den tüm verileri çek ve db nesnesine yükle
            const cursor = mongoCollection.find({});
            const allDocs = await cursor.toArray();
            db = {};
            allDocs.forEach(doc => {
                db[doc.key] = doc.value;
            });
            console.log(`✅ MongoDB'den ${allDocs.length} kayıt başarıyla yüklendi.`);
        } catch (e) {
            console.error("❌ MongoDB Atlas bağlantı hatası! Yerel veritabanına (database.json) geçiliyor...", e);
            loadLocalDatabase();
        }
    } else {
        console.log("ℹ️ MONGODB_URI tanımlı değil. Yerel veritabanı (database.json) kullanılıyor.");
        loadLocalDatabase();
    }

    // Global verileri başlat
    if (!db['ADMIN_SYSTEM']) {
        db['ADMIN_SYSTEM'] = { cvApplications: [], feedbacks: [] };
    } else if (!db['ADMIN_SYSTEM'].feedbacks) {
        db['ADMIN_SYSTEM'].feedbacks = [];
    }

    if (!db['SERVER_TIME']) {
        db['SERVER_TIME'] = {
            startTimestamp: Date.now()
        };
        await saveDatabaseKey('SERVER_TIME', db['SERVER_TIME']);
    }

    // Zamanlayıcı başlangıç fazını ayarla
    lastCalculatedPhase = getCalculatedTime().totalPhases;

    // Sunucuyu dinlemeye başla
    server.listen(PORT, () => {
        console.log(`🚀 [BİR ADA] Sunucusu Başarıyla Başlatıldı.`);
        console.log(`🌐 Server Portu: http://localhost:${PORT}`);
        console.log(`Bekleniyor...`);
    });
}

// Sunucuyu başlat
initDatabase().catch(e => {
    console.error("Sunucu başlatma hatası:", e);
});
