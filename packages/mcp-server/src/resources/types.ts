export interface FixedResourceDefinition {
  kind: "fixed";
  name: string;
  uri: `caido://${string}`;
  description: string;
  read(): Promise<Record<string, unknown>>;
}

export interface TemplateResourceDefinition {
  kind: "template";
  name: string;
  uriTemplate: `caido://${string}`;
  description: string;
  read(
    variables: Record<string, string | string[]>,
  ): Promise<Record<string, unknown>>;
}

export type ResourceDefinition =
  | FixedResourceDefinition
  | TemplateResourceDefinition;
