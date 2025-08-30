import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { commandSlice, reactSlice } from './fluent-builder';
import { createIntegration } from './types';
import { startFlow, clearCurrentFlow } from './flow-context';

// Test integrations
const MailChimp = createIntegration('mailchimp', 'MailChimp');
const Twilio = createIntegration('twilio', 'Twilio');

describe('via method', () => {
  beforeEach(() => {
    startFlow('test-flow');
  });

  afterEach(() => {
    clearCurrentFlow();
  });

  it('should accept a single integration', () => {
    const slice = commandSlice('test').via(MailChimp);

    expect(slice).toBeDefined();
  });

  it('should accept multiple integrations as array', () => {
    const slice = commandSlice('test').via([MailChimp, Twilio]);

    expect(slice).toBeDefined();
  });

  it('should work with reactSlice', () => {
    const slice = reactSlice('test').via([MailChimp, Twilio]);

    expect(slice).toBeDefined();
  });
});
