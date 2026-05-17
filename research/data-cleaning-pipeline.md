# 物种分布数据自动化清洗提取方案研究

## 1. 背景与问题定义

物种分布模型（Species Distribution Models, SDMs）依赖大规模物种出现记录（occurrence data）和环境变量数据。原始数据通常来源于：

| 数据源 | 格式 | 典型问题 |
|--------|------|----------|
| GBIF (全球生物多样性信息设施) | Darwin Core Archive / CSV | 坐标精度不均、分类学错误、重复记录 |
| iNaturalist | CSV / JSON API | 坐标模糊化、公民科学标注质量参差 |
| 博物馆标本记录 | 结构化文本 / 数据库 | 地理编码缺失、历史地名与现地名不匹配 |
| 文献提取 | PDF / 表格 | 非结构化数据、OCR 错误 |
| 遥感/环境栅格 | GeoTIFF / NetCDF | 分辨率不一致、投影体系混杂 |

## 2. 物种分布数据主要质量问题

### 2.1 坐标几何错误
- 经纬度反转（lat/lng 互换）
- 坐标落在海洋/水体中（陆地物种）
- 坐标精度过高或过低（小数点位数异常）
- 落在行政中心、研究机构等非自然位置
- 坐标值超出有效范围（lat > 90 或 lng > 180）

### 2.2 分类学错误
- 同物异名（synonyms）未合并
- 错误鉴定导致的错误记录
- 分类层级不一致（属、种、亚种混用）
- 名称拼写错误、命名人缩写不统一

### 2.3 数据重复与冗余
- 同一采集事件的多条记录
- 跨数据源的重复记录（GBIF + iNaturalist 同时收录）
- 时间和空间粒度过细的冗余采样

### 2.4 空间偏差
- 采样偏差（道路、城市附近采样密度过高）
- 地理覆盖不均（发达国家数据远多于发展中国家）
- 保护区偏向（protected area bias）

### 2.5 时间维问题
- 日期格式不一致（日/月/年 vs 月/日/年）
- 超出时间范围的无效日期
- 古生物数据与现代观测混合

## 3. 数据清洗标准化流程

### 阶段一：格式解析与标准化

```
原始数据 → 格式识别 → Darwin Core 标准化 → 字段映射 → 标准化 DataFrame
```

**关键操作**：
- 自动检测输入格式（CSV、JSON、GeoJSON、Shapefile、Excel）
- 字段名自动映射到 Darwin Core 标准词汇
- 字符编码检测与转换（UTF-8、Latin-1 等）
- 缺失值检测与标记

### 阶段二：坐标空间质量检查

```python
# 核心检查项目
1. 坐标边界检查：-90 ≤ lat ≤ 90, -180 ≤ lng ≤ 180
2. 坐标精度检查：有效小数位数
3. 陆地/海洋交叉验证（使用 Natural Earth 或 GADM 海岸线数据）
4. 行政中心/机构坐标黑名单过滤
5. 国家/省/县归属一致性验证（坐标落在声明的行政区内）
6. 海拔异常检测（与 DEM 数据交叉验证）
```

### 阶段三：分类学清洗

```python
# 核心检查项目
1. 名称拼写自动修正（基于权威名录如 GBIF Backbone Taxonomy）
2. 同物异名自动合并（synonym resolution）
3. 分类层级一致性验证（界-门-纲-目-科-属-种 链式验证）
4. 模糊匹配容错（Levenshtein 距离 < 3）
```

### 阶段四：重复检测与去重

```
- 精确匹配去重（所有字段完全一致）
- 模糊匹配去重（物种 + 坐标 + 日期在阈值内）
- 跨数据源去重（基于时空物种复合键）
- 基于DBSCAN的时空聚类去重
```

### 阶段五：空间偏差校正

```
- 稀疏化（spatial thinning）：按网格单元只保留N条记录
- 环境偏差评估：MESS (Multivariate Environmental Similarity Surfaces)
- 采样偏差图层生成（kernel density estimation）
```

## 4. 基于 AI/LLM 的智能清洗方案

### 4.1 LLM 在数据清洗中的应用场景

| 场景 | 传统方法 | LLM 方法 | 优势 |
|------|----------|----------|------|
| 字段映射 | 手工编写映射规则 | LLM 理解字段语义自动推断 | 无需预定义规则 |
| 地名解析 | 地名辞典 | LLM 理解描述文本 + 地理编码 | 处理模糊描述 |
| 分类学纠错 | 规则匹配 | LLM 上下文理解拼写错误 | 容错率高 |
| 异常解释 | 统计阈值 | LLM 分析异常原因 | 提供可解释性 |
| 数据溯源 | 人工 | LLM 自动提取引用/采集信息 | 自动化 |

### 4.2 推荐的 AI Pipeline 架构

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  原始数据     │ → │  LLM 预处理器     │ → │  规则引擎清洗    │
│  (多源异构)   │    │  - 格式识别       │    │  - 坐标检查      │
└──────────────┘    │  - 字段映射       │    │  - 分类学匹配    │
                    │  - 语义提取       │    │  - 去重          │
                    └──────────────────┘    └─────────────────┘
                                                     │
┌──────────────┐    ┌──────────────────┐             │
│  清洗后数据   │ ← │  人工审查界面     │ ← ─ ─ ─ ─ ─ ┘
│  (标准格式)   │    │  (对话式操作)     │
└──────────────┘    └──────────────────┘
```

### 4.3 核心技术选型

- **LLM 微调**：使用 vLLM 框架微调开源模型（如 Qwen2.5、DeepSeek-V3）针对生态学领域
- **嵌入模型**：用于分类学名称近似匹配（sentence-transformers）
- **地理处理**：GeoPandas + Shapely + rasterio
- **分类学 backbone**：GBIF Backbone Taxonomy API + pygbif
- **交互界面**：Next.js + React + shadcn/ui 对话式 Web 应用

## 5. 评价指标体系

| 指标类别 | 具体指标 | 计算方法 |
|----------|----------|----------|
| 坐标质量 | 海洋点检出率 | TP/(TP+FN) |
| 分类学 | 同义名合并率 | 合并数/应合并总数 |
| 去重 | 重复检出率 | TP/(TP+FP) |
| 精度 | 错误标记假阳性率 | FP/(FP+TN) |
| 效率 | 处理吞吐量 | records/second |
| 完整性 | 数据保留率 | 清洗后记录数/原始记录数 |

## 6. 参考文献与资源

- GBIF Backbone Taxonomy: https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c
- Darwin Core Standard: https://dwc.tdwg.org/
- Chamberlain, S. et al. (2021). rgbif: Interface to the Global Biodiversity Information Facility API. R package.
- Zizka, A. et al. (2019). CoordinateCleaner: Standardized cleaning of occurrence records. Methods in Ecology and Evolution.
- Robertson, T. et al. (2014). The GBIF Integrated Publishing Toolkit. PLOS ONE.
