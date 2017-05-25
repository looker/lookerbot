export interface ISpace {
  id: string;
  name: string;
  dashboards: IDashboard[];
}

export interface IDashboard {
  id: string | number;
  description: string;
  title: string;
  filters?: IDashboardFilter[];
  dashboard_filters?: IDashboardFilter[];
  dashboard_elements?: IDashboardElement[];
  elements?: IDashboardElement[];
}

export interface IDashboardElement {
  look_id: number;
  listen: {[key: string]: string};
}

export interface IDashboardFilter {
  title: string;
}

export interface ILook {
  id: number;
  query: IQuery;
}

export interface IQuery {
  id: number;
  slug: string;
  share_url: string;
  vis_config: {
    type?: string;
    hidden_fields?: string[];
    show_view_names: boolean;
    [key: string]: any;
  };
  client_id?: string | null; // deprecated
  filter_config: any;
  filters: {[key: string]: string};
}

export interface IQueryResponse {
  fields: {
    [key: string]: IQueryResponseField[],
  };
  pivots: any;
  data: IQueryResponseRow[];
  errors: Array<{message: string, message_details: string}>;
}

export interface IQueryResponseRow {
  [key: string]: IDatum;
}

export interface IQueryResponseField {
  is_measure?: boolean; // deprecated
  measure?: boolean;
  name: string;
  label: string;
  label_short: string;
}

export interface IDatum {
  value: any;
  rendered: string;
  links?: IDatumLinks[];
}

export interface IDatumLinks {
  type: string;
  label: string;
  form?: any;
  form_url?: string;
  url: string;
}
