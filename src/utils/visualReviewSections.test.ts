import { describe, it, expect } from "vitest";
import {
  countVisualReviewImages,
  parseVisualReviewSections,
} from "./visualReviewSections";

const SAMPLE_MARKDOWN = `# 开场介绍 (0:00 - 1:30)

![开场介绍](asset://localhost/a.png)

大家好，今天我们介绍课程的整体结构。

---

## 核心概念 (1:30 - 4:00)

![核心概念](asset://localhost/b.png)

这一节讲解三个核心概念，请重点理解它们的区别。

- 概念一：基础定义
- 概念二：常见误区

---

## 案例分析 (4:00 - 6:20)

![案例一](asset://localhost/c.png)

![案例二](asset://localhost/d.png)

结合案例回顾前面的知识点。
`;

describe("parseVisualReviewSections", () => {
  it("should return empty array for empty markdown", () => {
    expect(parseVisualReviewSections("")).toEqual([]);
    expect(parseVisualReviewSections("   \n\n  ")).toEqual([]);
  });

  it("should split markdown into one section per heading", () => {
    const sections = parseVisualReviewSections(SAMPLE_MARKDOWN);

    expect(sections).toHaveLength(3);
    expect(sections.map((section) => section.title)).toEqual([
      "开场介绍",
      "核心概念",
      "案例分析",
    ]);
    expect(sections.map((section) => section.level)).toEqual([1, 2, 2]);
    expect(sections.map((section) => section.index)).toEqual([0, 1, 2]);
  });

  it("should extract time ranges and start time", () => {
    const [first, second] = parseVisualReviewSections(SAMPLE_MARKDOWN);

    expect(first.timeRange).toBe("0:00 - 1:30");
    expect(first.startTime).toBe(0);
    expect(second.timeRange).toBe("1:30 - 4:00");
    expect(second.startTime).toBe(90);
  });

  it("should keep images inside their own section", () => {
    const sections = parseVisualReviewSections(SAMPLE_MARKDOWN);

    expect(sections[0].images).toEqual(["asset://localhost/a.png"]);
    expect(sections[1].images).toEqual(["asset://localhost/b.png"]);
    expect(sections[2].images).toEqual([
      "asset://localhost/c.png",
      "asset://localhost/d.png",
    ]);
    expect(countVisualReviewImages(sections)).toBe(4);
  });

  it("should remove horizontal rules and keep body markdown", () => {
    const sections = parseVisualReviewSections(SAMPLE_MARKDOWN);

    expect(sections[0].body).toBe("大家好，今天我们介绍课程的整体结构。");
    expect(sections[1].body).toContain("- 概念一：基础定义");
    expect(sections[2].body).not.toContain("![");
    expect(sections.every((section) => !section.body.includes("---"))).toBe(true);
  });

  it("should keep heading when it has no time range", () => {
    const sections = parseVisualReviewSections("## 无时间戳章节\n\n正文内容\n");

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("无时间戳章节");
    expect(sections[0].timeRange).toBeNull();
    expect(sections[0].startTime).toBeNull();
    expect(sections[0].body).toBe("正文内容");
  });

  it("should keep content before the first heading as an untitled section", () => {
    const sections = parseVisualReviewSections(
      "题记内容\n\n![封面](asset://localhost/cover.png)\n\n# 第一章 (0:10 - 2:00)\n\n正文\n"
    );

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("");
    expect(sections[0].body).toBe("题记内容");
    expect(sections[0].images).toEqual(["asset://localhost/cover.png"]);
    expect(sections[1].title).toBe("第一章");
  });

  it("should not treat markdown inside code blocks as headings or images", () => {
    const sections = parseVisualReviewSections(
      "# 代码讲解 (0:00 - 1:00)\n\n```md\n# 这不是标题\n![不是图片](x.png)\n```\n\n正文\n"
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].images).toEqual([]);
    expect(sections[0].body).toContain("# 这不是标题");
    expect(sections[0].body).toContain("![不是图片](x.png)");
  });

  it("should support image titles and alt text", () => {
    const sections = parseVisualReviewSections(
      '# 章节 (0:00 - 1:00)\n\n![示意图](asset://localhost/a.png "说明文字")\n'
    );

    expect(sections[0].images).toEqual(["asset://localhost/a.png"]);
  });
});

describe("countVisualReviewImages", () => {
  it("should sum images across sections", () => {
    expect(countVisualReviewImages([])).toBe(0);
    expect(
      countVisualReviewImages([
        { index: 0, level: 1, title: "", timeRange: null, startTime: null, images: ["a"], body: "" },
        { index: 1, level: 1, title: "", timeRange: null, startTime: null, images: ["b", "c"], body: "" },
      ])
    ).toBe(3);
  });
});
