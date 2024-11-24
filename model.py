from peewee import Model, CharField, DateTimeField, ForeignKeyField, MySQLDatabase
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Peewee MySQL database connection
db = MySQLDatabase(
    os.getenv('MYSQL_DATABASE'),
    user=os.getenv('MYSQL_USER'),
    password=os.getenv('MYSQL_PASSWORD'),
    host=os.getenv('MYSQL_HOST'),
    port=int(os.getenv('MYSQL_PORT')),
)

class BaseModel(Model):
    class Meta:
        database = db

class User(BaseModel):
    username = CharField(unique=True)
    email = CharField(unique=True)
    password = CharField()
    created_at = DateTimeField(default=datetime.datetime.now)

class Library(BaseModel):
    file_path = CharField()
    file_type = CharField()
    upload_time = DateTimeField(default=datetime.datetime.now)

# Create tables if they don't exist
db.connect()
db.create_tables([User, Library])
