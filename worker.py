import os
from rq import Worker, Queue
from redis import Redis

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')

conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    listen = ['default']
    queues = [Queue(name, connection=conn) for name in listen]
    worker = Worker(queues)
    worker.work()