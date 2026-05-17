# 基于大语言模型的物种分布数据自动化清洗与提取方法研究

## 研究方案 (Research Plan)

---

## Abstract

Species distribution models (SDMs) are fundamental tools in ecology and biodiversity conservation, yet their reliability is critically dependent on the quality of species occurrence data. Current data cleaning workflows rely on rule-based tools (CoordinateCleaner, rgbif, biogeo) that require manual intervention and lack the flexibility to handle heterogeneous, multi-source data. This research proposes a novel approach that leverages fine-tuned large language models (LLMs) to automate the cleaning and extraction of species distribution data. Building on the vLLM framework for efficient model serving, we develop an intelligent pipeline that combines LLM-based semantic understanding of data fields, automated coordinate validation, taxonomic name resolution via GBIF backbone taxonomy, and spatial outlier detection. The system is deployed through a chat-based web interface (EcoQ) that enables researchers to interact with the pipeline through natural language, significantly lowering the technical barriers to high-quality data preparation. We propose a comprehensive evaluation framework encompassing coordinate quality metrics, taxonomic resolution accuracy, duplicate detection rates, and processing throughput. This research contributes to both the methodological advancement of AI-assisted ecological data curation and the practical democratization of robust SDM workflows.

**Keywords**: species distribution models, large language models, data cleaning, occurrence data, biodiversity informatics, vLLM, automated quality control

---

## 1. 研究背景与意义

### 1.1 物种分布模型的数据质量挑战

物种分布模型（Species Distribution Models, SDMs）是生态学、生物地理学和保护生物学领域最常用的分析工具之一。通过关联物种出现记录与环境变量，SDMs 能够预测物种的潜在分布范围，为保护规划、入侵物种管理和气候变化影响评估提供关键科学依据[1]。

然而，SDMs 的输出质量高度依赖输入数据的可靠性。物种出现记录通常来源于多个异构数据源：

- **全球生物多样性信息设施（GBIF）**：汇集超过 27 亿条物种出现记录，是全球最大的生物多样性数据门户
- **自然观察平台**（iNaturalist、eBird 等）：公民科学数据，标注质量参差不齐
- **博物馆标本数据库**：历史记录常存在地理编码缺失和分类学信息陈旧等问题
- **科学文献**：数据以非结构化形式散落在论文的表格和附录中

这些多源数据在整合使用前，必须经过严格的清洗流程，解决以下核心问题：

| 问题类别 | 具体表现 | 影响 |
|----------|----------|------|
| 坐标错误 | 经纬度反转、坐标落在海洋中、精度异常 | 模型空间预测偏差 |
| 分类学错误 | 同物异名未合并、错误鉴定、拼写错误 | 物种范围估计不当 |
| 数据重复 | 跨数据源重复记录、同一采集事件多次录入 | 模型过拟合伪重复 |
| 空间偏差 | 采样偏向道路/城市、地理覆盖不均 | 模型外推能力下降 |
| 时间异常 | 日期格式不一致、古生物与现代观测混合 | 时间维度分析失效 |

### 1.2 现有工具的局限性

当前主流的物种分布数据清洗工具包括：

- **CoordinateCleaner** (R包)：基于规则的坐标质量检查，包括机构坐标黑名单、首都坐标检测、GBIF总部坐标标记等[2]
- **rgbif** (R包)：GBIF 数据下载和基础清洗接口，提供分类学名称查找功能[3]
- **biogeo** (R包)：地理坐标验证和环境异常检测
- **bdchecks**：Darwin Core 标准化的数据质量检查工具
- **OpenRefine + 分类学插件**：通用的数据清洗工具配合分类学匹配

这些工具存在以下根本性局限：

1. **规则刚性**：所有清洗规则需人工预设，无法适应新出现的错误模式
2. **语义理解缺失**：无法理解字段语义进行自动映射（如识别 "scientific_name" 列的实际含义）
3. **领域知识不足**：无法利用生态学上下文判断异常（如某个物种已知海拔范围）
4. **交互门槛高**：主要基于 R/Python 脚本，对非编程背景的生态学者不够友好
5. **缺乏可解释性**：清洗决策过程不透明，研究者难以审计和信任自动化的清洗结果

### 1.3 大语言模型的变革潜力

近年来，大语言模型（LLMs）在数据处理领域展现出革命性的能力：

- **语义理解**：LLM 可以理解列的语义含义，自动建立异构数据源之间的字段映射
- **上下文推理**：结合领域知识判断数据异常的合理性（如"某热带物种出现在北极圈"可能为坐标错误而非新分布记录）
- **自然语言交互**：研究者可以通过对话式界面描述数据问题，LLM 自动生成清洗策略
- **可解释的决策**：LLM 可以输出清洗决策的理由，增强透明度和信任

然而，通用 LLM 缺乏生态学领域的专业知识，直接应用于物种数据清洗存在分类学名称幻觉、地理知识不足等问题。因此，本研究提出通过对 LLM 进行领域微调，构建专门面向生态学数据清洗的智能系统。

---

## 2. 国内外研究现状

### 2.1 生物多样性数据质量控制研究

生物多样性数据质量研究经历了从人工审核到半自动化工具的发展阶段。Chapman (2005) 首次系统化地提出了生物多样性数据质量的原则和框架[4]。此后，大量研究聚焦于特定质量维度：

- **坐标质量**：Zizka et al. (2019) 开发的 CoordinateCleaner 是目前最全面的坐标清洗工具，集成了 8 大类、超过 50 种质量检查规则[2]
- **分类学分辨率**：GBIF Backbone Taxonomy 提供了权威的分类学 backbone，但同物异名解析的覆盖率仍有不足
- **时空一致性**：Robertson et al. (2016) 提出了基于时空聚类的重复记录检测方法

近年来，机器学习方法开始被引入数据清洗领域。随机森林和支持向量机已被用于异常坐标检测，但这些方法仍需要人工特征工程，且缺乏迁移能力。

### 2.2 LLM 在科学数据处理中的应用

LLM 在科学领域的应用正在迅速扩展：

- **生物医学**：BioBERT、PubMedBERT 等预训练模型在生物医学文献挖掘和命名实体识别方面取得了突破
- **化学信息学**：ChemGPT 等模型展示了分子性质预测和反应条件推荐的潜力
- **地理空间分析**：GeoGPT 等项目探索了 LLM 在地理数据处理中的应用

然而，**在生物多样性信息学和物种分布数据处理领域，LLM 的应用研究尚属空白**。现有工作主要集中在传统的规则引擎和浅层机器学习方法上，缺乏利用 LLM 的语义理解能力进行智能数据清洗的系统性研究。

### 2.3 研究空白与本研究的切入点

综合以上分析，本研究识别出以下关键研究空白：

1. **缺乏针对生态学领域的 LLM 微调方案**：通用 LLM 在生态学专业术语和数据格式方面的表现尚未被系统评估
2. **LLM 辅助数据清洗的理论框架缺失**：如何将 LLM 的语义理解能力形式化为可验证的数据质量规则尚待探索
3. **交互式数据清洗界面的空白**：现有工具缺乏自然语言交互能力，使得领域专家难以高效参与数据清洗过程

本研究将从上述三个空白切入，构建完整的 LLM 辅助物种分布数据清洗方案。

---

## 3. 研究目标

本研究的总体目标是：**构建并验证基于大语言模型的物种分布数据自动化清洗与提取系统**。

具体目标包括：

1. **数据质量自动诊断**：开发 LLM 驱动的数据质量自动评估模块，能够识别异构数据源中常见的坐标、分类学、时空维度错误
2. **智能字段映射**：利用 LLM 的语义理解能力，自动将异构数据源的列名映射到 Darwin Core 标准词汇
3. **分类学名称智能解析**：基于 GBIF Backbone Taxonomy，实现 LLM 辅助的分类学名称校正和同物异名合并
4. **多维度异常检测**：构建融合地理空间规则和 LLM 上下文推理的混合异常检测框架
5. **对话式交互平台**：开发基于自然语言对话的 Web 应用，使生态学研究者能够以低门槛方式使用清洗工具
6. **可解释清洗决策**：确保 LLM 对每个清洗决策提供人类可理解的解释，增强透明度和审计能力

---

## 4. 研究方法与技术路线

### 4.1 系统总体架构

本研究采用分层架构设计，整体系统包含四层：

```
┌──────────────────────────────────────────────────────┐
│                    表示层 (Presentation)               │
│   EcoQ Web 对话界面 (Next.js + React + shadcn/ui)      │
│   ├─ 文件上传 (CSV/GeoJSON)                           │
│   ├─ 对话交互 (自然语言指令)                            │
│   ├─ 数据预览 (表格/地图可视化)                          │
│   └─ 清洗报告 (可解释决策日志)                           │
├──────────────────────────────────────────────────────┤
│                   服务层 (Service)                     │
│   REST API (Next.js API Routes)                      │
│   ├─ /api/chat — 对话接口                             │
│   ├─ /api/clean — 数据清洗接口                         │
│   └─ /api/validate — 分类学验证接口                     │
├──────────────────────────────────────────────────────┤
│                   引擎层 (Engine)                       │
│   vLLM 推理服务                                       │
│   ├─ 微调模型 (DeepSeek-V3/Qwen2.5 + 生态学语料)        │
│   ├─ 嵌入模型 (BGE-M3 用于分类学匹配)                    │
│   └─ 规则引擎 (GeoPandas + Shapely 空间检查)            │
├──────────────────────────────────────────────────────┤
│                   数据层 (Data)                         │
│   ├─ GBIF Backbone Taxonomy (分类学 backbone)          │
│   ├─ Natural Earth / GADM (行政边界)                   │
│   ├─ GEBCO (海洋/陆地掩膜)                              │
│   └─ WorldClim / CHELSA (环境数据交叉验证)              │
└──────────────────────────────────────────────────────┘
```

### 4.2 LLM 微调方案

#### 4.2.1 训练数据构建

本研究将构建面向生态学数据清洗的专业训练数据集：

- **字段映射语料**：收集 GBIF、iNaturalist、Movebank 等 20+ 数据源的元数据，构造 10,000+ 条字段名到 Darwin Core 术语的映射对
- **分类学语料**：基于 GBIF Backbone Taxonomy 和 Catalogue of Life，构造分类学名称修正和同义名识别的训练样本
- **异常检测语料**：从 GBIF 中采样 100,000 条记录，人工标注坐标错误、分类学错误、重复记录等标签
- **清洗指令语料**：编写 500 种物种数据清洗的自然语言指令-响应对，覆盖各类数据质量问题的处理场景

#### 4.2.2 微调策略

采用以下微调策略：

1. **基座模型选择**：选用 DeepSeek-V3 或 Qwen2.5-7B 作为基座模型，权衡推理效率和专业性能
2. **LoRA 高效微调**：使用 LoRA (Low-Rank Adaptation) 技术进行参数高效微调，rank=64, alpha=128
3. **多任务训练**：同时训练字段映射、名称解析、异常检测三个任务，共享底层表示
4. **vLLM 推理优化**：使用 vLLM 框架进行模型部署，实现 PagedAttention 高吞吐量推理

### 4.3 核心清洗算法

#### 4.3.1 基于 LLM 的字段语义映射

```
输入：CSV 列名 ["species", "lat", "long", "date_obs"]
输出：Darwin Core 映射 {"species": "scientificName", "lat": "decimalLatitude", ...}

算法流程：
1. 提取数据源的所有列名
2. LLM 分析每个列名的语义含义
3. 与 Darwin Core 标准词汇进行匹配
4. 输出置信度得分和映射建议
5. 人工确认或自动应用高置信度映射
```

#### 4.3.2 混合坐标验证

```
算法流程：
├─ 规则层（确定性检查）
│   ├─ 坐标边界检查 (-90≤lat≤90, -180≤lng≤180)
│   ├─ lat/lng 互换检测
│   ├─ 海洋/陆地点位交叉验证
│   ├─ 行政中心坐标匹配
│   └─ 粗精度坐标标记 (|lat| 或 |lng| 小数位数<2)
└─ LLM 层（上下文推理）
    ├─ 物种已知分布范围对比
    ├─ 海拔-坐标一致性检查
    ├─ 国家/省声明的空间一致性
    └─ 物种栖息地类型与坐标环境的匹配
```

#### 4.3.3 分类学智能解析

```
算法流程：
1. LLM 预处理：拼写纠错、命名人提取、分类层级推断
2. 精确匹配：查询 GBIF Backbone Taxonomy API
3. 模糊匹配：基于编辑距离和嵌入相似度进行模糊查找
4. 同义名解析：调用 GBIF Species API 获取 accepted name
5. LLM 后处理：对 API 返回多个候选时进行上下文择优
6. 置信度评分：综合匹配得分，标记高/中/低置信度结果
```

### 4.4 对话式 Web 应用

已基于 Next.js + React + shadcn/ui 构建了 EcoQ 对话式 Web 应用框架（位于 `E:\ChatQ\src`），核心功能包括：

- **会话管理**：支持多轮对话和对话历史
- **文件上传与解析**：支持 CSV/GeoJSON 格式，自动解析并预览数据
- **Markdown 渲染**：支持表格、列表等富文本清洗报告
- **数据预览组件**：分页展示清洗前后的数据对比
- **暗色模式**：支持亮色/暗色主题切换

后续将集成：
- **地图可视化**：基于 Leaflet/MapLibre 的交互式物种分布地图
- **清洗历史面板**：记录所有清洗操作的审计日志
- **批量处理队列**：支持大规模数据的异步清洗任务

---

## 5. 实验设计与评价指标

### 5.1 数据集

本研究将使用以下数据集进行实验：

| 数据集 | 来源 | 记录数 | 用途 |
|--------|------|--------|------|
| GBIF 标准测试集 | GBIF.org | 100,000 | 清洗算法评估 |
| CoordinateCleaner 测试集 | Zizka et al. (2019) | 14,000 | 坐标质量对比 |
| 人工标注黄金标准 | 本研究构建 | 5,000 | 分类学/字段映射评估 |
| 多源混合数据集 | GBIF + iNaturalist + 文献 | 20,000 | 跨源清洗评估 |

### 5.2 评价指标

| 指标类别 | 具体指标 | 计算方法 |
|----------|----------|----------|
| **坐标质量** | 海洋点检出率 (Recall) | TP_marine / (TP_marine + FN_marine) |
| | 坐标反转检出率 | 正确检出的反转坐标 / 总反转坐标 |
| | 假阳性率 | FP / (FP + TN) |
| **分类学解析** | 同义名合并准确率 | 正确合并数 / 应合并总数 |
| | 名称修正正确率 | 正确修正数 / 总修正数 |
| | 模糊匹配 Top-1 命中率 | Top-1 正确 / 总查询数 |
| **去重效果** | 重复检出率 (Recall) | TP_dup / (TP_dup + FN_dup) |
| | 去重精确率 (Precision) | TP_dup / (TP_dup + FP_dup) |
| **效率** | 处理吞吐量 | records/second |
| | LLM 推理延迟 | ms/record |
| **可用性** | 数据保留率 | 清洗后有效记录数 / 原始记录数 |
| | 用户满意度 | SUS 量表评分 |

### 5.3 对比实验

- **Baseline 1**：CoordinateCleaner + rgbif 传统 R 脚本工作流
- **Baseline 2**：GPT-4o（未微调）直接清洗
- **Baseline 3**：Claude 3.5 Sonnet（未微调）直接清洗
- **Proposed**：EcoQ（微调后的 DeepSeek-V3/Qwen2.5 + 混合管道）

---

## 6. 预期成果与创新点

### 6.1 预期成果

1. **EcoQ 系统原型**：完整的智能物种分布数据清洗平台，包含对话式 Web 界面和微调后的 LLM 推理服务
2. **学术论文 2 篇**：
   - 方法论文：描述 LLM 驱动的物种数据清洗方法（拟投 Ecological Informatics 或 Methods in Ecology and Evolution）
   - 应用论文：EcoQ 在大规模物种分布数据处理中的实证研究（拟投 Biodiversity Data Journal）
3. **开源代码与模型**：在 GitHub 开源全部代码、微调模型权重和训练数据
4. **可分发 Skill**：将 EcoQ 封装为 Claude Code Skill，可通过 `npx skills add` 一键安装

### 6.2 创新点

1. **首次将 LLM 微调技术应用于物种分布数据清洗领域**，填补了生物多样性信息学与 AI 交叉领域的方法空白
2. **提出了"规则引擎 + LLM 推理"的混合清洗架构**，结合了确定性规则的高效性和 LLM 的语义灵活性
3. **构建了面向生态学数据处理的多任务训练策略**，通过字段映射、名称解析、异常检测三任务联合训练提升模型泛化能力
4. **开创了对话式生物多样性数据清洗的交互范式**，显著降低了领域专家使用数据清洗工具的技术门槛

---

## 7. 时间安排与里程碑

| 阶段 | 时间 | 里程碑 | 交付物 |
|------|------|--------|--------|
| 第一阶段 | 第 1-2 个月 | 需求分析与数据准备 | 训练数据集、标注规范、系统设计文档 |
| 第二阶段 | 第 3-4 个月 | LLM 微调与引擎开发 | 微调模型、规则引擎、API 接口 |
| 第三阶段 | 第 5-6 个月 | Web 界面完善与集成 | 完整 EcoQ 系统、使用文档 |
| 第四阶段 | 第 7-8 个月 | 实验评估与论文撰写 | 实验数据、方法论文初稿 |
| 第五阶段 | 第 9-10 个月 | 论文投稿与 Skill 发布 | 两篇投稿论文、EcoQ Skill |
| 第六阶段 | 第 11-12 个月 | 修订与推广 | 论文修订稿、开源社区建设 |

---

## 8. 参考文献

[1] Elith, J., & Leathwick, J. R. (2009). Species distribution models: ecological explanation and prediction across space and time. *Annual Review of Ecology, Evolution, and Systematics*, 40, 677-697.

[2] Zizka, A., Silvestro, D., Andermann, T., et al. (2019). CoordinateCleaner: Standardized cleaning of occurrence records from biological collection databases. *Methods in Ecology and Evolution*, 10(5), 744-751.

[3] Chamberlain, S., Barve, V., McGlinn, D., et al. (2021). rgbif: Interface to the Global Biodiversity Information Facility API. R package version 3.7.0.

[4] Chapman, A. D. (2005). Principles of Data Quality. *Global Biodiversity Information Facility*, Copenhagen.

[5] Robertson, T., Doring, M., Guralnick, R., et al. (2014). The GBIF Integrated Publishing Toolkit: facilitating the efficient publishing of biodiversity data on the internet. *PLOS ONE*, 9(8), e102623.

[6] Wieczorek, J., Bloom, D., Guralnick, R., et al. (2012). Darwin Core: an evolving community-developed biodiversity data standard. *PLOS ONE*, 7(1), e29715.

[7] Kwon, W., Li, Z., Zhuang, S., et al. (2023). Efficient memory management for large language model serving with PagedAttention. *Proceedings of SOSP '23*.

[8] Hu, E. J., Shen, Y., Wallis, P., et al. (2022). LoRA: Low-Rank Adaptation of Large Language Models. *ICLR 2022*.

---

## 附录：项目目录结构

```
E:\ChatQ\
├── research/
│   ├── data-cleaning-pipeline.md    # 数据清洗流程研究
│   └── research-plan.md             # 本研究方案
├── src/                             # EcoQ Web 应用 (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # 主聊天页面
│   │   │   ├── layout.tsx           # 根布局 (含侧边栏)
│   │   │   └── api/chat/route.ts    # 对话 API 接口
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatArea.tsx     # 主聊天区域
│   │   │   │   ├── ChatInput.tsx    # 输入组件 (含文件上传)
│   │   │   │   ├── MessageList.tsx  # 消息列表
│   │   │   │   ├── Sidebar.tsx      # 侧边栏
│   │   │   │   └── DataPreview.tsx  # 数据预览组件
│   │   │   └── ui/                  # shadcn/ui 组件
│   │   ├── lib/
│   │   │   ├── store.ts             # Zustand 状态管理
│   │   │   ├── types.ts             # TypeScript 类型
│   │   │   └── utils.ts             # 工具函数
│   │   └── app/globals.css          # 全局样式 (自然主题)
│   └── package.json
├── data/                            # 测试数据目录
├── skills/                          # Skill 打包目录
├── CLAUDE.md                        # Claude Code 项目指南
└── README.md                        # 项目说明
```

---

> **文档版本**: v1.0 | **日期**: 2026-05-16 | **作者**: DawningAn
