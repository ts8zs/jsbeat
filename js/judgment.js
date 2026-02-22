class JudgmentSystem {
    constructor() {
        // 判定时间阈值（毫秒）
        this.thresholds = {
            PERFECT: 50,   // ±50ms
            GREAT: 100,    // ±100ms  
            GOOD: 150,     // ±150ms
            BAD: 200,      // ±200ms
            MISS: Infinity // 超过200ms
        };
        
        // 分数权重
        this.scoreWeights = {
            PERFECT: 1.0,
            GREAT: 0.8,
            GOOD: 0.5,
            BAD: 0.2,
            MISS: 0.0
        };
    }
    
    judge(hitTime, noteTime) {
        const difference = Math.abs(hitTime - noteTime);
        const accuracy = difference;
        
        let judgmentType = 'MISS';
        
        if (difference <= this.thresholds.PERFECT) {
            judgmentType = 'PERFECT';
        } else if (difference <= this.thresholds.GREAT) {
            judgmentType = 'GREAT';
        } else if (difference <= this.thresholds.GOOD) {
            judgmentType = 'GOOD';
        } else if (difference <= this.thresholds.BAD) {
            judgmentType = 'BAD';
        }
        
        return {
            type: judgmentType,
            accuracy: accuracy,
            difference: difference,
            isEarly: hitTime < noteTime,
            scoreMultiplier: this.scoreWeights[judgmentType]
        };
    }
    
    getJudgmentColor(type) {
        const colors = {
            'PERFECT': '#ffff00',
            'GREAT': '#00ff00', 
            'GOOD': '#00ffff',
            'BAD': '#ff8800',
            'MISS': '#ff0000'
        };
        return colors[type] || '#ffffff';
    }
    
    getJudgmentText(type) {
        const texts = {
            'PERFECT': 'PERFECT!',
            'GREAT': 'GREAT!',
            'GOOD': 'GOOD',
            'BAD': 'BAD',
            'MISS': 'MISS'
        };
        return texts[type] || '';
    }
}

class MarkerManager {
    constructor() {
        this.markers = {};
        this.markerTypes = ['perfect', 'great', 'good', 'poor'];
        this.currentMarkers = [];
    }
    
    async init() {
        // 初始化各种标记效果
        // 在实际实现中，这里会加载marker图片资源
        this.setupBaseMarkers();
    }
    
    setupBaseMarkers() {
        // 创建基础标记容器
        this.markerContainer = new PIXI.Container();
        if (window.simulator && window.simulator.gameScene) {
            window.simulator.gameScene.addChild(this.markerContainer);
        }
    }
    
    async playMarker(row, col, judgmentType) {
        const markerType = this.getMarkerType(judgmentType);
        if (!markerType) return;
        
        // 创建标记效果
        const marker = this.createMarker(markerType, row, col);
        if (marker) {
            this.currentMarkers.push({
                sprite: marker,
                startTime: Date.now(),
                duration: 500, // 500ms持续时间
                row: row,
                col: col
            });
            
            this.markerContainer.addChild(marker);
        }
    }
    
    getMarkerType(judgmentType) {
        const typeMap = {
            'PERFECT': 'perfect',
            'GREAT': 'great', 
            'GOOD': 'good',
            'BAD': 'poor',
            'MISS': 'poor'
        };
        return typeMap[judgmentType];
    }
    
    createMarker(type, row, col) {
        // 创建标记精灵
        const graphics = new PIXI.Graphics();
        
        // 根据不同类型设置颜色和样式
        switch(type) {
            case 'perfect':
                graphics.beginFill(0xffff00, 0.8);
                break;
            case 'great':
                graphics.beginFill(0x00ff00, 0.7);
                break;
            case 'good':
                graphics.beginFill(0x00ffff, 0.6);
                break;
            case 'poor':
                graphics.beginFill(0xff4444, 0.7);
                break;
        }
        
        // 绘制圆形标记
        graphics.drawCircle(0, 0, 35);
        graphics.endFill();
        
        // 添加边框
        graphics.lineStyle(3, 0xffffff);
        graphics.drawCircle(0, 0, 30);
        
        // 设置位置
        const gridPos = this.getGridPosition(row, col);
        graphics.x = gridPos.x;
        graphics.y = gridPos.y;
        
        return graphics;
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
    
    update(currentTime) {
        const markersToRemove = [];
        
        this.currentMarkers.forEach((markerInfo, index) => {
            const elapsed = currentTime - markerInfo.startTime;
            const progress = elapsed / markerInfo.duration;
            
            if (progress >= 1) {
                // 标记效果结束
                markersToRemove.push(index);
                if (markerInfo.sprite.parent) {
                    markerInfo.sprite.parent.removeChild(markerInfo.sprite);
                }
            } else {
                // 更新标记效果
                this.updateMarkerEffect(markerInfo, progress);
            }
        });
        
        // 移除已完成的标记
        markersToRemove.reverse().forEach(index => {
            this.currentMarkers.splice(index, 1);
        });
    }
    
    updateMarkerEffect(markerInfo, progress) {
        const sprite = markerInfo.sprite;
        if (!sprite) return;
        
        // 缩放效果
        const scale = 1 + progress * 0.5;
        sprite.scale.set(scale);
        
        // 透明度渐变
        sprite.alpha = 1 - progress;
        
        // 颜色渐变效果
        if (progress > 0.7) {
            const finalAlpha = (1 - progress) / 0.3;
            sprite.alpha *= finalAlpha;
        }
    }
    
    // 高级标记效果（如连击特效）
    async playComboEffect(comboCount, row, col) {
        if (comboCount < 10) return; // 只有10连击以上才显示特效
        
        const comboText = new PIXI.Text(comboCount.toString(), {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffff00,
            stroke: 0x000000,
            strokeThickness: 3
        });
        
        const gridPos = this.getGridPosition(row, col);
        comboText.x = gridPos.x;
        comboText.y = gridPos.y - 50;
        comboText.anchor.set(0.5);
        
        this.markerContainer.addChild(comboText);
        
        // 动画效果
        let startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1000; // 1秒持续时间
            
            if (progress >= 1) {
                if (comboText.parent) {
                    comboText.parent.removeChild(comboText);
                }
                return;
            }
            
            // 上升动画
            comboText.y -= 2;
            // 淡出
            comboText.alpha = 1 - progress;
            // 缩放
            const scale = 1 + progress * 0.5;
            comboText.scale.set(scale);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// 全局暴露类
window.JudgmentSystem = JudgmentSystem;
window.MarkerManager = MarkerManager;