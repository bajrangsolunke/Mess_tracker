import { useMemo, useState } from "react";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMembers } from "../../api/useMembers";
import type { MemberStatus, MemberType } from "../../api/types";
import { SearchBar } from "../../components/SearchBar";
import { PageHeader } from "../../components/brand/PageHeader";
import { EmptyState } from "../../components/brand/EmptyState";
import { MemberCard } from "./MemberCard";
import { brand } from "../../app/theme";

type Filter = "" | MemberStatus;

export function MembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Filter>("active");
  const [type, setType] = useState<MemberType | "">("");
  const { data, isLoading, isError } = useMembers({ search, status, member_type: type || undefined });
  const members = data?.items ?? [];

  const filters = useMemo<{ key: Filter; label: string }[]>(
    () => [
      { key: "active", label: t("status.active") },
      { key: "inactive", label: t("status.inactive") },
      { key: "", label: t("members.all") },
    ],
    [t],
  );

  const isBlank = !isLoading && !isError && members.length === 0 && !search && status === "active";

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t("nav.members")}
        subtitle={data ? t("members.count", { count: data.total }) : undefined}
        action={
          <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => navigate("/owner/members/new")} sx={{ minHeight: 44 }}>
            {t("members.add")}
          </Button>
        }
      />

      {isBlank ? (
        <EmptyState
          pose="confused"
          says={t("chef.noMembers")}
          title={t("members.emptyTitle")}
          hint={t("members.emptyHint")}
          actionLabel={t("members.addFirst")}
          onAction={() => navigate("/owner/members/new")}
        />
      ) : (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder={t("members.searchPlaceholder")} />
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
            {([["", t("members.all")], ["dine_in", t("members.type.dine_in")], ["tiffin", t("members.type.tiffin")]] as const).map(([k, label]) => (
              <Chip
                key={`type-${k}`}
                label={label}
                onClick={() => setType(k)}
                variant="outlined"
                sx={{ height: 36, px: 0.5, bgcolor: type === k ? `${brand.gold}26` : brand.paper, color: type === k ? brand.goldDark : "text.primary", borderColor: type === k ? brand.gold : brand.line, fontWeight: 600 }}
              />
            ))}
            <Box sx={{ width: 1, borderLeft: `1px solid ${brand.line}`, mx: 0.5 }} />
            {filters.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                onClick={() => setStatus(f.key)}
                sx={{
                  height: 36,
                  px: 0.5,
                  bgcolor: status === f.key ? brand.red : brand.paper,
                  color: status === f.key ? "#fff" : "text.primary",
                  border: `1px solid ${status === f.key ? brand.red : brand.line}`,
                  "&:hover": { bgcolor: status === f.key ? brand.redDark : brand.cream },
                }}
              />
            ))}
          </Box>

          {isLoading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={76} sx={{ borderRadius: "16px" }} />
              ))}
            </Stack>
          ) : isError ? (
            <Typography color="error">{t("common.error")}</Typography>
          ) : members.length === 0 ? (
            <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>{t("members.noResults")}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {members.map((m) => (
                <MemberCard key={m.id} member={m} onClick={() => navigate(`/owner/members/${m.id}`)} />
              ))}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
