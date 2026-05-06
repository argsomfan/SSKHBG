export type SectionType =
  | 'definition'
  | 'orsaker'
  | 'symtom'
  | 'status'
  | 'diagnostik'
  | 'behandling'
  | 'omvardnad'
  | 'monitorering'
  | 'vardniva'
  | 'varningsflaggor'
  | 'dokumentation'
  | 'referenser';

export interface ModuleSectionItem {
  heading: string;
  body: string;
}

export interface ModuleSection {
  type: SectionType;
  title: string;
  items: ModuleSectionItem[];
}

export interface ModuleContent {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  sections: ModuleSection[];
  related: string[];
}