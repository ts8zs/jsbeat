# Jubeat Simulator - jubeat模拟器

一个基于Pixi.js的现代化jubeat音乐游戏模拟器，支持PC端和移动端游玩。

## 特性

- ✅ 16宫格经典玩法
- ✅ 支持PC键盘和移动端触控
- ✅ 多种难度等级选择
- ✅ 实时分数和连击显示
- ✨ 精美的视觉效果和判定反馈
- 📱 完整的移动端适配和响应式设计
- 🎵 支持.jmt谱面文件格式
- 🔊 同步音频播放

## 技术栈

- **图形引擎**: Pixi.js v7.3.2
- **前端框架**: 原生JavaScript (ES6+)
- **响应式设计**: CSS3 + Media Queries
- **移动端支持**: Touch Events API

## 文件结构

```
jsbeat/
├── index.html          # 主页面
├── js/
│   ├── main.js         # 主程序入口和场景管理
│   ├── game.js         # 游戏核心逻辑
│   ├── songLoader.js   # 歌曲和谱面加载器
│   └── judgment.js     # 判定系统和标记管理
├── songs/              # 歌曲资源目录
│   ├── Flip Flap/
│   ├── FLOWER/
│   └── ...其他歌曲
└── markers/            # 标记效果资源
    ├── thundergate/
    └── flower/
```

## 使用方法

### 启动服务

```bash
# 使用Python内置服务器
python -m http.server 8000

# 或使用Node.js http-server
npx http-server -p 8000

# 或使用任何其他HTTP服务器
```

### 游戏操作

#### PC端
- **键盘操作**: QWER (第1行), ASDF (第2行), ZXCV (第3行), TYUI (第4行)
- **鼠标点击**: 直接点击16宫格区域

#### 移动端
- **触控操作**: 直接触摸对应的宫格区域
- **优化体验**: 支持多点触控，无延迟响应

### 游戏流程

1. 打开浏览器访问 `http://localhost:8000`
2. 在歌曲列表中选择喜欢的歌曲
3. 选择难度等级 (Basic/Advanced/Extreme)
4. 点击"开始游戏"按钮
5. 跟随音乐节拍点击对应位置的音符

## 判定系统

- **PERFECT** (±50ms): 完美时机，获得满分
- **GREAT** (±100ms): 很好，获得80%分数  
- **GOOD** (±150ms): 好，获得50%分数
- **BAD** (±200ms): 一般，获得20%分数
- **MISS** (>200ms): 失误，不得分且中断连击

## 自定义内容

### 添加新歌曲

1. 在 `songs/` 目录下创建新的歌曲文件夹
2. 添加以下必要文件：
   - `manifest.txt` - 歌曲信息配置
   - `song.mp3` - 音频文件
   - `pic.jpg` - 封面图片
   - `pt_bsc.jmt` - Basic难度谱面
   - `pt_adv.jmt` - Advanced难度谱面  
   - `pt_ext.jmt` - Extreme难度谱面

### manifest.txt 格式示例

```
Name=歌曲名称
Composer=作曲者
BPM=120
Level=5,7,9
```

### .jmt谱面格式

每行代表一个音符：
```
#通道号.时间戳.行号.列号
#1.11131.31.998750
#2.12503.36.000417
```

## 开发说明

### 项目特点

- **无Node.js依赖**: 纯前端实现，可直接在浏览器中运行
- **模块化设计**: 代码结构清晰，易于扩展和维护
- **性能优化**: 使用Pixi.js硬件加速渲染
- **跨平台兼容**: 支持主流浏览器和移动设备

### 核心组件

- `JubeatSimulator`: 主控制器，负责场景管理和输入处理
- `Game`: 游戏逻辑核心，处理音符生成、判定和分数计算
- `SongLoader`: 负责加载歌曲数据和谱面文件
- `JudgmentSystem`: 实现精准的时间判定算法
- `MarkerManager`: 管理视觉效果和标记动画

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

## 注意事项

1. 由于涉及音频播放，请确保在HTTPS环境下运行以获得最佳体验
2. 移动端建议在全屏模式下游玩以获得更好的操作体验
3. 谱面文件需要按照标准.jmt格式编写
4. 建议使用耳机获得更好的音乐体验

## 许可证

本项目仅供学习和研究使用，请遵守相关版权法规。