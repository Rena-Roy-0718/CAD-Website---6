# CAD-Website---6

This is the sixth increment of a browser-based 2D CAD tool for drawing scaled technical plans — built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no backend.

![Sample](Screenshots/Sample%201.png)

## Features

- **11 shapes** — line, curve, arrow, rectangle, square, circle, ellipse, triangle, pentagon, hexagon, star
- **Click-and-drag drawing** — drag out any shape to size it, just like a real CAD tool
- **Real-world scale** — choose a drawing scale (1:1 to 1:500) so your plan represents real measurements
- **Multiple unit systems** — Metric (mm / cm / m), Imperial (in / ft), or raw Pixels
- **Rulers** — horizontal and vertical rulers that scroll with the sheet and adapt their tick spacing to your zoom level
- **Zoom** — 5% to 500%, with a Fit-to-screen button and Ctrl+scroll support
- **Grid & Snap to Grid** — toggle a visible grid and snap every shape to grid intersections for precise alignment
- **Live coordinates** — a floating badge tracks your cursor position in real units as you move
- **Layers** — add, rename, hide, lock, and delete layers; shapes are grouped by layer
- **Undo / Redo** — full history with `Ctrl+Z` / `Ctrl+Y` keyboard shortcuts
- **Save / Delete shapes** — keep finished shapes in a saved list, delete what you don't need
- **Colour & fill control** — preset palette or custom colour picker, filled or hollow shapes
- **Multiple sheet sizes** — A4, A3, A2, A1, A0

## Getting Started

No installation required.

1. Download or clone this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)


> **Note:** Keep `index.html`, `style.css`, and `script.js` in the same folder — the page will not work if they're separated.

## Usage

| Action | How |
|---|---|
| Draw a shape | Pick a shape from the top bar, then click-and-drag on the sheet |
| Move a shape | Click and drag an existing shape |
| Select a shape | Click on it |
| Change colour / fill | Use the sidebar while a shape is selected |
| Snap to grid | Toggle the 🧲 Snap button, or press `S` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y`, or the toolbar buttons |
| Add a layer | Click **+ Add layer** in the sidebar |
| Hide / lock a layer | Click the 👁 / 🔒 icons next to a layer |
| Save a shape | Select it, then click **Save** in the floating toolbar |
| Delete a shape | Select it, then click **Delete**, or press `Delete`/`Backspace` |
| Zoom | `+` / `−` buttons, **Fit**, or `Ctrl + scroll` |
| Change scale | Use the **Scale 1:** dropdown in the top bar |

## Screenshots

| Blank Page | Sample 1 | Sample 2 |
|---|---|---|
| ![Blank](Screenshots/Blank%20page.png) | ![Sample 1](Screenshots/Sample%201.png) | ![Sample 2](Screenshots/Sample%202.png) |

| Sample 3 | Sample 4 | Sample 5
|---|---|
| ![Sample 3](Screenshots/Sample%203.png) | ![Sample 4](Screenshots/Sample%204.png) | ![Sample 5](Screenshots/Sample%205.png)

## Project Structure

```
your-repo-name/
├── index.html          
├── style.css           
├── script.js           
├── Screenshots/        
│   ├── Blank page.png
│   ├── Sample 1.png
│   ├── Sample 2.png
│   ├── Sample 3.png
│   └── Sample 4.png
├── README.md
├── LICENSE
└── .gitignore
```

## Browser Support

Works in any modern browser — Chrome, Firefox, Edge, and Safari.

## License

Rena Roy V S    MIT — see [LICENSE](LICENSE) for details.
