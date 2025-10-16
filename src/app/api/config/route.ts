import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  try {
    const config = await db.getAdminConfig();

    // 只暴露前端需要的、安全的配置项
    const publicConfig = {
      EnableChat: config?.SiteConfig?.EnableChat ?? true, // 默认开启
      // 未来可以添加其他公共配置，如站点名称
      // SiteName: config?.SiteConfig?.SiteName || 'OrangeTV'
    };

    return NextResponse.json(publicConfig);
  } catch (error) {
    console.error('获取公共配置失败:', error);
    // 即使出错，也返回默认配置，保证前端功能基本可用
    return NextResponse.json({
      EnableChat: true,
    });
  }
}