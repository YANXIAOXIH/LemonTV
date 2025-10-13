CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  avatar_base64 TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS play_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  cover TEXT NOT NULL,
  year TEXT NOT NULL,
  index_episode INTEGER NOT NULL,
  total_episodes INTEGER NOT NULL,
  play_time INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  save_time INTEGER NOT NULL,
  search_title TEXT,
  UNIQUE(username, key)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  cover TEXT NOT NULL,
  year TEXT NOT NULL,
  total_episodes INTEGER NOT NULL,
  save_time INTEGER NOT NULL,
  UNIQUE(username, key)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  keyword TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(username, keyword)
);

CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS skip_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  source TEXT NOT NULL,
  id_video TEXT NOT NULL,
  enable INTEGER NOT NULL DEFAULT 0,
  intro_time INTEGER NOT NULL DEFAULT 0,
  outro_time INTEGER NOT NULL DEFAULT 0,
  UNIQUE(username, source, id_video)
);

-- 弹幕 (Danmus)
CREATE TABLE IF NOT EXISTS danmus (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT NOT NULL,
  mode INTEGER NOT NULL,
  time REAL NOT NULL,
  timestamp INTEGER NOT NULL
);

-- 机器码 (Machine Codes)
CREATE TABLE IF NOT EXISTS machine_codes (
  username TEXT PRIMARY KEY,
  machine_code TEXT NOT NULL UNIQUE,
  device_info TEXT,
  bind_time INTEGER NOT NULL,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- 对话 (Conversations)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              
  participants TEXT NOT NULL,
  type TEXT NOT NULL,              
  created_at INTEGER NOT NULL,     
  updated_at INTEGER NOT NULL
);

-- 消息 (Messages)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,         
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,      
  timestamp INTEGER NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 好友关系 (Friends)
CREATE TABLE IF NOT EXISTS friends (
  user1 TEXT NOT NULL,
  user2 TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('accepted', 'blocked')),
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user1, user2),
  FOREIGN KEY (user1) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (user2) REFERENCES users(username) ON DELETE CASCADE
);

-- 好友申请 (Friend Requests)
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  message TEXT,                    
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (from_user) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (to_user) REFERENCES users(username) ON DELETE CASCADE
);

-- 基本索引
CREATE INDEX IF NOT EXISTS idx_play_records_username ON play_records(username);
CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
CREATE INDEX IF NOT EXISTS idx_search_history_username ON search_history(username);

-- 复合索引优化查询性能
-- 播放记录：用户名+键值的复合索引，用于快速查找特定记录
CREATE INDEX IF NOT EXISTS idx_play_records_username_key ON play_records(username, key);
-- 播放记录：用户名+保存时间的复合索引，用于按时间排序的查询
CREATE INDEX IF NOT EXISTS idx_play_records_username_save_time ON play_records(username, save_time DESC);

-- 收藏：用户名+键值的复合索引，用于快速查找特定收藏
CREATE INDEX IF NOT EXISTS idx_favorites_username_key ON favorites(username, key);
-- 收藏：用户名+保存时间的复合索引，用于按时间排序的查询
CREATE INDEX IF NOT EXISTS idx_favorites_username_save_time ON favorites(username, save_time DESC);

-- 搜索历史：用户名+关键词的复合索引，用于快速查找/删除特定搜索记录
CREATE INDEX IF NOT EXISTS idx_search_history_username_keyword ON search_history(username, keyword);
-- 搜索历史：用户名+创建时间的复合索引，用于按时间排序的查询
CREATE INDEX IF NOT EXISTS idx_search_history_username_created_at ON search_history(username, created_at DESC);

-- 跳过片头片尾配置：用户名+源+视频ID的复合索引，用于快速查找特定配置
CREATE INDEX IF NOT EXISTS idx_skip_configs_username_source_id ON skip_configs(username, source, id_video);

-- 搜索历史清理查询的优化索引
CREATE INDEX IF NOT EXISTS idx_search_history_username_id_created_at ON search_history(username, id, created_at DESC);

-- 为快速按视频ID检索弹幕创建索引
CREATE INDEX IF NOT EXISTS idx_danmus_video_id ON danmus(video_id);

-- 为快速通过机器码查找用户创建索引
CREATE INDEX IF NOT EXISTS idx_machine_codes_machine_code ON machine_codes(machine_code);

-- 为快速检索一个对话的所有消息（按时间倒序）创建索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_timestamp ON messages(conversation_id, timestamp DESC);

-- 为用户快速查找发给自己的好友申请创建索引
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_status ON friend_requests(to_user, status);
