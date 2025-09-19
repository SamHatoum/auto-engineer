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
    expect(nodeIds).toContain('@auto-engineer/flow/export:schema');
    expect(nodeIds).toContain('@auto-engineer/server-generator-apollo-emmett/generate:server');
    expect(nodeIds).toContain('@auto-engineer/information-architect/generate:ia');
    expect(nodeIds).toContain('@auto-engineer/frontend-generator-react-graphql/generate:client');
    expect(nodeIds).toContain('@auto-engineer/frontend-implementer/implement:client');

    // Should have the correct edges
    const edgeStrings = graph.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgeStrings).toContain(
      '@auto-engineer/flow/export:schema->@auto-engineer/server-generator-apollo-emmett/generate:server',
    );
    expect(edgeStrings).toContain(
      '@auto-engineer/server-generator-apollo-emmett/generate:server->@auto-engineer/information-architect/generate:ia',
    );
    expect(edgeStrings).toContain(
      '@auto-engineer/information-architect/generate:ia->@auto-engineer/frontend-generator-react-graphql/generate:client',
    );
    expect(edgeStrings).toContain(
      '@auto-engineer/frontend-generator-react-graphql/generate:client->@auto-engineer/frontend-implementer/implement:client',
    );
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
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:tests');
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:types');
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:lint');
    expect(nodeIds).toContain('@auto-engineer/frontend-implementer/implement:client');

    // Should have edges from check commands to ImplementClient
    const edgeStrings = graph.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgeStrings).toContain(
      '@auto-engineer/server-checks/check:tests->@auto-engineer/frontend-implementer/implement:client',
    );
    expect(edgeStrings).toContain(
      '@auto-engineer/server-checks/check:types->@auto-engineer/frontend-implementer/implement:client',
    );
    expect(edgeStrings).toContain(
      '@auto-engineer/server-checks/check:lint->@auto-engineer/frontend-implementer/implement:client',
    );
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
          id: '@auto-engineer/flow/export:schema',
          title: 'Export Schema',
          alias: 'export:schema',
          description: 'Export flow schemas to context directory',
          package: '@auto-engineer/flow',
          category: 'export',
          icon: 'download',
        },
        {
          id: '@auto-engineer/server-generator-apollo-emmett/generate:server',
          title: 'Generate Server',
          alias: 'generate:server',
          description: 'Generate server from schema.json',
          package: '@auto-engineer/server-generator-apollo-emmett',
          category: 'generate',
          icon: 'server',
        },
        {
          id: '@auto-engineer/information-architect/generate:ia',
          title: 'Generate IA',
          alias: 'generate:ia',
          description: 'Generate Information Architecture',
          package: '@auto-engineer/information-architect',
          category: 'generate',
          icon: 'building',
        },
        {
          id: '@auto-engineer/frontend-generator-react-graphql/generate:client',
          title: 'Generate Client',
          alias: 'generate:client',
          description: 'Generate React client app',
          package: '@auto-engineer/frontend-generator-react-graphql',
          category: 'generate',
          icon: 'monitor',
        },
        {
          id: '@auto-engineer/frontend-implementer/implement:client',
          title: 'Implement Client',
          alias: 'implement:client',
          description: 'AI implements client',
          package: '@auto-engineer/frontend-implementer',
          category: 'implement',
          icon: 'code',
        },
        {
          id: '@auto-engineer/server-checks/check:tests',
          title: 'Check Tests',
          alias: 'check:tests',
          description: 'Run Vitest test suites',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'flask-conical',
        },
        {
          id: '@auto-engineer/server-checks/check:types',
          title: 'Check Types',
          alias: 'check:types',
          description: 'TypeScript type checking',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'shield-check',
        },
        {
          id: '@auto-engineer/server-checks/check:lint',
          title: 'Check Lint',
          alias: 'check:lint',
          description: 'ESLint with optional auto-fix',
          package: '@auto-engineer/server-checks',
          category: 'check',
          icon: 'sparkles',
        },
      ],
      edges: [
        {
          from: '@auto-engineer/flow/export:schema',
          to: '@auto-engineer/server-generator-apollo-emmett/generate:server',
        },
        {
          from: '@auto-engineer/server-generator-apollo-emmett/generate:server',
          to: '@auto-engineer/information-architect/generate:ia',
        },
        {
          from: '@auto-engineer/information-architect/generate:ia',
          to: '@auto-engineer/frontend-generator-react-graphql/generate:client',
        },
        {
          from: '@auto-engineer/frontend-generator-react-graphql/generate:client',
          to: '@auto-engineer/frontend-implementer/implement:client',
        },
        {
          from: '@auto-engineer/server-checks/check:tests',
          to: '@auto-engineer/frontend-implementer/implement:client',
        },
        {
          from: '@auto-engineer/server-checks/check:types',
          to: '@auto-engineer/frontend-implementer/implement:client',
        },
        { from: '@auto-engineer/server-checks/check:lint', to: '@auto-engineer/frontend-implementer/implement:client' },
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
