/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord, SkipConfig, ChatMessage, Conversation, Friend, FriendRequest } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

// D1 数据库接口
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
}

interface D1Result<T = any> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    changed_db: boolean;
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// 获取全局D1数据库实例
function getD1Database(): D1Database {
  return (process.env as any).DB as D1Database;
}

export class D1Storage implements IStorage {
  private db: D1Database | null = null;

  private async getDatabase(): Promise<D1Database> {
    if (!this.db) {
      this.db = getD1Database();
    }
    return this.db;
  }

  // 播放记录相关
  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first<any>();

      if (!result) return null;

      return {
        title: result.title,
        source_name: result.source_name,
        cover: result.cover,
        year: result.year,
        index: result.index_episode,
        total_episodes: result.total_episodes,
        play_time: result.play_time,
        total_time: result.total_time,
        save_time: result.save_time,
        search_title: result.search_title || undefined,
      };
    } catch (err) {
      console.error('Failed to get play record:', err);
      throw err;
    }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO play_records 
          (username, key, title, source_name, cover, year, index_episode, total_episodes, play_time, total_time, save_time, search_title)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          userName,
          key,
          record.title,
          record.source_name,
          record.cover,
          record.year,
          record.index,
          record.total_episodes,
          record.play_time,
          record.total_time,
          record.save_time,
          record.search_title || null
        )
        .run();
    } catch (err) {
      console.error('Failed to set play record:', err);
      throw err;
    }
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<Record<string, PlayRecord>> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT * FROM play_records WHERE username = ? ORDER BY save_time DESC'
        )
        .bind(userName)
        .all<any>();

      const records: Record<string, PlayRecord> = {};

      result.results.forEach((row: any) => {
        records[row.key] = {
          title: row.title,
          source_name: row.source_name,
          cover: row.cover,
          year: row.year,
          index: row.index_episode,
          total_episodes: row.total_episodes,
          play_time: row.play_time,
          total_time: row.total_time,
          save_time: row.save_time,
          search_title: row.search_title || undefined,
        };
      });

      return records;
    } catch (err) {
      console.error('Failed to get all play records:', err);
      throw err;
    }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('Failed to delete play record:', err);
      throw err;
    }
  }

  // 收藏相关
  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first<any>();

      if (!result) return null;

      return {
        title: result.title,
        source_name: result.source_name,
        cover: result.cover,
        year: result.year,
        total_episodes: result.total_episodes,
        save_time: result.save_time,
        search_title: result.search_title,
      };
    } catch (err) {
      console.error('Failed to get favorite:', err);
      throw err;
    }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO favorites 
          (username, key, title, source_name, cover, year, total_episodes, save_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          userName,
          key,
          favorite.title,
          favorite.source_name,
          favorite.cover,
          favorite.year,
          favorite.total_episodes,
          favorite.save_time
        )
        .run();
    } catch (err) {
      console.error('Failed to set favorite:', err);
      throw err;
    }
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT * FROM favorites WHERE username = ? ORDER BY save_time DESC'
        )
        .bind(userName)
        .all<any>();

      const favorites: Record<string, Favorite> = {};

      result.results.forEach((row: any) => {
        favorites[row.key] = {
          title: row.title,
          source_name: row.source_name,
          cover: row.cover,
          year: row.year,
          total_episodes: row.total_episodes,
          save_time: row.save_time,
          search_title: row.search_title,
        };
      });

      return favorites;
    } catch (err) {
      console.error('Failed to get all favorites:', err);
      throw err;
    }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('Failed to delete favorite:', err);
      throw err;
    }
  }

  // 用户相关
  async registerUser(userName: string, password: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
        .bind(userName, password)
        .run();
    } catch (err) {
      console.error('Failed to register user:', err);
      throw err;
    }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT password FROM users WHERE username = ?')
        .bind(userName)
        .first<{ password: string }>();

      return result?.password === password;
    } catch (err) {
      console.error('Failed to verify user:', err);
      throw err;
    }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result !== null;
    } catch (err) {
      console.error('Failed to check user existence:', err);
      throw err;
    }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('UPDATE users SET password = ? WHERE username = ?')
        .bind(newPassword, userName)
        .run();
    } catch (err) {
      console.error('Failed to change password:', err);
      throw err;
    }
  }

  // 搜索历史相关
  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT keyword FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?'
        )
        .bind(userName, SEARCH_HISTORY_LIMIT)
        .all<{ keyword: string }>();

      return result.results.map((row) => row.keyword);
    } catch (err) {
      console.error('Failed to get search history:', err);
      throw err;
    }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      // 先删除可能存在的重复记录
      await db
        .prepare(
          'DELETE FROM search_history WHERE username = ? AND keyword = ?'
        )
        .bind(userName, keyword)
        .run();

      // 添加新记录
      await db
        .prepare('INSERT INTO search_history (username, keyword) VALUES (?, ?)')
        .bind(userName, keyword)
        .run();

      // 保持历史记录条数限制
      await db
        .prepare(
          `
          DELETE FROM search_history 
          WHERE username = ? AND id NOT IN (
            SELECT id FROM search_history 
            WHERE username = ? 
            ORDER BY created_at DESC 
            LIMIT ?
          )
        `
        )
        .bind(userName, userName, SEARCH_HISTORY_LIMIT)
        .run();
    } catch (err) {
      console.error('Failed to add search history:', err);
      throw err;
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      if (keyword) {
        await db
          .prepare(
            'DELETE FROM search_history WHERE username = ? AND keyword = ?'
          )
          .bind(userName, keyword)
          .run();
      } else {
        await db
          .prepare('DELETE FROM search_history WHERE username = ?')
          .bind(userName)
          .run();
      }
    } catch (err) {
      console.error('Failed to delete search history:', err);
      throw err;
    }
  }

  // 用户列表
  async getAllUsers(): Promise<string[]> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT username FROM users ORDER BY created_at ASC')
        .all<{ username: string }>();

      return result.results.map((row) => row.username);
    } catch (err) {
      console.error('Failed to get all users:', err);
      throw err;
    }
  }

  // 管理员配置相关
  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT config FROM admin_config WHERE id = 1')
        .first<{ config: string }>();

      if (!result) return null;

      return JSON.parse(result.config) as AdminConfig;
    } catch (err) {
      console.error('Failed to get admin config:', err);
      throw err;
    }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          'INSERT OR REPLACE INTO admin_config (id, config) VALUES (1, ?)'
        )
        .bind(JSON.stringify(config))
        .run();
    } catch (err) {
      console.error('Failed to set admin config:', err);
      throw err;
    }
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT * FROM skip_configs WHERE username = ? AND source = ? AND id_video = ?'
        )
        .bind(userName, source, id)
        .first<any>();

      if (!result) return null;

      return {
        enable: Boolean(result.enable),
        intro_time: result.intro_time,
        outro_time: result.outro_time,
      };
    } catch (err) {
      console.error('Failed to get skip config:', err);
      throw err;
    }
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO skip_configs 
          (username, source, id_video, enable, intro_time, outro_time)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          userName,
          source,
          id,
          config.enable ? 1 : 0,
          config.intro_time,
          config.outro_time
        )
        .run();
    } catch (err) {
      console.error('Failed to set skip config:', err);
      throw err;
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          'DELETE FROM skip_configs WHERE username = ? AND source = ? AND id_video = ?'
        )
        .bind(userName, source, id)
        .run();
    } catch (err) {
      console.error('Failed to delete skip config:', err);
      throw err;
    }
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT source, id_video, enable, intro_time, outro_time FROM skip_configs WHERE username = ?'
        )
        .bind(userName)
        .all<any>();

      const configs: { [key: string]: SkipConfig } = {};

      result.results.forEach((row) => {
        const key = `${row.source}+${row.id_video}`;
        configs[key] = {
          enable: Boolean(row.enable),
          intro_time: row.intro_time,
          outro_time: row.outro_time,
        };
      });

      return configs;
    } catch (err) {
      console.error('Failed to get all skip configs:', err);
      throw err;
    }
  }

  // ---------- 用户头像 ----------

  async getUserAvatar(userName: string): Promise<string | null> {
    try {
      const db = await this.getDatabase();
      return await db
        .prepare('SELECT avatar FROM users WHERE username = ?') // 修改列名
        .bind(userName)
        .first('avatar'); // 修改列名
    } catch (err) {
      console.error('Failed to get user avatar:', err);
      throw err;
    }
  }

  async setUserAvatar(userName: string, avatarData: string): Promise<void> { // 参数名可以改为更通用的
    try {
      const db = await this.getDatabase();
      await db
        .prepare('UPDATE users SET avatar = ? WHERE username = ?') // 修改列名
        .bind(avatarData, userName)
        .run();
    } catch (err) {
      console.error('Failed to set user avatar:', err);
      throw err;
    }
  }

  async deleteUserAvatar(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('UPDATE users SET avatar = NULL WHERE username = ?') // 修改列名
        .bind(userName)
        .run();
    } catch (err) {
      console.error('Failed to delete user avatar:', err);
      throw err;
    }
  }

  // ---------- 弹幕管理 ----------
  async getDanmu(videoId: string): Promise<any[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare('SELECT * FROM danmus WHERE video_id = ? ORDER BY time ASC')
        .bind(videoId)
        .all();
      return results || [];
    } catch (err) {
      console.error('Failed to get danmu:', err);
      throw err;
    }
  }

  async saveDanmu(videoId: string, userName: string, danmu: {
    text: string;
    color: string;
    mode: number;
    time: number;
    timestamp: number;
  }): Promise<void> {
    try {
      const db = await this.getDatabase();
      const danmuId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db
        .prepare(
          'INSERT INTO danmus (id, video_id, username, text, color, mode, time, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          danmuId,
          videoId,
          userName,
          danmu.text,
          danmu.color,
          danmu.mode,
          danmu.time,
          danmu.timestamp
        )
        .run();
    } catch (err) {
      console.error('Failed to save danmu:', err);
      throw err;
    }
  }

  async deleteDanmu(videoId: string, danmuId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM danmus WHERE id = ? AND video_id = ?')
        .bind(danmuId, videoId)
        .run();
    } catch (err) {
      console.error('Failed to delete danmu:', err);
      throw err;
    }
  }

  // ---------- 机器码管理 ----------
  async getUserMachineCode(userName: string): Promise<string | null> {
    try {
      const db = await this.getDatabase();
      return await db
        .prepare('SELECT machine_code FROM machine_codes WHERE username = ?')
        .bind(userName)
        .first('machine_code');
    } catch (err) {
      console.error('Failed to get user machine code:', err);
      return null;
    }
  }

  async setUserMachineCode(userName: string, machineCode: string, deviceInfo?: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          'INSERT OR REPLACE INTO machine_codes (username, machine_code, device_info, bind_time) VALUES (?, ?, ?, ?)'
        )
        .bind(userName, machineCode, deviceInfo || '', Date.now())
        .run();
    } catch (err) {
      console.error('Failed to set user machine code:', err);
      throw err;
    }
  }

  async deleteUserMachineCode(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM machine_codes WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      console.error('Failed to delete user machine code:', err);
      throw err;
    }
  }

  async getMachineCodeUsers(): Promise<Record<string, { machineCode: string; deviceInfo?: string; bindTime: number }>> {
    try {
      const db = await this.getDatabase();
      const { results } = await db.prepare('SELECT username, machine_code, device_info, bind_time FROM machine_codes').all();

      const machineCodeUsers: Record<string, { machineCode: string; deviceInfo?: string; bindTime: number }> = {};
      if (results) {
        for (const row of results as any[]) {
          machineCodeUsers[row.username] = {
            machineCode: row.machine_code,
            deviceInfo: row.device_info,
            bindTime: row.bind_time,
          };
        }
      }
      return machineCodeUsers;
    } catch (err) {
      console.error('Failed to get machine code users:', err);
      return {};
    }
  }

  async isMachineCodeBound(machineCode: string): Promise<string | null> {
    try {
      const db = await this.getDatabase();
      return await db
        .prepare('SELECT username FROM machine_codes WHERE machine_code = ?')
        .bind(machineCode)
        .first('username');
    } catch (err) {
      console.error('Failed to check if machine code is bound:', err);
      return null;
    }
  }

  // ---------- 聊天功能 ----------

  // -- 消息管理 --
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          'INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, message_type, timestamp, is_read) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(message.id, message.conversation_id, message.sender_id, message.sender_name, message.content, message.message_type, message.timestamp, message.is_read ? 1 : 0)
        .run();
    } catch (err) {
      console.error('Failed to save message:', err);
      throw err;
    }
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
        .bind(conversationId, limit, offset)
        .all<ChatMessage>();
      return (results || []).reverse(); // 返回按时间正序排列的消息
    } catch (err) {
      console.error('Failed to get messages:', err);
      return [];
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('UPDATE messages SET is_read = 1 WHERE id = ?')
        .bind(messageId)
        .run();
    } catch (err) {
      console.error('Failed to mark message as read:', err);
      throw err;
    }
  }

  // -- 对话管理 --
  async getConversations(userName: string): Promise<Conversation[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare("SELECT * FROM conversations WHERE participants LIKE ? ORDER BY updated_at DESC")
        .bind(`%"${userName}"%`)
        .all<any>();

      return (results || []).map(row => ({
        ...row,
        participants: JSON.parse(row.participants)
      }));
    } catch (err) {
      console.error('Failed to get conversations:', err);
      return [];
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM conversations WHERE id = ?')
        .bind(conversationId)
        .first<any>();
      if (!result) return null;
      return {
        ...result,
        participants: JSON.parse(result.participants)
      };
    } catch (err) {
      console.error('Failed to get conversation:', err);
      return null;
    }
  }

  async createConversation(conversation: Conversation): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('INSERT INTO conversations (id, name, participants, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(conversation.id, conversation.name, JSON.stringify(conversation.participants), conversation.type, conversation.created_at, conversation.updated_at)
        .run();
    } catch (err) {
      console.error('Failed to create conversation:', err);
      throw err;
    }
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    try {
      const db = await this.getDatabase();
      const current = await this.getConversation(conversationId);
      if (!current) return;

      const updated = { ...current, ...updates };

      await db
        .prepare('UPDATE conversations SET name = ?, participants = ?, type = ?, created_at = ?, updated_at = ? WHERE id = ?')
        .bind(updated.name, JSON.stringify(updated.participants), updated.type, updated.created_at, updated.updated_at, conversationId)
        .run();
    } catch (err) {
      console.error('Failed to update conversation:', err);
      throw err;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      // 使用 batch 保证原子性 (或依赖外键的 ON DELETE CASCADE)
      const statements = [
        db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conversationId),
        db.prepare('DELETE FROM conversations WHERE id = ?').bind(conversationId)
      ];
      await db.batch(statements);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  }

  // -- 好友管理 --
  async getFriends(userName: string): Promise<Friend[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare("SELECT * FROM friends WHERE (user1 = ? OR user2 = ?) AND status = 'accepted'")
        .bind(userName, userName)
        .all<any>();

      return (results || []).map(row => {
        const friendUsername = row.user1 === userName ? row.user2 : row.user1;
        return {
          id: friendUsername, // 通常好友ID就是用户名
          username: friendUsername,
          status: 'offline', // D1 层不处理在线状态, 默认为 offline
          added_at: row.added_at
        };
      });
    } catch (err) {
      console.error('Failed to get friends:', err);
      return [];
    }
  }

  async addFriend(userName: string, friend: Friend): Promise<void> {
    try {
      const db = await this.getDatabase();
      const [user1, user2] = [userName, friend.username].sort();
      await db
        .prepare("INSERT OR REPLACE INTO friends (user1, user2, status, added_at) VALUES (?, ?, 'accepted', ?)")
        .bind(user1, user2, friend.added_at)
        .run();
    } catch (err) {
      console.error('Failed to add friend:', err);
      throw err;
    }
  }

  async removeFriend(userName: string, friendId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const [user1, user2] = [userName, friendId].sort();
      await db
        .prepare('DELETE FROM friends WHERE user1 = ? AND user2 = ?')
        .bind(user1, user2)
        .run();
    } catch (err) {
      console.error('Failed to remove friend:', err);
      throw err;
    }
  }

  // updateFriendStatus 在 D1 中不常用，因为在线状态通常由 WebSocket 管理
  async updateFriendStatus(friendId: string, status: Friend['status']): Promise<void> {
    // 在 SQL 模型中，通常不存储 'online'/'offline' 状态，此处留空或根据业务逻辑调整
    console.warn('updateFriendStatus is not implemented for D1 storage as status is typically real-time.');
    return Promise.resolve();
  }

  // -- 好友申请管理 --
  async getFriendRequests(userName: string): Promise<FriendRequest[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare('SELECT * FROM friend_requests WHERE to_user = ? OR from_user = ? ORDER BY created_at DESC')
        .bind(userName, userName)
        .all<FriendRequest>();
      return results || [];
    } catch (err) {
      console.error('Failed to get friend requests:', err);
      return [];
    }
  }

  async createFriendRequest(request: FriendRequest): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('INSERT INTO friend_requests (id, from_user, to_user, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(request.id, request.from_user, request.to_user, request.message, request.status, request.created_at, request.updated_at)
        .run();
    } catch (err) {
      console.error('Failed to create friend request:', err);
      throw err;
    }
  }

  async updateFriendRequest(requestId: string, status: FriendRequest['status']): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare("UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status, Date.now(), requestId)
        .run();
    } catch (err) {
      console.error('Failed to update friend request:', err);
      throw err;
    }
  }

  async deleteFriendRequest(requestId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM friend_requests WHERE id = ?')
        .bind(requestId)
        .run();
    } catch (err) {
      console.error('Failed to delete friend request:', err);
      throw err;
    }
  }

  // -- 用户搜索 --
  async searchUsers(query: string): Promise<Friend[]> {
    try {
      const db = await this.getDatabase();
      const { results } = await db
        .prepare("SELECT username FROM users WHERE username LIKE ? LIMIT 20")
        .bind(`%${query}%`)
        .all<{ username: string }>();

      return (results || []).map(row => ({
        id: row.username,
        username: row.username,
        status: 'offline', // 同样，默认为 offline
        added_at: 0,
      }));
    } catch (err) {
      console.error('Failed to search users:', err);
      return [];
    }
  }

  // ---------- 更新 deleteUser 方法以包含新数据 ----------
  async deleteUser(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      // 使用 batch 确保所有相关数据被一并删除
      const statements = [
        db.prepare('DELETE FROM users WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM play_records WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM favorites WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM search_history WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM skip_configs WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM danmus WHERE username = ?').bind(userName),
        db.prepare('DELETE FROM machine_codes WHERE username = ?').bind(userName),
        // 清理聊天相关数据 (更复杂, 需要先找到相关对话和好友)
        // 简单处理：删除作为参与者的对话，发送/接收的消息、好友关系、好友请求
        // 注意：这部分逻辑可能需要根据业务需求细化
        db.prepare("DELETE FROM conversations WHERE participants LIKE ?").bind(`%"${userName}"%`),
        db.prepare("DELETE FROM messages WHERE sender_name = ?").bind(userName),
        db.prepare("DELETE FROM friends WHERE user1 = ? OR user2 = ?").bind(userName, userName),
        db.prepare("DELETE FROM friend_requests WHERE from_user = ? OR to_user = ?").bind(userName, userName),
      ];
      await db.batch(statements);
    } catch (err) {
      console.error('Failed to delete user and all associated data:', err);
      throw err;
    }
  }

  // ---------- 数据清理 ----------
  async clearAllData(): Promise<void> {
    try {
      const db = await this.getDatabase();
      const statements = [
        db.prepare('DELETE FROM users'),
        db.prepare('DELETE FROM play_records'),
        db.prepare('DELETE FROM favorites'),
        db.prepare('DELETE FROM search_history'),
        db.prepare('DELETE FROM skip_configs'),
      ];

      await db.batch(statements);
      console.log('All user data has been cleared from D1 database.');
    } catch (err) {
      console.error('Failed to clear all data in D1:', err);
      throw err;
    }
  }
}
