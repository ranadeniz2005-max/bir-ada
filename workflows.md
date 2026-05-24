---
description: Ekonomi Oyunu Temel İş Akış Senaryoları (Hayatta Kalma & Şehir Yönergeleri)
---

# Oyun Çözümleme İş Akışları (Workflows)

Aşağıdaki iş akışları, oyuncunun ekonomi ve hayatta kalma oyunundaki ("Bir Ada") yaşayabileceği şehir döngüsü olay senaryolarını belgeler.

## Senaryo 1: Yeni Oyuncu (Hayatta Kalma & Ucuza Barınma)
1. Oyuncu **18 Yaşında** oyuna başlar, şifresini yazıp **28.000** coin ile giriş yapar ve işsiz statüsündedir. (Yaşadığı yer: Ucuz Sistem Oteli).
2. Sistem İlk gün saat 08:00 (1. Faz - Sabah) başladığında oyuncunun 15 öğünlük başlangıç erzağından `-1` düşer. 
3. Sistem takvimi ilerledikçe (oyuncu offline olsa bile offline catch-up ile zamanı simüle ederek yakalar), oyuncunun sisteme ilk giriş yaptığı tarihin (joinDate) yıl dönümü geldiğinde oyuncu yaşlanır ve her geçen yıl için Hükümetten **1.000 🪙 Doğum Günü Bonusu** kazanır. 
4. Ada takvimi 1 Ocak'a geldiğinde tüm adada "Yeni Yıl" görsel olarak kutlanır, ayrıca her ay bitiminde otel kirası kesilip varsa işsizlik maaşı yatar.
5. Oyuncu "Kariyer Merkezi"nden "Sisteme Bağlı İşçi (Kafe/Barista vs.)" butonunu seçer ve çalışır. Vardiyasında her görev bitirdiğinde **yorgunluktan -1 can ve -1 moral** puanı azalır. Maaş için de ayda **min. 50 kotayı** doldurmalıdır.

## Senaryo 2: Akademik Hayat, Kota ve Sınav Döngüsü
1. Oyunun 6. Ayı dolar ve sistem "Üniversiteye" izin verir. Öğrenci yetkisi kazanan öğrenci indirimler kazanır (Örn: Psikiyatri Kliniği %30 indirimlidir).
2. Üniversite sekmesinde o an okuyan "Üniversite Öğrencileri" listesi canlı takip edilebilir. Öğrenciler "Ada Ofis" gibi prestijli part-time işlerde çalışabilirler.
3. **Akademik Görevler ve Kota:** Üniversite sekmesinde 3 adet aktif ders görevi (Ödev/Proje) bulunur. Tamamlanan her görev anında yenisiyle doldurulur. Öğrenciler ay sonunda 4.000 🪙 burslarını koruyabilmek ve mezuniyet yolunda ilerleyebilmek için en az **30 Akademik Görev** bitirmelidir.
4. **Cezalar & Zihinsel Yorgunluk:** Kotanın altında kalınırsa, yapılmayan her ödev için burs ödemesinden **200 🪙 kesilir.** Ayrıca 30 görevin altında kalan öğrencilerin o ayki eğitimi geçersiz sayılır ve okul süresi **1 ay uzar!** Ders çalışmak zihni yıprattığından her başarılı görevde karakterden **-2 Moral ve -0.5 Can** eksilir.
5. **Sınav Haftaları:** 3, 6, 9 ve 12. ayların son haftalarında (22-30. günler) sınav dönemleri başlar. Ödevler **SINAV** görevine dönüşür ve daha zor akademik mini oyunlarla (refleks testi, renk dizisi hatırlama, köstebek vurmaca, X-O-X oyunu, kelime karıştırma veya farklı olanı bulma) test edilirsiniz.
6. **Üniversite Dondurma & Ayrılma:** Öğrenciler okulu en fazla 2 kez ve her seferinde en fazla 6 ay dondurabilir (dondurulduğu sürece öğrenci avantajları askıya alınır, part-time işten otomatik çıkılır, 6. ayın sonunda okula zorunlu geri dönüş yapılır ve okunan aylar aynen korunur). Okuldan ayrılma (dropout) seçildiğinde tüm ilerleme sıfırlanır ve tekrar kaydolmak için 18 ay bekleme süresi başlar (yeni kayıt 0. aydan başlar).
7. Üniversite bitince "Üst Düzey Yönetici Ol" cv'sini başvurur.
8. *Adada 17'den az Müdür varsa* admin kabul eder. Ancak kota zaten 17 doldurulmuşsa liyakat dahi tanınmaksızın başvuru sistem tarafından sertçe reddedilir.
9. Yöneticilik sonsuza kadar sürmez. Sistemin adaleti gereği her 2 yılda bir (24. Ay, 48. Ay vb.) 17 kişilik tüm müdürlük kadrosu sıfırlanır ve herkes işinden atılarak koltuklar yeniden yarışa açılır.

## Senaryo 3: İşletme Kurma, İhale ve İşçi Vergisi
1. Oyuncunun kasasında **1.000.000** coin üstünde bakiye birikir (Ve oyunun 12. Ayı geçmiştir).
2. Fırın veya Kafe ihalelerine katılır. Patron olarak o işletmeye her ay vergi/maaş öder.
3. Ancak şirket sahibiyseniz o şirkete bizzat yemeğe veya kahveye gittiğiniz zaman "Hak Sahibi İndirimi" olan **%40 Personel İndirimiyle** bedava denebilecek ücretlere moralinizi lüks derecesine (fullenir) çıkartabilirsiniz. (Ada Ofis part-time çalışanları da bu indirimden yararlanır).

## Senaryo 4: Şehir Meydanında Sosyalleşme ve Global Yayın (Multiplayer)
1. Oyuncu çok çalışmaktan yorulmuş veya borç stresinden (eksi bakiye) **Moral barı** %0'a doğru inmeye başlamıştır. Eğer 0'ı görürse 5.000 🪙 Depresyon Hastane masrafı öder.
2. Bunun için arayüzden **"Şehir Meydanı"na** iner ve Kafe / Butik isimli kartellerden birinin "Mekandakiler" butonunu kontrol eder. İçerideki patron, işçi ve o an sunucuda aktif olan gerçek **Online Müşterileri** listeler.
3. Ancak oyuncu, o mekana giriş yapıp "Harcama Yap" butonunu kullanmadan (yani o masaya oturmadan) diğer kişilerin yanındaki ➕ butonuna basarsa sistem hata verir. Sosyalleşmek için mutlaka para harcamalıdır. Parayı harcayıp adisyon açtıktan sonra masalardaki online müşterilere canlı istek atabilir.
4. Karşı taraf (hedef oyuncu) Ada Sosyal menüsünden **[Kabul Et]** butonuna bastığında kalıcı olarak arkadaş olurlar ve birbirlerinin online/offline durumlarını görürler.
5. Sadece bu arkadaşlarıyla "Ada Sosyal -> Mesajlar (DM)" sayfasından sunucu üzerinden gerçek zamanlı (Real-Time P2P Chat) dertleşebilir. Yeni bir mesaj geldiğinde bildirim kutusunu açarsanız sistem otomatik olarak sizi o arkadaşınızla olan konuşmaya odaklar. Mesajlar adaletin sağlanması için sunucuda loglanır.
6. Eğer oyuncu tüm adaya hitap etmek isterse, ekranın en üstündeki **Ada Haber Bülteni (Global Chat)** üzerinden 50 🪙 karşılığında kayan yazıyla anons geçebilir.

## Senaryo 5: Sosyal Ağ, P2P Finans ve Yapay Zeka Yargıç (Multiplayer)
1. Anlaşan oyuncular **Banka > Para Transferi** modülüne girerek birbirlerine "P2P Borç/Para Gönderimi" yaparlar.
2. Bir anlaşmazlık veya hakaret durumu olursa mağdur taraf Karakol **(Dava Aç)** menüsüne gelir, **3.000 🪙** harç ödeyerek oyuncuyu Adliyeye şikayet eder.
3. **Otomatik Yargıç:** Sunucu (Yapay Zeka) anında davacı ve davalı arasındaki DM loglarını okur. "Aptal, salak, hırsız" vb. hakaretler tespit ederse Yargıç anında davalıdan **10.000 🪙 tazminat** keserek davacıya verir.
4. Suçsuz veya iftiraysa şikayetçiye adaleti meşgul etmekten **5.000 🪙 iftira cezası** uygulanır.

## Senaryo 6: Kritik İflas ve Ceza Seçimi
1. Oyuncu parasını eksiye batırıp **-100.000 🪙** sınırına getirir. İflas ekranıyla yüzleşir.
2. Hapishane, ev hacizi veya maaştan daimi yüksek haciz oranlarını seçmek mecburiyetindedir.

## Senaryo 7: Danışman Bota Danışmak (Yapay Zeka NLP Engine)
1. Oyuncu finansal krizde ne yapacağını bilemez ve sağ alttaki "Danışman Bot"u açar.
2. "Bana durumumun analizini yap" yazar. Bot, sabit kural okumak yerine o an oyuncunun canlı `gameState` verisindeki parasını, canını, erzak miktarını analiz eder.
3. Yapay Zeka bot animasyonu (Typing effect) devreye girer ve saniyeler içinde harfleri tek tek yazarak bizzat oyuncunun eksi bakiyesini ve bitmekte olan stoğunu bildiren özelleştirilmiş bir reçete sunar!

## Senaryo 8: Bulut Veritabanı ve Otomatik Kayıt (Multiplayer Persistence)
1. Oyuncu giriş yaptığında Node.js sunucusundaki `database.json` sorgulanır.
2. Eğer oyuncunun kaydı varsa eski `gameState` sunucudan istemciye (`load_game_state`) yüklenir ve oyuncu kaldığı yerden devam eder.
3. Sürekli Bilanço Sistemi sayesinde, oyuncunun kazandığı veya harcadığı her kuruş "Bu Ayki Gider / Gelir" tablosuna o an canlı olarak (real-time) işlenir.
4. Oyun saati sunucuda (Global Game Loop) ilerler, istemci artık her gün sonunu beklemez; arka planda **her 10 saniyede bir** sunucuya otomatik olarak bir kayıt isteği atar (`save_game_state`).
5. Admin (Yönetim Kurulu), sunucu tarafında tam yetkilidir. Hile yapan oyuncuyu tek bir tuşla silebilir. Bu işlem yapıldığında sunucu, silinen oyuncuyu sadece veri tabanından atmakla kalmaz; o oyuncuyu **tüm aktif arkadaş listelerinden** söküp çıkarır ve ismini boşa çıkartarak o isimle yeniden temiz bir hesap açılmasına izin verir.
6. Oyuncu gün ortasında oyunu terk etmek isterse veya içinin rahat etmesini isterse ana sayfadaki `💾 Kaydet` butonuna basarak anlık (manuel) kayıt alabilir. Böylece emekleri kalıcı dünyada (Persistent World) daima güvende olur.
