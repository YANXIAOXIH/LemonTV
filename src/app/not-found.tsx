// src/app/not-found.tsx

import Link from 'next/link';

// 关键：声明此页面在 Edge Runtime 上运行
export const runtime = 'edge';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>404 - 页面未找到</h1>
      <p style={{ marginTop: '1rem' }}>抱歉，我们找不到您要访问的页面。</p>
      <Link href="/" style={{ marginTop: '2rem', color: '#22c55e', textDecoration: 'underline' }}>
        返回首页
      </Link>
    </div>
  );
}