/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps */

'use client';

import { Moon, Sun, MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { ChatModal } from './ChatModal';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketMessage } from '../lib/types';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  useEffect(() => {
    // 获取公共配置来决定是否启用聊天功能
    const fetchPublicConfig = async () => {
      console.log('[ThemeToggle] 正在获取公共配置...');
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          console.log('[ThemeToggle] 成功获取配置:', data);
          setIsChatEnabled(data.EnableChat); // 根据API返回结果设置状态
        } else {
          console.error('[ThemeToggle] 获取配置失败, 状态码:', response.status);
          // 如果获取失败，保持禁用状态
          setIsChatEnabled(false);
        }
      } catch (error) {
        console.error('[ThemeToggle] 获取公共配置时发生网络错误:', error);
        // 如果发生网络错误，保持禁用状态
        setIsChatEnabled(false);
      }
    };

    fetchPublicConfig();
  }, []);

  // 不再在ThemeToggle中创建独立的WebSocket连接
  // 改为依赖ChatModal传递的消息计数

  // 直接使用ChatModal传来的消息计数
  const handleMessageCountFromModal = useCallback((totalCount: number) => {
    console.log('📊 [ThemeToggle] 收到ChatModal传来的消息计数:', totalCount);
    setMessageCount(totalCount);
  }, []);

  // 处理聊天消息计数重置（当用户查看对话时）
  const handleChatCountReset = useCallback((resetCount: number) => {
    console.log('💬 [ThemeToggle] 重置聊天计数:', resetCount);
    // 这些回调函数现在主要用于同步状态，实际计数由ChatModal管理
  }, []);

  // 处理好友请求计数重置（当用户查看好友请求时）
  const handleFriendRequestCountReset = useCallback((resetCount: number) => {
    console.log('👥 [ThemeToggle] 重置好友请求计数:', resetCount);
    // 这些回调函数现在主要用于同步状态，实际计数由ChatModal管理
  }, []);

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#0c111c' : '#f9fbfe');
    }
  };

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 监听主题变化和路由变化，确保主题色始终同步
  useEffect(() => {
    if (mounted) {
      setThemeColor(resolvedTheme);
    }
  }, [mounted, resolvedTheme, pathname]);

  if (!mounted) {
    // 渲染一个占位符以避免布局偏移
    return <div className='w-10 h-10' />;
  }

  const toggleTheme = () => {
    // 检查浏览器是否支持 View Transitions API
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (!(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(targetTheme);
    });
  };

  // 检查是否在登录页面
  const isLoginPage = pathname === '/login';

  console.log(`[ThemeToggle] 渲染UI: isChatEnabled = ${isChatEnabled}`);

  return (
    <>
      <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
        {/* 聊天按钮 - 在登录页面不显示 */}
        {!isLoginPage && isChatEnabled && (
          <button
            onClick={() => setIsChatModalOpen(true)}
            className={`${isMobile ? 'w-8 h-8 p-1.5' : 'w-10 h-10 p-2'} rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors relative`}
            aria-label='Open chat'
          >
            <MessageCircle className='w-full h-full' />
            {messageCount > 0 && (
              <span className={`absolute ${isMobile ? '-top-0.5 -right-0.5 w-4 h-4 text-xs' : '-top-1 -right-1 w-5 h-5 text-xs'} bg-red-500 text-white rounded-full flex items-center justify-center`}>
                {messageCount > 99 ? '99+' : messageCount}
              </span>
            )}
          </button>
        )}

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className={`${isMobile ? 'w-8 h-8 p-1.5' : 'w-10 h-10 p-2'} rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors`}
          aria-label='Toggle theme'
        >
          {resolvedTheme === 'dark' ? (
            <Sun className='w-full h-full' />
          ) : (
            <Moon className='w-full h-full' />
          )}
        </button>
      </div>

      {/* 聊天模态框 - 在登录页面不渲染 */}
      {!isLoginPage && isChatEnabled && (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          onMessageCountChange={handleMessageCountFromModal}
          onChatCountReset={handleChatCountReset}
          onFriendRequestCountReset={handleFriendRequestCountReset}
        />
      )}
    </>
  );
}
