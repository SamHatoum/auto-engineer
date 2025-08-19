export interface IAScheme {
  schema_description: string;
  atoms: ComponentGroup<AtomSpec>;
  molecules: ComponentGroup<MoleculeSpec>;
  organisms: ComponentGroup<OrganismSpec>;
  pages: PageGroup;
}

interface ComponentGroup<T> {
  description: string;
  items: Record<string, T>;
}

export interface AtomSpec {
  description?: string;
}

export interface MoleculeSpec {
  description: string;
  composition: {
    atoms: string[];
  };
  specs?: string[];
}

export interface OrganismSpec {
  description: string;
  composition: {
    molecules: string[];
  };
  specs?: string[];
  data_requirements?: DataRequirement[];
}

export interface DataRequirement {
  type: 'query' | 'mutation';
  description: string;
  trigger: string;
  details: {
    source: string;
    gql: string;
    payload_schema?: Record<string, string>;
  };
}

export interface PageGroup {
  description: string;
  items: Record<string, PageSpec>;
}

export interface PageSpec {
  route: string;
  description: string;
  layout: {
    organisms: string[];
  };
  navigation?: {
    on: string;
    to: string;
  }[];
  specs?: string[];
  data_requirements?: DataRequirement[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}
