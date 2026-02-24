'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function CreateRoomButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const roomName = `경매방-${Math.floor(Math.random() * 10000)}`;

      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          name: roomName,
          total_teams: 5,
          base_point: 1000
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // 방장 권한으로 자동 접속
        router.push(`/room/${data.id}?role=ORGANIZER&token=${data.organizer_token}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('방 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateRoom}
      disabled={isLoading}
      className={`bg-minion-yellow hover:bg-minion-yellow-hover text-minion-blue font-bold py-4 px-10 rounded-2xl text-2xl transition-all shadow-[0_6px_0_#D9B310] hover:shadow-[0_4px_0_#D9B310] hover:translate-y-1 active:shadow-none active:translate-y-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
    >
      {isLoading ? '생성 중...' : '새로운 경매방 만들기'}
    </button>
  );
}
