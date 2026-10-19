import type { Locale } from './i18n';

// Project details and contribution scope are drawn from Alic's resume.
const projects = [
  {
    name: 'RWKV Lightning CUDA',
    url: 'https://github.com/Alic-Li/rwkv_lightning_cuda',
    stack: 'C++ · CUDA · HIP · Go',
    en: 'Maintainer and core developer of a native C++ RWKV-7 runtime for NVIDIA CUDA and AMD ROCm, without a PyTorch runtime dependency. Includes W8A16/W4A16 inference, continuous batching, streaming, and tiered state caching.',
    zh: '作为维护者与核心开发者，开发原生 C++ RWKV-7 推理引擎，支持 NVIDIA CUDA 与 AMD ROCm，无需 PyTorch 运行时。实现 W8A16/W4A16 量化推理、连续批处理、流式生成与分层状态缓存。',
  },
  {
    name: 'ModRWKV / WorldRWKV',
    url: 'https://github.com/Joluck/mod-rwkv',
    stack: 'Python · PyTorch · RWKV-7',
    en: 'Contributed to multimodal RWKV-7 research on lightweight modality encoding and cross-modal feature fusion. Published at EMNLP 2025, main conference, oral presentation.',
    zh: '参与 RWKV-7 多模态研究，探索轻量化模态编码与跨模态特征融合。成果发表于 EMNLP 2025 主会，并获口头报告。',
  },
  {
    name: 'RWKV-LM-V7',
    url: 'https://github.com/RWKV-Vibe/RWKV-LM-V7',
    stack: 'Python · PyTorch · CUDA · ROCm',
    en: 'Contribute to training framework maintenance, GPU kernel adaptation, and RWKV-7 experiments, including CUDA/ROCm multi-GPU training, BF16 computation, and fine-tuning.',
    zh: '参与 RWKV-7 训练框架维护、GPU 算子适配与训练实验，支持 CUDA/ROCm 多 GPU 训练、BF16 计算及模型微调。',
  },
  {
    name: 'RWKV Lightning',
    url: 'https://github.com/RWKV-Vibe/rwkv_lightning',
    stack: 'Python · PyTorch · CUDA · ROCm',
    en: 'Contribute to batched inference, streaming generation, and recurrent state management, alongside CUDA/HIP backend adaptation and quantized inference optimization.',
    zh: '参与批量推理框架研发，涉及流式生成、连续批处理、循环状态管理，以及 CUDA/HIP 后端适配与量化推理优化。',
  },
  {
    name: 'Mini RWKV-7',
    url: 'https://github.com/Alic-Li/Mini_RWKV_7',
    stack: 'Python · PyTorch',
    en: 'Implemented training and inference for an approximately 34M-parameter RWKV-7 model, exploring Deep Embedding and Deep Embedding Attention architectures.',
    zh: '实现约 3400 万参数 RWKV-7 模型的完整训练与推理流程，探索 Deep Embedding 和 Deep Embedding Attention 等轻量模型架构。',
  },
  {
    name: 'RetinexRWKV',
    url: 'https://github.com/Alic-Li/RetinexRWKV',
    stack: 'Python · PyTorch',
    en: 'Introduced RWKV TimeMix into Retinexformer to explore recurrent networks for low-light image enhancement and restoration.',
    zh: '将 RWKV TimeMix 引入 Retinexformer，探索循环网络在低照度图像增强与图像恢复中的应用。',
  },
];
export const projectsFor = (lang: Locale) =>
  projects.map((project) => ({ ...project, description: project[lang] }));
