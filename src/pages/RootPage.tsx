import React, { useState, useCallback } from 'react';
import { useNickname } from '@/contexts/NicknameContext';
import WelcomeIntro from '@/components/workspace/WelcomeIntro';
import NicknameSetup from '@/pages/NicknameSetup';
import HomePage from '@/pages/HomePage';

const SEEN_INTRO_KEY = 'aquanote_seen_intro';

function hasSeenIntro(): boolean {
  try { return localStorage.getItem(SEEN_INTRO_KEY) === '1'; } catch { return false; }
}

function markSeenIntro() {
  try { localStorage.setItem(SEEN_INTRO_KEY, '1'); } catch { /* noop */ }
}

// 根页面：初次使用 → 介绍页 → 昵称设置 → 主页
export default function RootPage() {
  const { nickname } = useNickname();
  const [introDone, setIntroDone] = useState(hasSeenIntro());
  const [nicknameDone, setNicknameDone] = useState(!!nickname);

  const handleIntroComplete = useCallback(() => {
    markSeenIntro();
    setIntroDone(true);
  }, []);

  const handleNicknameComplete = useCallback(() => {
    setNicknameDone(true);
  }, []);

  if (!introDone) {
    return <WelcomeIntro onComplete={handleIntroComplete} />;
  }

  if (!nicknameDone && !nickname) {
    return <NicknameSetup onComplete={handleNicknameComplete} />;
  }

  return <HomePage />;
}
