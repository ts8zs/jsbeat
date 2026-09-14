package main

import (
	"encoding/json"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
	"strconv"
)

// 每个 marker 目录下的帧分组，namePrefix 必须与 play.html 中使用的别名一致
var groups = []struct {
	namePrefix  string
	dir         string
	filePrefix  string
	count       int
}{
	{"markerBase", "marker_base", "base", 25},
	{"touchPerfect", "touch_perfect", "perfect", 15},
	{"touchGreat", "touch_great", "great", 15},
	{"touchGood", "touch_good", "good", 15},
	{"touchPoor", "touch_poor", "poor", 15},
}

type entry struct {
	name string
	img  image.Image
	w, h int
}

type placedFrame struct {
	name string
	x, y int
	w, h int
}

func pad4(n int) string {
	return fmt.Sprintf("%04d", n)
}

func buildMarker(root, marker string) error {
	dir := filepath.Join(root, marker)
	var entries []entry

	for _, g := range groups {
		for n := 1; n <= g.count; n++ {
			path := filepath.Join(dir, g.dir, g.filePrefix+pad4(n)+".png")
			f, err := os.Open(path)
			if err != nil {
				fmt.Printf("  [skip] %s: %v\n", path, err)
				continue
			}
			img, err := png.Decode(f)
			f.Close()
			if err != nil {
				return fmt.Errorf("decode %s: %w", path, err)
			}
			b := img.Bounds()
			entries = append(entries, entry{
				name: g.namePrefix + strconv.Itoa(n),
				img:  img,
				w:    b.Dx(),
				h:    b.Dy(),
			})
		}
	}

	if len(entries) == 0 {
		return fmt.Errorf("no frames found for %s", marker)
	}

	atlasW, atlasH, placedList := layout(entries)
	dst := image.NewRGBA(image.Rect(0, 0, atlasW, atlasH))
	for i, e := range entries {
		p := placedList[i]
		draw.Draw(dst, image.Rect(p.x, p.y, p.x+p.w, p.y+p.h), e.img, e.img.Bounds().Min, draw.Src)
	}

	atlasPath := filepath.Join(dir, "atlas.png")
	out, err := os.Create(atlasPath)
	if err != nil {
		return err
	}
	if err := png.Encode(out, dst); err != nil {
		out.Close()
		return err
	}
	out.Close()

	// 写 Pixi 格式的 spritesheet JSON
	frames := make(map[string]interface{})
	for i, e := range entries {
		p := placedList[i]
		frames[e.name] = map[string]interface{}{
			"frame": map[string]int{"x": p.x, "y": p.y, "w": p.w, "h": p.h},
			"rotated": false,
			"trimmed": false,
			"spriteSourceSize": map[string]int{"x": 0, "y": 0, "w": p.w, "h": p.h},
			"sourceSize":       map[string]int{"w": p.w, "h": p.h},
		}
	}
	meta := map[string]interface{}{
		"image":  "atlas.png",
		"format": "RGBA8888",
		"size":   map[string]int{"w": atlasW, "h": atlasH},
		"scale":  "1",
	}
	sheet := map[string]interface{}{"frames": frames, "meta": meta}
	jsonBytes, err := json.MarshalIndent(sheet, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "atlas.json"), jsonBytes, 0644); err != nil {
		return err
	}
	fmt.Printf("  [ok] %s: %d frames -> atlas %dx%d (atlas.png %dKB)\n",
		marker, len(entries), atlasW, atlasH, fileSizeKB(atlasPath))
	return nil
}

// layout 使用 shelf 算法把帧排进画布，自动选择最小能容纳的尺寸
func layout(entries []entry) (int, int, []placedFrame) {
	widths := []int{1024, 2048, 4096}
	heights := []int{1024, 2048, 4096, 4096}
	for _, cw := range widths {
		for _, ch := range heights {
			if placed, ok := tryLayout(entries, cw, ch); ok {
				return cw, ch, placed
			}
		}
	}
	// 兜底：直接给个超大画布
	cw, ch := 4096, 8192
	placed, _ := tryLayout(entries, cw, ch)
	return cw, ch, placed
}

func tryLayout(entries []entry, cw, ch int) ([]placedFrame, bool) {
	placed := make([]placedFrame, len(entries))
	x, y, rowH, maxY := 0, 0, 0, 0
	for i, e := range entries {
		if x+e.w > cw {
			x = 0
			y += rowH
			rowH = 0
		}
		if y+e.h > ch {
			return nil, false
		}
		placed[i] = placedFrame{name: e.name, x: x, y: y, w: e.w, h: e.h}
		x += e.w
		if e.h > rowH {
			rowH = e.h
		}
		if y+e.h > maxY {
			maxY = y + e.h
		}
	}
	_ = maxY
	return placed, true
}

func fileSizeKB(path string) int {
	fi, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return int(fi.Size() / 1024)
}

func main() {
	root := "markers"
	if _, err := os.Stat(filepath.Join(root, "thundergate")); err != nil {
		// 允许从 tools/buildatlas 子目录运行
		if _, err2 := os.Stat(filepath.Join("..", "..", "markers", "thundergate")); err2 == nil {
			root = filepath.Join("..", "..", "markers")
		}
	}
	dirEntries, err := os.ReadDir(root)
	if err != nil {
		fmt.Println("无法读取 markers 目录:", err)
		os.Exit(1)
	}
	fmt.Println("开始生成 marker 精灵图 (atlas)...")
	for _, e := range dirEntries {
		if !e.IsDir() {
			continue
		}
		fmt.Printf("处理 marker: %s\n", e.Name())
		if err := buildMarker(root, e.Name()); err != nil {
			fmt.Printf("  [error] %s: %v\n", e.Name(), err)
		}
	}
	fmt.Println("完成。每个 marker 目录下已生成 atlas.png + atlas.json")
}
