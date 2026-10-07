/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import MuiAppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { styled, useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Menu, PanelLeftClose } from "lucide-react";
import * as React from "react";

import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";
import { useTranslate } from "@/hooks/useTranslate";
import ColorModeIconDropdown from "@/layout/ColorModeIconDropdown";
import LicenseBadge from "@/layout/LicenseBadge";
import { Avatar } from "@/shared/displays/Avatar";

import { PopoverMenu } from "../PopoverMenu";

import { DashboardHeaderProps } from "./types/sidebar.types";

const LogoContainer = styled("div")({
  marginLeft: "4px",
});

export const DashboardHeader = ({
  logo,
  menuOpen,
  onToggleMenu,
}: DashboardHeaderProps) => {
  const { user, logoutMutation } = useAuth();
  const { mutate: logout } = logoutMutation;
  const { ssoEnabled } = useConfig();
  const { t } = useTranslate();
  const anchorRef = React.useRef(null);
  const [isMenuPopoverOpen, setIsMenuPopoverOpen] = React.useState(false);
  const label = t(menuOpen ? "button.collapse_menu" : "button.expand_menu");
  const isRtl = useTheme().direction === "rtl";

  return (
    <MuiAppBar color="inherit" position="fixed">
      <Toolbar>
        <Stack direction="row" alignItems="center" spacing={1} width="100%">
          <Tooltip title={label} enterDelay={1000}>
            <IconButton
              size="small"
              aria-label={label}
              onClick={() => onToggleMenu(!menuOpen)}
            >
              {menuOpen ? (
                <PanelLeftClose
                  style={isRtl ? { transform: "scaleX(-1)" } : undefined}
                />
              ) : (
                <Menu />
              )}
            </IconButton>
          </Tooltip>

          {logo && <LogoContainer>{logo}</LogoContainer>}
          {user?.license ? <LicenseBadge license={user.license} /> : null}

          <Box
            sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}
          >
            <Box
              ref={anchorRef}
              onClick={() => setIsMenuPopoverOpen(!isMenuPopoverOpen)}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                cursor: "pointer",
                borderRadius: 3,
                p: 0.5,
                transition: "filter 0.2s",
                "&:hover": { filter: "brightness(90%)" },
                ...(isMenuPopoverOpen && { filter: "brightness(80%)" }),
              }}
            >
              <Box
                sx={{
                  textAlign: "start",
                  "& .MuiTypography-root": { unicodeBidi: "plaintext" },
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  lineHeight={1}
                  textTransform="capitalize"
                >
                  {user?.fullName || user?.email}
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.8rem"
                  sx={{ mt: 0.4, lineHeight: 1 }}
                >
                  {user?.email}
                </Typography>
              </Box>
              <Avatar subscriberId={user?.id} />
            </Box>
          </Box>

          <ColorModeIconDropdown />
          {user && (
            <PopoverMenu
              open={isMenuPopoverOpen}
              user={user}
              anchorEl={anchorRef.current}
              onClose={() => setIsMenuPopoverOpen(false)}
              handleClose={() => setIsMenuPopoverOpen(false)}
              logout={{
                text: t("menu.logout"),
                onClick: () => {
                  logout([]);
                },
              }}
              links={[
                { text: t("menu.home"), href: "/" },
                ...(!ssoEnabled
                  ? [{ text: t("menu.edit_account"), href: "/profile" }]
                  : []),
              ]}
            />
          )}
        </Stack>
      </Toolbar>
    </MuiAppBar>
  );
};
