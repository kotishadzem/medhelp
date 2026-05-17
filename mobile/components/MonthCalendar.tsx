import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const KA_MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];
const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DE_MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const KA_DAYS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];
const EN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DE_DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function localized(lang: string) {
  if (lang === "ka") return { months: KA_MONTHS, days: KA_DAYS };
  if (lang === "de") return { months: DE_MONTHS, days: DE_DAYS };
  return { months: EN_MONTHS, days: EN_DAYS };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (ymd: string) => void;
  minYMD?: string;
};

export function MonthCalendar({ value, onChange, minYMD }: Props) {
  const { i18n } = useTranslation();
  const { months, days } = localized(i18n.language || "ka");

  const today = useMemo(() => {
    const d = new Date();
    return ymd(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Page state — which month is shown. Defaults to month of `value`.
  const [page, setPage] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const grid = useMemo(() => buildMonthGrid(page.year, page.month), [page]);

  const canPrev = (() => {
    if (!minYMD) return true;
    const [my, mm] = minYMD.split("-").map(Number);
    if (page.year > my) return true;
    if (page.year === my && page.month > mm - 1) return true;
    return false;
  })();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            canPrev &&
            setPage((p) =>
              p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 }
            )
          }
          hitSlop={8}
          style={({ pressed }) => [styles.nav, !canPrev && styles.navDisabled, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={18} color={canPrev ? colors.text : colors.textDim} />
        </Pressable>
        <Text style={styles.title}>
          {months[page.month]} {page.year}
        </Text>
        <Pressable
          onPress={() =>
            setPage((p) =>
              p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 }
            )
          }
          hitSlop={8}
          style={({ pressed }) => [styles.nav, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {days.map((d) => (
          <Text key={d} style={styles.dowText}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((cell, i) => {
          if (cell === null) {
            return <View key={i} style={styles.cell} />;
          }
          const cellYMD = ymd(page.year, page.month, cell);
          const selected = cellYMD === value;
          const isToday = cellYMD === today;
          const disabled = minYMD ? cellYMD < minYMD : false;
          return (
            <Pressable
              key={i}
              onPress={() => !disabled && onChange(cellYMD)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.cell,
                selected && styles.cellSelected,
                isToday && !selected && styles.cellToday,
                pressed && !disabled && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  selected && styles.cellTextSelected,
                  disabled && styles.cellTextDisabled,
                ]}
              >
                {cell}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Build a flat 6×7 grid for a month. Cells outside the month are `null`.
// Week starts on Monday.
function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // JS getDay(): 0 = Sunday, 1 = Monday, …; convert to Mon=0 … Sun=6.
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells.slice(0, 42);
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.xs,
  },
  nav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  navDisabled: { opacity: 0.35 },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },

  dowRow: { flexDirection: "row", justifyContent: "space-between" },
  dowText: {
    width: CELL_SIZE,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CELL_SIZE / 2,
    margin: 1,
  },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cellText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  cellTextSelected: { color: colors.bg, fontWeight: "800" },
  cellTextDisabled: { color: colors.textDim },
});
