from sqlalchemy import Column, Integer, DateTime, JSON, String
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow) 
    
    data = Column(JSON)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True) 
    
    permissions = Column(JSON)

class ActionLog(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    log_data = Column(JSON)