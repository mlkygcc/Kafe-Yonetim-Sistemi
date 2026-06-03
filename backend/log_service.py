import pika
from database import SessionLocal
import models
import sys

def mesaji_isleme_al(ch, method, properties, body):
    islem_detayi = body.decode('utf-8')
    
    print(f"\n[ LOG SERVİSİ] Yeni Log Yakalandı: {islem_detayi}")
    
    db = SessionLocal()
    try:
        yeni_log = models.ActionLog(log_data={"islem_detayi": islem_detayi})
        db.add(yeni_log)
        db.commit()
        print("[ BAŞARILI] Log MySQL veritabanına işlendi.")
    except Exception as e:
        print(f"[ HATA] Veritabanına kaydedilemedi: {e}")
    finally:
        db.close()

def log_servisini_baslat():
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
        channel = connection.channel()
        
        channel.queue_declare(queue='log_kuyrugu')

        channel.basic_consume(queue='log_kuyrugu', on_message_callback=mesaji_isleme_al, auto_ack=True)

        print(" [*] Radar devrede! RabbitMQ üzerinden gelen loglar bekleniyor...")
        print(" [*] Çıkmak için CTRL+C yapın.\n")
        channel.start_consuming()
        
    except Exception as e:
        print(f"Bağlantı hatası: {e}")

if __name__ == '__main__':
    try:
        log_servisini_baslat()
    except KeyboardInterrupt:
        print("\n Log servisi güvenli bir şekilde durduruldu. Görüşmek üzere!")
        sys.exit(0)