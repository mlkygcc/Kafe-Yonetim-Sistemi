import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [roller, setRoller] = useState([]);
  const [aktifKullanici, setAktifKullanici] = useState(null);
  const [aktifSayfa, setAktifSayfa] = useState('ana_panel');
  const [duzenlenenRol, setDuzenlenenRol] = useState(null);
  const [yeniRolModal, setYeniRolModal] = useState(false);
  const [yeniRol, setYeniRol] = useState({
    role_name: '',
    permissions: {
      siparis_sayfasi: { okuma: false, yazma: false, silme: false },
      barista_sayfasi: { okuma: false, yazma: false, silme: false }
    }
  });

  const rolleriGetir = () => fetch('http://127.0.0.1:8000/roles/').then(r => r.json()).then(setRoller).catch(err => console.log(err));
  useEffect(() => { rolleriGetir(); }, []);

  const rolEkle = (e) => {
    e.preventDefault();
    if (!yeniRol.role_name) return alert("Lütfen rol adı giriniz!");
    
    fetch("http://127.0.0.1:8000/roles/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yeniRol)
    }).then(() => {
      setYeniRolModal(false);
      setYeniRol({ 
        role_name: '', 
        permissions: { 
          siparis_sayfasi: {okuma: false, yazma: false, silme: false}, 
          barista_sayfasi: {okuma: false, yazma: false, silme: false}
        } 
      });
      rolleriGetir(); 
    });
  };

  const rolSil = (id) => {
    if(window.confirm("Bu rolü silmek istediğine emin misin?")) {
      fetch(`http://127.0.0.1:8000/roles/${id}`, { method: 'DELETE' }).then(rolleriGetir);
    }
    rolleriGetir(); 
  };

  const rolGuncelle = (id, veri) => {
    fetch(`http://127.0.0.1:8000/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veri)
    }).then(() => { setDuzenlenenRol(null); rolleriGetir(); });
    rolleriGetir(); 
  };

  const sistemeLogGonder = (mesaj) => {
    fetch("http://127.0.0.1:8000/log-action/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaj: mesaj })
    }).catch(err => console.error("Log gönderilemedi", err));
  };

  // --- GİRİŞ EKRANI ---
  const GirisEkrani = () => {
    const [isim, setIsim] = useState('');
    const [secilenRol, setSecilenRol] = useState('');

    const girisYap = (e) => {
      e.preventDefault();
      if (!isim || !secilenRol) return alert("Lütfen adınızı ve rolünüzü girin!");
      
      const rolVerisi = secilenRol === "admin" ? "admin" : roller.find(r => r.id === parseInt(secilenRol));
      setAktifKullanici({ isim: isim, rol: rolVerisi });

      if (secilenRol === "admin") {
        setAktifSayfa('ana_panel'); 
      } else {
        const yetkiliOlduguIlkSayfa = Object.entries(rolVerisi.permissions).find(([sayfaAdi, yetki]) => yetki.okuma === true);
        
        if (yetkiliOlduguIlkSayfa) {
          setAktifSayfa(yetkiliOlduguIlkSayfa[0]); 
        } else {
          setAktifSayfa('ana_panel'); 
        }
      }

      const rolAdi = secilenRol === "admin" ? "Müdür" : rolVerisi.role_name;
      sistemeLogGonder(`[GİRİŞ] ${isim} isimli kullanıcı (${rolAdi}) sisteme giriş yaptı.`);
    };  

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-500 relative overflow-hidden">
          <h1 className="text-3xl font-black text-slate-800 text-center mb-2"> Kafe Çalışan Girişi</h1>
          <form onSubmit={girisYap} className="space-y-6 mt-8">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Adınız</label>
              <input type="text" value={isim} onChange={e => setIsim(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Rolünüz</label>
              <select value={secilenRol} onChange={e => setSecilenRol(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none font-semibold">
                <option value="">Seçiniz...</option>
                <option value="admin">Müdür</option>
                {roller.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  };

  // --- YAPAY ZEKA SAYFASI ---
  const YapayZekaSayfasi = () => {
    const [soru, setSoru] = useState("");
    const [dosya, setDosya] = useState(null);
    const [cevap, setCevap] = useState("");
    const [yukleniyor, setYukleniyor] = useState(false);

    const aiGonder = async (e) => {
      e.preventDefault();
      if (!soru && !dosya) return alert("Lütfen benden bir şey isteyin veya dosya yükleyin!");
      
      setYukleniyor(true);
      const formData = new FormData();
      formData.append("prompt", soru || "Bu dosyayı analiz et ve bana özet çıkar.");
      if (dosya) formData.append("file", dosya);

      try {
        const res = await fetch("http://127.0.0.1:8000/ai-chat/", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.hata) setCevap(` Hata: ${data.hata}`);
        else setCevap(data.cevap);
      } catch (error) {
        setCevap(" Sunucuya bağlanırken hata oluştu.");
      }
      setYukleniyor(false);
    };

    return (
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-4xl mx-auto border-t-8 border-emerald-500 flex flex-col md:flex-row gap-8">
        
        <div className="w-full md:w-1/2 space-y-6">
          <div>
            <h2 className="text-3xl font-black text-emerald-700 mb-2"> Kafe Asistanı</h2>
            <p className="text-slate-500 font-semibold text-sm">Bana kafe yönetimi, tarifler veya sistem hakkında sorular sorun.</p>
          </div>
          
          <form onSubmit={aiGonder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Asistana Mesajınız</label>
              <textarea 
                rows="4" 
                value={soru} 
                onChange={(e) => setSoru(e.target.value)} 
                placeholder="Örn: Bu dosyada yazan malzemelerle bana bir kahve tarifi ver..." 
                className="w-full border-2 border-slate-200 p-4 rounded-xl outline-none focus:border-emerald-500 resize-none font-medium"
              />
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-xl border-2 border-dashed border-emerald-200">
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-2">Ek Dosya</label>
              <input 
                type="file" 
                accept=".txt"
                onChange={(e) => setDosya(e.target.files[0])} 
                className="text-sm w-full cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
              />
            </div>

            <button disabled={yukleniyor} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg flex justify-center items-center gap-2">
              {yukleniyor ? "Düşünüyor... " : "Asistana Sor "}
            </button>
          </form>
        </div>

        <div className="w-full md:w-1/2 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 flex flex-col">
          <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">
             Asistanın Yanıtı
          </h3>
          <div className="flex-grow overflow-y-auto max-h-[400px]">
            {cevap ? (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-slate-800 font-medium whitespace-pre-wrap leading-relaxed prose prose-slate max-w-none prose-p:mb-4 prose-headings:mb-4 prose-li:mb-1">
                <ReactMarkdown>{cevap}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-center">
                <span className="text-4xl mb-2"></span>
                <p>Cevaplar burada görünecek...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  // --- GARSON EKRANI ---
  const SiparisEkrani = () => {
    const [masaNo, setMasaNo] = useState('');
    const [urunlerListesi, setUrunlerListesi] = useState([{ urun: '', adet: 1 }]);
    const [bildirim, setBildirim] = useState('');
    const [siparisler, setSiparisler] = useState([]);

    const siparisleriGetir = () => fetch("http://127.0.0.1:8000/orders/").then(r => r.json()).then(setSiparisler).catch(e => console.error(e));
    useEffect(() => { siparisleriGetir(); const int = setInterval(siparisleriGetir, 3000); return () => clearInterval(int); }, []);

    const urunEkle = () => setUrunlerListesi([...urunlerListesi, { urun: '', adet: 1 }]);
    const urunSil = (index) => setUrunlerListesi(urunlerListesi.filter((_, i) => i !== index));
    const urunDegistir = (index, field, value) => {
      const yeni = [...urunlerListesi];
      yeni[index][field] = value;
      setUrunlerListesi(yeni);
    };

    const siparisGonder = async (e) => {
      e.preventDefault();
      if (urunlerListesi.some(u => !u.urun)) return alert("Lütfen tüm ürün seçimlerini yapın!");

      try {
        const res = await fetch("http://127.0.0.1:8000/orders/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masa_no: masaNo, urunler: urunlerListesi })
        });
        const data = await res.json();
        setBildirim(data.mesaj);
        
        setMasaNo(''); setUrunlerListesi([{ urun: '', adet: 1 }]);
        siparisleriGetir();
        setTimeout(() => setBildirim(''), 3000);
      } catch (error) { console.error("Sipariş hatası:", error); }
    };

    const servisEt = (id) => fetch(`http://127.0.0.1:8000/orders/${id}`, { method: 'DELETE' }).then(siparisleriGetir);

    return (
      <div className="space-y-8">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-2xl mx-auto border-t-8 border-amber-800">
          <h2 className="text-3xl font-black text-amber-900 mb-6 flex items-center gap-3"> Yeni Adisyon</h2>
          {bildirim && <div className="bg-green-100 text-green-800 p-4 rounded-xl font-bold mb-6 text-center animate-pulse">✅ {bildirim}</div>}
          
          <form onSubmit={siparisGonder} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Masa No</label>
              <input required type="text" placeholder="Örn: Masa 5" value={masaNo} onChange={e => setMasaNo(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-amber-800" />
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Sipariş Edilen Ürünler</label>
                <button type="button" onClick={urunEkle} className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-200">+ Ürün Ekle</button>
              </div>
              
              {urunlerListesi.map((kalem, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select required value={kalem.urun} onChange={e => urunDegistir(index, 'urun', e.target.value)} className="flex-grow border-2 p-3 rounded-xl outline-none focus:border-amber-800 font-semibold text-slate-700 text-sm">
                    <option value="">Ürün seçin...</option>
                    <option value="Karamel Macchiato">Karamel Macchiato</option>
                    <option value="Iced Latte">Iced Latte</option>
                    <option value="Filtre Kahve">Filtre Kahve</option>
                    <option value="Çikolatalı Muffin">Çikolatalı Muffin</option>
                    <option value="Sıcak Çay">Sıcak Çay</option>
                  </select>
                  <input required type="number" min="1" value={kalem.adet} onChange={e => urunDegistir(index, 'adet', parseInt(e.target.value))} className="w-20 border-2 p-3 rounded-xl outline-none focus:border-amber-800 text-center font-bold" />
                  {urunlerListesi.length > 1 && (
                    <button type="button" onClick={() => urunSil(index)} className="bg-red-100 text-red-500 p-3 rounded-xl hover:bg-red-200">❌</button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg">Adisyonu Mutfağa İlet</button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-4xl mx-auto border-t-4 border-slate-300">
          <h2 className="text-xl font-black text-slate-700 mb-6"> Aktif Siparişler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {siparisler.filter(s => s.durum !== 'Tamamlandı').length === 0 && <p className="text-slate-400 font-bold col-span-full">Takip edilecek sipariş yok...</p>}
            {siparisler.filter(s => s.durum !== 'Tamamlandı').map((siparis) => (
              <div key={siparis.id} className="p-4 border-2 border-slate-100 rounded-xl flex justify-between items-start bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">{siparis.masa_no}</h3>
                  <div className="text-sm font-semibold text-slate-600 mb-3 border-l-2 border-slate-300 pl-2">
                    {siparis.urunler?.map((u, i) => <p key={i}>{u.adet}x {u.urun}</p>)}
                  </div>
                  <p className={`text-xs font-black uppercase inline-block px-2 py-1 rounded text-white ${siparis.durum === 'Bekliyor' ? 'bg-red-500' : siparis.durum === 'Hazırlanıyor' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    {siparis.durum}
                  </p>
                </div>
                {siparis.durum === 'Hazırlandı' && (
                  <button onClick={() => servisEt(siparis.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-md">
                    Servis Et
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  // --- BARİSTA EKRANI ---
  const BaristaEkrani = () => {
    const [siparisler, setSiparisler] = useState([]);

    const siparisleriGetir = () => fetch("http://127.0.0.1:8000/orders/").then(r => r.json()).then(setSiparisler).catch(e => console.error(e));
    useEffect(() => { siparisleriGetir(); const int = setInterval(siparisleriGetir, 3000); return () => clearInterval(int); }, []);

    const durumGuncelle = (id, yeniDurum) => fetch(`http://127.0.0.1:8000/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ durum: yeniDurum }) }).then(siparisleriGetir);

    return (
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-5xl mx-auto border-t-8 border-amber-800">
        <h2 className="text-3xl font-black text-amber-900 mb-6 flex items-center gap-3"> Barista Paneli</h2>
        <p className="text-slate-500 mb-6 font-semibold text-sm">Gelen adisyonların durumunu buradan yönetin.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {siparisler.filter(s => s.durum !== 'Tamamlandı').length === 0 ? (
            <div className="col-span-full p-8 border-2 border-dashed border-amber-200 rounded-2xl text-center bg-amber-50">
              <p className="text-amber-800 font-bold text-lg">Şu an bekleyen sipariş yok...</p>
            </div>
          ) : (
            siparisler.filter(s => s.durum !== 'Tamamlandı').map((siparis) => (
              <div key={siparis.id} className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg ${siparis.durum === 'Bekliyor' ? 'bg-red-500' : siparis.durum === 'Hazırlanıyor' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                  {siparis.durum.toUpperCase()}
                </div>
                <h3 className="font-black text-amber-900 text-xl mb-4 border-b-2 border-amber-200 pb-2 mt-2">{siparis.masa_no} Adisyonu</h3>
                
                <div className="flex-grow space-y-2 mb-6">
                  {siparis.urunler?.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 text-amber-900 bg-amber-100/50 p-2 rounded-lg">
                      <span className="font-black text-lg w-8 text-center">{u.adet}x</span>
                      <span className="font-bold text-md">{u.urun}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 mt-auto">
                  {siparis.durum === 'Bekliyor' && (
                    <button onClick={() => durumGuncelle(siparis.id, 'Hazırlanıyor')} className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg shadow hover:bg-amber-700">Hazırlamaya Başla</button>
                  )}
                  {siparis.durum === 'Hazırlanıyor' && (
                    <button onClick={() => durumGuncelle(siparis.id, 'Hazırlandı')} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg shadow hover:bg-emerald-700">Hazır (Zile Bas)</button>
                  )}
                  {siparis.durum === 'Hazırlandı' && (
                    <button disabled className="w-full bg-slate-300 text-slate-500 font-bold py-3 rounded-lg cursor-not-allowed">Garson Bekleniyor...</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  //--- SİSTEM GEÇMİŞİ VE LOGLAR ---
  const LogEkrani = () => {
    const [loglar, setLoglar] = useState([]);

    useEffect(() => {
      fetch("http://127.0.0.1:8000/logs/")
        .then(res => res.json())
        .then(data => setLoglar(data))
        .catch(err => console.error(err));
    }, []);

    return (
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-5xl mx-auto border-t-8 border-slate-800">
        <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3"> Sistem Geçmişi </h2>
        <p className="text-slate-500 mb-6 font-semibold text-sm">Sistemde yapılan işlemler, RabbitMQ üzerinden asenkron olarak kaydedilip burada listelenir.</p>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {loglar.length === 0 ? (
            <p className="text-slate-400 font-bold text-center p-6 border-2 border-dashed rounded-xl">Henüz log kaydı yok...</p>
          ) : (
            loglar.map((log) => (
              <div key={log.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-800 text-white font-mono text-xs px-2 py-1 rounded-md">#{log.id}</span>
                  <p className="font-bold text-slate-700">{log.log_data.islem_detayi}</p>
                </div>
                <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-lg border shadow-sm">
                  {new Date(log.created_at).toLocaleString('tr-TR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  //--- SÜPERVİZÖR CANLI SİPARİŞ MONİTÖRÜ ---
  const SiparisMonitoru = () => {
    const [siparisler, setSiparisler] = useState([]);

    const siparisleriGetir = () => fetch("http://127.0.0.1:8000/orders/").then(r => r.json()).then(setSiparisler).catch(e => console.error(e));
    useEffect(() => { siparisleriGetir(); const int = setInterval(siparisleriGetir, 3000); return () => clearInterval(int); }, []);

    const sonAltiSiparis = [...siparisler].reverse().slice(0, 6);

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500 mb-8">
        <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2"> Canlı Sipariş Monitörü </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sonAltiSiparis.length === 0 && <p className="text-slate-400 font-bold col-span-full border-2 border-dashed p-4 text-center rounded-xl">Henüz sisteme düşen sipariş yok...</p>}
          {sonAltiSiparis.map(siparis => (
            <div key={siparis.id} className="p-4 border-2 border-slate-100 rounded-xl bg-slate-50 flex flex-col hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-3 border-b pb-2">
                  <h3 className="font-bold text-slate-800 text-lg">{siparis.masa_no}</h3>
                  <span className={`text-[10px] font-black px-2 py-1 rounded text-white shadow-sm ${siparis.durum === 'Bekliyor' ? 'bg-red-500' : siparis.durum === 'Hazırlanıyor' ? 'bg-amber-500' : siparis.durum === 'Hazırlandı' ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                    {siparis.durum.toUpperCase()}
                  </span>
               </div>
               <div className="space-y-1">
                 {siparis.urunler?.map((u, i) => (
                   <p key={i} className="text-sm font-bold text-slate-600">👉 {u.adet}x {u.urun}</p>
                 ))}
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

 // --- MÜDÜR PANELİ ---
  const MudurPaneli = () => (
    <div>
      <SiparisMonitoru />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-700">Sistem Rolleri ve Yetkiler</h2>
        <button onClick={() => setYeniRolModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors">
          + Yeni Rol Ekle
        </button>
      </div>

      {yeniRolModal && (
        <div className="bg-indigo-50 p-6 rounded-xl shadow-inner border-2 border-indigo-200 mb-8 animate-fade-in-down">
          <h3 className="text-lg font-bold text-indigo-900 mb-4">Yeni Rol Oluştur</h3>
          <form onSubmit={rolEkle} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol Adı (Örn: Barista, Kasiyer)</label>
              <input required type="text" value={yeniRol.role_name} onChange={e => setYeniRol({...yeniRol, role_name: e.target.value})} className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500" placeholder="Yeni rol adını girin..." />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Sayfa Erişim İzinleri</label>
              <div className="flex gap-4 flex-wrap">
                {Object.keys(yeniRol.permissions).map(sayfa => (
                  <label key={sayfa} className="flex items-center gap-2 bg-white px-4 py-3 border-2 border-indigo-100 rounded-lg shadow-sm cursor-pointer text-sm font-bold text-slate-700 hover:border-indigo-300 transition-colors">
                    <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={yeniRol.permissions[sayfa].okuma} onChange={e => {
                      const kopya = {...yeniRol};
                      kopya.permissions[sayfa].okuma = e.target.checked;
                      setYeniRol(kopya);
                    }} /> 
                    {sayfa.replace('_', ' ').toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-md">Kaydet</button>
              <button type="button" onClick={() => setYeniRolModal(false)} className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-6 py-2 rounded-lg font-bold transition-colors">İptal</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roller.map(rol => (
          <div key={rol.id} className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
            {duzenlenenRol?.id === rol.id ? (
              <div className="space-y-4">
                <input className="w-full border p-2 rounded" value={duzenlenenRol.role_name} onChange={e => setDuzenlenenRol({...duzenlenenRol, role_name: e.target.value})} />
                {Object.entries(duzenlenenRol.permissions).map(([sayfa, yetkiler]) => (
                  <div key={sayfa} className="p-2 bg-slate-50 rounded">
                    <p className="text-xs font-bold uppercase mb-1">{sayfa.replace('_',' ')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(yetkiler).map(([k, v]) => (
                        <label key={k} className="text-[9px] flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={v} onChange={() => {
                            const yeni = {...duzenlenenRol};
                            yeni.permissions[sayfa][k] = !v;
                            setDuzenlenenRol(yeni);
                          }} /> {k}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => rolGuncelle(rol.id, duzenlenenRol)} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">KAYDET</button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between">
                  <h2 className="text-xl font-bold text-slate-800">{rol.role_name}</h2>
                  <button onClick={() => rolSil(rol.id)} className="text-red-500 text-xs font-bold hover:underline">SİL</button>
                </div>
                <button onClick={() => setDuzenlenenRol(JSON.parse(JSON.stringify(rol)))} className="text-indigo-600 text-xs font-bold mb-4 hover:underline">⚙ DÜZENLE</button>
                <div className="space-y-2">
                  {Object.entries(rol.permissions).map(([sayfa, yetki]) => (
                    <div key={sayfa} className="text-[10px] flex justify-between p-2 border border-slate-100 rounded bg-slate-50">
                      <span className="font-bold text-slate-600">{sayfa.replace('_', ' ').toUpperCase()}</span>
                      <span className={yetki.okuma ? "text-emerald-600 font-bold" : "text-red-400 font-bold"}>{yetki.okuma ? "GÖREBİLİR" : "KAPALI"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (!aktifKullanici) return <GirisEkrani />;
  const seciliRol = aktifKullanici.rol;

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      <div className="bg-white shadow-sm border-b border-slate-200 px-10 py-4 mb-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-indigo-900 cursor-pointer" onClick={() => setAktifSayfa('ana_panel')}> KAFE SİSTEMİ</h1>
          
          <div className="flex items-center gap-4">

            {seciliRol === 'admin' && (
              <button 
                onClick={() => setAktifSayfa('log_sayfasi')} 
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors">
                 Log Kayıtları
              </button>
            )}

            <button 
              onClick={() => setAktifSayfa('yapay_zeka')} 
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-lg text-sm border border-emerald-200 transition-colors">
               Yapay Zeka Aracı
            </button>

            <div className="text-right border-l pl-4 border-slate-200">
              <p className="text-sm font-bold text-slate-800">{aktifKullanici.isim}</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">{seciliRol === 'admin' ? 'MÜDÜR' : seciliRol.role_name}</p>
            </div>
            <button 
              onClick={() => { 
                sistemeLogGonder(`[ÇIKIŞ] ${aktifKullanici.isim} sistemden çıkış yaptı.`);
                setAktifKullanici(null); 
                setAktifSayfa('ana_panel'); 
              }} 
              className="bg-red-50 hover:bg-red-100 text-red-500 font-bold px-4 py-2 rounded-lg text-sm transition-colors border border-red-200">
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-10">
        {aktifSayfa === 'ana_panel' ? (
          <>
            {seciliRol === "admin" && MudurPaneli()}
            {seciliRol !== "admin" && (
              <div>
                 <h2 className="text-2xl font-bold mb-6 text-slate-700">Yetkili Olduğunuz Sayfalar</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {Object.entries(seciliRol.permissions).filter(([_, y]) => y.okuma).map(([ad]) => (
                     <div key={ad} className="p-6 bg-white rounded-2xl shadow border-l-4 border-indigo-500 flex justify-between items-center cursor-pointer" onClick={() => setAktifSayfa(ad)}>
                       <span className="font-bold text-slate-700 uppercase"> {ad.replace('_',' ')}</span>
                       <span className="text-indigo-500">➔</span>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </>
        ) : aktifSayfa === 'yapay_zeka' ? (
          <YapayZekaSayfasi />
        ) : aktifSayfa === 'siparis_sayfasi' ? ( 
          <SiparisEkrani />
          ) : aktifSayfa === 'barista_sayfasi' ? (
          <BaristaEkrani />
          ) : aktifSayfa === 'log_sayfasi' ? (
          <LogEkrani />
        ) : (
          <div className="bg-white p-10 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-3xl font-bold capitalize text-slate-800">{aktifSayfa.replace('_',' ')}</h2>
              <button onClick={() => setAktifSayfa('ana_panel')} className="bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-lg">← Geri Dön</button>
            </div>
            <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
               <p className="text-slate-400 font-semibold">{aktifSayfa.replace('_',' ')} içeriği...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;