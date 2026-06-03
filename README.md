# Kafe Otomasyonu ve Yönetim Sistemi

Bu proje, mikroservis mimarisi (FastAPI + RabbitMQ), dinamik yetkilendirme (RBAC), yapay zeka (RAG) ve gerçek zamanlı sipariş takibi özelliklerini barındıran tam teşekküllü bir kafe yönetim sistemidir.

## Proje Tanıtım Videosu
Projenin detaylı çalışma senaryosunu buradaki YouTube bağlantısından izleyebilirsiniz:
https://youtu.be/Po_QW4L6ulM

## Kullanılan Teknolojiler
* **Frontend:** ReactJS, TailwindCSS, Vite
* **Backend:** FastAPI (Python), SQLAlchemy
* **Microservice:** RabbitMQ, Pika
* **Veritabanı:** MySQL (Docker)
* **Yapay Zeka:** Google Gemini 2.5 Flash (RAG ve Prompt Mimarisi)
* **Alt Yapı:** Docker

## Öne Çıkan Özellikler

* **Dinamik Yetkilendirme (RBAC):** Müdür paneli üzerinden roller oluşturulabilir ve her role özel sayfa erişim/işlem yetkileri (CRUD) JSON formatında atanabilir.
* **Mikroservis Mimarisi:** Loglama işlemleri ana sunucudan bağımsız, RabbitMQ üzerinden asenkron olarak çalışan bir mikroservis tarafından yönetilir.
* **Yapay Zeka & RAG Entegrasyonu:** Google Gemini 2.5 Flash modeli kullanılarak geliştirilen asistan, hem serbest soruları cevaplar hem de yüklenen `.txt` dosyalarını analiz ederek veri üretir.
* **Canlı Sipariş Takibi:** Garsonların girdiği çoklu ürün içeren adisyonlar, Barista ekranına anlık düşer. Durum güncellemeleri (Hazırlanıyor, Hazırlandı, Tamamlandı) tüm panellerde canlı olarak izlenebilir.
* **Veritabanı Seviyesinde Otomasyon:** MySQL üzerinde tanımlı Trigger'lar ile veritabanı seviyesinde veri tutarlılığı ve otomatik dönüşüm sağlanır.

## Ekran Görüntüleri

### Müdür Paneli ve Rol Yönetimi
<div align="left">
  <img src="screenshots/Ekran görüntüsü 2026-05-11 133940.png" width="600"/>
</div>

### Garson Adisyon Ekranı ve Çoklu Ürün Seçimi
<div align="left">
  <img src="screenshots/Ekran görüntüsü 2026-05-11 134047.png" width="600"/>
</div>
  
### Barista (Mutfak) Canlı Sipariş Paneli
<div align="left">
  <img src="screenshots/Ekran görüntüsü 2026-05-11 133925.png" width="600"/>
</div>

### Yapay Zeka Destekli RAG Asistanı
<div align="left">
  <img src="screenshots/Ekran görüntüsü 2026-05-11 134108.png" width="600"/>
</div>

---

## Kurulum ve Çalıştırma Adımları
Projeyi çalıştırmak için bilgisayarınızda sadece **Docker** ve **Docker Compose** kurulu olması yeterlidir.

### Altyapıyı (Docker) Başlatma
Projenin ana dizininde (docker-compose.yml dosyasının bulunduğu yer) bir terminal açın ve aşağıdaki komutu çalıştırın:
```bash
docker-compose up --build -d
``` 
### Sistemi Durdurma ve Temizleme
Projeyi kapatmak ve oluşturulan veritabanı kalıntılarını tamamen silmek için terminale aşağıdaki komutu yazabilirsiniz:
```bash
docker-compose down -v
``` 

## Test İçin Varsayılan Kullanıcılar ve Roller
Sistem tamamen dinamik yetkilendirme ile çalıştığı için, Müdür hesabıyla girip yeni roller oluşturabilir ve sayfa yetkilerini JSON formatında atayabilirsiniz.

Örnek Test Senaryosu:
1. Sisteme "Müdür" olarak giriş yapın.
2. Yeni roller oluşturun (Örn: Garson, Barista).
3. Garson'a "Sipariş Sayfası", Barista'ya "Barista Sayfası" yetkisi verin.
4. İki farklı sekme açarak bu personellerle giriş yapın ve eş zamanlı sipariş/durum yönetimini test edin.
5. İşlemlerin arka planda RabbitMQ üzerinden asenkron olarak MySQL'e nasıl loglandığını Müdür panelindeki "Log Kayıtları" sayfasından veya RabbitMQ arayüzünden izleyin.
6. Üst menüdeki "Yapay Zeka" butonunu kullanarak asistana .txt formatında menü/tarif dosyası yükleyip analiz yaptırın.

---

**Geliştirici:** Meleksu YAĞCI
