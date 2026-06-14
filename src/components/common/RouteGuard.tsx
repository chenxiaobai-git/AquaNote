interface RouteGuardProps {
  children: React.ReactNode;
}

// AquaNote 无需登录，所有路由开放
export function RouteGuard({ children }: RouteGuardProps) {
  return <>{children}</>;
}