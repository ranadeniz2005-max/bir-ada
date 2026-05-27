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
5. Oyuncu "Kariyer Merkezi"nden "Sisteme Bağlı İşçi (Ada Kafe İşçisi, Ada Butik İşçisi vb.)" butonunu seçer ve çalışır. Bu işlerde çalışanların maaşları bankada **"Ada Maaşı"** olarak görünür. Vardiyasında her görev bitirdiğinde **yorgunluktan -1 can ve -1 moral** puanı azalır. Maaş için de ayda **min. 50 kotayı** doldurmalıdır.
6. **Otele Geri Dönüş:** Kiralık veya satın alınmış evlerden otele geri dönmek isteyen oyuncular, hem Emlakçı hem de Otel menülerindeki **"Evi Boşalt ve Otele Dön"** butonunu kullanarak otele geri dönebilir. Satılan evlerin yarı bedeli oyuncuya iade edilir.

## Senaryo 2: Akademik Hayat, Kota ve Sınav Döngüsü
1. Oyunun 6. Ayı dolar ve sistem "Üniversiteye" izin verir.
2. **Üniversiteye Giriş ve İş Engeli:** Aktif bir işte (asgari veya üst düzey) çalışan oyuncunun üniversiteye kayıt olması veya dondurulmuş okulu açması engellenir. Önce mevcut işinden istifa etmesi istenir.
3. **Dondurma ve Zoraki Dönüş:** Üniversite eğitimi en fazla 2 kez ve maksimum 6'şar aylığına dondurulabilir. 6 ay sonunda okula zorunlu geri dönüş yapıldığında, oyuncu bu sırada bir işe girdiyse o işinden otomatik olarak istifa ettirilir.
4. **Akademik Görevler ve Kota:** Üniversite sekmesinde yer alan akademik görevlerden ay sonunda 4.000 🪙 bursu koruyabilmek ve mezuniyete ilerleyebilmek için en az **30 Akademik Görev** bitirilmelidir.
5. **Cezalar & Zihinsel Yorgunluk:** Kotanın altında kalınırsa, yapılmayan her ödev için burs ödemesinden **200 🪙 kesilir.** Ayrıca 30 görevin altında kalınırsa eğitim geçersiz sayılarak okul **1 ay uzar!** Başarılı her ödevde karakterden **-2 Moral ve -0.5 Can** eksilir.
6. **Sınav Haftaları:** 3, 6, 9 ve 12. ayların son haftalarında sınav dönemleri başlar. Görevler SINAV görevine dönüşür ve daha zor mini oyunlarla test edilirsiniz.
7. **İflas Durumunda Kayıt Silinmesi:** Kritik iflas tetiklendiğinde Hapis seçilirse tüm mal varlığı ve okul kaydı silinir. Haciz seçilip asgari zorunlu kamu hizmetine atanılırsa üniversite kaydı yine otomatik silinir.
8. Üniversite bitince "Üst Düzey Yönetici Ol" CV'si ile başvurulabilir. Üst düzey yöneticilerin (Bakanlar) maaşları bankada **"Memur Maaşı"** olarak görünür. Adada maksimum **17 Müdür** bulunabilir ve bu kadrolar **her 2 yılda bir (24 Ay)** tamamen sıfırlanır.

## Senaryo 3: İşletme Kurma, İhale ve İşçi Vergisi
1. Oyuncunun kasasında **1.000.000** coin üstünde bakiye birikir (Ve oyunun 12. Ayı geçmiştir).
2. Fırın veya Kafe ihalelerine katılır. Patron olarak o işletmeye her ay vergi/maaş öder.
3. Patron veya çalışan olunan işletmelerde sosyalleşme yapıldığında **%40 VIP Personel İndirimi** uygulanır.

## Senaryo 4: Şehir Meydanında Sosyalleşme ve Global Yayın (Multiplayer)
1. Oyuncu çok çalışmaktan yorulmuş veya borç stresinden (eksi bakiye) **Moral barı** %0'a doğru inmeye başlamıştır. Eğer 0'ı görürse 5.000 🪙 Depresyon Hastane masrafı öder.
2. Bunun için arayüzden **"Şehir Meydanı"na** iner ve Kafe / Butik isimli kartellerden birinin "Mekandakiler" butonunu kontrol eder.
3. Sosyalleşmek ve arkadaşlık isteği (➕) atabilmek için mutlaka o mekanda harcama yapılması (adisyon açılması) zorunludur. Bedavaya sosyalleşilemez.
4. Karşı taraf arkadaşlık isteğini kabul ettiğinde kalıcı olarak arkadaş olurlar.
5. **Mobil Uyumlu DM Arayüzü:** Arkadaşlar arasında DM üzerinden mesajlaşılabilir. DM ekranı telefonlar için tamamen **mobil uyumlu** hale getirilmiştir. Telefonda mesajlaşırken arkadaş listesi gizlenir ve sohbet alanı ekranı kaplar; geri dönmek için sol üstteki ⬅️ butonu kullanılır.
6. Adaya hitap etmek için Ada Haber Bülteni (Global Chat) üzerinden 50 🪙 karşılığında global anons geçilebilir.

## Senaryo 5: Sosyal Ağ, P2P Finans ve Yapay Zeka Yargıç (Multiplayer)
1. Anlaşan oyuncular **Banka > Para Transferi** modülüne girerek birbirlerine para transferi yaparlar.
2. Anlaşmazlık veya hakaret durumunda Karakol üzerinden **3.000 🪙** harç ödenerek dava açılabilir.
3. **Otomatik Yargıç:** Yapay zeka yargıç, taraflar arasındaki DM loglarını okuyarak hakaret ("aptal, salak, hırsız" vb.) tespit ederse davalıdan **10.000 🪙 tazminat** kesip davacıya verir. İftira davalarında ise davacıya **5.000 🪙 ceza** kesilir.

## Senaryo 6: Findex Kredi Sistemi ve Borçlanma Limitleri (YENİ)
1. Bankacılık sistemi gerçek hayattaki Findex not sistemine dayanır. Her oyuncunun başlangıç skoru **1100 (Orta)** olarak belirlenir (Aralık: 300 - 1900).
2. **Skor Dinamikleri:** Aylık taksitlerini düzenli ödeyenlerin Findex notu **+15 puan** artar. Krediyi tamamen kapatanlar **+50 puan** ödül alır. Ayı ekside kapatmak **-15 puan** ceza verir. Taksit ödeme gününde hesapta para yoksa veya eksi bakiye ile zoraki taksit ödenirse Findex **-25 puan** düşer. İflasta not hapis için 300'e, haciz için 400'e sıfırlanır.
3. **Limit Kontrolleri:** Maksimum kredi limitiniz aylık geliriniz ve Findex skorunuza göre dinamik olarak hesaplanır: $\text{Limit} = \text{Aylık Gelir} \times (\text{Findex} / 350) \times 1.5$. Findex skoru **700'ün altında (Çok Riskli)** olan kişilere kredi kullandırılmaz.
4. **Borçlanma Sınırı (%70 Kuralı):** Aylık toplam kredi taksit ödemeleriniz aylık net gelirinizin **%70'ini aşamaz.**
5. **Dinamik Faiz:** Findex notu çok iyi (>=1700) olanlara %20 faiz indirimi, iyi (>=1500) olanlara %10 faiz indirimi uygulanırken, orta riskli (<1100) olanların faiz oranları %30 artırılır.

## Senaryo 7: Kritik İflas ve Ceza Seçimi
1. Oyuncu parasını eksiye batırıp **-100.000 🪙** sınırına getirdiğinde iflas tetiklenir.
2. Hapishane, ev hacizi veya zorunlu kamu hizmetini seçmek zorundadır. Hapis seçildiğinde tüm mal varlığı ve üniversite kaydı silinir. Haciz seçilip zorunlu kamu hizmetine atanılırsa üniversite kaydı yine otomatik silinir.

## Senaryo 8: Danışman Bota Danışmak (Yapay Zeka NLP Engine)
1. Finansal krizdeki oyuncu sağ alttaki Danışman Bot'a "Durumum nedir, analiz yap" yazdığında, bot oyuncunun canlı verilerini (yaş, bakiye, can, erzak) okuyarak özel tavsiyeler üretir.
2. Botun cevapları ekrana ChatGPT gibi harf harf yazılma (Typing effect) animasyonuyla yansır.

## Senaryo 9: Bulut Veritabanı, Otomatik Kayıt ve Gelişmiş Admin Takibi
1. Node.js sunucusundaki `database.json` aracılığıyla veriler kalıcı tutulur. Sistem arka planda **her 10 saniyede bir** sunucuya otomatik kayıt isteği atar.
2. Oyuncu dilerse sol menüdeki `💾 Kaydet` butonuyla manuel kayıt da alabilir.
3. **Gelişmiş Admin Paneli:** Şehir Yönetimi panelden tüm oyuncuların yaş, bakiye, iş, barınma, eğitim, yetenek ve online durumlarının yanı sıra artık her oyuncunun **Findex Skorunu, Kredi Borcunu** ve **Mevduat Bakiyesini** de gerçek zamanlı olarak (13 sütunlu panel) takip edebilir.
4. Kural ihlali yapan oyuncular tek tuşla silinebilir ve arkadaş listelerinden dezenfekte edilir.
