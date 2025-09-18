import { describe, it, expect, beforeEach } from 'vitest';
import { on, dispatch, getPipelineGraph, getRegistrations } from './index';
import { CommandMetadataService } from '../server/command-metadata-service';
import type { Command } from '@auto-engineer/message-bus';

interface CheckTestsCommand extends Command {
  type: 'CheckTests';
  data: { targetDirectory: string; scope: string };
}

interface CheckTypesCommand extends Command {
  type: 'CheckTypes';
  data: { targetDirectory: string; scope: string };
}

interface CheckLintCommand extends Command {
  type: 'CheckLint';
  data: { targetDirectory: string; scope: string; fix: boolean };
}

interface ImplementClientCommand extends Command {
  type: 'ImplementClient';
  data: { projectDir: string; iaSchemeDir: string; designSystemPath?: string; failures?: unknown[] };
}

describe('Pipeline Graph Generation', () => {
  let metadataService: CommandMetadataService;

  beforeEach(() => {
    getRegistrations();

    // Set up metadata service with test data
    metadataService = new CommandMetadataService();
    metadataService.setCommandMetadata('ExportSchema', {
      alias: 'export:schema',
      description: 'Export flow schemas to context directory',
      package: '@auto-engineer/flow',
      category: 'export',
      icon: 'download',
    });
    metadataService.setCommandMetadata('GenerateServer', {
      alias: 'generate:server',
      description: 'Generate server from schema.json',
      package: '@auto-engineer/server-generator-apollo-emmett',
      category: 'generate',
      icon: 'server',
    });
    metadataService.setCommandMetadata('GenerateIA', {
      alias: 'generate:ia',
      description: 'Generate Information Architecture',
      package: '@auto-engineer/information-architect',
      category: 'generate',
      icon: 'building',
    });
    metadataService.setCommandMetadata('GenerateClient', {
      alias: 'generate:client',
      description: 'Generate React client app',
      package: '@auto-engineer/frontend-generator-react-graphql',
      category: 'generate',
      icon: 'monitor',
    });
    metadataService.setCommandMetadata('ImplementClient', {
      alias: 'implement:client',
      description: 'AI implements client',
      package: '@auto-engineer/frontend-implementer',
      category: 'implement',
      icon: 'code',
    });
    metadataService.setCommandMetadata('CheckTests', {
      alias: 'check:tests',
      description: 'Run Vitest test suites',
      package: '@auto-engineer/server-checks',
      category: 'check',
      icon: 'flask-conical',
    });
    metadataService.setCommandMetadata('CheckTypes', {
      alias: 'check:types',
      description: 'TypeScript type checking',
      package: '@auto-engineer/server-checks',
      category: 'check',
      icon: 'shield-check',
    });
    metadataService.setCommandMetadata('CheckLint', {
      alias: 'check:lint',
      description: 'ESLint with optional auto-fix',
      package: '@auto-engineer/server-checks',
      category: 'check',
      icon: 'sparkles',
    });
  });

  it('should generate pipeline graph from DSL registrations', () => {
    on('SchemaExported', () =>
      dispatch('GenerateServer', {
        schemaPath: './.context/schema.json',
        destination: '.',
      }),
    );

    on('ServerGenerated', () =>
      dispatch('GenerateIA', {
        outputDir: './.context',
        flowFiles: ['./flows/questionnaires.flow.ts'],
      }),
    );

    on('IAGenerated', () =>
      dispatch('GenerateClient', {
        starterDir: '../../packages/frontend-generator-react-graphql/shadcn-starter',
        targetDir: './client',
        iaSchemaPath: './.context/auto-ia-scheme.json',
        gqlSchemaPath: './.context/schema.graphql',
        figmaVariablesPath: './.context/figma-variables.json',
      }),
    );

    on('ClientGenerated', () =>
      dispatch('ImplementClient', {
        projectDir: './client',
        iaSchemeDir: './.context',
        designSystemPath: './.context/design-system.md',
      }),
    );

    // Generate the pipeline graph
    const graph = getPipelineGraph(metadataService);

    console.log('🔗 GENERATED PIPELINE GRAPH:');
    console.log(JSON.stringify(graph, null, 2));

    // Verify structure
    expect(graph).toHaveProperty('nodes');
    expect(graph).toHaveProperty('edges');
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);

    // Should have the command nodes
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toContain('ExportSchema');
    expect(nodeIds).toContain('GenerateServer');
    expect(nodeIds).toContain('GenerateIA');
    expect(nodeIds).toContain('GenerateClient');
    expect(nodeIds).toContain('ImplementClient');

    // Should have the correct edges
    const edgeStrings = graph.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgeStrings).toContain('ExportSchema->GenerateServer');
    expect(edgeStrings).toContain('GenerateServer->GenerateIA');
    expect(edgeStrings).toContain('GenerateIA->GenerateClient');
    expect(edgeStrings).toContain('GenerateClient->ImplementClient');
  });

  it('should handle on.settled registrations', () => {
    on.settled<CheckTestsCommand, CheckTypesCommand, CheckLintCommand>(
      ['CheckTests', 'CheckTypes', 'CheckLint'],
      dispatch<ImplementClientCommand>(['ImplementClient'], (_events, send) => {
        send({
          type: 'ImplementClient',
          data: {
            projectDir: 'some/where',
            iaSchemeDir: '/',
            designSystemPath: '',
            failures: [],
          },
        });
      }),
    );

    const graph = getPipelineGraph(metadataService);

    console.log('🔗 ON.SETTLED GRAPH:');
    console.log(JSON.stringify(graph, null, 2));

    // Should have all the check commands as nodes
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toContain('CheckTests');
    expect(nodeIds).toContain('CheckTypes');
    expect(nodeIds).toContain('CheckLint');
    expect(nodeIds).toContain('ImplementClient');

    // Should have edges from check commands to ImplementClient
    const edgeStrings = graph.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgeStrings).toContain('CheckTests->ImplementClient');
    expect(edgeStrings).toContain('CheckTypes->ImplementClient');
    expect(edgeStrings).toContain('CheckLint->ImplementClient');
  });

  it('should match the expected questionnaires pipeline structure', () => {
    // Replicate the questionnaires auto.config.ts pipeline
    on('SchemaExported', () => dispatch('GenerateServer', { schemaPath: './.context/schema.json', destination: '.' }));
    on('ServerGenerated', () =>
      dispatch('GenerateIA', { outputDir: './.context', flowFiles: ['./flows/questionnaires.flow.ts'] }),
    );
    on('IAGenerated', () =>
      dispatch('GenerateClient', {
        starterDir: '../../packages/frontend-generator-react-graphql/shadcn-starter',
        targetDir: './client',
      }),
    );
    on('ClientGenerated', () => dispatch('ImplementClient', { projectDir: './client', iaSchemeDir: './.context' }));

    on.settled<CheckTestsCommand, CheckTypesCommand, CheckLintCommand>(
      ['CheckTests', 'CheckTypes', 'CheckLint'],
      dispatch<ImplementClientCommand>(['ImplementClient'], (_events, send) => {
        send({
          type: 'ImplementClient',
          data: { projectDir: 'some/where', iaSchemeDir: '/', designSystemPath: '', failures: [] },
        });
      }),
    );

    const actualGraph = getPipelineGraph(metadataService);

    // status (running, idle, failed)
    // icon: this needs to be added to dec
    // package org name, eg: @auto-engineer
    // package name, eg: cli
    const expectedGraph = {
      nodes: [
        {
          id: 'ExportSchema',
          title: 'ExportSchema',
          alias: 'export:schema',
          description: 'Export flow schemas to context directory',
          package: '@auto-engineer/flow',
          category: 'export',
          icon: 'download',
        },
        {
          id: 'GenerateServer',
          title: 'GenerateServer',
          alias: 'generate:server',
          description: 'Generate server from schema.json',
          package: '@auto-engineer/server-generator-apollo-emmett',
          category: 'generate',
          icon: 'server',
        },
        {
          id: 'GenerateIA',
          title: 'GenerateIA',
          alias: 'generate:ia',
          description: 'Generate Information Architecture',
          package: '@auto-engineer/information-architect',
          category: 'generate',
          icon: 'building',
        },
        {
          id: 'GenerateClient',
          title: 'GenerateClient',
          alias: 'generate:client',
          description: 'Generate React client app',
          package: '@auto-engineer/frontend-generator-react-graphql',
          category: 'generate',
          icon: 'monitor',
        },
        {
          id: 'ImplementClient',
          title: 'ImplementClient',
          alias: 'implement:client',
          description: 'AI implements client',
          package: '@auto-engineer/frontend-implementer',
          category: 'implement',
          icon: 'code',
        },
        {
          id: 'CheckTests',
          title: 'CheckTests',
          alias: 'check:tests',
          description: 'Run Vitest test suites',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'flask-conical',
        },
        {
          id: 'CheckTypes',
          title: 'CheckTypes',
          alias: 'check:types',
          description: 'TypeScript type checking',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'shield-check',
        },
        {
          id: 'CheckLint',
          title: 'CheckLint',
          alias: 'check:lint',
          description: 'ESLint with optional auto-fix',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'sparkles',
        },
      ],
      edges: [
        { from: 'ExportSchema', to: 'GenerateServer' },
        { from: 'GenerateServer', to: 'GenerateIA' },
        { from: 'GenerateIA', to: 'GenerateClient' },
        { from: 'GenerateClient', to: 'ImplementClient' },
        { from: 'CheckTests', to: 'ImplementClient' },
        { from: 'CheckTypes', to: 'ImplementClient' },
        { from: 'CheckLint', to: 'ImplementClient' },
      ],
    };

    console.log('📋 EXPECTED GRAPH:');
    console.log(JSON.stringify(expectedGraph, null, 2));

    console.log('📊 ACTUAL DSL GRAPH:');
    console.log(JSON.stringify(actualGraph, null, 2));

    // Verify node count and edge count
    expect(actualGraph.nodes.length).toBe(expectedGraph.nodes.length);
    expect(actualGraph.edges.length).toBe(expectedGraph.edges.length);

    // Verify all expected nodes exist with correct metadata
    expectedGraph.nodes.forEach((expectedNode) => {
      const actualNode = actualGraph.nodes.find((n) => n.id === expectedNode.id);
      expect(actualNode).toBeDefined();
      expect(actualNode).toMatchObject(expectedNode);
    });

    // Verify all expected edges exist
    expectedGraph.edges.forEach((expectedEdge) => {
      const actualEdge = actualGraph.edges.find((e) => e.from === expectedEdge.from && e.to === expectedEdge.to);
      expect(actualEdge).toBeDefined();
    });
  });
});
