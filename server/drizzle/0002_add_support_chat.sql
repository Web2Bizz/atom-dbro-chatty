-- Добавляем enum для типов комнат
DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('normal', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавляем поле type в rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type room_type DEFAULT 'normal' NOT NULL;

-- Добавляем поле recipientId в messages (для адресации сообщений в чате поддержки)
-- null = видно всем модераторам, конкретный userId = приватное сообщение этому пользователю
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES users(id) ON DELETE SET NULL;

