import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Edit3, Trash2, Plus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  id: string;
  points: Point[];
  color: string;
}

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - viewState.offsetX) / viewState.scale;
    const y = (screenY - rect.top - viewState.offsetY) / viewState.scale;
    return { x, y };
  }, [viewState]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    return {
      x: canvasX * viewState.scale + viewState.offsetX,
      y: canvasY * viewState.scale + viewState.offsetY
    };
  }, [viewState]);

  // Draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();
    ctx.translate(viewState.offsetX, viewState.offsetY);
    ctx.scale(viewState.scale, viewState.scale);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1 / viewState.scale;
    const gridSize = 50;
    const startX = Math.floor(-viewState.offsetX / viewState.scale / gridSize) * gridSize;
    const startY = Math.floor(-viewState.offsetY / viewState.scale / gridSize) * gridSize;
    const endX = startX + (canvas.width / viewState.scale) + gridSize;
    const endY = startY + (canvas.height / viewState.scale) + gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw existing polygons
    polygons.forEach((polygon) => {
      if (polygon.points.length < 2) return;

      const isSelected = polygon.id === selectedPolygonId;
      
      // Draw polygon fill
      ctx.fillStyle = polygon.color + '20';
      ctx.beginPath();
      ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      polygon.points.forEach((point, index) => {
        if (index > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();

      // Draw polygon outline
      ctx.strokeStyle = isSelected ? '#000000' : polygon.color;
      ctx.lineWidth = (isSelected ? 3 : 2) / viewState.scale;
      ctx.stroke();

      // Draw control points for selected polygon
      if (isSelected && isEditing) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 / viewState.scale;
        
        polygon.points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6 / viewState.scale, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Highlight dragged point
          if (draggedPointIndex === index) {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6 / viewState.scale, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
          }
        });
      }
    });

    // Draw current drawing points
    if (currentPoints.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = '#3b82f620';
      ctx.lineWidth = 2 / viewState.scale;

      if (currentPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach((point, index) => {
          if (index > 0) ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point, index) => {
        if (index > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#3b82f6';
      currentPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / viewState.scale, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    ctx.restore();
  }, [polygons, selectedPolygonId, isEditing, currentPoints, draggedPointIndex, viewState]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isPanning || draggedPointIndex !== null) return;

    const point = screenToCanvas(e.clientX, e.clientY);

    if (isDrawing) {
      // Check if clicking near the first point to close polygon
      if (currentPoints.length > 2) {
        const firstPoint = currentPoints[0];
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        
        if (distance < 20 / viewState.scale) {
          // Close polygon
          const newPolygon: Polygon = {
            id: isEditing && selectedPolygonId ? selectedPolygonId : `polygon-${Date.now()}`,
            points: [...currentPoints],
            color: colors[polygons.length % colors.length]
          };

          if (isEditing && selectedPolygonId) {
            // Replace existing polygon
            setPolygons(prev => prev.map(p => p.id === selectedPolygonId ? newPolygon : p));
          } else {
            // Add new polygon
            setPolygons(prev => [...prev, newPolygon]);
          }

          setCurrentPoints([]);
          setIsDrawing(false);
          setIsEditing(false);
          setSelectedPolygonId(newPolygon.id);
          return;
        }
      }

      // Add point to current drawing
      setCurrentPoints(prev => [...prev, point]);
    } else if (isEditing && selectedPolygonId) {
      // Check if clicking on a control point
      const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
      if (selectedPolygon) {
        for (let i = 0; i < selectedPolygon.points.length; i++) {
          const controlPoint = selectedPolygon.points[i];
          const distance = Math.sqrt(
            Math.pow(point.x - controlPoint.x, 2) + Math.pow(point.y - controlPoint.y, 2)
          );
          
          if (distance < 10 / viewState.scale) {
            return; // Don't deselect if clicking on control point
          }
        }
      }
      
      // Click outside control points - deselect
      setIsEditing(false);
      setSelectedPolygonId(null);
    } else {
      // Check if clicking on a polygon
      let clickedPolygon: Polygon | null = null;
      
      for (const polygon of polygons) {
        if (polygon.points.length < 3) continue;
        
        // Point-in-polygon test
        let inside = false;
        for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
          if (((polygon.points[i].y > point.y) !== (polygon.points[j].y > point.y)) &&
              (point.x < (polygon.points[j].x - polygon.points[i].x) * (point.y - polygon.points[i].y) / (polygon.points[j].y - polygon.points[i].y) + polygon.points[i].x)) {
            inside = !inside;
          }
        }
        
        if (inside) {
          clickedPolygon = polygon;
          break;
        }
      }
      
      if (clickedPolygon) {
        setSelectedPolygonId(clickedPolygon.id);
      } else {
        setSelectedPolygonId(null);
      }
    }
  }, [isDrawing, isEditing, currentPoints, selectedPolygonId, polygons, isPanning, draggedPointIndex, screenToCanvas, viewState.scale]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle mouse or Ctrl+click for panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    if (isEditing && selectedPolygonId) {
      const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
      if (selectedPolygon) {
        // Check if clicking on a control point
        for (let i = 0; i < selectedPolygon.points.length; i++) {
          const controlPoint = selectedPolygon.points[i];
          const distance = Math.sqrt(
            Math.pow(point.x - controlPoint.x, 2) + Math.pow(point.y - controlPoint.y, 2)
          );
          
          if (distance < 10 / viewState.scale) {
            setDraggedPointIndex(i);
            e.preventDefault();
            return;
          }
        }
      }
    }
  }, [isEditing, selectedPolygonId, polygons, screenToCanvas, viewState.scale]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggedPointIndex !== null && selectedPolygonId) {
      const point = screenToCanvas(e.clientX, e.clientY);
      
      setPolygons(prev => prev.map(polygon => {
        if (polygon.id === selectedPolygonId) {
          const newPoints = [...polygon.points];
          newPoints[draggedPointIndex] = point;
          return { ...polygon, points: newPoints };
        }
        return polygon;
      }));
    }
  }, [isPanning, lastPanPoint, draggedPointIndex, selectedPolygonId, screenToCanvas]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setLastPanPoint(null);
    setDraggedPointIndex(null);
  }, []);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, viewState.scale * scaleFactor));
    
    if (newScale !== viewState.scale) {
      const scaleChange = newScale / viewState.scale;
      
      setViewState(prev => ({
        scale: newScale,
        offsetX: mouseX - (mouseX - prev.offsetX) * scaleChange,
        offsetY: mouseY - (mouseY - prev.offsetY) * scaleChange
      }));
    }
  }, [viewState.scale]);

  // Start drawing new polygon
  const startDrawing = () => {
    setIsDrawing(true);
    setIsEditing(false);
    setSelectedPolygonId(null);
    setCurrentPoints([]);
  };

  // Start editing selected polygon
  const startEditing = (polygonId: string) => {
    setSelectedPolygonId(polygonId);
    setIsEditing(true);
    setIsDrawing(true);
    setCurrentPoints([]);
  };

  // Delete polygon
  const deletePolygon = (polygonId: string) => {
    setPolygons(prev => prev.filter(p => p.id !== polygonId));
    if (selectedPolygonId === polygonId) {
      setSelectedPolygonId(null);
      setIsEditing(false);
    }
  };

  // Select polygon
  const selectPolygon = (polygonId: string) => {
    setSelectedPolygonId(polygonId);
    setIsEditing(false);
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // Zoom controls
  const zoomIn = () => {
    setViewState(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.2)
    }));
  };

  const zoomOut = () => {
    setViewState(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }));
  };

  const resetView = () => {
    setViewState({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  // Draw on canvas updates
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setIsEditing(false);
        setCurrentPoints([]);
        setSelectedPolygonId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Polygon Editor</h1>
          <button
            onClick={startDrawing}
            disabled={isDrawing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} />
            {isDrawing ? 'Drawing...' : 'New Polygon'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Polygons ({polygons.length})</h2>
          
          {polygons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No polygons yet.</p>
              <p className="text-sm mt-1">Click "New Polygon" to start drawing.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {polygons.map((polygon, index) => (
                <div
                  key={polygon.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedPolygonId === polygon.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => selectPolygon(polygon.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: polygon.color }}
                      />
                      <span className="font-medium text-gray-800">
                        Polygon {index + 1}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(polygon.id);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Edit polygon"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePolygon(polygon.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete polygon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {polygon.points.length} points
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={zoomIn}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ZoomIn size={16} />
              Zoom In
            </button>
            <button
              onClick={zoomOut}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ZoomOut size={16} />
              Zoom Out
            </button>
            <button
              onClick={resetView}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
              title="Reset view"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Zoom: {Math.round(viewState.scale * 100)}%
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {isDrawing ? (
              <>
                <li>• Click to add points</li>
                <li>• Click near first point to close</li>
                <li>• Press Escape to cancel</li>
              </>
            ) : isEditing ? (
              <>
                <li>• Drag control points to edit</li>
                <li>• Click outside to finish editing</li>
                <li>• Press Escape to cancel</li>
              </>
            ) : (
              <>
                <li>• Click polygons to select them</li>
                <li>• Use sidebar to manage polygons</li>
                <li>• Scroll to zoom, Ctrl+drag to pan</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;