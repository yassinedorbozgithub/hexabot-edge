/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import { IndexRouteObject, Navigate, NonIndexRouteObject } from "react-router";

import { EntityType } from "@/api/types";
import { Audit } from "@/features/audit";
import { Login } from "@/features/auth/Login";
import { ResetPassword } from "@/features/auth/ResetPassword";
import { ResetPasswordRequest } from "@/features/auth/ResetPasswordRequest";
import { ContentTypes } from "@/features/content-types";
import { Contents } from "@/features/contents";
import { Credentials } from "@/features/credentials";
import { Dashboard } from "@/features/dashboard";
import { Inbox } from "@/features/inbox";
import { Labels } from "@/features/labels";
import { Languages } from "@/features/languages";
import { McpServers } from "@/features/mcp-servers";
import { MediaLibrary } from "@/features/media-library";
import { MemoryDefinitions } from "@/features/memory-definitions";
import { Menu } from "@/features/menu";
import { Profile } from "@/features/profile";
import { Roles } from "@/features/roles";
import { Settings } from "@/features/settings";
import { Sources } from "@/features/sources";
import { Subscribers } from "@/features/subscribers";
import { Translations } from "@/features/translations";
import { Users } from "@/features/users";
import { WorkflowEditor } from "@/features/visual-editor/v4";
import { WorkflowRuns } from "@/features/workflow-runs";
import { LayoutProps } from "@/layout";
import { WorkflowRunDebuggerPage } from "@/shared/workflow/run-debugger";

export type RouteObjectItem = (
  Omit<IndexRouteObject, "handle"> | Omit<NonIndexRouteObject, "handle">
) & {
  handle?: Omit<LayoutProps, "children">;
};

const canRead = (entity: EntityType): RouteObjectItem["handle"] => ({
  requiredPermissions: [[entity, Action.READ]],
});

export const routes: RouteObjectItem[] = [
  {
    path: "/login/:token?",
    Component: Login,
    handle: { isPublicRoute: true, sxContent: { alignContent: "center" } },
  },
  {
    path: "/reset",
    Component: ResetPasswordRequest,
    handle: { isPublicRoute: true, sxContent: { alignContent: "center" } },
  },
  {
    path: "/reset/:token?",
    Component: ResetPassword,
    handle: { isPublicRoute: true, sxContent: { alignContent: "center" } },
  },
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: `/workflow-editor/:flowId?/:nodeIds?`,
    Component: WorkflowEditor,
    handle: { hasNoPadding: true },
  },
  {
    path: "/workflow/memory-definitions",
    Component: MemoryDefinitions,
    handle: canRead(EntityType.MEMORY_DEFINITION),
  },
  {
    path: "/workflow/runs",
    Component: WorkflowRuns,
    handle: canRead(EntityType.WORKFLOW_RUN),
  },
  {
    path: "/workflow/mcp-servers",
    Component: McpServers,
    handle: canRead(EntityType.MCP_SERVER),
  },
  {
    path: "/workflow/:workflowId/runs/:initiatorId/:runId?",
    Component: WorkflowRunDebuggerPage,
    handle: canRead(EntityType.WORKFLOW_RUN),
  },
  {
    path: "/inbox/threads/:thread?",
    Component: Inbox,
    handle: { hasNoPadding: true },
  },
  {
    path: "/content/persistent-menu",
    Component: Menu,
    handle: canRead(EntityType.MENU),
  },
  {
    path: "/content-types",
    Component: ContentTypes,
    handle: canRead(EntityType.CONTENT_TYPE),
  },
  {
    path: "/content-types/content/:id",
    Component: Contents,
    handle: canRead(EntityType.CONTENT),
  },
  {
    path: "/content/media-library",
    Component: MediaLibrary,
  },
  {
    path: "/subscribers",
    Component: Subscribers,
    handle: canRead(EntityType.SUBSCRIBER),
  },
  {
    path: "/subscribers/labels",
    Component: Labels,
    handle: canRead(EntityType.LABEL),
  },
  {
    path: "/users",
    Component: Users,
    handle: canRead(EntityType.USER),
  },
  {
    path: "/roles",
    Component: Roles,
    handle: canRead(EntityType.ROLE),
  },
  {
    path: "/audit",
    Component: Audit,
    handle: canRead(EntityType.AUDIT_LOG),
  },
  {
    path: "/credentials",
    Component: Credentials,
    handle: canRead(EntityType.CREDENTIAL),
  },
  {
    path: "/localization/languages",
    Component: Languages,
    handle: canRead(EntityType.LANGUAGE),
  },
  {
    path: "/localization/translations",
    Component: Translations,
    handle: canRead(EntityType.TRANSLATION),
  },
  {
    path: "/settings/groups?/:group?",
    Component: Settings,
    handle: {
      requiredPermissions: [
        [EntityType.SETTING, Action.READ],
        [EntityType.SETTING, Action.UPDATE],
      ],
    },
  },
  {
    path: "/settings/sources",
    Component: Sources,
    handle: canRead(EntityType.SOURCE),
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "*",
    element: <Navigate replace to="/" />,
  },
];
