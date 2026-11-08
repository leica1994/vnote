import { useCallback, useEffect, useRef, useState } from "react";
import appIconUrl from "@icons/icon.png";
import { cn } from "../utils/cn";

/** 淡出开始时刻（毫秒），需与 index.css 中 splash-out 的延迟一致 */
const FADE_OUT_START = 1000;
/** 淡出时长（毫秒），需与 index.css 中 splash-out 的时长一致 */
const FADE_OUT_DURATION = 300;

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * 启动开屏：Logo 淡入弹出 → 标题上浮 → 整体淡出。
 * 动画只在图标就绪且首帧合成完成后启动，避免与 WebView 首次绘制抢资源。
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const logoRef = useRef<HTMLImageElement | null>(null);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // 等两帧，确保第一帧已画完再起动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStarted(true);
        timerRef.current = window.setTimeout(onDone, FADE_OUT_START + FADE_OUT_DURATION);
      });
    });
  }, [onDone]);

  useEffect(() => {
    // 命中图片缓存时不会再触发 onLoad，这里补一次判断
    if (!logoRef.current || logoRef.current.complete) {
      start();
    }
  }, [start]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn("splash", started && "splash--started")}
      data-tauri-drag-region
    >
      <div className="splash__content">
        <div className="splash__logo-wrap">
          <span className="splash__glow" aria-hidden="true" />
          <img
            ref={logoRef}
            className="splash__logo"
            src={appIconUrl}
            alt="VNote"
            draggable={false}
            onLoad={start}
            onError={start}
          />
        </div>
        <p className="splash__title">VNote</p>
      </div>
    </div>
  );
}
