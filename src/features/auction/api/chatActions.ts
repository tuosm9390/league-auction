'use server'

import {
  withBroadcast,
} from './serverActionUtils'

// ---------- 채팅 ----------

/** 일반 채팅 메시지 전송 → Broadcast STATE_UPDATE */
export async function sendChatMessage(
  roomId: string,
  senderName: string,
  senderRole: string,
  content: string,
): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 메시지' }
  const validRoles = ['ORGANIZER', 'LEADER', 'VIEWER', 'SYSTEM', 'NOTICE']
  const safeSenderRole = validRoles.includes(senderRole) ? senderRole : 'VIEWER'
  
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
    const { error } = await db.from('messages').insert([{
      room_id: roomId,
      sender_name: senderName,
      sender_role: safeSenderRole,
      content: content.trim(),
    }])
    if (error) return { error: error.message }
    return {}
  })
}

/** 공지 전송 (ORGANIZER 전용 UI) → Broadcast STATE_UPDATE */
export async function sendNotice(roomId: string, content: string): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 공지' }
  
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
    const { error } = await db.from('messages').insert([{
      room_id: roomId,
      sender_name: '주최자',
      sender_role: 'NOTICE',
      content: content.trim(),
    }])
    if (error) return { error: error.message }
    return {}
  })
}
