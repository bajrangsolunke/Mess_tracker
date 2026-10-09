import { useMemo, useState } from "react";
import { Alert, Box, Button, ButtonBase, Skeleton, Stack, Tab, Tabs, Typography, alpha } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import BeachAccessIcon from "@mui/icons-material/BeachAccessRounded";
import MenuBookIcon from "@mui/icons-material/MenuBookRounded";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { AttendanceRow, MealType, MemberType } from "../../api/types";
import { Chip } from "@mui/material";
import { useAttendanceSheet, useMarkAttendance, useMemberSearch } from "../../api/useAttendance";
import { SearchResults } from "../search/SearchResults";
import { TiffinsLeft } from "../search/TiffinsLeft";
import { SearchBar } from "../../components/SearchBar";
import { Avatar } from "../../components/brand/Avatar";
import { PageHeader } from "../../components/brand/PageHeader";
import { brand } from "../../app/theme";
import { formatDateLong, formatTime, todayIst } from "../../lib/date";
import ScheduleIcon from "@mui/icons-material/ScheduleRounded";
import { DateStrip } from "./DateStrip";
import { useSession } from "../auth/authStore";
import EditIcon from "@mui/icons-material/EditRounded";
import { CorrectMarkDialog, type Correction } from "./CorrectMarkDialog";
import { ApiError } from "../../api/client";

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{ flex: 1, textAlign: "center", py: 1, borderRadius: "12px", bgcolor: alpha(color, 0.1) }}>
      <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.1, color }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
}

function MarkInfo({ row }: { row: AttendanceRow }) {
  const { t, i18n } = useTranslation();
  if (!row.status) return null;
  const who = row.auto ? t("attendance.byAuto") : row.self_marked ? t("attendance.selfMarked") : row.marked_by_name ?? t("attendance.byOwner");
  const color = row.status === "present" ? brand.greenDark : "#B91C1C";
  return (
    <Box component="span" sx={{ color, fontWeight: 600 }}>
      · {row.status === "present" ? "✓" : "✗"} {row.marked_at ? formatTime(row.marked_at, i18n.language) : ""} · {who}
    </Box>
  );
}

function Row({ row, locked, onMark, onCorrect }: { row: AttendanceRow; locked: boolean; onMark: (s: "present" | "absent") => void; onCorrect?: () => void }) {
  const { t } = useTranslation();
  const present = row.status === "present";
  const absent = row.status === "absent";
  const fixed = row.status !== null || locked;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.25,
        borderRadius: "16px",
        bgcolor: brand.paper,
        border: `1px solid ${present ? alpha(brand.green, 0.5) : absent ? alpha("#DC2626", 0.4) : brand.line}`,
      }}
    >
      <Avatar name={row.member.name} size={40} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ lineHeight: 1.3, minWidth: 0 }}>
            {row.member.name}
          </Typography>
          {row.tiffins_left != null ? <TiffinsLeft left={row.tiffins_left} /> : null}
        </Box>
        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", lineHeight: 1.4 }}>
          <Box component="span" sx={{ fontWeight: 700, color: brand.red }}>#{row.member.member_no}</Box>
          {row.member.member_type === "tiffin" ? ` · ${t("members.type.tiffin")}${row.member.company ? ` · ${row.member.company}` : ""}` : ""}
          {row.extra ? <Box component="span" sx={{ fontWeight: 700, color: brand.goldDark }}>· {t("attendance.extraMeal")}</Box> : null}
          <MarkInfo row={row} />
          {row.on_leave ? (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color: brand.goldDark, fontWeight: 600 }}>
              <BeachAccessIcon sx={{ fontSize: 14 }} /> {t("attendance.onLeave")}
            </Box>
          ) : null}
        </Typography>
      </Box>
      {fixed ? (
        <ButtonBase
          disabled={!onCorrect || locked || row.status === null}
          onClick={onCorrect}
          aria-label={onCorrect ? t("attendance.correctTitle") : undefined}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, borderRadius: "999px", px: 1.15, minHeight: 36, bgcolor: present ? alpha(brand.green, 0.12) : absent ? alpha("#DC2626", 0.12) : alpha(brand.inkSoft, 0.08), color: present ? brand.greenDark : absent ? "#B91C1C" : "text.secondary", fontWeight: 700, fontSize: "0.875rem" }}
        >
          {onCorrect && !locked ? <EditIcon sx={{ fontSize: 15 }} /> : <LockIcon sx={{ fontSize: 15 }} />}
          {present ? t("status.present") : absent ? t("status.absent") : t("attendance.unmarked")}
        </ButtonBase>
      ) : (
        <Box sx={{ display: "flex", gap: 0.75 }}>
          <ButtonBase
            aria-label={`${row.member.name}: ${t("status.present")}`}
            aria-pressed={present}
            disabled={locked}
            onClick={() => onMark("present")}
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: present ? brand.green : alpha(brand.green, 0.1),
              color: present ? "#fff" : brand.green,
              border: `1.5px solid ${present ? brand.green : alpha(brand.green, 0.3)}`,
              transition: "background-color 120ms, transform 120ms",
              "&:active": { transform: "scale(.94)" },
            }}
          >
            <CheckIcon />
          </ButtonBase>
          <ButtonBase
            aria-label={`${row.member.name}: ${t("status.absent")}`}
            aria-pressed={absent}
            disabled={locked}
            onClick={() => onMark("absent")}
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: absent ? "#DC2626" : alpha("#DC2626", 0.08),
              color: absent ? "#fff" : "#DC2626",
              border: `1.5px solid ${absent ? "#DC2626" : alpha("#DC2626", 0.25)}`,
              transition: "background-color 120ms, transform 120ms",
              "&:active": { transform: "scale(.94)" },
            }}
          >
            <CloseIcon />
          </ButtonBase>
        </Box>
      )}
    </Box>
  );
}

export function AttendancePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const isOwner = user?.role === "owner";
  const [params, setParams] = useSearchParams();
  // staff mark today's meals only
  const date = isOwner ? params.get("date") ?? todayIst() : todayIst();
  const [correcting, setCorrecting] = useState<Correction | null>(null);
  const meal = (params.get("meal") as MealType | null) ?? "lunch";
  const setDate = (d: string) => setParams({ date: d, meal }, { replace: true });
  const setMeal = (m: MealType) => setParams({ date, meal: m }, { replace: true });
  const [search, setSearch] = useState("");
  const [type, setType] = useState<MemberType | "">("");

  const { data, isLoading, isError } = useAttendanceSheet(date, meal);
  const mark = useMarkAttendance(date, meal);
  const others = useMemberSearch(search, isOwner ? date : undefined);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    const typed = type ? items.filter((r) => r.member.member_type === type) : items;
    return q ? typed.filter((r) => r.member.name.toLowerCase().includes(q) || r.member.phone.includes(q) || String(r.member.member_no).includes(q) || (r.member.company ?? "").toLowerCase().includes(q)) : typed;
  }, [data, search, type]);
  const tiffinCount = (data?.items ?? []).filter((r) => r.member.member_type === "tiffin").length;

  const locked = data?.locked ?? false;
  const listed = new Set((data?.items ?? []).map((r) => r.member.id));
  const extraHits = search.trim() && !locked ? (others.data ?? []).filter((r) => !listed.has(r.member.id)) : [];
  // members not on this meal's list (a 1-time member's other meal, buffer days) found by search
  const othersBlock = extraHits.length ? (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("attendance.otherMembers", { meal: t(`meal.${meal}`) })}</Typography>
      <SearchResults rows={extraHits} date={date} meals={[meal]} />
    </Box>
  ) : null;

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t("nav.attendance")}
        subtitle={formatDateLong(date, i18n.language)}
        action={isOwner ? <Button variant="outlined" size="medium" startIcon={<MenuBookIcon />} onClick={() => navigate("/owner/register")} sx={{ minHeight: 44 }}>{t("register.title")}</Button> : undefined}
      />
      {isOwner ? <DateStrip value={date} onChange={setDate} /> : null}

      <Tabs value={meal} onChange={(_, v: MealType) => setMeal(v)} variant="fullWidth" sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontWeight: 600 } }}>
        <Tab value="lunch" label={t("meal.lunch")} />
        <Tab value="dinner" label={t("meal.dinner")} />
      </Tabs>

      {!data?.holiday ? (
        <Box sx={{ position: "sticky", top: 64, zIndex: 3, bgcolor: "background.default", py: 0.5, mx: -0.5, px: 0.5 }}>
          <SearchBar value={search} onChange={setSearch} placeholder={t("members.searchPlaceholder")} />
        </Box>
      ) : null}

      {locked ? (
        <Alert severity="warning" icon={<LockIcon />} action={isOwner ? <Button size="small" onClick={() => navigate("/owner/months")}>{t("attendance.manageMonths")}</Button> : undefined}>
          {t("attendance.locked")}
        </Alert>
      ) : null}

      {isLoading && !data ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={64} sx={{ borderRadius: "12px" }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: "16px" }} />
          ))}
        </Stack>
      ) : isError || !data ? (
        <Typography color="error">{t("common.error")}</Typography>
      ) : data.holiday ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <BeachAccessIcon sx={{ fontSize: 56, color: brand.gold }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {t("attendance.holiday")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {data.holiday.reason || t("attendance.messClosed")}
          </Typography>
          {isOwner ? (
            <Button variant="text" sx={{ mt: 2 }} onClick={() => navigate("/owner/holidays")}>
              {t("attendance.manageHolidays")}
            </Button>
          ) : null}
        </Box>
      ) : data.items.length === 0 ? (
        <>
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 5 }}>{t("attendance.nobodyExpected")}</Typography>
          {othersBlock}
        </>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Counter label={t("status.present")} value={data.counts.present} color={brand.green} />
            <Counter label={t("status.absent")} value={data.counts.absent} color="#DC2626" />
            <Counter label={t("attendance.unmarked")} value={data.counts.unmarked} color={brand.inkSoft} />
            {data.counts.on_leave > 0 ? <Counter label={t("attendance.onLeave")} value={data.counts.on_leave} color={brand.goldDark} /> : null}
          </Box>

          {data.ends_at ? (
            <Alert severity={data.closed ? "info" : "success"} icon={<ScheduleIcon />} sx={{ py: 0.25 }}>
              {data.closed ? t("attendance.mealClosed", { time: formatTime(data.ends_at, i18n.language) }) : t("attendance.mealOpen", { time: formatTime(data.ends_at, i18n.language) })}
            </Alert>
          ) : null}

          {tiffinCount > 0 ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              {([["", `${t("members.all")} (${data.items.length})`], ["dine_in", `${t("members.type.dine_in")} (${data.items.length - tiffinCount})`], ["tiffin", `${t("members.type.tiffin")} (${tiffinCount})`]] as const).map(([k, label]) => (
                <Chip key={k} label={label} onClick={() => setType(k)} sx={{ height: 34, bgcolor: type === k ? brand.red : brand.paper, color: type === k ? "#fff" : "text.primary", border: `1px solid ${type === k ? brand.red : brand.line}`, fontWeight: 600 }} />
              ))}
            </Box>
          ) : null}

          <Stack spacing={1.25}>
            {rows.map((r) => (
              <Row
                key={r.member.id}
                row={r}
                locked={locked}
                onMark={(s) => mark.mutate({ items: [{ member_id: r.member.id, status: s }] })}
                onCorrect={isOwner && r.status ? () => setCorrecting({ memberId: r.member.id, name: r.member.name, date, meal, from: r.status! }) : undefined}
              />
            ))}
          </Stack>
          {mark.error instanceof ApiError ? <Alert severity="info">{mark.error.code === "ATTENDANCE_LOCKED" ? t("attendance.alreadyMarked") : t(`search.block.${mark.error.code}`, { defaultValue: mark.error.message })}</Alert> : null}
          {othersBlock}
        </>
      )}
      {correcting ? (
        <CorrectMarkDialog
          value={correcting}
          busy={mark.isPending}
          onCancel={() => setCorrecting(null)}
          onConfirm={(to) => mark.mutate({ items: [{ member_id: correcting.memberId, status: to }], override: true }, { onSettled: () => setCorrecting(null) })}
        />
      ) : null}
    </Stack>
  );
}
