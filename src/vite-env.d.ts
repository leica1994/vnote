/// <reference types="vite/client" />

// 应用图标（打包图标目录，经 vite 的 @icons 别名引用）
declare module "@icons/*.png" {
  const src: string;
  export default src;
}

declare module "@icons/*.svg" {
  const src: string;
  export default src;
}

// simple-mind-map 插件类型声明
declare module "simple-mind-map/src/plugins/NodeImgAdjust.js" {
  const NodeImgAdjust: any;
  export default NodeImgAdjust;
}
