/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Flag,
  GitBranch,
  Home,
  Images,
  KeyRound,
  Languages,
  Library,
  Menu as MenuIcon,
  MessagesSquare,
  Plug,
  PlugZap,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Tag,
  UserRound,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

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
import { Languages as LanguagesPage } from "@/features/languages";
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
import { Users as UsersPage } from "@/features/users";
import { WorkflowEditor } from "@/features/visual-editor/v4";
import { WorkflowRuns } from "@/features/workflow-runs";
import type { TTranslationKeys } from "@/i18n/i18n.types";
import type { TMenu } from "@/shared/menus/DashboardSidebar/types/sidebar.types";
import { WorkflowRunDebuggerPage } from "@/shared/workflow/run-debugger";

import type { RouteObjectItem } from "./routeConfig";

export type MenuGroupId =
  "workflows" | "content" | "audience" | "integrations" | "administration";

export const MENU_GROUPS: {
  id: MenuGroupId;
  text: TTranslationKeys;
  Icon: TMenu["Icon"];
}[] = [
  { id: "workflows", text: "menu.workflows", Icon: GitBranch },
  { id: "content", text: "menu.content", Icon: Library },
  { id: "audience", text: "menu.audience", Icon: UserRound },
  { id: "integrations", text: "menu.integrations", Icon: Plug },
  { id: "administration", text: "menu.administration", Icon: ShieldCheck },
];

export type AppPage = RouteObjectItem & {
  menu?: {
    /** Undefined = top-level menu item, otherwise grouped under a MENU_GROUPS entry. */
    group?: MenuGroupId;
    text: TTranslationKeys;
    Icon: TMenu["Icon"];
    /** Defaults to the route path. */
    href?: string;
    requires?: TMenu["requires"];
    hideWhenSso?: boolean;
  };
};

const readRoute = (entity: EntityType): [EntityType, Action][] => [
  [entity, Action.READ],
];
const readMenu = (entity: EntityType): TMenu["requires"] => ({
  [entity]: [Action.READ],
});

/**
 * Single source of truth for routes + sidebar menu.
 *
 * - `routeConfig.tsx` derives `routes` from this list (order preserved, `*` fallback appended there).
 * - `menu.util.ts` derives `TMenu[]` by grouping on `menu.group` (APP_PAGES order = submenu order).
 * - To add a page: add one entry here. Do not edit routeConfig/menu.util directly.
 *
 * NOTE: a few routes are intentionally open (no `requiredPermissions`) while
 * their menu entry is permission-gated (inbox, workflow-editor, media-library).
 * This preserves current behavior; tighten the route side explicitly if desired.
 */
export const APP_PAGES: AppPage[] = [
  {
    path: "/login/:token?",
    Component: Login,
    handle: {
      isPublicRoute: true,
      sxContent: { alignContent: "center" },
    },
  },
  {
    path: "/reset",
    Component: ResetPasswordRequest,
    handle: {
      isPublicRoute: true,
      sxContent: { alignContent: "center" },
    },
  },
  {
    path: "/reset/:token?",
    Component: ResetPassword,
    handle: {
      isPublicRoute: true,
      sxContent: { alignContent: "center" },
    },
  },
  {
    path: "/",
    Component: Dashboard,
    menu: { text: "menu.dashboard", Icon: Home },
  },
  {
    path: "/inbox/threads/:thread?",
    Component: Inbox,
    handle: {
      hasNoPadding: true,
    },
    menu: {
      text: "menu.inbox",
      Icon: MessagesSquare,
      href: "/inbox/threads",
      requires: readMenu(EntityType.MESSAGE),
    },
  },
  {
    path: "/workflow-editor/:flowId?/:nodeIds?",
    Component: WorkflowEditor,
    handle: {
      hasNoPadding: true,
    },
    menu: {
      group: "workflows",
      text: "menu.workflow_builder",
      Icon: Workflow,
      href: "/workflow-editor",
      requires: readMenu(EntityType.WORKFLOW),
    },
  },
  {
    path: "/workflow/runs",
    Component: WorkflowRuns,
    handle: {
      requiredPermissions: readRoute(EntityType.WORKFLOW_RUN),
    },
    menu: {
      group: "workflows",
      text: "menu.runs",
      Icon: Activity,
      requires: readMenu(EntityType.WORKFLOW_RUN),
    },
  },
  {
    path: "/workflow/memory-definitions",
    Component: MemoryDefinitions,
    handle: {
      requiredPermissions: readRoute(EntityType.MEMORY_DEFINITION),
    },
    menu: {
      group: "workflows",
      text: "menu.memory",
      Icon: BrainCircuit,
      requires: readMenu(EntityType.MEMORY_DEFINITION),
    },
  },
  {
    path: "/workflow/:workflowId/runs/:initiatorId/:runId?",
    Component: WorkflowRunDebuggerPage,
    handle: {
      requiredPermissions: readRoute(EntityType.WORKFLOW_RUN),
    },
  },
  {
    path: "/content-types",
    Component: ContentTypes,
    handle: {
      requiredPermissions: readRoute(EntityType.CONTENT_TYPE),
    },
    menu: {
      group: "content",
      text: "menu.content_types",
      Icon: BookOpen,
      requires: readMenu(EntityType.CONTENT_TYPE),
    },
  },
  {
    path: "/content-types/content/:id",
    Component: Contents,
    handle: {
      requiredPermissions: readRoute(EntityType.CONTENT),
    },
  },
  {
    path: "/content/persistent-menu",
    Component: Menu,
    handle: {
      requiredPermissions: readRoute(EntityType.MENU),
    },
    menu: {
      group: "content",
      text: "menu.persistent_menu",
      Icon: MenuIcon,
      requires: readMenu(EntityType.MENU),
    },
  },
  {
    path: "/content/media-library",
    Component: MediaLibrary,
    menu: {
      group: "content",
      text: "menu.media_library",
      Icon: Images,
      requires: readMenu(EntityType.ATTACHMENT),
    },
  },
  {
    path: "/subscribers",
    Component: Subscribers,
    handle: {
      requiredPermissions: readRoute(EntityType.SUBSCRIBER),
    },
    menu: {
      group: "audience",
      text: "menu.subscribers",
      Icon: UserRound,
      requires: readMenu(EntityType.SUBSCRIBER),
    },
  },
  {
    path: "/subscribers/labels",
    Component: Labels,
    handle: {
      requiredPermissions: readRoute(EntityType.LABEL),
    },
    menu: {
      group: "audience",
      text: "menu.labels",
      Icon: Tag,
      requires: readMenu(EntityType.LABEL),
    },
  },
  {
    path: "/settings/sources",
    Component: Sources,
    handle: {
      requiredPermissions: readRoute(EntityType.SOURCE),
    },
    menu: {
      group: "integrations",
      text: "menu.channels",
      Icon: Webhook,
      requires: readMenu(EntityType.SOURCE),
    },
  },
  {
    path: "/workflow/mcp-servers",
    Component: McpServers,
    handle: {
      requiredPermissions: readRoute(EntityType.MCP_SERVER),
    },
    menu: {
      group: "integrations",
      text: "menu.mcp_servers",
      Icon: PlugZap,
      requires: readMenu(EntityType.MCP_SERVER),
    },
  },
  {
    path: "/credentials",
    Component: Credentials,
    handle: {
      requiredPermissions: readRoute(EntityType.CREDENTIAL),
    },
    menu: {
      group: "integrations",
      text: "menu.credentials",
      Icon: KeyRound,
      requires: readMenu(EntityType.CREDENTIAL),
    },
  },
  {
    path: "/users",
    Component: UsersPage,
    handle: {
      requiredPermissions: readRoute(EntityType.USER),
    },
    menu: {
      group: "administration",
      text: "menu.users",
      Icon: Users,
      requires: readMenu(EntityType.USER),
    },
  },
  {
    path: "/roles",
    Component: Roles,
    handle: {
      requiredPermissions: readRoute(EntityType.ROLE),
    },
    menu: {
      group: "administration",
      text: "menu.roles",
      Icon: ShieldCheck,
      requires: readMenu(EntityType.ROLE),
      hideWhenSso: true,
    },
  },
  {
    path: "/localization/languages",
    Component: LanguagesPage,
    handle: {
      requiredPermissions: readRoute(EntityType.LANGUAGE),
    },
    menu: {
      group: "administration",
      text: "menu.languages",
      Icon: Flag,
      requires: readMenu(EntityType.LANGUAGE),
    },
  },
  {
    path: "/localization/translations",
    Component: Translations,
    handle: {
      requiredPermissions: readRoute(EntityType.TRANSLATION),
    },
    menu: {
      group: "administration",
      text: "menu.translations",
      Icon: Languages,
      requires: readMenu(EntityType.TRANSLATION),
    },
  },
  {
    path: "/audit",
    Component: Audit,
    handle: {
      requiredPermissions: readRoute(EntityType.AUDIT_LOG),
    },
    menu: {
      group: "administration",
      text: "menu.audit_trail",
      Icon: ScrollText,
      requires: readMenu(EntityType.AUDIT_LOG),
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
    menu: {
      group: "administration",
      text: "menu.settings",
      Icon: SettingsIcon,
      href: "/settings",
      requires: {
        [EntityType.SETTING]: [Action.READ, Action.UPDATE],
      },
    },
  },
  {
    path: "/profile",
    Component: Profile,
  },
];
