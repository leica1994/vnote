import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import appIconUrl from "@icons/icon.png";
import { cn } from "../utils/cn";

/** 淡出开始时刻（毫秒），需与 index.css 中 splash-out 的延迟一致 */
const FADE_OUT_START = 1000;
/** 淡出时长（毫秒），需与 index.css 中 splash-out 的时长一致 */
const FADE_OUT_DURATION = 300;
/** 最短展示时长：资源就绪太快时也保证动画完整播放 */
const MIN_VISIBLE = FADE_OUT_START + FADE_OUT_DURATION;
/** 兜底超时：资源异常时不把用户卡在开屏页 */
const MAX_WAIT = 4000;

interface SplashScreenProps {
  onDone: () => void;
  /** 首页数据（笔记列表、统计、设置）是否已加载完成 */
  ready?: boolean;
  /** 已保存的自定义背景图路径，开屏期间预加载，避免结束后才出现 */
  backgroundImage?: string | null;
}

/**
 * 启动开屏：Logo 淡入弹出 → 标题上浮 → 整体淡出。
 * 窗口已在 Rust 侧先行显示；这里等首页资源（背景图、笔记、统计）就绪且动效播完后淡出，
 * 避免开屏结束后界面再「二次填充」。
 */
export function SplashScreen({ onDone, ready = true, backgroundImage }: SplashScreenProps) {
  const [started, setStarted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  // 就绪后触发淡出：淡出期间下层已是加载完毕的首页
  const [exiting, setExiting] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const backgroundSrc = useMemo(
    () => (backgroundImage ? convertFileSrc(backgroundImage) : null),
    [backgroundImage]
  );

  // 预加载并解码开屏用到的图片（应用图标 + 自定义背景图）
  useEffect(() => {
    let cancelled = false;
    const sources = [appIconUrl, backgroundSrc].filter((src): src is string => Boolean(src));

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // decode 确保像素就绪，避免淡出后背景图才绘制出来
          if (typeof img.decode === "function") {
            img.decode().then(() => resolve(), () => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = src;
      });

    Promise.all(sources.map(preload)).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundSrc]);

  // 等两帧再起动画，让静态开屏（含主题底色）先完成首次合成
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setStarted(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  // 最短展示时长：资源就绪太快时也保证动画完整播放
  useEffect(() => {
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    onDoneRef.current();
  }, []);

  // 资源就绪 + 最短时长满足 → 开始淡出，动画结束后卸载
  useEffect(() => {
    if (!ready || !assetsReady || !minElapsed) return;
    setExiting(true);
    const timer = window.setTimeout(finish, FADE_OUT_DURATION);
    return () => window.clearTimeout(timer);
  }, [ready, assetsReady, minElapsed, finish]);

  useEffect(() => {
    const bail = window.setTimeout(() => finish(), MAX_WAIT);
    return () => window.clearTimeout(bail);
  }, [finish]);

  return (
    <div
      className={cn("splash", started && "splash--started", exiting && "splash--exit")}
      aria-busy={!(ready && assetsReady)}
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
