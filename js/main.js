class JubeatSimulator {
    constructor() {
        this.app = null;
        this.gameScene = null;
        this.menuScene = null;
        this.currentSong = null;
        this.currentDifficulty = null;
        this.isMobile = this.detectMobile();
        
        this.init();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    async init() {
        // 显示加载界面
        this.showLoadingScreen();
        
        // 初始化Pixi.js应用
        await this.initPixi();
        
        // 加载资源
        await this.loadResources();
        
        // 创建场景
        this.createScenes();
        
        // 绑定事件
        this.bindEvents();
        
        // 填充歌曲列表
        this.populateSongList();
        
        // 隐藏加载界面，显示菜单
        this.hideLoadingScreen();
        this.showMenu();
    }
    
    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'flex';
    }
    
    hideLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
    }
    
    showMenu() {
        document.getElementById('menuScreen').style.display = 'flex';
        document.getElementById('gameUI').style.display = 'none';
    }
    
    showGame() {
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameUI').style.display = 'block';
    }
    
    async initPixi() {
        const canvas = document.getElementById('pixiCanvas');
        
        this.app = new PIXI.Application({
            view: canvas,
            backgroundColor: 0x000000,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        
        // 处理窗口大小变化
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        
        // 禁用右键菜单
        this.app.view.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleResize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        this.app.renderer.resize(screenWidth, screenHeight);
        
        if (this.gameScene) {
            this.gameScene.scale.set(Math.min(screenWidth / 800, screenHeight / 600));
            this.gameScene.position.set(
                (screenWidth - 800 * this.gameScene.scale.x) / 2,
                (screenHeight - 600 * this.gameScene.scale.y) / 2
            );
        }
    }
    
    async loadResources() {
        const progressBar = document.getElementById('progressFill');
        let progress = 0;
        
        // 更新加载进度
        const updateProgress = (increment) => {
            progress += increment;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        };
        
        // 加载歌曲列表
        try {
            this.songs = await SongLoader.loadSongs();
            updateProgress(40);
        } catch (error) {
            console.error('加载歌曲列表失败:', error);
            this.songs = [];
        }
        
        // 模拟其他资源加载
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(30);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        updateProgress(30);
    }
    
    createScenes() {
        // 创建游戏场景容器
        this.gameScene = new PIXI.Container();
        this.app.stage.addChild(this.gameScene);
        
        // 创建菜单场景容器
        this.menuScene = new PIXI.Container();
        this.app.stage.addChild(this.menuScene);
        
        // 初始化16宫格布局
        this.createGrid();
    }
    
    createGrid() {
        const gridSize = 4;
        const cellSize = 120;
        const spacing = 20;
        const startX = 100;
        const startY = 80;
        
        this.hitAreas = [];
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = startX + col * (cellSize + spacing);
                const y = startY + row * (cellSize + spacing);
                
                // 创建打击区域
                const hitArea = new PIXI.Graphics();
                hitArea.beginFill(0x333333, 0.7);
                hitArea.drawRoundedRect(x, y, cellSize, cellSize, 15);
                hitArea.endFill();
                
                // 添加高光效果
                const highlight = new PIXI.Graphics();
                highlight.beginFill(0xffffff, 0.1);
                highlight.drawRoundedRect(x + 5, y + 5, cellSize - 10, cellSize - 10, 10);
                highlight.endFill();
                hitArea.addChild(highlight);
                
                // 存储位置信息用于判定
                hitArea.gridPosition = { row, col };
                hitArea.baseX = x;
                hitArea.baseY = y;
                
                this.gameScene.addChild(hitArea);
                this.hitAreas.push(hitArea);
                
                // 添加交互事件
                hitArea.interactive = true;
                hitArea.buttonMode = true;
                
                // PC端鼠标事件
                hitArea.on('pointerdown', () => this.onHitAreaPress(row, col));
                hitArea.on('pointerup', () => this.onHitAreaRelease(row, col));
                hitArea.on('pointerupoutside', () => this.onHitAreaRelease(row, col));
                
                // 移动端触摸事件
                if (this.isMobile) {
                    hitArea.on('touchstart', (event) => {
                        event.stopPropagation();
                        this.onHitAreaPress(row, col);
                    });
                    
                    hitArea.on('touchend', (event) => {
                        event.stopPropagation();
                        this.onHitAreaRelease(row, col);
                    });
                    
                    hitArea.on('touchendoutside', (event) => {
                        event.stopPropagation();
                        this.onHitAreaRelease(row, col);
                    });
                }
            }
        }
    }
    
    populateSongList() {
        const songListElement = document.getElementById('songList');
        songListElement.innerHTML = '';
        
        if (!this.songs || this.songs.length === 0) {
            songListElement.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;">暂无歌曲数据</div>';
            return;
        }
        
        this.songs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.index = index;
            
            songItem.innerHTML = `
                <img src="${song.imageUrl}" alt="${song.name}" class="song-cover" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0iIzMzMyIvPgo8dGV4dCB4PSIzMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2FhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+44OG44K5PC90ZXh0Pgo8L3N2Zz4='">
                <div class="song-info">
                    <div class="song-name">${song.name}</div>
                    <div class="song-artist">${song.composer || 'Unknown Artist'}</div>
                    <div class="difficulty-selector">
                        ${song.level.map((level, i) => {
                            const diffNames = ['basic', 'advanced', 'extreme'];
                            const diffClasses = ['basic', 'advanced', 'extreme'];
                            return `<span class="difficulty-btn ${diffClasses[i]} ${i === 0 ? 'selected' : ''}" 
                                         data-diff="${diffNames[i]}" data-level="${level}">
                                    ${diffNames[i].toUpperCase()} ${level}
                                   </span>`;
                        }).join('')}
                    </div>
                </div>
            `;
            
            // 添加点击事件
            songItem.addEventListener('click', () => this.selectSong(index));
            
            // 添加难度选择事件
            const diffButtons = songItem.querySelectorAll('.difficulty-btn');
            diffButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectDifficulty(index, btn.dataset.diff);
                });
            });
            
            songListElement.appendChild(songItem);
        });
        
        // 默认选择第一首歌的第一个难度
        if (this.songs.length > 0) {
            this.selectSong(0);
            this.selectDifficulty(0, 'basic');
        }
    }
    
    selectSong(songIndex) {
        // 清除之前的选择
        document.querySelectorAll('.song-item').forEach(item => {
            item.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        // 高亮选中的歌曲
        const selectedItem = document.querySelector(`.song-item[data-index="${songIndex}"]`);
        if (selectedItem) {
            selectedItem.style.background = 'rgba(0, 238, 255, 0.3)';
        }
        
        this.currentSongIndex = songIndex;
        this.currentSong = this.songs[songIndex];
    }
    
    selectDifficulty(songIndex, difficulty) {
        // 清除同首歌的其他难度选择
        const songItem = document.querySelector(`.song-item[data-index="${songIndex}"]`);
        if (songItem) {
            songItem.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        }
        
        // 高亮选中的难度
        const selectedBtn = songItem.querySelector(`.difficulty-btn[data-diff="${difficulty}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        this.currentDifficulty = difficulty;
    }
    
    bindEvents() {
        // 开始游戏按钮
        document.getElementById('startGameBtn').addEventListener('click', () => {
            if (this.currentSong && this.currentDifficulty) {
                this.startGame();
            } else {
                alert('请先选择歌曲和难度！');
            }
        });
        
        // 键盘支持（PC端）
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => this.handleKeyPress(e));
            document.addEventListener('keyup', (e) => this.handleKeyRelease(e));
        }
    }
    
    handleKeyPress(event) {
        const keyMap = {
            'q': { row: 0, col: 0 }, 'w': { row: 0, col: 1 }, 'e': { row: 0, col: 2 }, 'r': { row: 0, col: 3 },
            'a': { row: 1, col: 0 }, 's': { row: 1, col: 1 }, 'd': { row: 1, col: 2 }, 'f': { row: 1, col: 3 },
            'z': { row: 2, col: 0 }, 'x': { row: 2, col: 1 }, 'c': { row: 2, col: 2 }, 'v': { row: 2, col: 3 },
            't': { row: 3, col: 0 }, 'y': { row: 3, col: 1 }, 'u': { row: 3, col: 2 }, 'i': { row: 3, col: 3 }
        };
        
        const pos = keyMap[event.key.toLowerCase()];
        if (pos) {
            event.preventDefault();
            this.onHitAreaPress(pos.row, pos.col);
        }
    }
    
    handleKeyRelease(event) {
        const keyMap = {
            'q': { row: 0, col: 0 }, 'w': { row: 0, col: 1 }, 'e': { row: 0, col: 2 }, 'r': { row: 0, col: 3 },
            'a': { row: 1, col: 0 }, 's': { row: 1, col: 1 }, 'd': { row: 1, col: 2 }, 'f': { row: 1, col: 3 },
            'z': { row: 2, col: 0 }, 'x': { row: 2, col: 1 }, 'c': { row: 2, col: 2 }, 'v': { row: 2, col: 3 },
            't': { row: 3, col: 0 }, 'y': { row: 3, col: 1 }, 'u': { row: 3, col: 2 }, 'i': { row: 3, col: 3 }
        };
        
        const pos = keyMap[event.key.toLowerCase()];
        if (pos) {
            this.onHitAreaRelease(pos.row, pos.col);
        }
    }
    
    onHitAreaPress(row, col) {
        const index = row * 4 + col;
        const hitArea = this.hitAreas[index];
        
        if (hitArea) {
            // 视觉反馈
            hitArea.children[0].alpha = 0.3;
            hitArea.scale.set(0.95);
            
            // 触发游戏逻辑
            if (window.gameInstance) {
                window.gameInstance.handleNoteHit(row, col);
            }
        }
    }
    
    onHitAreaRelease(row, col) {
        const index = row * 4 + col;
        const hitArea = this.hitAreas[index];
        
        if (hitArea) {
            // 恢复视觉效果
            hitArea.children[0].alpha = 0.1;
            hitArea.scale.set(1);
        }
    }
    
    setCurrentSong(song, difficulty) {
        this.currentSong = song;
        this.currentDifficulty = difficulty;
    }
    
    async startGame() {
        try {
            console.log('启动游戏:', this.currentSong.name, this.currentDifficulty);
            
            this.showGame();
            
            // 初始化游戏实例
            if (!window.gameInstance) {
                window.gameInstance = new Game(this);
            }
            
            // 传递歌曲名称而不是整个歌曲对象
            await window.gameInstance.start(this.currentSong.name, this.currentDifficulty);
        } catch (error) {
            console.error('游戏启动失败:', error);
            alert('游戏启动失败: ' + error.message);
            this.showMenu();
        }
    }
}

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new JubeatSimulator();
});