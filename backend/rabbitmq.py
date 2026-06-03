import pika

def mesaji_kuyruga_gonder(mesaj: str):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
        channel = connection.channel()

        channel.queue_declare(queue='log_kuyrugu')

        channel.basic_publish(exchange='', routing_key='log_kuyrugu', body=mesaj)
        
        connection.close()
    except Exception as e:
        print(f"RabbitMQ Bağlantı Hatası: {e}")