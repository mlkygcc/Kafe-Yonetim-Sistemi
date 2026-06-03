from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
import schemas
import google.generativeai as genai
from rabbitmq import mesaji_kuyruga_gonder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from sqlalchemy import text
from typing import Optional
from typing import List
from fastapi import Form

Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        conn.execute(text("DROP TRIGGER IF EXISTS trg_rol_ismi_buyut"))
        conn.execute(text("""
            CREATE TRIGGER trg_rol_ismi_buyut
            BEFORE INSERT ON roles
            FOR EACH ROW
            SET NEW.role_name = UPPER(NEW.role_name);
        """))
        conn.commit()
        print(" Veritabanı Trigger'ı başarıyla aktif edildi!")
except Exception as e:
    print(f"Trigger oluşturma hatası (MySQL ayarlarından olabilir): {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key="AQ.Ab8RN6I0BElOhvId8bFKuvL_OQbXpV9EDHzLvsIqOhegxy-dzw")
ai_model = genai.GenerativeModel('gemini-2.5-flash')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem çalışıyor."}

@app.post("/users/")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    new_user = models.User(data=user.data)
    db.add(new_user)      
    db.commit()           
    db.refresh(new_user)   
    return {"mesaj": "Kullanıcı başarıyla eklendi!", "kullanici": new_user}

@app.get("/users/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all() 
    return users

@app.post("/roles/")
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db)):
    new_role = models.Role(role_name=role.role_name, permissions=role.permissions)
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    mesaji_kuyruga_gonder(f"Yeni bir kafe rolü eklendi: {role.role_name}")
    return {"mesaj": f"'{role.role_name}' rolü başarıyla oluşturuldu!", "rol": new_role}

@app.get("/roles/")
def get_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()

@app.get("/logs/")
def get_system_logs(db: Session = Depends(get_db)):
    loglar = db.query(models.ActionLog).order_by(models.ActionLog.id.desc()).limit(50).all()
    return loglar

@app.post("/ai-chat/")
async def ai_chat_endpoint(prompt: str = Form(...), file: Optional[UploadFile] = File(None)):
    try:
        istek_metni = prompt
        dosya_adi = "Dosya eklenmedi"

        if file and file.filename != "":
            dosya_adi = file.filename
            icerik_bayt = await file.read()
            try:
                dosya_metni = icerik_bayt.decode("utf-8")
                istek_metni = f"{prompt}\n\n--- KULLANICININ YÜKLEDİĞİ DOSYA İÇERİĞİ ---\n{dosya_metni}"
            except Exception:
                return {"hata": f"Şimdilik sadece metin tabanlı (txt) dosyaları okuyabiliyorum!"}

        response = ai_model.generate_content(istek_metni)
        
        mesaji_kuyruga_gonder(f" AI Asistan Kullanıldı. Soru: '{prompt[:30]}...' (Ek: {dosya_adi})")

        return {
            "cevap": response.text,
            "dosya_adi": dosya_adi
        }
    except Exception as e:
        return {"hata": f"Yapay Zeka Bağlantı Hatası: {str(e)}"}

@app.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    silinecek_rol = db.query(models.Role).filter(models.Role.id == role_id).first()
    
    if not silinecek_rol:
        return {"hata": "Böyle bir rol bulunamadı!"}
        
    db.delete(silinecek_rol)
    db.commit()
    
    mesaji_kuyruga_gonder(f"Sistemden bir rol silindi: ID {role_id}")
    
    return {"mesaj": "Rol başarıyla silindi!"}

@app.put("/roles/{role_id}")
def update_role(role_id: int, role_data: dict, db: Session = Depends(get_db)):
    db_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not db_role:
        return {"hata": "Rol bulunamadı"}
    
    db_role.role_name = role_data.get("role_name", db_role.role_name)
    db_role.permissions = role_data.get("permissions", db_role.permissions)
    
    db.commit()
    mesaji_kuyruga_gonder(f"Rol güncellendi: {db_role.role_name}")
    return {"mesaj": "Başarıyla güncellendi"}

aktif_siparisler = [] 

class SiparisKalemi(BaseModel):
    urun: str
    adet: int

class Siparis(BaseModel):
    masa_no: str
    urunler: List[SiparisKalemi]

class SiparisDurumUpdate(BaseModel):
    durum: str

@app.post("/orders/")
def create_order(siparis: Siparis):
    yeni_siparis = {
        "id": str(uuid.uuid4()),
        "masa_no": siparis.masa_no,
        "urunler": [{"urun": u.urun, "adet": u.adet} for u in siparis.urunler],
        "durum": "Bekliyor"
    }
    aktif_siparisler.append(yeni_siparis)
    
    urun_detaylari = ", ".join([f"{u.adet}x {u.urun}" for u in siparis.urunler])
    mesaj = f" YENİ SİPARİŞ: {siparis.masa_no} masasından sipariş geldi: {urun_detaylari}"
    
    mesaji_kuyruga_gonder(mesaj)
    return {"mesaj": "Sipariş mutfağa iletildi!", "siparis": yeni_siparis}

@app.get("/orders/")
def get_orders():
    return aktif_siparisler

@app.put("/orders/{order_id}")
def update_order_status(order_id: str, guncelleme: SiparisDurumUpdate):
    for siparis in aktif_siparisler:
        if siparis["id"] == order_id:
            siparis["durum"] = guncelleme.durum
            mesaji_kuyruga_gonder(f" DURUM DEĞİŞTİ: {siparis['masa_no']} siparişi '{guncelleme.durum}' durumuna geçti.")
            return {"mesaj": "Durum güncellendi"}
    raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

@app.delete("/orders/{order_id}")
def delete_order(order_id: str):
    for siparis in aktif_siparisler:
        if siparis["id"] == order_id:
            siparis["durum"] = "Tamamlandı" 
            mesaji_kuyruga_gonder(f" SERVİS EDİLDİ: {siparis['masa_no']} siparişi tamamlandı ve garson/barista ekranından gizlendi.")
            return {"mesaj": "Sipariş tamamlandı"}
    raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

class LogIstegi(BaseModel):
    mesaj: str

@app.post("/log-action/")
def log_frontend_islemi(istek: LogIstegi):
    mesaji_kuyruga_gonder(istek.mesaj)
    return {"durum": "ok"}