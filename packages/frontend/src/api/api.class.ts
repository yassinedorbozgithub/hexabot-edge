/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  AttachmentResourceRef,
  type ICsrf,
  type ILoginAttributes,
  type IntegrationHealthResponse,
  type IResetPayload,
  type IResetRequest,
  type McpServerDiagnostics,
  type McpToken,
  type McpToolSummary,
  type SettingSchemaDefinitions,
  type StatsFailedWorkflowRuns,
  type StatsSummary,
  type StatsThreadSnapshot,
  type StatsThreadSnapshotQuery,
  type Workflow,
  type WorkflowImportResult,
} from "@hexabot-ai/types";
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { WorkflowBindingsCatalog } from "@/providers/workflow-bindings/workflow-bindings.context";
import { IAction } from "@/types/action.types";
import { IUserPermissions } from "@/types/auth/permission.types";
import { THook } from "@/types/base";
import { IProfileAttributes, User, UserStub } from "@/types/user.types";
import { applyFullNameDerivedFields } from "@/utils/full-name.utils";

import { EntityType, Format, TCount, TypeByFormat } from "./types";

export type RouteParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type McpTokenCreatePayload = {
  name: string;
  expiresAt?: string | null;
};

export type McpTokenCreateResponse = {
  token: string;
  record: McpToken;
};

export type WorkflowExportFile = {
  blob: Blob;
  filename: string;
};

export const resolveRoute = (route: string, params?: RouteParams) => {
  if (!params) {
    return route;
  }

  return route.replace(/:([A-Za-z0-9_]+)/g, (match, key) => {
    const value = params[key];

    if (value === undefined || value === null) {
      return match;
    }

    return encodeURIComponent(String(value));
  });
};

export const ROUTES = {
  // Misc
  CONFIRM_ACCOUNT: "/user/confirm",
  LOGIN: "/auth/local",
  ME: "/auth/me",
  LOGOUT: "/auth/logout",
  PROFILE: "/user/edit",
  USER_PERMISSIONS: "/user/permissions",
  CSRF: "/csrftoken",
  REFRESH_TRANSLATIONS: "/translation/refresh",
  RESET: "/user/reset",
  CONTENT_IMPORT: "/content/import",
  STATS_SUMMARY: "/stats/summary",
  STATS_THREAD_SNAPSHOT: "/stats/thread-snapshot",
  STATS_FAILED_WORKFLOW_RUNS: "/stats/failed-workflow-runs",
  WORKFLOW_PUBLISH: "/workflow/:id/publish",
  WORKFLOW_UNPUBLISH: "/workflow/:id/unpublish",
  WORKFLOW_EXPORT: "/workflow/:id/export",
  WORKFLOW_IMPORT: "/workflow/import",
  WORKFLOW_BINDINGS: "/workflow/bindings",
  WORKFLOW_ACTIONS: "/workflow/actions/:type",
  MCP_SERVER_TEST: "/mcpserver/:id/test",
  MCP_TOOLS: "/mcpserver/:id/tools",
  MCP_TOKEN: "/mcp-token",
  INTEGRATION_HEALTH: "/stats/integration-health",
  SETTING_SCHEMAS: "setting/schemas",

  // Entities
  [EntityType.SUBSCRIBER]: "/subscriber",
  [EntityType.LABEL]: "/label",
  [EntityType.LABEL_GROUP]: "/labelgroup",
  [EntityType.ROLE]: "/role",
  [EntityType.USER]: "/user",
  [EntityType.PERMISSION]: "/permission",
  [EntityType.MODEL]: "/model",
  [EntityType.CREDENTIAL]: "/credential",
  [EntityType.MENU]: "/menu",
  [EntityType.MENUTREE]: "/menu/tree",
  [EntityType.CONTENT]: "/content",
  [EntityType.CONTENT_TYPE]: "/contenttype",
  [EntityType.SETTING]: "/setting",
  [EntityType.MESSAGE]: "/message",
  [EntityType.LANGUAGE]: "/language",
  [EntityType.TRANSLATION]: "/translation",
  [EntityType.ATTACHMENT]: "/attachment",
  [EntityType.CHANNEL]: "/channel",
  [EntityType.SOURCE]: "/source",
  [EntityType.HELPER]: "/helper",
  [EntityType.STORAGE_HELPER]: "/helper/storage",
  [EntityType.RAG_HELPER]: "/helper/rag",
  [EntityType.WORKFLOW]: "/workflow",
  [EntityType.WORKFLOW_VERSION]: "/workflow/:id/versions",
  [EntityType.WORKFLOW_RUN]: "/workflowrun",
  [EntityType.MCP_SERVER]: "/mcpserver",
  [EntityType.MEMORY_DEFINITION]: "/memorydefinition",
  [EntityType.AUDIT_LOG]: "/auditlog",
  [EntityType.THREAD]: "/thread",
} as const;

export class TranslatableMethods {
  constructor(protected readonly request: AxiosInstance) {}

  protected async fetchData<T>(url: string, config?: AxiosRequestConfig) {
    const { data } = await this.request.get<T>(url, config);

    return data;
  }

  protected async postData<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ) {
    const { data } = await this.request.post<T>(url, body, config);

    return data;
  }

  protected async patchData<T>(url: string, body: unknown) {
    const { data } = await this.request.patch<T>(url, body);

    return data;
  }

  protected async deleteData<T>(url: string, config: AxiosRequestConfig) {
    const { data } = await this.request.delete<T>(url, config);

    return data;
  }

  async getByPath<TResponse = unknown>(
    path: string,
    params?: Record<string, unknown>,
  ) {
    return this.fetchData<TResponse>(path, { params });
  }

  async getWorkflowBindings() {
    return this.fetchData<WorkflowBindingsCatalog>(ROUTES.WORKFLOW_BINDINGS);
  }

  async getSettingSchemas() {
    return this.fetchData<SettingSchemaDefinitions>(ROUTES.SETTING_SCHEMAS);
  }

  async getActions(type: string) {
    return this.fetchData<IAction[]>(
      resolveRoute(ROUTES.WORKFLOW_ACTIONS, { type }),
    );
  }
}

export class ApiClient extends TranslatableMethods {
  constructor(protected readonly request: AxiosInstance) {
    super(request);
  }

  async getCsrf() {
    return this.fetchData<ICsrf>(ROUTES.CSRF, { withCredentials: true });
  }

  /**
   * Fetch a CSRF token and append it to the body: `{ ...body, _csrf }`.
   */
  protected async withCsrf<T>(body: T) {
    const { _csrf } = await this.getCsrf();

    return { ...body, _csrf };
  }

  async login(payload: ILoginAttributes) {
    return applyFullNameDerivedFields(
      await this.postData<User>(ROUTES.LOGIN, payload),
    );
  }

  async logout() {
    return this.postData<{ status: "ok" }>(ROUTES.LOGOUT);
  }

  async getCurrentSession() {
    return applyFullNameDerivedFields(await this.fetchData<User>(ROUTES.ME));
  }

  async updateProfile(id: string, payload: Partial<IProfileAttributes>) {
    const { _csrf } = await this.getCsrf();
    const formData = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        formData.append(key, value as string | Blob);
      }
    }

    // Append the CSRF token
    formData.append("_csrf", _csrf);

    return applyFullNameDerivedFields(
      await this.patchData<UserStub>(
        `${ROUTES.PROFILE}/${id}?_csrf=${_csrf}`,
        formData,
      ),
    );
  }

  async confirmAccount(payload: { token: string }) {
    return this.postData<never>(
      ROUTES.CONFIRM_ACCOUNT,
      await this.withCsrf(payload),
    );
  }

  async getUserPermissions() {
    return this.fetchData<IUserPermissions>(ROUTES.USER_PERMISSIONS);
  }

  async requestResetPassword(payload: IResetRequest) {
    return this.postData<void>(ROUTES.RESET, payload);
  }

  async getStatsSummary() {
    return this.fetchData<StatsSummary>(ROUTES.STATS_SUMMARY);
  }

  async getThreadSnapshot(params?: StatsThreadSnapshotQuery) {
    return this.fetchData<StatsThreadSnapshot>(ROUTES.STATS_THREAD_SNAPSHOT, {
      params,
    });
  }

  async getFailedWorkflowRunsLast24h(limit = 3) {
    return this.fetchData<StatsFailedWorkflowRuns>(
      ROUTES.STATS_FAILED_WORKFLOW_RUNS,
      { params: { limit } },
    );
  }

  async getIntegrationHealth() {
    return this.fetchData<IntegrationHealthResponse>(ROUTES.INTEGRATION_HEALTH);
  }

  async refreshTranslations() {
    return this.postData<{ acknowledged: boolean; deletedCount: number }>(
      ROUTES.REFRESH_TRANSLATIONS,
      await this.withCsrf({}),
    );
  }

  async resetPassword(token: string, payload: IResetPayload) {
    return this.postData<void>(`${ROUTES.RESET}/${token}`, payload);
  }

  async testMcpServer(id: string) {
    return this.postData<McpServerDiagnostics>(
      resolveRoute(ROUTES.MCP_SERVER_TEST, { id }),
      await this.withCsrf({}),
    );
  }

  async getMcpTools(id: string) {
    return this.fetchData<McpToolSummary[]>(
      resolveRoute(ROUTES.MCP_TOOLS, { id }),
    );
  }

  async listMcpTokens() {
    return this.fetchData<McpToken[]>(ROUTES.MCP_TOKEN);
  }

  async createMcpToken(payload: McpTokenCreatePayload) {
    return this.postData<McpTokenCreateResponse>(
      ROUTES.MCP_TOKEN,
      await this.withCsrf(payload),
    );
  }

  async revokeMcpToken(id: string) {
    return this.postData<McpToken>(
      `${ROUTES.MCP_TOKEN}/${encodeURIComponent(id)}/revoke`,
      await this.withCsrf({}),
    );
  }

  async publishWorkflow(id: string) {
    return this.postData<Workflow>(
      resolveRoute(ROUTES.WORKFLOW_PUBLISH, { id }),
      await this.withCsrf({}),
    );
  }

  async exportWorkflow(
    id: string,
    credentialPassword?: string | null,
  ): Promise<WorkflowExportFile> {
    const route = resolveRoute(ROUTES.WORKFLOW_EXPORT, { id });
    const response = await this.request.post<Blob>(
      route,
      {
        ...(await this.getCsrf()),
        ...(credentialPassword ? { password: credentialPassword } : {}),
      },
      { responseType: "blob" },
    );
    const contentDisposition = response.headers["content-disposition"];
    const filename = this.getFilenameFromContentDisposition(
      typeof contentDisposition === "string" ? contentDisposition : null,
    );

    return {
      blob: response.data,
      filename: filename || "workflow.workflow.yml",
    };
  }

  async importWorkflowBundle(
    file: File,
    credentialPassword?: string,
  ): Promise<WorkflowImportResult> {
    const { _csrf } = await this.getCsrf();
    const formData = new FormData();

    formData.append("file", file);

    if (credentialPassword) {
      formData.append("password", credentialPassword);
    }

    return this.postData<WorkflowImportResult>(
      ROUTES.WORKFLOW_IMPORT,
      formData,
      { params: { _csrf } },
    );
  }

  async unpublishWorkflow(id: string) {
    return this.postData<Workflow>(
      resolveRoute(ROUTES.WORKFLOW_UNPUBLISH, { id }),
      await this.withCsrf({}),
    );
  }

  async publishWorkflowVersion(workflowId: string, versionId: string) {
    const { _csrf } = await this.getCsrf();
    const route = resolveRoute(ROUTES[EntityType.WORKFLOW], {});

    return this.patchData<Workflow>(
      `${route}/${encodeURIComponent(workflowId)}`,
      { _csrf, publishedVersion: versionId },
    );
  }

  private getFilenameFromContentDisposition(
    contentDisposition: string | null,
  ): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Filename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Filename?.[1]) {
      return decodeURIComponent(utf8Filename[1].trim().replace(/^"|"$/g, ""));
    }

    const filename = contentDisposition.match(/filename="?([^";]+)"?/i);

    return filename?.[1]?.trim() ?? null;
  }

  getRequest() {
    return this.request;
  }

  buildEntityClient<TE extends THook["entity"] = never>(
    entity: TE,
    routeParams?: RouteParams,
  ) {
    return EntityApiClient.getInstance(this.request, entity, routeParams);
  }
}

export class EntityApiClient<
  TE extends THook["entity"],
  TBasic = THook<{ entity: TE }>["basic"],
  TFull = THook<{ entity: TE }>["full"],
  TAttr = THook<{ entity: TE }>["attributes"],
  TFilters = THook<{ entity: TE }>["filters"],
> extends ApiClient {
  constructor(
    request: AxiosInstance,
    private readonly type: TE,
    private readonly routeParams?: RouteParams,
  ) {
    super(request);
  }

  static getInstance<TE extends THook["entity"]>(
    request: AxiosInstance,
    entity: TE,
    routeParams?: RouteParams,
  ) {
    return new EntityApiClient<TE>(request, entity, routeParams);
  }

  private getRoute(routeParams?: RouteParams) {
    return resolveRoute(ROUTES[this.type], routeParams ?? this.routeParams);
  }

  /**
   * Create an entry to the given entity type.
   */
  async create(payload: TAttr, routeParams?: RouteParams) {
    return this.postData<TBasic>(
      this.getRoute(routeParams),
      await this.withCsrf(payload),
    );
  }

  async import<T = TBasic>(
    file: File,
    params?: any,
    routeParams?: RouteParams,
  ) {
    const { _csrf } = await this.getCsrf();
    const formData = new FormData();

    formData.append("file", file);

    return this.postData<T[]>(
      `${this.getRoute(routeParams)}/import`,
      formData,
      { params: { _csrf, ...params } },
    );
  }

  async upload(
    file: File,
    resourceRef?: AttachmentResourceRef,
    routeParams?: RouteParams,
  ) {
    const { _csrf } = await this.getCsrf();
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await this.request.postForm<
      TBasic[],
      AxiosResponse<TBasic[]>,
      FormData
    >(
      `${this.getRoute(routeParams)}/upload?_csrf=${_csrf}${
        resourceRef ? `&resourceRef=${resourceRef}` : ""
      }`,
      formData,
    );

    return data[0];
  }

  private serializePopulate<P = string[] | undefined>(populate: P) {
    return ((populate || []) as string[]).join(",");
  }

  async get<
    P = string[] | undefined,
    F extends Format = P extends undefined ? Format.BASIC : Format.FULL,
    T = TypeByFormat<F, TBasic, TFull>,
  >(id?: string, populate?: P, routeParams?: RouteParams) {
    return this.fetchData<T>(
      `${this.getRoute(routeParams)}${id ? `/${id}` : ""}`,
      {
        params: {
          ...(Array.isArray(populate) &&
            populate.length && { populate: this.serializePopulate(populate) }),
        },
      },
    );
  }

  async find<
    P = string[] | undefined,
    F extends Format = P extends undefined ? Format.BASIC : Format.FULL,
    T = TypeByFormat<F, TBasic, TFull>,
  >(params: any, populate: P, routeParams?: RouteParams) {
    return this.fetchData<T[]>(this.getRoute(routeParams), {
      params: {
        ...params,
        ...(Array.isArray(populate) &&
          populate.length && { populate: this.serializePopulate(populate) }),
      },
    });
  }

  /**
   * Update an entry in a entity type.
   */
  async update(id: string, payload: Partial<TAttr>, routeParams?: RouteParams) {
    return this.patchData<TBasic>(
      `${this.getRoute(routeParams)}/${id}`,
      await this.withCsrf(payload),
    );
  }

  /**
   * Bulk Update entries.
   */
  async updateMany(
    ids: string[],
    payload: Partial<TAttr>,
    routeParams?: RouteParams,
  ) {
    const { _csrf } = await this.getCsrf();

    return this.patchData<string>(`${this.getRoute(routeParams)}/bulk`, {
      _csrf,
      ids,
      payload,
    });
  }

  /**
   * Delete an entry.
   */
  async delete(id: string, routeParams?: RouteParams) {
    return this.deleteData<string>(`${this.getRoute(routeParams)}/${id}`, {
      data: await this.withCsrf({}),
    });
  }

  /**
   * Bulk Delete entries.
   */
  async deleteMany(ids: string[], routeParams?: RouteParams) {
    const { _csrf } = await this.getCsrf();

    return this.deleteData<string>(this.getRoute(routeParams), {
      data: { _csrf, ids },
    });
  }

  /**
   * Count elements.
   */
  async count(params: { where?: TFilters }, routeParams?: RouteParams) {
    const { count } = await this.fetchData<TCount>(
      `${this.getRoute(routeParams)}/count`,
      { params },
    );

    return { count };
  }
}
