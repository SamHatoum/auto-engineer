import { toKebabCase } from '../utils/path';
import { Message } from '../types';

export interface ImportGroup {
  importPath: string;
  eventTypes: string[];
}

export interface CrossSliceImportContext {
  currentSliceName: string;
  events: Message[];
}

/**
 * Groups events by their import paths, handling cross-slice imports correctly.
 * Events from the current slice are imported from './events',
 * while cross-slice events are imported from '../other-slice/events'.
 */
export function groupEventImports(context: CrossSliceImportContext): ImportGroup[] {
  const { currentSliceName, events } = context;
  const importGroups = new Map<string, string[]>();

  for (const event of events) {
    if (!event.type) continue;
    let importPath: string;
    const isFromCurrentSlice =
      event.source === 'then' || event.sourceSliceName === currentSliceName || event.sourceSliceName == null;

    if (isFromCurrentSlice) {
      importPath = './events';
    } else {
      importPath = `../${toKebabCase(event.sourceSliceName ?? currentSliceName)}/events`;
    }
    if (!importGroups.has(importPath)) {
      importGroups.set(importPath, []);
    }
    const eventTypes = importGroups.get(importPath)!;
    if (!eventTypes.includes(event.type)) {
      eventTypes.push(event.type);
    }
  }
  return Array.from(importGroups.entries()).map(([importPath, eventTypes]) => ({
    importPath,
    eventTypes: eventTypes.sort(),
  }));
}

/**
 * Filters events to only include those from the current slice (source === 'then').
 * Used for generating local event definitions.
 */
export function getLocalEvents(events: Message[]): Message[] {
  return events.filter((event) => event.source === 'then');
}

/**
 * Extracts all unique event types from a list of events.
 */
export function getAllEventTypes(events: Message[]): string[] {
  const eventTypes = events.map((event) => event.type).filter((type): type is string => Boolean(type));

  return Array.from(new Set(eventTypes)).sort();
}

/**
 * Creates a TypeScript union type string from event types.
 */
export function createEventUnionType(events: Message[]): string {
  const eventTypes = getAllEventTypes(events);
  return eventTypes.length > 0 ? eventTypes.join(' | ') : 'never';
}
