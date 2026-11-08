/**
 * 视觉化总结「课件视图模式」视图
 * 将视觉化总结以图片罗列方式展示：默认只显示章节截图，
 * 点击眼睛图标后在图片下方展开标题与段落内容，用于看图回忆。
 */

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageOff,
  Images,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useGlassBg } from "../../hooks/useGlassBg";
import { MarkdownRenderer } from "../Markdown/MarkdownRenderer";
import {
  parseVisualReviewSections,
  type VisualReviewSection,
} from "../../utils/visualReviewSections";

/** 课件视图布局：列表（一图一行）/ 逐图（一屏一图） */
export type VisualReviewLayout = "list" | "focus";

interface VisualSummaryReviewViewProps {
  markdown: string;
  layout: VisualReviewLayout;
}

const revealPanelClass =
  "animate-fade-in border-t border-slate-200/80 px-4 py-4 dark:border-vnote-border/70";

// 与图文阅读一致：宽度撑满容器、高度按原始比例自适应，超大图限制在 80vh 内
const reviewImageClass = "rounded-lg w-full h-auto object-contain";
const reviewImageStyle = { maxHeight: "80vh" } as const;
const reviewImageWrapperClass = "flex w-full items-center justify-center";
// 图片容器撑满卡片内容区，并作为尺寸容器：翻页按钮随图片宽度等比缩放
const reviewImageStackClass = "relative @container flex w-full flex-col items-center gap-2";
// 左右翻页按钮对称贴边，尺寸随图片宽度缩放；默认半透明避免遮挡图片信息，悬停/聚焦时实显
const focusNavButtonClass =
  "absolute top-1/2 flex h-[clamp(26px,4.6cqw,40px)] w-[clamp(26px,4.6cqw,40px)] -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-slate-200/50 bg-white/55 text-slate-600 opacity-45 shadow-sm transition-[opacity,background-color,color] duration-200 hover:bg-white/90 hover:text-slate-800 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-20 dark:border-vnote-border/60 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:bg-slate-900/85 dark:hover:text-slate-100";
const focusNavButtonOffset = "left-[clamp(2px,0.6cqw,6px)]";
const focusNavButtonOffsetRight = "right-[clamp(2px,0.6cqw,6px)]";

export function VisualSummaryReviewView({ markdown, layout }: VisualSummaryReviewViewProps) {
  const glassCard = useGlassBg("card");

  const sections = useMemo(() => parseVisualReviewSections(markdown), [markdown]);

  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);

  // 逐图模式优先只看有截图的卡片，避免连续翻到纯文字页
  const orderedSections = useMemo(() => {
    const withImage = sections.filter((section) => section.images.length > 0);
    return withImage.length > 0 ? withImage : sections;
  }, [sections]);

  const safeFocusIndex =
    orderedSections.length === 0 ? 0 : Math.min(focusIndex, orderedSections.length - 1);
  const focusSection = orderedSections[safeFocusIndex];

  const toggleSection = (sectionIndex: number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  };

  if (sections.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-slate-500 dark:text-slate-400">
        <Images className="h-12 w-12 opacity-50" />
        <p className="text-base font-medium">暂无可展示的图片</p>
        <p className="max-w-md text-center text-sm">
          当前视觉化总结中没有解析到章节截图，请先回到图文模式确认内容。
        </p>
      </div>
    );
  }

  /** 展开后的内容区：标题 + 时间 + 段落正文（Markdown） */
  const renderRevealPanel = (section: VisualReviewSection) => (
    <div className={revealPanelClass}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold text-slate-800 dark:text-slate-100">
          {section.title || `第 ${section.index + 1} 段`}
        </h3>
        {section.timeRange && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/6 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {section.timeRange}
          </span>
        )}
      </div>

      {section.body ? (
        // 逐图模式：段落自然展开，避免与整页滚动叠加出第二根滚动条
        // 列表模式：保留段落内的独立滚动区，防止单个长章节把卡片撑得过高
        <div className={layout === "focus" ? undefined : "max-h-[46vh] overflow-y-auto pr-1"}>
          <MarkdownRenderer
            content={section.body}
            variant="compact"
            className="text-sm"
            enableTimestampRanges
            enableHashtags={false}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">本段没有文字内容</p>
      )}
    </div>
  );

  // ===== 逐图模式（一屏一图，自适应尺寸）=====
  if (layout === "focus" && focusSection) {
    const isExpanded = expandedKeys.has(focusSection.index);
    const totalFocusPages = orderedSections.length;

    return (
      // 逐图模式保留滚动（长段落可滚动查看），但隐藏滚动条
      <div className="flex h-full flex-col overflow-y-auto scrollbar-hide py-3">
        {/* 全宽展示，不再限制 max-w-5xl */}
        <div className="mx-auto flex w-full flex-col px-4">
          <div
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-vnote-border/80",
              glassCard
            )}
          >
            {/* 图片区域：左右两侧悬浮翻页按钮，始终固定在图片可视区内，不随段落展开位移 */}
            <div className="relative @container">
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleSection(focusSection.index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleSection(focusSection.index);
                  }
                }}
                className="relative flex cursor-pointer flex-col items-center gap-2 p-3"
              >
                {focusSection.images.length > 0 ? (
                  <div className={reviewImageStackClass}>
                    {focusSection.images.map((src, imageIndex) => (
                      <div key={`focus-image-${focusSection.index}-${imageIndex}`} className={reviewImageWrapperClass}>
                        <img
                          src={src}
                          alt={
                            focusSection.title
                              ? `${focusSection.title} 第 ${imageIndex + 1} 张截图`
                              : `第 ${safeFocusIndex + 1} 张截图`
                          }
                          className={reviewImageClass}
                          style={reviewImageStyle}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative flex w-full flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
                    <ImageOff className="h-10 w-10 opacity-60" />
                    本段无配图（纯文字）
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={safeFocusIndex === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  setFocusIndex(Math.max(0, safeFocusIndex - 1));
                }}
                title="上一张"
                aria-label="上一张"
                className={cn(focusNavButtonClass, focusNavButtonOffset)}
              >
                <ChevronLeft className="h-[55%] w-[55%]" />
              </button>
              <button
                type="button"
                disabled={safeFocusIndex >= totalFocusPages - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  setFocusIndex(Math.min(totalFocusPages - 1, safeFocusIndex + 1));
                }}
                title="下一张"
                aria-label="下一张"
                className={cn(focusNavButtonClass, focusNavButtonOffsetRight)}
              >
                <ChevronRight className="h-[55%] w-[55%]" />
              </button>
            </div>

            {isExpanded && renderRevealPanel(focusSection)}
          </div>
        </div>
      </div>
    );
  }

  // ===== 列表模式（一图一行，默认）=====
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto flex w-full flex-col gap-4">
        {sections.map((section) => {
          const isExpanded = expandedKeys.has(section.index);
          return (
            <article
              key={`review-card-${section.index}`}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/30 dark:border-vnote-border/80 dark:shadow-none",
                glassCard
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleSection(section.index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleSection(section.index);
                  }
                }}
                className="relative flex cursor-pointer flex-col items-center gap-2 p-3"
              >
                {section.images.length > 0 ? (
                  <div className={reviewImageStackClass}>
                    {section.images.map((src, imageIndex) => (
                      <div key={`review-image-${section.index}-${imageIndex}`} className={reviewImageWrapperClass}>
                        <img
                          src={src}
                          alt={
                            section.title
                              ? `${section.title} 第 ${imageIndex + 1} 张截图`
                              : `第 ${section.index + 1} 段截图`
                          }
                          loading="lazy"
                          className={reviewImageClass}
                          style={reviewImageStyle}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative flex h-40 w-full flex-col items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                    <ImageOff className="h-8 w-8 opacity-60" />
                    本段无配图（纯文字）
                  </div>
                )}
              </div>

              {isExpanded && renderRevealPanel(section)}
            </article>
          );
        })}
      </div>
    </div>
  );
}
