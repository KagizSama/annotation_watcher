import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Edit3, Trash2, Plus, ZoomIn, ZoomOut, RotateCcw, MousePointer } from 'lucide-react';

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
  const [mode, setMode] = useState<'select' | 'draw' | 'edit'>('select');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  
  // Add state for tracking edit operations
  const [editingPolygonId, setEditingPolygonId] = useState<string | null>(null);

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
    ctx.strokeStyle = '#f3f4f6';
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
      ctx.strokeStyle = isSelected ? '#1f2937' : polygon.color;
      ctx.lineWidth = (isSelected ? 3 : 2) / viewState.scale;
      ctx.stroke();

      // Draw control points for selected polygon in edit mode
      if (isSelected && mode === 'edit') {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2 / viewState.scale;
        
        polygon.points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8 / viewState.scale, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Highlight dragged point
          if (draggedPointIndex === index) {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8 / viewState.scale, 0, 2 * Math.PI);
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
      ctx.lineWidth = 3 / viewState.scale;

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
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / viewState.scale;
      currentPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / viewState.scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Highlight first point when we can close the polygon
        if (index === 0 && currentPoints.length > 2) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3 / viewState.scale;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 10 / viewState.scale, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / viewState.scale;
        }
      });
    }

    ctx.restore();
  }, [polygons, selectedPolygonId, mode, currentPoints, draggedPointIndex, viewState]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Prevent clicks during panning or dragging
    if (isPanning || draggedPointIndex !== null) {
      return;
    }

    const point = screenToCanvas(e.clientX, e.clientY);

    if (mode === 'draw') {
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
          setMode('select');
          return;
        }
      }

      // Add point to current drawing
      setCurrentPoints(prev => [...prev, point]);
    } else if (mode === 'edit' && selectedPolygonId) {
      // Check if clicking on a control point - if so, don't deselect
      const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
      if (selectedPolygon) {
        for (let i = 0; i < selectedPolygon.points.length; i++) {
          const controlPoint = selectedPolygon.points[i];
          const distance = Math.sqrt(
            Math.pow(point.x - controlPoint.x, 2) + Math.pow(point.y - controlPoint.y, 2)
          );
          
          if (distance < 12 / viewState.scale) {
            return; // Don't deselect if clicking on control point
          }
        }
      }
      
      // Click outside control points - exit edit mode
      setMode('select');
    } else if (mode === 'select') {
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
  }, [mode, currentPoints, selectedPolygonId, polygons, isPanning, draggedPointIndex, screenToCanvas, viewState.scale, isEditing]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const point = screenToCanvas(e.clientX, e.clientY);

    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle mouse or Ctrl+click for panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (mode === 'edit' && selectedPolygonId) {
      const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
      if (selectedPolygon) {
        // Check if clicking on a control point
        for (let i = 0; i < selectedPolygon.points.length; i++) {
          const controlPoint = selectedPolygon.points[i];
          const distance = Math.sqrt(
            Math.pow(point.x - controlPoint.x, 2) + Math.pow(point.y - controlPoint.y, 2)
          );
          
          if (distance < 12 / viewState.scale) {
            setDraggedPointIndex(i);
            return;
          }
        }
      }
    }
  }, [mode, selectedPolygonId, polygons, screenToCanvas, viewState.scale]);

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
    setMode('draw');
    setIsDrawing(true);
    setIsEditing(false);
    setSelectedPolygonId(null);
    setCurrentPoints([]);
  };

  // Select polygon
  const selectPolygon = (polygonId: string) => {
    setSelectedPolygonId(polygonId);
    setMode('select');
    setIsDrawing(false);
    setIsEditing(false);
    setCurrentPoints([]);
  };

  // Start editing by replacing polygon completely
  const editPolygon = (polygonId: string) => {
    const polygonToEdit = polygons.find(p => p.id === polygonId);
    if (!polygonToEdit) return;
    
    // Clear the existing polygon points and start fresh drawing
    setSelectedPolygonId(polygonId);
    setEditingPolygonId(polygonId);
    setMode('draw');
    setIsEditing(true);
    setIsDrawing(true);
    setCurrentPoints([]);
    
    // Clear the polygon's points immediately to show it's being replaced
    setPolygons(prev => prev.map(p => 
      p.id === polygonId ? { ...p, points: [] } : p
    ));
  };

  // Start editing existing polygon points
  const editPolygonPoints = (polygonId: string) => {
    setSelectedPolygonId(polygonId);
    setEditingPolygonId(null);
    setMode('edit');
    setIsDrawing(false);
    setIsEditing(false);
    setCurrentPoints([]);
  };

  // Delete polygon
  const deletePolygon = (polygonId: string) => {
    setPolygons(prev => prev.filter(p => p.id !== polygonId));
    if (selectedPolygonId === polygonId) {
      setSelectedPolygonId(null);
      setMode('select');
      setIsEditing(false);
      setIsDrawing(false);
    }
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
        setMode('select');
        setIsDrawing(false);
        setIsEditing(false);
        setCurrentPoints([]);
        setSelectedPolygonId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        draw();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize

    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Fixed width, scrollable content */}
      <div className="w-80 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Polygon Editor</h1>
          <button
            onClick={startDrawing}
            disabled={mode === 'draw'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-medium shadow-sm"
          >
            <Plus size={20} />
            {mode === 'draw' ? 'Drawing Mode Active' : 'New Polygon'}
          </button>
        </div>

        {/* Mode Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              mode === 'select' ? 'bg-green-500' : 
              mode === 'draw' ? 'bg-blue-500' : 
              'bg-orange-500'
            }`} />
            <span className="font-medium text-gray-700">
              {mode === 'select' ? 'Selection Mode' : 
               mode === 'draw' ? (isEditing ? 'Replacing Polygon' : 'Drawing Mode') : 
               'Edit Mode'}
            </span>
          </div>
        </div>

        {/* Polygons List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Polygons ({polygons.length})
              </h2>
              {selectedPolygonId && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Selected
                </span>
              )}
            </div>
            
            {polygons.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MousePointer size={24} className="text-gray-400" />
                </div>
                <p className="font-medium">No polygons yet</p>
                <p className="text-sm mt-1">Click "New Polygon" to start drawing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {polygons.map((polygon, index) => (
                  <div
                    key={polygon.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedPolygonId === polygon.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: polygon.color }}
                        />
                        <span className="font-semibold text-gray-800">
                          Polygon {index + 1}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {polygon.points.length} points
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectPolygon(polygon.id)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedPolygonId === polygon.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <MousePointer size={14} className="inline mr-1" />
                        Select
                      </button>
                      <button
                        onClick={() => editPolygonPoints(polygon.id)}
                        className="px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-sm font-medium transition-colors"
                        title="Edit polygon points"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => editPolygon(polygon.id)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                        title="Replace polygon (draw new)"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => deletePolygon(polygon.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                        title="Delete polygon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={zoomIn}
              className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-gray-200 text-sm font-medium"
            >
              <ZoomIn size={16} />
              In
            </button>
            <button
              onClick={zoomOut}
              className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-gray-200 text-sm font-medium"
            >
              <ZoomOut size={16} />
              Out
            </button>
            <button
              onClick={resetView}
              className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center transition-colors border border-gray-200"
              title="Reset view"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="text-center text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
            Zoom: {Math.round(viewState.scale * 100)}%
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${
            mode === 'draw' ? 'cursor-crosshair' : 
            mode === 'edit' ? 'cursor-pointer' : 
            'cursor-default'
          }`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Instructions Panel */}
        <div className="absolute top-6 right-6 bg-white bg-opacity-95 backdrop-blur-sm p-5 rounded-xl shadow-lg max-w-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              mode === 'select' ? 'bg-green-500' : 
              mode === 'draw' ? 'bg-blue-500' : 
              'bg-orange-500'
            }`} />
            Instructions
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            {mode === 'draw' ? (
              isEditing ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    {editingPolygonId ? `Replacing Polygon ${polygons.findIndex(p => p.id === editingPolygonId) + 1}` : 'Drawing replacement polygon'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    Click to add points
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    Click near first point to close
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    Press Escape to cancel
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    Click to add points
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    Click near first point to close
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    Press Escape to cancel
                  </li>
                </>
              )
            ) : mode === 'edit' ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  Drag control points to edit
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Click outside to finish editing
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  Press Escape to cancel
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  Click polygons to select them
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Use sidebar to manage polygons
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  Scroll to zoom, Ctrl+drag to pan
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  Orange edit = modify points
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Blue + = replace polygon
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Status indicator */}
        {mode !== 'select' && (
          <div className="absolute top-6 left-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg font-medium">
            {mode === 'draw' && isEditing ? 'Replacing Polygon...' : 
             mode === 'draw' ? 'Drawing New Polygon...' : 
             'Editing Polygon Points...'}
          </div>
        )}

        {/* Zoom level indicator */}
        <div className="absolute bottom-6 right-6 bg-white bg-opacity-95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-700">
            Zoom: {Math.round(viewState.scale * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;