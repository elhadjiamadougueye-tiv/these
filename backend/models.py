from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from database import Base
import secrets


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="Nouvelle conversation")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    model = Column(String(128), nullable=False)
    system_prompt = Column(Text, nullable=True)
    is_shared = Column(Boolean, default=False)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat",
                            cascade="all, delete-orphan", order_by="Message.created_at")

    def generate_share_token(self):
        self.share_token = secrets.token_urlsafe(32)
        self.is_shared = True


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    model = Column(String(128), nullable=True)
    extra_data = Column(JSON, nullable=True)   # pièces jointes : {type, filename, data, ...}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    chat = relationship("Chat", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)
    file_size = Column(Integer, nullable=False)
    collection_name = Column(String(128), nullable=False)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="documents")
