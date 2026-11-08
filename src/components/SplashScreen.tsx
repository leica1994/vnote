import { useEffect, useRef, useState } from "react";
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
 * 窗口已在 Rust 侧先行显示，动画在这里等首帧合成完成后开始，避免与首次绘制抢资源。
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [started, setStarted] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    // 等两帧，让静态开屏（含主题底色）先完成首次合成，再起动画
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setStarted(true);
        timer = window.setTimeout(() => onDoneRef.current(), FADE_OUT_START + FADE_OUT_DURATION);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (timer !== undefined) {
        window.clearTimeout(timer);
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
            className="splash__logo"
            src={appIconUrl}
            alt="VNote"
            draggable={false}
          />
        </div>
        <p className="splash__title">VNote</p>
      </div>
    </div>
  );
}
