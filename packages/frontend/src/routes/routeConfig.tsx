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
    handle: {
      requiredPermissions: [[EntityType.MEMORY_DEFINITION, Action.READ]],
    },
  },
  {
    path: "/workflow/runs",
    Component: WorkflowRuns,
    handle: {
      requiredPermissions: [[EntityType.WORKFLOW_RUN, Action.READ]],
    },
  },
  {
    path: "/workflow/mcp-servers",
    Component: McpServers,
    handle: {
      requiredPermissions: [[EntityType.MCP_SERVER, Action.READ]],
    },
  },
  {
    path: "/workflow/:workflowId/runs/:initiatorId/:runId?",
    Component: WorkflowRunDebuggerPage,
    handle: {
      requiredPermissions: [[EntityType.WORKFLOW_RUN, Action.READ]],
    },
  },
  {
    path: "/inbox/threads/:thread?",
    Component: Inbox,
    handle: { hasNoPadding: true },
  },
  {
    path: "/content/persistent-menu",
    Component: Menu,
    handle: {
      requiredPermissions: [[EntityType.MENU, Action.READ]],
    },
  },
  {
    path: "/content-types",
    Component: ContentTypes,
    handle: {
      requiredPermissions: [[EntityType.CONTENT_TYPE, Action.READ]],
    },
  },
  {
    path: "/content-types/content/:id",
    Component: Contents,
    handle: {
      requiredPermissions: [[EntityType.CONTENT, Action.READ]],
    },
  },
  {
    path: "/content/media-library",
    Component: MediaLibrary,
  },
  {
    path: "/subscribers",
    Component: Subscribers,
    handle: {
      requiredPermissions: [[EntityType.SUBSCRIBER, Action.READ]],
    },
  },
  {
    path: "/subscribers/labels",
    Component: Labels,
    handle: {
      requiredPermissions: [[EntityType.LABEL, Action.READ]],
    },
  },
  {
    path: "/users",
    Component: Users,
    handle: {
      requiredPermissions: [[EntityType.USER, Action.READ]],
    },
  },
  {
    path: "/roles",
    Component: Roles,
    handle: {
      requiredPermissions: [[EntityType.ROLE, Action.READ]],
    },
  },
  {
    path: "/audit",
    Component: Audit,
    handle: {
      requiredPermissions: [[EntityType.AUDIT_LOG, Action.READ]],
    },
  },
  {
    path: "/credentials",
    Component: Credentials,
    handle: {
      requiredPermissions: [[EntityType.CREDENTIAL, Action.READ]],
    },
  },
  {
    path: "/localization/languages",
    Component: Languages,
    handle: {
      requiredPermissions: [[EntityType.LANGUAGE, Action.READ]],
    },
  },
  {
    path: "/localization/translations",
    Component: Translations,
    handle: {
      requiredPermissions: [[EntityType.TRANSLATION, Action.READ]],
    },
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
    handle: {
      requiredPermissions: [[EntityType.SOURCE, Action.READ]],
    },
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
