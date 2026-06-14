import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { NicknameProvider } from '@/contexts/NicknameContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppLaunchOverlay from '@/components/workspace/AppLaunchOverlay';
import CustomTitleBar from '@/components/layouts/CustomTitleBar';
import { routes } from './routes';

const App: React.FC = () => {
  const [launchDone, setLaunchDone] = useState(() => {
    // 开发时如需跳过启动动画，可在此改为 true
    return false;
  });

  return (
    <Router>
      <NicknameProvider>
        <ThemeProvider>
          {!launchDone && <AppLaunchOverlay onComplete={() => setLaunchDone(true)} />}
          <IntersectObserver />
          <CustomTitleBar />
          <div className="bg-background min-h-screen flex flex-col">
            <main className="flex-1 min-h-0">
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Toaster richColors position="top-right" theme="dark" />
        </ThemeProvider>
      </NicknameProvider>
    </Router>
  );
};

export default App;
