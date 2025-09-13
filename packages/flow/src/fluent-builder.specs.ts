import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { command, react } from './fluent-builder';
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
    const slice = command('test').via(MailChimp);

    expect(slice).toBeDefined();
  });

  it('should accept multiple integrations as array', () => {
    const slice = command('test').via([MailChimp, Twilio]);

    expect(slice).toBeDefined();
  });

  it('should work with react', () => {
    const slice = react('test').via([MailChimp, Twilio]);

    expect(slice).toBeDefined();
  });
});
