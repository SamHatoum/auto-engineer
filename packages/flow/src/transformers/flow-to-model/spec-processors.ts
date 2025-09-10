/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, complexity */
import { TypeInfo } from '../../loader/ts-utils';
import { Message } from '../../index';
import { createMessage } from './messages';
import { preferNewFields } from './normalize';
import { ExampleShapeHints, collectExampleHintsForData } from './example-shapes';

type TypeResolver = (
  t: string,
  expected?: 'command' | 'event' | 'state',
  exampleData?: unknown,
) => { resolvedName: string; typeInfo: TypeInfo | undefined };

function handleEventRef(
  g: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const { resolvedName, typeInfo } = resolveTypeAndInfo(g.eventRef, 'event', g.exampleData);

  // Only fix ref type if we have concrete typeInfo and it's definitely not an event
  // Don't misclassify events as states when type resolution fails
  if (typeInfo && typeInfo.classification && typeInfo.classification !== 'event') {
    if (typeInfo.classification === 'command') {
      delete g.eventRef;
      g.commandRef = resolvedName;
      if (g.exampleData !== undefined) {
        collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
      }
    }
    // Never auto-convert events to states - this causes misclassification
  } else {
    g.eventRef = resolvedName;
    if (g.exampleData !== undefined) {
      collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
    }
  }

  const messageType = typeInfo?.classification || 'event';
  const msg = createMessage(resolvedName, typeInfo, messageType);
  const existing = messages.get(resolvedName);
  if (!existing || preferNewFields(msg.fields, existing.fields)) {
    messages.set(resolvedName, msg);
  }
}

function handleStateRef(
  g: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const { resolvedName, typeInfo } = resolveTypeAndInfo(g.stateRef, 'state', g.exampleData);
  g.stateRef = resolvedName;

  if (g.exampleData !== undefined) {
    collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
  }

  // Respect the actual classification of the type, not just assume 'state'
  const messageType = typeInfo?.classification || 'state';
  const msg = createMessage(resolvedName, typeInfo, messageType);
  const existing = messages.get(resolvedName);
  if (!existing || preferNewFields(msg.fields, existing.fields)) {
    messages.set(resolvedName, msg);
  }
}

function handleCommandRef(
  g: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const cmdRef = g.commandRef;
  if (typeof cmdRef === 'string') {
    const { resolvedName, typeInfo } = resolveTypeAndInfo(cmdRef, 'command', g.exampleData);
    g.commandRef = resolvedName;

    if (g.exampleData !== undefined) {
      collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
    }

    const msg = createMessage(resolvedName, typeInfo, 'command');
    const existing = messages.get(resolvedName);
    if (!existing || preferNewFields(msg.fields, existing.fields)) {
      messages.set(resolvedName, msg);
    }
  }
}

export function processGiven(
  given: any[],
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  given.forEach((g) => {
    // Auto-correct misclassified refs based on actual type classification
    if ('stateRef' in g) {
      const originalRef = g.stateRef;
      const { resolvedName, typeInfo } = resolveTypeAndInfo(originalRef, 'state', g.exampleData);

      console.log('DEBUG processGiven state resolution:', {
        originalRef,
        resolvedName,
        classification: typeInfo?.classification,
      });

      // If we got InferredType -> InferredType (failed resolution), try resolving as other types
      if (originalRef === 'InferredType' && resolvedName === 'InferredType') {
        // Only try other types if the state resolution completely failed
        const eventResult = resolveTypeAndInfo(originalRef, 'event', g.exampleData);
        const commandResult = resolveTypeAndInfo(originalRef, 'command', g.exampleData);

        console.log('DEBUG trying alternatives:', {
          eventResult: { name: eventResult.resolvedName, classification: eventResult.typeInfo?.classification },
          commandResult: { name: commandResult.resolvedName, classification: commandResult.typeInfo?.classification },
        });

        // Prefer event or command if they resolve to non-InferredType and state resolution failed
        if (eventResult.resolvedName !== 'InferredType' && eventResult.typeInfo?.classification === 'event') {
          console.log('DEBUG converting to eventRef:', eventResult.resolvedName);
          delete g.stateRef;
          g.eventRef = eventResult.resolvedName;
          handleEventRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
          return;
        } else if (
          commandResult.resolvedName !== 'InferredType' &&
          commandResult.typeInfo?.classification === 'command'
        ) {
          console.log('DEBUG converting to commandRef:', commandResult.resolvedName);
          delete g.stateRef;
          g.commandRef = commandResult.resolvedName;
          handleCommandRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
          return;
        }
      }

      // Original logic: if resolved type has different classification, convert
      if (typeInfo && typeInfo.classification === 'event') {
        console.log('DEBUG original logic conversion to event:', resolvedName);
        delete g.stateRef;
        g.eventRef = resolvedName;
        handleEventRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
        return;
      }
    }

    if ('eventRef' in g) {
      // Auto-correct eventRef that should be stateRef (similar logic to stateRef auto-correction)
      const originalRef = g.eventRef;
      const { resolvedName, typeInfo } = resolveTypeAndInfo(originalRef, 'event', g.exampleData);

      console.log('DEBUG processGiven event resolution:', {
        originalRef,
        resolvedName,
        classification: typeInfo?.classification,
      });

      // Always try alternative resolutions when we have InferredType (regardless of whether it resolved)
      if (originalRef === 'InferredType') {
        const stateResult = resolveTypeAndInfo(originalRef, 'state', g.exampleData);
        const commandResult = resolveTypeAndInfo(originalRef, 'command', g.exampleData);

        console.log('DEBUG trying alternatives for event:', {
          eventResult: { name: resolvedName, classification: typeInfo?.classification },
          stateResult: { name: stateResult.resolvedName, classification: stateResult.typeInfo?.classification },
          commandResult: { name: commandResult.resolvedName, classification: commandResult.typeInfo?.classification },
        });

        // Prefer state or command if they provide better matches than event
        if (stateResult.resolvedName !== 'InferredType' && stateResult.typeInfo?.classification === 'state') {
          console.log('DEBUG converting eventRef to stateRef (better match):', stateResult.resolvedName);
          delete g.eventRef;
          g.stateRef = stateResult.resolvedName;
          handleStateRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
          return;
        } else if (
          commandResult.resolvedName !== 'InferredType' &&
          commandResult.typeInfo?.classification === 'command'
        ) {
          console.log('DEBUG converting eventRef to commandRef (better match):', commandResult.resolvedName);
          delete g.eventRef;
          g.commandRef = commandResult.resolvedName;
          handleCommandRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
          return;
        }
      }

      // Original logic: if resolved type has different classification, convert
      if (typeInfo && typeInfo.classification === 'state') {
        console.log('DEBUG original logic conversion event to state:', resolvedName);
        delete g.eventRef;
        g.stateRef = resolvedName;
        handleStateRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
        return;
      } else if (typeInfo && typeInfo.classification === 'command') {
        console.log('DEBUG original logic conversion event to command:', resolvedName);
        delete g.eventRef;
        g.commandRef = resolvedName;
        handleCommandRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
        return;
      }

      handleEventRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
    }
    if ('stateRef' in g) {
      handleStateRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
    }
    if ('commandRef' in g) {
      handleCommandRef(g, resolveTypeAndInfo, messages, exampleShapeHints);
    }
  });
}

export function processWhen(
  when: any,
  slice: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  if ('commandRef' in when) {
    // when (single)
    // Skip processing if commandRef is empty string (from empty .when({}))
    if (when.commandRef === '') {
      return;
    }

    const expected = slice.type === 'command' ? 'command' : 'event';
    const { resolvedName, typeInfo } = resolveTypeAndInfo(when.commandRef, expected, when.exampleData);

    // Fix ref type if resolved type has different classification
    if (typeInfo && typeInfo.classification !== 'command') {
      if (typeInfo.classification === 'event') {
        delete when.commandRef;
        when.eventRef = resolvedName;
      } else if (typeInfo.classification === 'state') {
        delete when.commandRef;
        when.stateRef = resolvedName;
      }
    } else {
      when.commandRef = resolvedName;
    }

    // collect example shapes for when (single)
    if (when.exampleData !== undefined) {
      const refName = when.commandRef || when.eventRef || when.stateRef;
      if (typeof refName === 'string') {
        collectExampleHintsForData(refName, when.exampleData, exampleShapeHints);
      }
    }

    // Don't create messages for InferredType (from empty .when({}))
    if (resolvedName !== 'InferredType') {
      const messageType = typeInfo?.classification || (slice.type === 'command' ? 'command' : 'event');
      const msg = createMessage(resolvedName, typeInfo, messageType);
      const existing = messages.get(resolvedName);
      if (!existing || preferNewFields(msg.fields, existing.fields)) {
        messages.set(resolvedName, msg);
      }
    }
  } else if (Array.isArray(when)) {
    // when (array)
    when.forEach((ev) => {
      const { resolvedName, typeInfo } = resolveTypeAndInfo(ev.eventRef, 'event', ev.exampleData);
      ev.eventRef = resolvedName;

      // collect example shapes for when (array)
      if (ev.exampleData !== undefined) {
        collectExampleHintsForData(resolvedName, ev.exampleData, exampleShapeHints);
      }

      const messageType = typeInfo?.classification || 'event';
      const msg = createMessage(resolvedName, typeInfo, messageType);
      const existing = messages.get(resolvedName);
      if (!existing || preferNewFields(msg.fields, existing.fields)) {
        messages.set(resolvedName, msg);
      }
    });
  }
}

function handleThenEventRef(
  t: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.eventRef, 'event', t.exampleData);
  t.eventRef = resolvedName;

  if (t.exampleData !== undefined) {
    collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
  }

  const messageType =
    typeInfo?.classification === 'command' ||
    typeInfo?.classification === 'event' ||
    typeInfo?.classification === 'state'
      ? typeInfo.classification
      : 'event';
  const msg = createMessage(resolvedName, typeInfo, messageType);
  const existing = messages.get(resolvedName);
  if (!existing || preferNewFields(msg.fields, existing.fields)) {
    messages.set(resolvedName, msg);
  }
}

function handleThenCommandRef(
  t: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.commandRef, 'command', t.exampleData);

  // Fix ref type if resolved type has different classification
  if (typeInfo && typeInfo.classification !== 'command') {
    if (typeInfo.classification === 'event') {
      delete t.commandRef;
      t.eventRef = resolvedName;
      if (t.exampleData !== undefined) collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
    } else if (typeInfo.classification === 'state') {
      delete t.commandRef;
      t.stateRef = resolvedName;
      if (t.exampleData !== undefined) collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
    }
  } else {
    t.commandRef = resolvedName;
    if (t.exampleData !== undefined) collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
  }

  const messageType = typeInfo?.classification || 'command';
  const msg = createMessage(resolvedName, typeInfo, messageType);
  const existing = messages.get(resolvedName);
  if (!existing || preferNewFields(msg.fields, existing.fields)) {
    messages.set(resolvedName, msg);
  }
}

function handleThenStateRef(
  t: any,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.stateRef, 'state', t.exampleData);
  t.stateRef = resolvedName;

  if (t.exampleData !== undefined) {
    collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
  }

  const messageType = typeInfo?.classification || 'state';
  const msg = createMessage(resolvedName, typeInfo, messageType);
  const existing = messages.get(resolvedName);
  if (!existing || preferNewFields(msg.fields, existing.fields)) {
    messages.set(resolvedName, msg);
  }
}

export function processThen(
  then: any[],
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
) {
  if (Array.isArray(then) && then.length > 0) {
    then.forEach((t) => {
      if ('eventRef' in t) {
        handleThenEventRef(t, resolveTypeAndInfo, messages, exampleShapeHints);
      } else if ('commandRef' in t) {
        handleThenCommandRef(t, resolveTypeAndInfo, messages, exampleShapeHints);
      } else if ('stateRef' in t) {
        handleThenStateRef(t, resolveTypeAndInfo, messages, exampleShapeHints);
      }
    });
  }
}
