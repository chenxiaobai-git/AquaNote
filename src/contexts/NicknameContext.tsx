import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { nicknameStorage } from '@/lib/storage';

interface NicknameContextType {
  nickname: string;
  setNickname: (name: string) => void;
}

const NicknameContext = createContext<NicknameContextType>({ nickname: '', setNickname: () => {} });

export function NicknameProvider({ children }: { children: React.ReactNode }) {
  const [nickname, setNick] = useState(() => nicknameStorage.get() ?? '');

  const setNickname = useCallback((name: string) => {
    nicknameStorage.save(name);
    setNick(name.trim());
  }, []);

  // 监听其他标签页修改
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'aquanote_nickname') {
        setNick(e.newValue ?? '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <NicknameContext.Provider value={{ nickname, setNickname }}>
      {children}
    </NicknameContext.Provider>
  );
}

export const useNickname = () => useContext(NicknameContext);
