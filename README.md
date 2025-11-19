# Kuaför360

Kuaför360, yerel kuaförlerin randevu, hizmet ve gelir yönetimini tek panelden yürütmesini sağlayan tam yığın bir web uygulamasıdır. Sistem hem müşteri hem de yönetici girişleri sunar.

## Özellikler
- Saat 10:00-22:00 arası 60 dakikalık slotlarla çakışmasız randevu planlama
- Saç/sakal paketleri, bakım hizmetleri ve ekstra ürün seçimi
- Hizmet + ürün bazlı toplam tutar hesaplama
- Popüler hizmet/ürün analizleri, yoğunluk ve gelir raporları
- Yönetici panelinde günlük/haftalık takvim ve fiyat yönetimi

## Kurulum ve Komutlar
Projede yalnızca kök dizindeki `package.json` kullanılır; `Backend/` içinde ayrı bir NPM kurulumu yapmanız gerekmez. Tüm bağımlılıkları yüklemek için kök dizinde şunu çalıştırın:

```bash
npm install
```

### Üretim modunda çalıştırma

```bash
npm run start
```

### Geliştirme modu

```bash
npm run dev
```

`npm run dev` komutu `Backend/` klasörünü izleyen `nodemon`'ı kullanır; sunucu kodunda yaptığınız her değişiklik otomatik olarak yeniden başlatılır. Ardından tarayıcınızda [http://localhost:5050](http://localhost:5050) adresini açarak müşteriye dönük arayüzü ve API'yi aynı origin üzerinden görüntüleyebilirsiniz.

> **Neden `npm run start` hata veriyor?**
>
> Backend MySQL tablolarını açarken 127.0.0.1:3306 adresindeki bir veritabanına bağlanmaya çalışır. MySQL servisi çalışmıyorsa veya `Backend/db.js` (veya ortam değişkenleriniz) yanlış kullanıcı/parola içeriyorsa süreç "ECONNREFUSED" hatasıyla kapanır. Çözüm için:
>
> 1. MySQL'i başlatın: `sudo service mysql start` veya Docker kullanıyorsanız `docker compose up db`.
> 2. `mysql -u root -p` komutuyla bağlanıp `CREATE DATABASE kuafor360 CHARACTER SET utf8mb4;` çalıştırın.
> 3. İsterseniz şu ortam değişkenleriyle farklı bağlantı bilgileri tanımlayın:
>
>    ```bash
>    export DB_HOST=127.0.0.1
>    export DB_USER=root
>    export DB_PASSWORD=1234
>    export DB_NAME=kuafor360
>    ```
>
> 4. Sunucuyu yeniden başlatın: `npm run start`.
>
> Sunucu MySQL'e ulaşamazsa artık terminalde açıklayıcı bir uyarı bırakır ancak kapanmaz; yine de randevu, ürün ve rapor işlemleri için veritabanını ayağa kaldırmanız gerekir.
