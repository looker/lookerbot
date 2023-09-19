export interface IFolder {
  id: string
  name: string
  dashboards: IDashboard[]
}

export interface IDashboard {
  id: string
  description: string
  title: string
  filters?: IDashboardFilter[]
  dashboard_filters?: IDashboardFilter[]
  dashboard_elements?: IDashboardElement[]
  elements?: IDashboardElement[]
}

export interface IDashboardElement {
  look?: ILook
  query?: IQuery
  listen?: {[key: string]: string} // deprecated
  result_maker_id?: string
  result_maker?: {
    id: string,
    query_id?: string,
    merge_result_id?: string,
    filterables?: IDashboardElementResultMakerFilterable[],
  }
}

export interface IDashboardElementResultMakerFilterable {
  listen: IDashboardElementResultMakerFilterableListen[]
}

export interface IDashboardElementResultMakerFilterableListen {
  dashboard_filter_name: string
  field: string
}

export interface IDashboardFilter {
  title: string
}

export interface ILook {
  id: string
  query: IQuery
}

export interface IQueryFilters {
  [key: string]: string
}

export interface IQuery {
  id: string
  slug: string
  share_url: string
  vis_config: {
    type?: string;
    hidden_fields?: string[];
    show_view_names: boolean;
    [key: string]: any;
  }
  client_id?: string | null // deprecated
  filter_config: any
  filters: IQueryFilters
}

export interface IQueryResponse {
  fields: {
    [key: string]: IQueryResponseField[],
  }
  pivots: any
  data: IQueryResponseRow[]
  errors: Array<{message: string, message_details: string}>
}

export interface IQueryResponseRow {
  [key: string]: IDatum
}

export interface IQueryResponseField {
  is_measure?: boolean // deprecated
  measure?: boolean
  name: string
  label: string
  label_short: string
}

export interface IDatum {
  value: any
  rendered: string
  links?: IDatumLinks[]
}

export interface IDatumLinks {
  type: string
  label: string
  form?: any
  form_url?: string
  url: string
}
