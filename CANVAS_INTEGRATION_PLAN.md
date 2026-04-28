# Canvas Integration Investigation & Plan

## Executive Summary

**Goal**: Integrate infinite canvas with sticky notes, freehand drawing, shapes, and text blocks while reusing existing Yjs real-time sync infrastructure.

**Approach**: Reference Excalidraw's architecture for the canvas rendering system, but integrate with LIGMA's existing Yjs/WebSocket collaboration layer.

---

## Current LIGMA Architecture (Working)

### What's Already Built ✅

1. **Real-time Collaboration**
   - `SyncManager` - Yjs CRDT synchronization via WebSocket
   - `usePresence` - Live cursor tracking
   - `useCanvas` - Hook for canvas operations
   - Backend Yjs server with RBAC checks

2. **Data Model**
   ```typescript
   interface CanvasNode {
     id: string;
     type: 'sticky' | 'text' | 'shape' | 'image';
     content: any;
     position: { x: number; y: number };
     rotation?: number;
     intent?: 'action' | 'decision' | 'question' | 'reference';
     locked?: boolean;
     createdBy: string;
     createdAt: string;
     color?: string;
     taskStatus?: 'backlog' | 'todo' | 'in_progress' | 'done';
     assignee?: string;
   }
   ```

3. **UI Components**
   - Editor page with split view (canvas + task board)
   - Sticky note rendering as DOM elements
   - Basic zoom controls (CSS transform)
   - Live cursors overlay

### What's Missing ❌

1. **Infinite Canvas Viewport**
   - Currently: Fixed CSS positioning
   - Need: Pan/zoom with coordinate transformation
   - Excalidraw ref: Two-layer canvas (static + interactive)

2. **Freehand Drawing**
   - Currently: Not supported
   - Need: Path-based drawing with pressure/points
   - Excalidraw ref: `freedraw` element with point array

3. **Shapes**
   - Currently: Only sticky notes
   - Need: Rectangle, ellipse, diamond, arrow, line
   - Excalidraw ref: RoughJS for sketchy appearance

4. **Text Blocks**
   - Currently: Text inside sticky notes only
   - Need: Standalone text elements
   - Excalidraw ref: Text with auto-resize bounds

5. **Performance**
   - Currently: DOM elements for each node (won't scale)
   - Need: HTML5 Canvas rendering for >100 elements
   - Excalidraw ref: Canvas-based renderer with viewport culling

---

## Excalidraw Architecture Analysis

### Core Components to Reference

#### 1. Scene Graph Structure
```typescript
// Excalidraw element base (simplified)
interface ExcalidrawElement {
  id: string;
  type: 'rectangle' | 'diamond' | 'ellipse' | 'line' | 'arrow' | 'text' | 'freedraw' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch';
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
}

// Freehand specific
interface FreeDrawElement extends ExcalidrawElement {
  type: 'freedraw';
  points: [number, number, pressure?][]; // Array of [x, y, pressure?]
  simulatePressure: boolean;
}
```

#### 2. Dual-Canvas Rendering
- **Static Canvas**: Renders all elements (background layer)
- **Interactive Canvas**: UI overlays - selection, hover, cursors
- Benefits: Static canvas cached, only redraw on changes

#### 3. Viewport System
```typescript
interface AppState {
  scrollX: number;  // Pan X offset
  scrollY: number;  // Pan Y offset
  zoom: number;     // Zoom level (1.0 = 100%)
}

// Coordinate transforms
function sceneToViewport(x: number, y: number, state: AppState) {
  return {
    x: (x - state.scrollX) * state.zoom,
    y: (y - state.scrollY) * state.zoom
  };
}

function viewportToScene(x: number, y: number, state: AppState) {
  return {
    x: x / state.zoom + state.scrollX,
    y: y / state.zoom + state.scrollY
  };
}
```

#### 4. Element Rendering Pipeline
1. **Filter**: Only render elements in viewport bounds
2. **Cache**: Generate offscreen canvas per element type
3. **Draw**: Render cached canvases to main canvas
4. **RoughJS**: Generate sketchy paths for shapes

#### 5. Interaction Handling
- **Hit Testing**: Check collision with elements (rotated bounds)
- **Selection**: Track selected element IDs
- **Drag**: Update element x,y on mouse move
- **Resize**: Handle resize handles
- **Rotate**: Calculate angle from center

---

## Integration Strategy

### Phase 1: Core Canvas Infrastructure (Week 1)

#### 1.1 Extend Data Model
Extend `CanvasNode` to support new element types:

```typescript
// New extended node types
interface BaseNode {
  id: string;
  type: 'sticky' | 'text' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'freedraw' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  createdBy: string;
  createdAt: string;
  
  // Style properties
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch';
  roughness?: number;
  opacity?: number;
}

interface FreeDrawNode extends BaseNode {
  type: 'freedraw';
  points: number[][]; // [[x, y, pressure?], ...]
  simulatePressure: boolean;
}

interface ArrowNode extends BaseNode {
  type: 'arrow';
  start: { x: number; y: number };
  end: { x: number; y: number };
  elbowed?: boolean;
}

interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
}
```

#### 1.2 Create Canvas Engine
New files to create:

```
frontend/lib/canvas/
├── engine/
│   ├── CanvasEngine.ts      # Main renderer, viewport management
│   ├── SceneGraph.ts        # Element management
│   ├── Viewport.ts          # Pan/zoom transforms
│   └── Renderer.ts          # HTML5 Canvas drawing
├── elements/
│   ├── Element.ts           # Base element class
│   ├── StickyNoteElement.ts # Current sticky notes
│   ├── ShapeElement.ts      # Rect, ellipse, diamond
│   ├── ArrowElement.ts      # Lines with arrowheads
│   ├── FreeDrawElement.ts   # Hand-drawn paths
│   └── TextElement.ts       # Text blocks
├── interactions/
│   ├── InteractionManager.ts # Mouse/touch handling
│   ├── SelectionManager.ts  # Multi-select, bounds
│   └── TransformManager.ts  # Move, resize, rotate
└── utils/
    ├── roughHelper.ts       # RoughJS integration
    ├── hitTest.ts           # Collision detection
    └── bounds.ts            # Bounding box math
```

#### 1.3 Integrate with Existing Sync

**Keep existing**: `SyncManager`, `YjsProvider`, `usePresence`

**Modify** `SyncManager` to support new node types:
```typescript
// Add methods for bulk operations
export class SyncManager {
  // ... existing methods ...
  
  // New: Batch update for smooth dragging
  updateNodePositionBatch(nodeId: string, x: number, y: number) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      node.x = x;
      node.y = y;
      // Yjs will batch and sync automatically
    }
  }
  
  // New: Support freedraw points
  updateFreeDrawPoints(nodeId: string, points: number[][]) {
    const node = this.nodesMap.get(nodeId);
    if (node && node.type === 'freedraw') {
      node.points = points;
    }
  }
}
```

### Phase 2: Element Types (Week 2)

#### 2.1 Sticky Notes (Existing - Adapt)
- Keep current DOM-based rendering for stickies
- Add to CanvasEngine as special "DOM overlay" elements
- Allows complex content (rich text, tags) while shapes use canvas

#### 2.2 Shapes (New)
Use RoughJS for sketchy appearance:

```typescript
import rough from 'roughjs';

class ShapeElementRenderer {
  private roughGenerator: RoughGenerator;
  
  constructor() {
    this.roughGenerator = rough.generator();
  }
  
  render(ctx: CanvasRenderingContext2D, element: ShapeNode) {
    const options = {
      roughness: element.roughness || 1,
      stroke: element.strokeColor || '#000',
      strokeWidth: element.strokeWidth || 2,
      fill: element.backgroundColor,
      fillStyle: element.fillStyle || 'hachure',
    };
    
    let drawable;
    switch (element.type) {
      case 'rectangle':
        drawable = this.roughGenerator.rectangle(
          element.x, element.y, element.width, element.height, options
        );
        break;
      case 'ellipse':
        drawable = this.roughGenerator.ellipse(
          element.x + element.width/2, 
          element.y + element.height/2,
          element.width, element.height, options
        );
        break;
      case 'diamond':
        // Calculate diamond points from bounds
        const cx = element.x + element.width/2;
        const cy = element.y + element.height/2;
        const points = [
          [cx, element.y],
          [element.x + element.width, cy],
          [cx, element.y + element.height],
          [element.x, cy]
        ];
        drawable = this.roughGenerator.linearPath(points as any, options);
        break;
    }
    
    rough.draw(ctx, drawable);
  }
}
```

#### 2.3 Freehand Drawing (New)
Store points array, render as smooth curve:

```typescript
class FreeDrawElement {
  render(ctx: CanvasRenderingContext2D, element: FreeDrawNode) {
    if (element.points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = element.strokeColor || '#000';
    ctx.lineWidth = element.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Use simplified points for performance
    const points = this.simplifyPoints(element.points);
    
    ctx.moveTo(points[0][0], points[0][1]);
    
    // Draw with quadratic curves for smoothness
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i][0] + points[i + 1][0]) / 2;
      const yc = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
    }
    
    ctx.stroke();
  }
  
  // Ramer-Douglas-Peucker algorithm to reduce points
  simplifyPoints(points: number[][], tolerance: number = 1): number[][] {
    // Implementation for performance
  }
}
```

#### 2.4 Arrows (New)
Support both straight and elbowed arrows:

```typescript
interface ArrowNode extends BaseNode {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elbowed: boolean; // true = right-angle connectors
  startBound?: string; // ID of attached node
  endBound?: string; // ID of attached node
}
```

### Phase 3: Interaction System (Week 3)

#### 3.1 Tool System
Replace current `activeTool` state with proper tool manager:

```typescript
type ToolType = 
  | 'selection' 
  | 'sticky' 
  | 'rectangle' 
  | 'ellipse' 
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text';

interface ToolConfig {
  type: ToolType;
  cursor: string;
  onPointerDown: (e: PointerEvent, viewport: Viewport) => void;
  onPointerMove: (e: PointerEvent, viewport: Viewport) => void;
  onPointerUp: (e: PointerEvent, viewport: Viewport) => void;
}
```

#### 3.2 Selection & Transformation
- **Selection box**: Drag to select multiple elements
- **Move**: Drag selected elements
- **Resize**: Corner/edge handles
- **Rotate**: Rotate handle above element
- **Multi-select**: Shift+click, Cmd+A

#### 3.3 Infinite Canvas UX
- **Pan**: Space+drag or middle-click drag
- **Zoom**: Mouse wheel, Cmd++, Cmd+-, pinch gesture
- **Fit to screen**: Cmd+0
- **Minimap**: Optional overview widget

### Phase 4: Editor Page Integration (Week 4)

Replace current DOM-based canvas in `editor/page.tsx`:

```tsx
// New canvas section in EditorContent
<section className="relative flex-1 overflow-hidden bg-paper">
  <CanvasContainer
    nodes={canvasNodes}
    cursors={liveCursors}
    selectedIds={selectedIds}
    onSelect={setSelectedIds}
    onUpdateNode={updateNode}
    onAddNode={addNode}
    activeTool={activeTool}
    syncManager={syncManagerRef.current}
  />
  
  {/* Keep existing UI overlays */}
  <CanvasToolbar />
  <ZoomControls />
  <Minimap />
</section>
```

---

## Files to Create/Modify

### New Files (High Priority)

| File | Purpose | Lines Est. |
|------|---------|------------|
| `frontend/lib/canvas/CanvasEngine.ts` | Main canvas controller | 300 |
| `frontend/lib/canvas/Viewport.ts` | Pan/zoom transforms | 150 |
| `frontend/lib/canvas/Renderer.ts` | HTML5 Canvas drawing | 250 |
| `frontend/lib/canvas/elements/ShapeElement.ts` | RoughJS shapes | 200 |
| `frontend/lib/canvas/elements/FreeDrawElement.ts` | Hand-drawn paths | 150 |
| `frontend/lib/canvas/elements/TextElement.ts` | Text rendering | 100 |
| `frontend/lib/canvas/interactions/ToolManager.ts` | Tool switching | 150 |
| `frontend/lib/canvas/interactions/SelectionManager.ts` | Select/move/resize | 300 |
| `frontend/components/canvas/CanvasContainer.tsx` | React wrapper | 200 |
| `frontend/components/canvas/CanvasToolbar.tsx` | Tool buttons | 150 |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/lib/yjs/syncManager.ts` | Add new node types, batch update methods |
| `frontend/lib/yjs/syncManager.ts` | Extend `CanvasNode` interface |
| `frontend/app/editor/page.tsx` | Replace DOM canvas with CanvasContainer |
| `frontend/lib/hooks/useCanvas.ts` | Add methods for new element types |
| `frontend/types/canvas.ts` | Add extended node type definitions |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "roughjs": "^4.6.6",
    "perfect-freehand": "^1.2.2"
  }
}
```

- **RoughJS**: Sketchy shape rendering (Excalidraw uses this)
- **perfect-freehand**: Smooth freehand drawing with pressure simulation

---

## Risk Assessment

### Low Risk ✅
- Extending `CanvasNode` interface - additive change
- Adding new element types - existing sync still works
- Canvas rendering layer - isolated from sync logic

### Medium Risk ⚠️
- Coordinate system change - need to migrate existing sticky positions
- Performance at >100 elements - need viewport culling

### High Risk ❌
- Breaking existing collaboration - test thoroughly with Yjs
- Mobile/touch support - significant testing needed

---

## Testing Strategy

1. **Unit Tests**
   - Viewport coordinate transforms
   - Element hit testing
   - RoughJS rendering output

2. **Integration Tests**
   - Add shape → syncs to other client
   - Draw freehand → points array syncs
   - Move element → position updates

3. **E2E Tests**
   - Two clients draw simultaneously
   - Selection, move, resize operations
   - Pan/zoom while others edit

---

## Success Criteria

- [ ] Infinite canvas with smooth pan/zoom (60fps)
- [ ] All 5 element types render correctly
- [ ] Real-time sync works for all operations
- [ ] Existing sticky notes still work
- [ ] Mobile touch support (basic)
- [ ] <100ms latency for local operations
- [ ] Works with 100+ elements (viewport culling)

---

## Next Steps

1. **Create `CanvasEngine.ts`** - Core viewport and rendering
2. **Extend `CanvasNode`** - Add new type definitions
3. **Implement shape rendering** - RoughJS integration
4. **Add freehand tool** - Drawing interaction
5. **Integrate with editor page** - Replace DOM canvas

**Ready to start implementation?** Confirm and I'll begin with Phase 1.
