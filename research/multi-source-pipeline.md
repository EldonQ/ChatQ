# 多源物种分布数据清洗方案

## 数据源矩阵

| 数据源 | 类型 | API | 记录量级 | 特点 |
|--------|------|-----|---------|------|
| **GBIF** | 聚合门户 | REST | 27亿+ | 最全面，包含 museum + citizen science |
| **iNaturalist** | 公民科学 | REST | 2亿+ | 图片验证，质量较高 |
| **eBird** | 公民科学(鸟类) | REST | 10亿+ | 鸟类专项，时空覆盖好 |
| **OBIS** | 海洋生物 | REST | 6000万+ | 海洋物种权威来源 |
| **VertNet** | 脊椎动物标本 | REST | 2500万+ | 博物馆标本数字化 |
| **文献提取** | 非结构化 | 手动/AI | 不定 | 补充稀有和古生物记录 |
| **用户上传** | CSV/GeoJSON | 本地 | 不定 | 自有数据 |

## 多源融合清洗流水线

```
用户输入物种名
       │
       ├─→ GBIF API ─────→ 300 records
       ├─→ iNaturalist API → 200 records
       └─→ 用户上传文件 ──→ N records
              │
              ▼
        ┌──────────────────────┐
        │   去重引擎 (Deduplication)    │
        │   跨源重复检测          │
        │   - 精确匹配 (species + lat + lng + date)  │
        │   - 模糊匹配 (spatial buffer + time window)  │
        │   - 优先级: research-grade > casual │
        └──────────────────────┘
              │
              ▼
        ┌──────────────────────┐
        │   字段标准化 (Normalization)   │
        │   → Darwin Core 统一映射      │
        │   null → "unknown" for required fields │
        └──────────────────────┘
              │
              ▼
        ┌──────────────────────┐
        │   坐标清洗 (Coordinate Cleaning)  │
        │   - 边界检查           │
        │   - 海洋/陆地交叉验证    │
        │   - 坐标精度标记        │
        │   - 行政中心黑名单过滤   │
        └──────────────────────┘
              │
              ▼
        ┌──────────────────────┐
        │   分类学清洗 (Taxonomic Cleaning)│
        │   - GBIF Backbone 名称匹配    │
        │   - 同物异名合并        │
        │   - 拼写纠错            │
        │   - 高层级分类补充       │
        └──────────────────────┘
              │
              ▼
        ┌──────────────────────┐
        │   空间稀疏化 (Spatial Thinning) │
        │   - 网格单元 (0.1° × 0.1°)   │
        │   - 每单元保留 N=1       │
        │   - 优先保留 research-grade │
        └──────────────────────┘
              │
              ▼
        清洗后统一数据集 (CSV/GeoJSON/Parquet)
              │
              ▼
        地图可视化 (Folium/Leaflet)
```

## 数据优先级策略

清洗去重时按以下优先级保留记录：
1. **research-grade** (iNaturalist) / **HUMAN_OBSERVATION** verified
2. **PRESERVED_SPECIMEN** (博物馆标本, 可追溯)
3. **OBSERVATION** (未验证的观察)
4. **FOSSIL_SPECIMEN** (古生物记录)
5. **LIVING_SPECIMEN** (人工环境, 排除用于SDM)
