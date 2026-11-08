/**
 * 视觉化总结「图片复习模式」解析工具
 * 将视觉化总结的 Markdown 拆分为「一图一段」的复习卡片数据：
 * - 每张卡片只保留截图，标题与正文默认隐藏
 * - 用户点击卡片后再展开标题与段落内容
 */

import { cleanMarkdownText, parseTimestampToSeconds } from "./markdownRendererUtils";

export interface VisualReviewSection {
  /** 卡片序号（从 0 开始，用于展示序号与展开状态追踪） */
  index: number;
  /** 原 Markdown 标题层级 */
  level: number;
  /** 标题（已清理时间戳、图片等装饰内容；首段无标题时为空字符串） */
  title: string;
  /** 时间范围文本，例如 "3:12 - 5:40" */
  timeRange: string | null;
  /** 时间范围起点（秒），用于点击时间戳跳转视频 */
  startTime: number | null;
  /** 本节包含的截图地址 */
  images: string[];
  /** 本节正文（Markdown，已移除分隔线） */
  body: string;
}

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/;
const HEADING_TIME_RANGE_RE =
  /\s*[（(]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[)）]\s*$/;
const IMAGE_LINE_RE = /^\s*!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)\s*$/;
const HORIZONTAL_RULE_RE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;

interface SectionBuilder {
  level: number;
  title: string;
  timeRange: string | null;
  startTime: number | null;
  images: string[];
  bodyLines: string[];
}

/**
 * 将视觉化总结 Markdown 解析为复习卡片列表。
 * 标题行开启新卡片，其后的图片与文本归入该卡片；
 * 第一个标题之前的内容会作为一张无标题卡片保留。
 */
export function parseVisualReviewSections(markdown: string): VisualReviewSection[] {
  if (!markdown || !markdown.trim()) return [];

  const sections: VisualReviewSection[] = [];
  const lines = markdown.split(/\r?\n/);

  let builder: SectionBuilder | null = null;
  let inCodeBlock = false;

  const flush = () => {
    if (!builder) return;

    const body = builder.bodyLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (builder.title || builder.images.length > 0 || body) {
      sections.push({
        index: sections.length,
        level: builder.level,
        title: builder.title,
        timeRange: builder.timeRange,
        startTime: builder.startTime,
        images: builder.images,
        body,
      });
    }

    builder = null;
  };

  const ensureBuilder = (): SectionBuilder => {
    if (!builder) {
      const created: SectionBuilder = {
        level: 1,
        title: "",
        timeRange: null,
        startTime: null,
        images: [],
        bodyLines: [],
      };
      builder = created;
      return created;
    }
    return builder;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 代码块内的内容原样保留，避免把代码里的 # 或图片语法误判为标题/图片
    if (/^(```|~~~)/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      ensureBuilder().bodyLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      ensureBuilder().bodyLines.push(line);
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flush();

      const level = headingMatch[1].length;
      const rawTitle = headingMatch[2].trim();
      const timeRangeMatch = rawTitle.match(HEADING_TIME_RANGE_RE);
      const titleText = timeRangeMatch
        ? rawTitle.slice(0, timeRangeMatch.index).trim()
        : rawTitle;

      builder = {
        level,
        title: cleanMarkdownText(titleText),
        timeRange: timeRangeMatch ? `${timeRangeMatch[1]} - ${timeRangeMatch[2]}` : null,
        startTime: timeRangeMatch ? parseTimestampToSeconds(timeRangeMatch[1]) : null,
        images: [],
        bodyLines: [],
      };
      continue;
    }

    // 章节分隔线不参与展示
    if (HORIZONTAL_RULE_RE.test(line)) continue;

    // 标题前没有内容时，忽略开头的空行
    if (!builder && trimmed === "") continue;

    const target = ensureBuilder();
    const imageMatch = line.match(IMAGE_LINE_RE);
    if (imageMatch) {
      target.images.push(imageMatch[1].trim());
      continue;
    }

    target.bodyLines.push(line);
  }

  flush();

  return sections;
}

/**
 * 统计复习卡片中的截图总数
 */
export function countVisualReviewImages(sections: VisualReviewSection[]): number {
  return sections.reduce((total, section) => total + section.images.length, 0);
}
