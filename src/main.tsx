import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// 全局水波纹点击效果
document.addEventListener('click', (e) => {
  const el = document.createElement('div');
  el.className = 'ripple-effect';
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.08;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${e.clientX}px`;
  el.style.top = `${e.clientY}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
});

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
