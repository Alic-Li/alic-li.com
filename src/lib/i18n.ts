export type Locale = 'en' | 'zh';
export const locales: Locale[] = ['en', 'zh'];
export const pathFor = (lang: Locale, path = '') =>
  `${lang === 'zh' ? '/zh' : ''}/${path}`;
const en = {
  nav: {
    home: 'Home',
    about: 'About',
    blog: 'Writing',
    projects: 'Projects',
    publications: 'Research',
    lab: 'Lab',
  },
  skip: 'Skip to content',
  language: 'Language',
  appearance: 'Appearance',
  switchToLight: 'Switch to light theme',
  switchToDark: 'Switch to dark theme',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  menu: 'Open navigation',
  close: 'Close',
  description:
    'Alic Li — open-source development, recurrent language models, GPU inference, and heterogeneous computing.',
  artCaption: 'RECURRENT MODELS · OPEN SOURCE',
  eyebrow: 'OPEN-SOURCE DEVELOPER · RWKV COMMUNITY',
  hero: 'Building intelligent systems,',
  heroAccent: 'from algorithms to silicon.',
  intro:
    'I’m Alic Li, an open-source developer working on recurrent language models, high-performance inference, and heterogeneous computing.',
  explore: 'Explore my work',
  aboutLink: 'A little about me',
  current: 'ON THE WORKBENCH',
  currentTitle: 'Thinking in sequences.',
  currentBody:
    'A small playground for exploring RWKV — one conversation at a time.',
  playground: 'Enter the playground',
  experimental: 'EXPERIMENT / 001',
  selected: 'A few places to start',
  selectedSub: 'Build. Understand. Share.',
  allWriting: 'All writing',
  writingLabel: 'FIELD NOTES',
  latest: 'Notes from the process',
  projectTitle: 'Built in the open',
  projectBody:
    'RWKV runtimes, training frameworks, and experiments with smaller recurrent models.',
  researchTitle: 'Questions worth asking',
  researchBody:
    'Multimodal learning with RWKV-7, alongside work in image reconstruction and enhancement.',
  labTitle: 'Room to experiment',
  labBody:
    'Try the RWKV playground and explore recurrent language models through conversation.',
  footer: 'Made with care. Always a work in progress.',
  back: 'Back to writing',
  read: 'Read note',
  emptyProjects:
    'Projects I maintain or contribute to, from recurrent model experiments to GPU inference and serving.',
  aboutResearch:
    'I also worked on image fusion and super-resolution under Dr. Hangyuan Lu. My multimodal research with ModRWKV was published at EMNLP 2025 as a main-conference oral presentation.',
  contact: 'Find me online',
  paper: 'Read paper',
  preprint: 'Preprint',
  researchDetail:
    'I contributed to a RWKV-7 multimodal framework exploring lightweight modality encoding and cross-modal feature fusion.',
  visionTitle: 'Image reconstruction & enhancement',
  visionBody:
    'Research experience in image fusion and super-resolution, and experiments applying RWKV TimeMix to low-light image enhancement in RetinexRWKV.',
  ravenAlt:
    'A raven in flight, with iridescent black, blue, violet, and teal feathers.',
  aboutTitle: 'Hello, I’m Alic.',
  aboutBody:
    'I’m Alic Li (李韦乐), an open-source developer based in Shanghai / Zhejiang. I’ve been involved in the RWKV community since high school, working across model architectures, training, and inference systems.',
  aboutSecond:
    'My work spans PyTorch experiments, C++ runtimes, and CUDA/HIP kernels on NVIDIA and AMD GPUs. I contribute to RWKV-7 training, quantized inference, and model serving, and maintain several related open-source projects.',
  blogTitle: 'Notes & observations.',
  blogBody: 'On software, systems, and the details that make them interesting.',
  projectsHeading: 'Things taking shape.',
  researchHeading: 'Models, modalities, and systems.',
  labHeading: 'Follow the curiosity.',
  labIntro:
    'A home for small, interactive experiments. Some useful. Some simply interesting.',
  source: 'View source',
  chatTitle: 'RWKV Playground',
  chatIntro: 'A quiet space to think with a language model.',
  model: 'Model',
  enableThinking: 'Enable thinking',
  thinking: 'Thinking…',
  reasoning: 'Reasoning',
  send: 'Send message',
  stop: 'Stop generating',
  clear: 'Clear conversation',
  placeholder: 'What are you curious about?',
  chatEmpty: 'Start with a question.',
  chatHint: 'Try asking how recurrent language models work.',
  privacy:
    'History stays in this browser. Messages are sent to the configured AI provider. Responses may be inaccurate.',
  loading: 'Connecting…',
  unavailable: 'The playground is not configured yet. Please come back later.',
  chatError: 'Could not complete the response. Please try again.',
  rateError: 'Too many requests. Please wait a minute.',
  you: 'You',
  assistant: 'Assistant',
  storageError:
    'Browser storage is unavailable. This conversation will not be saved.',
  notFound: 'This page wandered off.',
  notFoundBody: 'Let’s find our way back.',
  homeLink: 'Return home',
  translatedFallback: 'This note is available in English.',
};
type Dictionary = {
  [K in keyof typeof en]: (typeof en)[K] extends string
    ? string
    : { [P in keyof (typeof en)[K]]: string };
};
const zh: Dictionary = {
  nav: {
    home: '首页',
    about: '关于',
    blog: '文章',
    projects: '项目',
    publications: '研究',
    lab: '实验室',
  },
  skip: '跳转到正文',
  language: '语言',
  appearance: '外观',
  switchToLight: '切换为浅色',
  switchToDark: '切换为深色',
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
  menu: '打开导航',
  close: '关闭',
  description:
    'Alic Li 的个人博客，记录循环语言模型、GPU 推理与异构计算的研究和开源实践。',
  artCaption: '循环模型 · 开源实践',
  eyebrow: '开源开发者 · RWKV 社区',
  hero: '构建智能系统，',
  heroAccent: '从算法到芯片。',
  intro:
    '我是 Alic Li，一名开源开发者，主要关注循环语言模型、高性能推理与异构计算。',
  explore: '探索我的作品',
  aboutLink: '了解我',
  current: '正在探索',
  currentTitle: '在序列中思考。',
  currentBody: '一个探索 RWKV 的小小实验场，从一段对话开始。',
  playground: '进入实验场',
  experimental: '实验 / 001',
  selected: '从这里开始',
  selectedSub: '构建，理解，分享。',
  allWriting: '全部文章',
  writingLabel: '探索笔记',
  latest: '记录过程中的发现',
  projectTitle: '开放地构建',
  projectBody: 'RWKV 推理引擎、训练框架，以及轻量循环模型的探索。',
  researchTitle: '值得追问的问题',
  researchBody: '基于 RWKV-7 的多模态学习，以及图像重建与增强研究。',
  labTitle: '给探索一点空间',
  labBody: '在 RWKV 实验场中，通过对话了解循环语言模型。',
  footer: '用心构建，持续生长。',
  back: '返回文章列表',
  read: '阅读笔记',
  emptyProjects:
    '我维护或参与的开源项目，涵盖循环模型实验、GPU 推理与在线模型服务。',
  aboutResearch:
    '我也曾在卢航远博士指导下参与图像融合与超分辨率研究。参与的 ModRWKV 多模态研究成果发表于 EMNLP 2025 主会，并获口头报告。',
  contact: '联系与主页',
  paper: '阅读论文',
  preprint: '预印本',
  researchDetail:
    '参与基于 RWKV-7 的多模态框架研究，探索轻量化模态编码与跨模态特征融合。',
  visionTitle: '图像重建与增强',
  visionBody:
    '参与图像融合与超分辨率研究，并在 RetinexRWKV 中尝试将 RWKV TimeMix 用于低照度图像增强。',
  ravenAlt: '展翅飞翔的渡鸦，黑色羽毛泛着蓝色、紫色与青绿色光泽。',
  aboutTitle: '你好，我是 Alic。',
  aboutBody:
    '我是李韦乐（Alic Li），一名在上海与浙江生活的开源开发者。从高中起参与 RWKV 社区，持续探索模型架构、训练与推理系统。',
  aboutSecond:
    '我的工作涉及 PyTorch 模型实验、C++ 推理引擎，以及面向 NVIDIA 和 AMD GPU 的 CUDA/HIP 算子开发。我参与 RWKV-7 训练、量化推理与模型服务研发，并维护多个相关开源项目。',
  blogTitle: '笔记与观察。',
  blogBody: '关于软件、系统，以及那些有意思的细节。',
  projectsHeading: '让想法成形。',
  researchHeading: '模型、模态与系统。',
  labHeading: '跟随好奇心。',
  labIntro: '一些小小的交互实验。有些实用，有些只是有趣。',
  source: '查看源码',
  chatTitle: 'RWKV 实验场',
  chatIntro: '与语言模型一起思考的安静空间。',
  model: '模型',
  enableThinking: '深度思考',
  thinking: '正在思考…',
  reasoning: '思考过程',
  send: '发送消息',
  stop: '停止生成',
  clear: '清空对话',
  placeholder: '你在好奇什么？',
  chatEmpty: '从一个问题开始。',
  chatHint: '试着问问循环语言模型如何工作。',
  privacy:
    '历史记录保存在本浏览器。消息会发送至配置的 AI 服务商。回答可能不准确。',
  loading: '正在连接…',
  unavailable: '实验场尚未配置，请稍后再来。',
  chatError: '无法完成回答，请重试。',
  rateError: '请求过于频繁，请等待一分钟。',
  you: '你',
  assistant: '助手',
  storageError: '浏览器存储不可用，本次对话不会被保存。',
  notFound: '这一页迷路了。',
  notFoundBody: '一起回到起点吧。',
  homeLink: '返回首页',
  translatedFallback: '这篇笔记目前提供英文版本。',
};
export const dictionaries = { en, zh };
export const t = (lang: Locale) => dictionaries[lang];
export const htmlLang = (lang: Locale) => (lang === 'zh' ? 'zh-CN' : 'en');
