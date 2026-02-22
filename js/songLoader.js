class SongLoader {
    static async loadSongs() {
        const songs = [];
        
        // 扫描songs目录
        try {
            // 在实际环境中，这里需要通过服务器API获取歌曲列表
            // 现在我们手动列出已知的歌曲
            const songNames = [
                'Flip Flap',
                'FLOWER',
                'Evans',
                'I\'m so Happy',
                'AIR RAID FROM THA UNDAGROUND'
            ];
            
            for (const songName of songNames) {
                const song = await this.loadSongManifest(songName);
                if (song) {
                    songs.push(song);
                }
            }
        } catch (error) {
            console.error('加载歌曲列表失败:', error);
        }
        
        return songs;
    }
    
    static async loadSongManifest(songName) {
        try {
            const manifestPath = `songs/${songName}/manifest.txt`;
            const response = await fetch(manifestPath);
            
            if (!response.ok) {
                throw new Error(`无法加载歌曲清单: ${songName}`);
            }
            
            const manifestText = await response.text();
            const songData = this.parseManifest(manifestText, songName);
            
            return songData;
        } catch (error) {
            console.error(`加载歌曲 ${songName} 失败:`, error);
            return null;
        }
    }
    
    static parseManifest(text, songName) {
        const lines = text.split('\n');
        const song = {
            name: songName,
            composer: '',
            bpm: 0,
            level: [],
            imageUrl: `songs/${songName}/pic.jpg`,
            audioUrl: `songs/${songName}/song.mp3`
        };
        
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('Name=')) {
                song.name = line.substring(5);
            } else if (line.startsWith('Composer=')) {
                song.composer = line.substring(9);
            } else if (line.startsWith('BPM=')) {
                song.bpm = parseInt(line.substring(4)) || 0;
            } else if (line.startsWith('Level=')) {
                song.level = line.substring(6).split(',').map(l => parseInt(l.trim()) || 0);
            }
        });
        
        return song;
    }
    
    static async loadSong(songName, difficulty) {
        // 难度映射：支持完整名称和简写
        const difficultyMap = {
            'basic': 'bsc',
            'advanced': 'adv', 
            'extreme': 'ext',
            'bsc': 'bsc',
            'adv': 'adv',
            'ext': 'ext'
        };
        
        const shortDiff = difficultyMap[difficulty.toLowerCase()];
        if (!shortDiff) {
            throw new Error(`无效的难度等级: ${difficulty}`);
        }
        
        const difficulties = ['bsc', 'adv', 'ext'];
        const diffIndex = difficulties.indexOf(shortDiff);
        
        if (diffIndex === -1) {
            throw new Error('无效的难度等级');
        }
        
        try {
            // 加载谱面文件
            const chartPath = `songs/${encodeURIComponent(songName)}/pt_${shortDiff}.jmt`;
            const response = await fetch(chartPath);
            
            if (!response.ok) {
                throw new Error(`无法加载谱面文件: ${chartPath}`);
            }
            
            const chartText = await response.text();
            const notes = this.parseChart(chartText);
            
            // 获取歌曲基本信息
            const manifest = await this.loadSongManifest(songName);
            
            return {
                name: songName,
                difficulty: difficulty,
                level: manifest ? manifest.level[diffIndex] : 0,
                bpm: manifest ? manifest.bpm : 120,
                notes: notes,
                audioUrl: manifest ? manifest.audioUrl : '',
                imageUrl: manifest ? manifest.imageUrl : ''
            };
        } catch (error) {
            console.error('加载歌曲失败:', error);
            // 如果加载失败，返回测试数据
            return this.getTestSongData(songName, difficulty);
        }
    }
    
    static getTestSongData(songName, difficulty) {
        // 提供测试用的简单谱面数据
        const testNotes = [];
        const intervals = [500, 750, 1000]; // 不同难度的时间间隔
        
        let interval = intervals[['bsc', 'adv', 'ext'].indexOf(difficulty.toLowerCase())] || 1000;
        
        // 生成测试音符
        for (let i = 0; i < 50; i++) {
            const time = i * interval;
            const row = Math.floor(Math.random() * 4);
            const col = Math.floor(Math.random() * 4);
            
            testNotes.push({
                time: time,
                row: row,
                col: col,
                channel: row * 4 + col + 1
            });
        }
        
        return {
            name: songName,
            difficulty: difficulty,
            level: [4, 7, 10][['bsc', 'adv', 'ext'].indexOf(difficulty.toLowerCase())] || 5,
            bpm: 120,
            notes: testNotes,
            audioUrl: '',
            imageUrl: ''
        };
    }
    
    static parseChart(chartText) {
        const notes = [];
        const lines = chartText.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#')) {
                const note = this.parseNoteLine(line);
                if (note) {
                    notes.push(note);
                }
            }
        });
        
        return notes;
    }
    
    static parseNoteLine(line) {
        // 解析格式: #通道号.时间戳.行号.列号
        // 例如: #1.11131.31.998750
        const match = line.match(/#(\d+)\.(\d+)\.(\d+)\.(\d+)/);
        if (!match) return null;
        
        const [, channel, timestamp, row, col] = match;
        
        // 转换为我们的内部格式
        // jubeat使用16个通道，我们需要映射到4x4网格
        const gridPos = this.channelToGrid(parseInt(channel));
        if (!gridPos) return null;
        
        // 时间戳转换为毫秒
        const timeMs = this.timestampToMs(timestamp);
        
        return {
            time: timeMs,
            row: gridPos.row,
            col: gridPos.col,
            channel: parseInt(channel),
            originalTimestamp: timestamp
        };
    }
    
    static channelToGrid(channel) {
        // 将16个通道映射到4x4网格
        // 通道1-16 对应网格位置
        if (channel < 1 || channel > 16) return null;
        
        const positions = [
            {row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}, {row: 0, col: 3},
            {row: 1, col: 0}, {row: 1, col: 1}, {row: 1, col: 2}, {row: 1, col: 3},
            {row: 2, col: 0}, {row: 2, col: 1}, {row: 2, col: 2}, {row: 2, col: 3},
            {row: 3, col: 0}, {row: 3, col: 1}, {row: 3, col: 2}, {row: 3, col: 3}
        ];
        
        return positions[channel - 1];
    }
    
    static timestampToMs(timestamp) {
        // jubeat的时间戳格式需要特殊处理
        // 通常是基于BPM的tick系统
        // 这里简化处理，假设时间戳直接表示毫秒
        return parseInt(timestamp) || 0;
    }
    
    static async preloadSongAssets(songName) {
        try {
            // 预加载图片和音频
            const manifest = await this.loadSongManifest(songName);
            if (!manifest) return false;
            
            // 预加载封面图片
            const img = new Image();
            img.src = manifest.imageUrl;
            
            // 预加载音频（如果浏览器支持）
            if ('preload' in document.createElement('audio')) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = manifest.audioUrl;
            }
            
            return true;
        } catch (error) {
            console.error('预加载歌曲资源失败:', error);
            return false;
        }
    }
}

// 在全局作用域中暴露SongLoader
window.SongLoader = SongLoader;