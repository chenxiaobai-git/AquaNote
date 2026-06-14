import React from 'react';
import RootPage from './pages/RootPage';
import WorkspacePage from './pages/WorkspacePage';
import SettingsPage from './pages/SettingsPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '主页',
    path: '/',
    element: <RootPage />,
    public: true,
  },
  {
    name: '工作区',
    path: '/workspace/:id',
    element: <WorkspacePage />,
    public: true,
  },
  {
    name: '设置',
    path: '/settings',
    element: <SettingsPage />,
    public: true,
  },
];
