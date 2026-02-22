class Game {
    constructor(simulator) {
        this.simulator = simulator;
        this.songData = null;
        this.notes = [];
        this.activeNotes = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.isPlaying = false;
        this.audio = null;
        this.startTime = 0;
        this.currentTime = 0;
        this.noteSpeed = 300; // 像素/秒
        
        this.judgmentSystem = new JudgmentSystem();
        this.markerManager = new MarkerManager();
    }
    
    async start(song, difficulty) {
        this.reset();
        
        // 加载歌曲数据
        this.songData = await SongLoader.loadSong(song, difficulty);
        
        // 初始化音频
        await this.initAudio();
        
        // 创建音符
        this.createNotes();
        
        // 初始化标记管理器
        await this.markerManager.init();
        
        // 开始游戏循环
        this.isPlaying = true;
        this.startTime = Date.now();
        this.gameLoop();
        
        // 开始音频播放
        this.playAudio();
    }
    
    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.notes = [];
        this.activeNotes = [];
        this.isPlaying = false;
        this.currentTime = 0;
        
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        
        // 清除现有音符显示
        this.clearNotes();
        
        // 重置UI显示
        this.updateScoreDisplay();
        this.updateComboDisplay();
    }
    
    async initAudio() {
        return new Promise((resolve, reject) => {
            this.audio = new Audio(this.songData.audioUrl);
            this.audio.preload = 'auto';
            
            this.audio.addEventListener('loadeddata', resolve);
            this.audio.addEventListener('error', reject);
            
            // 设置音频事件监听
            this.audio.addEventListener('ended', () => {
                this.endGame();
            });
        });
    }
    
    playAudio() {
        if (this.audio) {
            this.audio.play().catch(e => {
                console.error('音频播放失败:', e);
            });
        }
    }
    
    createNotes() {
        // 根据谱面数据创建音符
        this.songData.notes.forEach(noteData => {
            const note = new Note(
                noteData.time,
                noteData.row,
                noteData.col,
                noteData.type || 'normal'
            );
            this.notes.push(note);
        });
        
        // 按时间排序
        this.notes.sort((a, b) => a.time - b.time);
    }
    
    clearNotes() {
        // 移除所有活动音符的显示
        this.activeNotes.forEach(note => {
            if (note.sprite && note.sprite.parent) {
                note.sprite.parent.removeChild(note.sprite);
            }
        });
        this.activeNotes = [];
    }
    
    gameLoop() {
        if (!this.isPlaying) return;
        
        this.currentTime = Date.now() - this.startTime;
        
        // 更新音符状态
        this.updateNotes();
        
        // 检查新音符出现
        this.spawnNotes();
        
        // 更新标记效果
        this.markerManager.update(this.currentTime);
        
        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateNotes() {
        const notesToRemove = [];
        
        this.activeNotes.forEach((note, index) => {
            // 计算音符当前位置
            const elapsed = this.currentTime - note.spawnTime;
            const distance = (elapsed / 1000) * this.noteSpeed;
            const targetY = note.targetY + distance;
            
            // 更新音符位置
            if (note.sprite) {
                note.sprite.y = targetY;
            }
            
            // 检查是否错过判定线
            if (targetY > note.missY) {
                this.handleMiss(note);
                notesToRemove.push(index);
            }
        });
        
        // 移除已处理的音符
        notesToRemove.reverse().forEach(index => {
            const note = this.activeNotes.splice(index, 1)[0];
            if (note.sprite && note.sprite.parent) {
                note.sprite.parent.removeChild(note.sprite);
            }
        });
    }
    
    spawnNotes() {
        const spawnThreshold = 2000; // 提前2秒生成音符
        
        while (this.notes.length > 0 && 
               this.notes[0].time <= this.currentTime + spawnThreshold) {
            
            const note = this.notes.shift();
            note.spawnTime = this.currentTime;
            this.setupNoteSprite(note);
            this.activeNotes.push(note);
        }
    }
    
    setupNoteSprite(note) {
        // 创建音符精灵
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0x00eeff);
        graphics.drawCircle(0, 0, 25);
        graphics.endFill();
        
        // 添加内圈
        graphics.lineStyle(3, 0xffffff);
        graphics.drawCircle(0, 0, 20);
        
        note.sprite = graphics;
        
        // 设置初始位置（在网格上方）
        const gridPos = this.getGridPosition(note.row, note.col);
        note.sprite.x = gridPos.x;
        note.sprite.y = gridPos.y - 300;
        
        // 设置判定线位置
        note.targetY = gridPos.y;
        note.missY = gridPos.y + 100;
        
        // 添加到场景
        this.simulator.gameScene.addChild(note.sprite);
    }
    
    getGridPosition(row, col) {
        const cellSize = 120;
        const spacing = 20;
        const startX = 100;
        const startY = 80;
        
        return {
            x: startX + col * (cellSize + spacing) + cellSize / 2,
            y: startY + row * (cellSize + spacing) + cellSize / 2
        };
    }
    
    handleNoteHit(row, col) {
        const hitTime = this.currentTime;
        let bestNote = null;
        let bestJudgment = null;
        
        // 寻找最近的可判定音符
        this.activeNotes.forEach(note => {
            if (note.row === row && note.col === col) {
                const judgment = this.judgmentSystem.judge(hitTime, note.time);
                if (judgment && (!bestJudgment || judgment.accuracy < bestJudgment.accuracy)) {
                    bestNote = note;
                    bestJudgment = judgment;
                }
            }
        });
        
        if (bestNote && bestJudgment) {
            this.processHit(bestNote, bestJudgment);
        } else {
            // 空击处理
            this.handleEmptyHit(row, col);
        }
    }
    
    processHit(note, judgment) {
        // 移除音符
        const index = this.activeNotes.indexOf(note);
        if (index > -1) {
            this.activeNotes.splice(index, 1);
            if (note.sprite && note.sprite.parent) {
                note.sprite.parent.removeChild(note.sprite);
            }
        }
        
        // 更新分数和连击
        this.updateScore(judgment);
        
        // 显示判定效果
        this.showJudgmentEffect(judgment.type, note.row, note.col);
        
        // 播放标记动画
        this.markerManager.playMarker(note.row, note.col, judgment.type);
    }
    
    handleMiss(note) {
        // 更新连击
        this.combo = 0;
        this.updateComboDisplay();
        
        // 显示MISS效果
        this.showJudgmentEffect('MISS', note.row, note.col);
    }
    
    handleEmptyHit(row, col) {
        // 空击惩罚
        this.combo = 0;
        this.score = Math.max(0, this.score - 50);
        this.updateScoreDisplay();
        this.updateComboDisplay();
        
        // 显示空击效果
        this.showJudgmentEffect('EMPTY', row, col);
    }
    
    updateScore(judgment) {
        // 根据判定类型更新分数
        const scoreValues = {
            'PERFECT': 1000,
            'GREAT': 800,
            'GOOD': 500,
            'BAD': 200
        };
        
        this.score += scoreValues[judgment.type] || 0;
        
        // 更新连击
        if (judgment.type !== 'MISS' && judgment.type !== 'BAD') {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        } else {
            this.combo = 0;
        }
        
        this.updateScoreDisplay();
        this.updateComboDisplay();
    }
    
    showJudgmentEffect(type, row, col) {
        const display = document.getElementById('judgmentDisplay');
        const colors = {
            'PERFECT': '#ffff00',
            'GREAT': '#00ff00',
            'GOOD': '#00ffff',
            'BAD': '#ff8800',
            'MISS': '#ff0000',
            'EMPTY': '#888888'
        };
        
        display.textContent = type;
        display.style.color = colors[type] || '#ffffff';
        display.style.opacity = '1';
        
        // 动画效果
        setTimeout(() => {
            display.style.opacity = '0';
        }, 500);
        
        // 在指定位置显示特效
        this.showVisualEffect(type, row, col);
    }
    
    showVisualEffect(type, row, col) {
        const gridPos = this.getGridPosition(row, col);
        
        // 创建视觉效果精灵
        const effect = new PIXI.Graphics();
        
        switch(type) {
            case 'PERFECT':
                effect.beginFill(0xffff00, 0.8);
                break;
            case 'GREAT':
                effect.beginFill(0x00ff00, 0.7);
                break;
            case 'GOOD':
                effect.beginFill(0x00ffff, 0.6);
                break;
            case 'MISS':
                effect.beginFill(0xff0000, 0.7);
                break;
            default:
                effect.beginFill(0xffffff, 0.5);
        }
        
        effect.drawCircle(0, 0, 40);
        effect.endFill();
        effect.x = gridPos.x;
        effect.y = gridPos.y;
        
        this.simulator.gameScene.addChild(effect);
        
        // 淡出动画
        let alpha = 1;
        const fadeInterval = setInterval(() => {
            alpha -= 0.05;
            effect.alpha = alpha;
            
            if (alpha <= 0) {
                clearInterval(fadeInterval);
                if (effect.parent) {
                    effect.parent.removeChild(effect);
                }
            }
        }, 50);
    }
    
    updateScoreDisplay() {
        document.getElementById('scoreDisplay').textContent = `SCORE: ${this.score}`;
    }
    
    updateComboDisplay() {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.textContent = `COMBO: ${this.combo}`;
        
        if (this.combo > 0) {
            comboDisplay.style.color = '#ffcc00';
            comboDisplay.style.fontSize = Math.min(18 + this.combo * 0.5, 36) + 'px';
        } else {
            comboDisplay.style.color = '#aaa';
            comboDisplay.style.fontSize = '18px';
        }
    }
    
    endGame() {
        this.isPlaying = false;
        
        // 显示结算画面
        setTimeout(() => {
            this.showResult();
        }, 1000);
    }
    
    showResult() {
        const result = `
            游戏结束！
            最终分数: ${this.score}
            最大连击: ${this.maxCombo}
            准确率: ${this.calculateAccuracy()}%
        `;
        
        alert(result);
        
        // 返回菜单
        this.simulator.showMenu();
    }
    
    calculateAccuracy() {
        // 简化的准确率计算
        const totalNotes = this.songData.notes.length;
        const perfectNotes = this.activeNotes.filter(n => 
            this.judgmentSystem.judge(this.currentTime, n.time)?.type === 'PERFECT'
        ).length;
        
        return totalNotes > 0 ? Math.round((perfectNotes / totalNotes) * 100) : 0;
    }
}

class Note {
    constructor(time, row, col, type = 'normal') {
        this.time = time;        // 出现时间(ms)
        this.row = row;          // 行(0-3)
        this.col = col;          // 列(0-3)
        this.type = type;        // 音符类型
        this.sprite = null;      // Pixi精灵
        this.spawnTime = 0;      // 实际生成时间
        this.targetY = 0;        // 目标Y坐标
        this.missY = 0;          // MISS判定线Y坐标
    }
}