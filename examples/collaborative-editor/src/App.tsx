import React, { useState, useEffect, useRef } from 'react';
import { Cliffy, Multivector, MultivectorBuilder, initWasm } from '@cliffy/typescript';
import { useGeometric, useP2PCollaboration } from '@cliffy/typescript/react';
import { GeometricSpace, VectorVisualization, CRDTStatus } from '@cliffy/typescript/components';

interface EditOperation {
  id: string;
  nodeId: string;
  operationType: string;
  position: number;
  content: string;
  geometricTransform: number[];
  timestamp: number;
}

interface DocumentState {
  content: string;
  geometricState: number[];
  version: number;
  nodeId: string;
}

const App: React.FC = () => {
  const [cliffy, setCliffy] = useState<Cliffy | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const [operations, setOperations] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Cliffy
  useEffect(() => {
    const init = async () => {
      await initWasm();
      const cliffyInstance = new Cliffy('Cl(3,0)');
      await cliffyInstance.initialize();
      await cliffyInstance.initCRDT();
      setCliffy(cliffyInstance);
    };
    init();
  }, []);

  // Geometric state for document
  const documentGeometricState = useGeometric(
    cliffy ? cliffy.scalar(0) : new Multivector([0, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)')
  );

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const websocket = new WebSocket('ws://localhost:3030/ws');
      
      websocket.onopen = () => {
        console.log('🔗 Connected to collaborative editor server');
        setIsConnected(true);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.content !== undefined) {
            // Initial document state
            setDocumentContent(data.content);
            if (cliffy && data.geometricState) {
              const mv = new Multivector(data.geometricState, 'Cl(3,0)');
              documentGeometricState.transform('addition', mv);
            }
          } else if (data.operationType) {
            // Incoming edit operation
            handleRemoteEdit(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('🔌 Disconnected from server');
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);
    };

    if (cliffy) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [cliffy]);

  const handleRemoteEdit = (operation: EditOperation) => {
    console.log('📥 Received remote edit:', operation);
    
    // Apply the edit to local state
    const { operationType, position, content } = operation;
    
    setDocumentContent(prevContent => {
      let newContent = prevContent;
      
      switch (operationType) {
        case 'insert':
          newContent = prevContent.slice(0, position) + content + prevContent.slice(position);
          break;
        case 'delete':
          newContent = prevContent.slice(0, position) + prevContent.slice(position + content.length);
          break;
        case 'replace':
          const endPos = position + content.length;
          newContent = prevContent.slice(0, position) + content + prevContent.slice(endPos);
          break;
      }
      
      return newContent;
    });

    // Apply geometric transformation
    if (cliffy && operation.geometricTransform) {
      const mv = new Multivector(operation.geometricTransform, 'Cl(3,0)');
      documentGeometricState.transform('addition', mv);
      setOperations(prev => prev + 1);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const oldContent = documentContent;
    
    setDocumentContent(newContent);

    // Determine the type of change and create geometric transformation
    if (cliffy && ws && ws.readyState === WebSocket.OPEN) {
      const operation = analyzeTextChange(oldContent, newContent);
      if (operation) {
        const geometricTransform = textToGeometricTransform(operation);
        
        const editOperation: EditOperation = {
          id: `edit_${Date.now()}_${Math.random()}`,
          nodeId: cliffy.getNodeId(),
          operationType: operation.type,
          position: operation.position,
          content: operation.content,
          geometricTransform: geometricTransform.coefficients as number[],
          timestamp: Date.now(),
        };

        // Apply locally
        if (operation.type !== 'no-change') {
          documentGeometricState.transform('addition', geometricTransform);
          setOperations(prev => prev + 1);
        }

        // Send to server
        ws.send(JSON.stringify(editOperation));
      }
    }
  };

  const analyzeTextChange = (oldText: string, newText: string) => {
    if (oldText === newText) return null;

    if (newText.length > oldText.length) {
      // Text was inserted
      for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
        if (oldText[i] !== newText[i]) {
          return {
            type: 'insert',
            position: i,
            content: newText.slice(i, i + (newText.length - oldText.length))
          };
        }
      }
      // Insertion at the end
      return {
        type: 'insert',
        position: oldText.length,
        content: newText.slice(oldText.length)
      };
    } else {
      // Text was deleted
      for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
        if (oldText[i] !== newText[i]) {
          return {
            type: 'delete',
            position: i,
            content: oldText.slice(i, i + (oldText.length - newText.length))
          };
        }
      }
      // Deletion at the end
      return {
        type: 'delete',
        position: newText.length,
        content: oldText.slice(newText.length)
      };
    }
  };

  const textToGeometricTransform = (operation: { type: string; position: number; content: string }) => {
    if (!cliffy) return new Multivector([0, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)');

    const builder = cliffy.builder();
    
    switch (operation.type) {
      case 'insert':
        // Insertion as vector in e1-e2 plane
        return builder
          .e1(operation.position / 1000) // Normalize position
          .e2(operation.content.length / 100) // Content length factor
          .build();
        
      case 'delete':
        // Deletion as negative vector
        return builder
          .e1(-(operation.position / 1000))
          .e2(-(operation.content.length / 100))
          .build();
        
      default:
        return cliffy.scalar(0);
    }
  };

  const formatText = (formatType: string) => {
    if (!cliffy || !ws || ws.readyState !== WebSocket.OPEN) return;

    const selection = textareaRef.current?.selectionStart || 0;
    const geometricTransform = cliffy.builder()
      .e12(formatType === 'bold' ? 1.0 : formatType === 'italic' ? 0.5 : 0.25)
      .build();

    const editOperation: EditOperation = {
      id: `format_${Date.now()}_${Math.random()}`,
      nodeId: cliffy.getNodeId(),
      operationType: 'format',
      position: selection,
      content: formatType,
      geometricTransform: geometricTransform.coefficients as number[],
      timestamp: Date.now(),
    };

    documentGeometricState.transform('sandwich', geometricTransform);
    setOperations(prev => prev + 1);
    
    ws.send(JSON.stringify(editOperation));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎯 Cliffy Collaborative Editor</h1>
      <p>A revolutionary text editor using geometric algebra for conflict resolution</p>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>📝 Document Editor</h2>
          <div style={{ marginBottom: '10px' }}>
            <button onClick={() => formatText('bold')} disabled={!isConnected}>
              Bold
            </button>
            <button onClick={() => formatText('italic')} disabled={!isConnected} style={{ marginLeft: '5px' }}>
              Italic
            </button>
            <button onClick={() => formatText('underline')} disabled={!isConnected} style={{ marginLeft: '5px' }}>
              Underline
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            value={documentContent}
            onChange={handleTextChange}
            disabled={!isConnected}
            placeholder="Start typing to collaborate..."
            style={{
              width: '100%',
              height: '300px',
              padding: '10px',
              border: `2px solid ${isConnected ? '#4CAF50' : '#f44336'}`,
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
            Characters: {documentContent.length} | 
            Operations: {operations}
          </div>
        </div>

        <div style={{ flex: '0 0 400px' }}>
          <h2>🔮 Geometric Visualization</h2>
          <GeometricSpace width={350} height={250}>
            <VectorVisualization 
              vector={documentGeometricState.value} 
              color="#007acc" 
              label="Document State"
            />
          </GeometricSpace>
          
          {cliffy && (
            <CRDTStatus
              nodeId={cliffy.getNodeId()}
              state={documentGeometricState.value}
              operations={operations}
              peers={peers}
            />
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>🧮 Geometric Algebra Properties</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Current Document State</h3>
            <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify({
                scalar: documentGeometricState.value.coefficients[0]?.toFixed(3) || '0.000',
                vector: {
                  e1: documentGeometricState.value.coefficients[1]?.toFixed(3) || '0.000',
                  e2: documentGeometricState.value.coefficients[2]?.toFixed(3) || '0.000',
                  e3: documentGeometricState.value.coefficients[4]?.toFixed(3) || '0.000',
                },
                bivector: {
                  e12: documentGeometricState.value.coefficients[3]?.toFixed(3) || '0.000',
                  e13: documentGeometricState.value.coefficients[5]?.toFixed(3) || '0.000',
                  e23: documentGeometricState.value.coefficients[6]?.toFixed(3) || '0.000',
                }
              }, null, 2)}
            </pre>
          </div>
          
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Conflict Resolution</h3>
            <p style={{ fontSize: '14px' }}>
              Conflicts are resolved using geometric mean in the conformal model:
            </p>
            <ul style={{ fontSize: '12px' }}>
              <li>📍 <strong>Insert operations:</strong> Represented as translations (vectors)</li>
              <li>🗑️ <strong>Delete operations:</strong> Represented as inverse translations</li>
              <li>🎨 <strong>Format operations:</strong> Represented as rotations (bivectors)</li>
              <li>🔄 <strong>Conflict resolution:</strong> Geometric mean preserves document semantics</li>
            </ul>
            <p style={{ fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>
              Magnitude: {documentGeometricState.value.magnitude().toFixed(3)}
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        Powered by Cliffy - Geometric Algebra for Distributed Systems
      </div>
    </div>
  );
};

export default App;