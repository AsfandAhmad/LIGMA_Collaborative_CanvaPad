/**
 * Canvas Type Definitions
 * 
 * This file defines TypeScript types for canvas nodes, cursor positions,
 * and canvas state management used throughout the frontend application.
 */

/**
 * Node type enumeration
 * Defines the types of canvas elements that can be created
 */
export enum NodeType {
  STICKY_NOTE = 'STICKY_NOTE',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  TEXT = 'TEXT'
}

/**
 * Canvas node interface - stored in Y.Map
 * Represents a collaborative canvas element with all its properties
 */
export interface CanvasNode {
  /** Unique identifier for the node */
  id: string
  
  /** Type of the canvas node */
  type: NodeType
  
  /** X coordinate position on canvas */
  x: number
  
  /** Y coordinate position on canvas */
  y: number
  
  /** Width of the node in pixels */
  width: number
  
  /** Height of the node in pixels */
  height: number
  
  /** Text content of the node */
  text: string
  
  /** Color of the node (hex format) */
  color: string
  
  /** User ID of the creator */
  createdBy: string
  
  /** Timestamp when node was created */
  createdAt: number
  
  /** Timestamp when node was last updated (optional) */
  updatedAt?: number
  
  /** Whether the node is locked from editing (optional) */
  locked?: boolean
  
  /** Z-index for layering (optional) */
  zIndex?: number
}

/**
 * Cursor position interface
 * Represents a user's cursor position on the canvas for presence tracking
 */
export interface CursorPosition {
  /** X coordinate of cursor */
  x: number
  
  /** Y coordinate of cursor */
  y: number
  
  /** User ID of cursor owner */
  userId: string
  
  /** Display name of user */
  userName: string
  
  /** Color assigned to user's cursor */
  color: string
  
  /** Timestamp of last cursor update */
  lastUpdate: number
}

/**
 * Canvas state interface
 * Manages the overall state of the canvas including nodes and viewport
 */
export interface CanvasState {
  /** Map of all canvas nodes by ID */
  nodes: Map<string, CanvasNode>
  
  /** Set of currently selected node IDs */
  selectedNodeIds: Set<string>
  
  /** Viewport X offset */
  viewportX: number
  
  /** Viewport Y offset */
  viewportY: number
  
  /** Zoom level (1.0 = 100%) */
  zoom: number
}
