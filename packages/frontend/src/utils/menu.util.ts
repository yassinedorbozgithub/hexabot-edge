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
  Menu,
  MessagesSquare,
  Plug,
  PlugZap,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  UserRound,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

import { EntityType } from "@/api/types";
import { TMenu } from "@/shared/menus/DashboardSidebar/types/sidebar.types";

const canRead = (entity: EntityType): TMenu["requires"] => ({
  [entity]: [Action.READ],
});

export const getMenuItems = (ssoEnabled: boolean): TMenu[] => [
  {
    text: "menu.dashboard",
    href: "/",
    Icon: Home,
  },
  {
    text: "menu.inbox",
    href: "/inbox/threads",
    Icon: MessagesSquare,
    requires: canRead(EntityType.MESSAGE),
  },
  {
    text: "menu.workflows",
    Icon: GitBranch,
    submenuItems: [
      {
        text: "menu.workflow_builder",
        href: "/workflow-editor",
        Icon: Workflow,
        requires: canRead(EntityType.WORKFLOW),
      },
      {
        text: "menu.runs",
        href: "/workflow/runs",
        Icon: Activity,
        requires: canRead(EntityType.WORKFLOW_RUN),
      },
      {
        text: "menu.memory",
        href: "/workflow/memory-definitions",
        Icon: BrainCircuit,
        requires: canRead(EntityType.MEMORY_DEFINITION),
      },
    ],
  },
  {
    text: "menu.content",
    Icon: Library,
    submenuItems: [
      {
        text: "menu.content_types",
        href: "/content-types",
        Icon: BookOpen,
        requires: canRead(EntityType.CONTENT_TYPE),
      },
      {
        text: "menu.persistent_menu",
        href: "/content/persistent-menu",
        Icon: Menu,
        requires: canRead(EntityType.MENU),
      },
      {
        text: "menu.media_library",
        href: "/content/media-library",
        Icon: Images,
        requires: canRead(EntityType.ATTACHMENT),
      },
    ],
  },
  {
    text: "menu.audience",
    Icon: UserRound,
    submenuItems: [
      {
        text: "menu.subscribers",
        href: "/subscribers",
        Icon: UserRound,
        requires: canRead(EntityType.SUBSCRIBER),
      },
      {
        text: "menu.labels",
        href: "/subscribers/labels",
        Icon: Tag,
        requires: canRead(EntityType.LABEL),
      },

      // {
      //   text: 'menu.broadcast',
      //   href: "/subscribers/broadcast",
      //   Icon: faBullhorn,
      // },
    ],
  },
  {
    text: "menu.integrations",
    Icon: Plug,
    submenuItems: [
      {
        text: "menu.channels",
        href: "/settings/sources",
        Icon: Webhook,
        requires: canRead(EntityType.SOURCE),
      },
      {
        text: "menu.mcp_servers",
        href: "/workflow/mcp-servers",
        Icon: PlugZap,
        requires: canRead(EntityType.MCP_SERVER),
      },
      {
        text: "menu.credentials",
        href: "/credentials",
        Icon: KeyRound,
        requires: canRead(EntityType.CREDENTIAL),
      },
    ],
  },
  {
    text: "menu.administration",
    Icon: ShieldCheck,
    submenuItems: [
      {
        text: "menu.users",
        href: "/users",
        Icon: Users,
        requires: canRead(EntityType.USER),
      },
      ...(!ssoEnabled
        ? [
            {
              text: "menu.roles",
              href: "/roles",
              Icon: ShieldCheck,
              requires: canRead(EntityType.ROLE),
            } satisfies TMenu,
          ]
        : []),
      {
        text: "menu.languages",
        href: "/localization/languages",
        Icon: Flag,
        requires: canRead(EntityType.LANGUAGE),
      },
      {
        text: "menu.translations",
        href: "/localization/translations",
        Icon: Languages,
        requires: canRead(EntityType.TRANSLATION),
      },
      {
        text: "menu.audit_trail",
        href: "/audit",
        Icon: ScrollText,
        requires: canRead(EntityType.AUDIT_LOG),
      },
      {
        text: "menu.settings",
        href: "/settings",
        Icon: Settings,
        requires: {
          [EntityType.SETTING]: [Action.READ, Action.UPDATE],
        },
      },
    ],
  },
];
