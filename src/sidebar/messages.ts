export type SidebarIncomingMessage =
  | { type: 'ready' }
  | { type: 'saveSelection'; selection: unknown }
  | { type: 'scanWorkspace' }
  | { type: 'generateProject' }
  | { type: 'generateFlashScript' }
  | { type: 'generateDebugConfiguration' }
  | { type: 'openSettings' };

export type SidebarOutgoingMessage =
  | { type: 'state'; state: unknown }
  | { type: 'operationStarted'; operation: string }
  | {
      type: 'operationFinished';
      result: {
        ok: boolean;
        message: string;
        files: string[];
      };
    }
  | { type: 'workspaceScan'; sources: number; includeDirs: number; defines: number }
  | { type: 'notification'; level: 'info' | 'warning' | 'error'; message: string };

const commandTypes = new Set([
  'ready',
  'scanWorkspace',
  'generateProject',
  'generateFlashScript',
  'generateDebugConfiguration',
  'openSettings'
]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function parseIncomingMessage(value: unknown): SidebarIncomingMessage | undefined {
  const record = asRecord(value);
  if (!record || typeof record.type !== 'string') {
    return undefined;
  }
  if (record.type === 'saveSelection') {
    return record.selection === undefined
      ? undefined
      : { type: 'saveSelection', selection: record.selection };
  }
  if (!commandTypes.has(record.type)) {
    return undefined;
  }
  return { type: record.type } as SidebarIncomingMessage;
}
