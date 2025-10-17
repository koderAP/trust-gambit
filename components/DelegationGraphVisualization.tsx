'use client'

import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface DelegationNode {
  id: string
  name: string
  action: 'SOLVE' | 'DELEGATE' | 'PASS'
  score: number
  isCorrect: boolean | null
  isCurrentUser: boolean
  inCycle: boolean
  answer?: string
  delegateTo?: string
}

interface DelegationEdge {
  from: string
  to: string
}

interface DelegationGraphData {
  nodes: DelegationNode[]
  edges: DelegationEdge[]
}

interface Props {
  graphData: DelegationGraphData
}

export function DelegationGraphVisualization({ graphData }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!graphData || !graphData.nodes || !graphData.edges) return

    // Convert delegation nodes to ReactFlow nodes
    const flowNodes: Node[] = graphData.nodes.map((node, index) => {
      // Determine node color based on action and correctness
      let bgColor = '#e5e7eb' // gray default
      let borderColor = '#9ca3af'
      let textColor = '#1f2937'

      if (node.action === 'SOLVE') {
        if (node.isCorrect === true) {
          bgColor = '#d1fae5' // green
          borderColor = '#10b981'
          textColor = '#065f46'
        } else if (node.isCorrect === false) {
          bgColor = '#fee2e2' // red
          borderColor = '#ef4444'
          textColor = '#991b1b'
        } else {
          bgColor = '#dbeafe' // blue (solved but not evaluated yet)
          borderColor = '#3b82f6'
          textColor = '#1e40af'
        }
      } else if (node.action === 'DELEGATE') {
        bgColor = '#e0e7ff' // indigo
        borderColor = '#6366f1'
        textColor = '#3730a3'
      } else if (node.action === 'PASS') {
        bgColor = '#f3f4f6' // light gray
        borderColor = '#d1d5db'
        textColor = '#6b7280'
      }

      // Highlight current user
      if (node.isCurrentUser) {
        borderColor = '#eab308' // yellow
        bgColor = '#fef9c3'
      }

      // Highlight cycle members
      if (node.inCycle) {
        borderColor = '#dc2626' // red border for cycles
      }

      // Calculate position in a better spaced circular layout
      // Use larger radius and better spacing based on number of nodes
      const minRadius = 400
      const radiusIncrement = Math.max(200, graphData.nodes.length * 15)
      const radius = minRadius + (graphData.nodes.length > 10 ? radiusIncrement : 0)
      const angleStep = (2 * Math.PI) / graphData.nodes.length
      const angle = index * angleStep
      const centerX = 400
      const centerY = 300
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      return {
        id: node.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center px-4 py-3">
              <div className="font-bold text-base mb-1">{node.name}</div>
              {node.isCurrentUser && <div className="text-xs text-yellow-700 font-semibold mb-1">(You)</div>}
              <div className="text-xs mt-1.5 px-2 py-1 bg-white/50 rounded">{node.action}</div>
              {node.action === 'SOLVE' && node.isCorrect !== null && (
                <div className="text-xs mt-1">{node.isCorrect ? '✓ Correct' : '✗ Wrong'}</div>
              )}
              <div className={`text-base font-bold mt-2 ${node.score >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {node.score >= 0 ? '+' : ''}{node.score.toFixed(2)}
              </div>
              {node.inCycle && <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Cycle</div>}
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: `3px solid ${borderColor}`,
          borderRadius: '16px',
          padding: '12px',
          color: textColor,
          width: 180,
          fontSize: '13px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })

    // Convert delegation edges to ReactFlow edges
    const flowEdges: Edge[] = graphData.edges.map((edge, index) => ({
      id: `e${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#6366f1',
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1',
        width: 25,
        height: 25,
      },
      label: 'delegates to',
      labelStyle: {
        fontSize: '11px',
        fill: '#4b5563',
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.9,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [8, 4] as [number, number],
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [graphData, setNodes, setEdges])

  return (
    <div style={{ width: '100%', height: '600px' }} className="border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{
          padding: 0.3,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background color="#d1d5db" gap={20} size={1} />
      </ReactFlow>
      
      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-lg border-2 border-gray-200 text-sm space-y-2">
        <div className="font-bold mb-3 text-base">Legend</div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-green-200 border-2 border-green-600 rounded"></div>
          <span>Solved Correctly</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-red-200 border-2 border-red-600 rounded"></div>
          <span>Solved Incorrectly</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-indigo-200 border-2 border-indigo-600 rounded"></div>
          <span>Delegated</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 border-2 border-gray-400 rounded"></div>
          <span>Passed</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-600 rounded"></div>
          <span>You</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-white border-2 border-red-600 rounded"></div>
          <span>In Cycle</span>
        </div>
      </div>
    </div>
  )
}
