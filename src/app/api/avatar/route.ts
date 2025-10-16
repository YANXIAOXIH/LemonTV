import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 获取用户头像
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUser = searchParams.get('user') || authInfo.username;

    // 在聊天系统中，用户应该能够查看其他用户的头像，这对聊天功能是必要的
    // 只要是已认证用户，就可以查看任何用户的头像
    // 这对于聊天、好友功能等社交功能是必要的

    const avatar = await db.getUserAvatar(targetUser);

    if (!avatar) {
      return NextResponse.json({ avatar: null });
    }

    return NextResponse.json({ avatar });
  } catch (error) {
    console.error('获取头像失败:', error);
    return NextResponse.json({ error: '获取头像失败' }, { status: 500 });
  }
}

// 上传用户头像
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { avatar, targetUser } = body;

    if (!avatar || typeof avatar !== 'string') {
      return NextResponse.json({ error: '头像数据不能为空且必须为字符串' }, { status: 400 });
    }

    const userToUpdate = targetUser || authInfo.username;

    // 只允许更新自己的头像，管理员和站长可以更新任何用户的头像
    const canUpdate = userToUpdate === authInfo.username ||
      authInfo.role === 'admin' ||
      authInfo.role === 'owner';

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // --- 新的逻辑：区分 Base64 和 URL ---
    const isBase64 = avatar.startsWith('data:image/');
    const isUrl = avatar.startsWith('http://') || avatar.startsWith('https://');

    if (isBase64) {
      // 验证 Base64 格式和大小
      const base64Data = avatar.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: '无效的 Base64 图片格式' }, { status: 400 });
      }
      const sizeInBytes = (base64Data.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) { // 2MB 限制
        return NextResponse.json({ error: '图片大小不能超过2MB' }, { status: 400 });
      }
    } else if (isUrl) {
      // 验证 URL 格式 (一个简单的检查)
      try {
        new URL(avatar);
      } catch (e) {
        return NextResponse.json({ error: '无效的图片 URL 格式' }, { status: 400 });
      }
    } else {
      // 如果既不是 Base64 也不是 URL，则拒绝
      return NextResponse.json({ error: '无效的头像数据格式，请提供 Base64 或有效的 URL' }, { status: 400 });
    }

    // 无论是 Base64 还是 URL，都直接存入数据库
    await db.setUserAvatar(userToUpdate, avatar);

    return NextResponse.json({ success: true, message: '头像更新成功' });

  } catch (error) {
    console.error('上传头像失败:', error);
    return NextResponse.json({ error: '上传头像失败' }, { status: 500 });
  }
}

// 删除用户头像
export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUser = searchParams.get('user') || authInfo.username;

    // 只允许删除自己的头像，管理员和站长可以删除任何用户的头像
    const canDelete = targetUser === authInfo.username ||
      authInfo.role === 'admin' ||
      authInfo.role === 'owner';

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await db.deleteUserAvatar(targetUser);

    return NextResponse.json({ success: true, message: '头像删除成功' });
  } catch (error) {
    console.error('删除头像失败:', error);
    return NextResponse.json({ error: '删除头像失败' }, { status: 500 });
  }
}
