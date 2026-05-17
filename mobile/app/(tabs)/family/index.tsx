import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { familyApi } from "@/lib/api/endpoints";
import type { FamilyLink, FamilyParty } from "@/lib/types";
import { confirm } from "@/lib/confirm";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function FamilyList() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["family"], queryFn: familyApi.list });

  const outgoing = query.data?.outgoing ?? [];
  const incoming = query.data?.incoming ?? [];
  const incomingPending = incoming.filter((l) => l.status === "PENDING");
  const accepted = outgoing.filter((l) => l.status === "ACCEPTED");
  const outgoingPending = outgoing.filter((l) => l.status === "PENDING");

  const respond = useMutation({
    mutationFn: (input: { id: string; status: "ACCEPTED" | "REJECTED" }) =>
      familyApi.respond(input.id, input.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => familyApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family"] }),
  });

  const confirmRemove = async (link: FamilyLink) => {
    const ok = await confirm({
      title: t("family.removeConfirmTitle"),
      body: t("family.removeConfirmBody", { name: displayName(link) }),
      confirmLabel: t("family.remove"),
      cancelLabel: t("family.cancel" as never, { defaultValue: "Cancel" }),
      destructive: true,
    });
    if (ok) remove.mutate(link.id);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("family.title")}</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/family/add")}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={20} color={colors.bg} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            {incomingPending.length > 0 && (
              <Section title={t("family.incoming")}>
                {incomingPending.map((link) => (
                  <View key={link.id} style={styles.incomingCard}>
                    <View style={styles.incomingAvatar}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incomingTitle}>{t("family.incomingTitle")}</Text>
                      <Text style={styles.incomingBody}>
                        {t("family.incomingBody", { name: partyDisplay(link.requester) })}
                      </Text>
                      <View style={styles.incomingActions}>
                        <Pressable
                          onPress={() =>
                            respond.mutate({ id: link.id, status: "REJECTED" })
                          }
                          style={({ pressed }) => [
                            styles.responseBtn,
                            styles.responseReject,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text style={styles.responseRejectText}>
                            {t("family.reject")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            respond.mutate({ id: link.id, status: "ACCEPTED" })
                          }
                          style={({ pressed }) => [
                            styles.responseBtn,
                            styles.responseAccept,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text style={styles.responseAcceptText}>
                            {t("family.accept")}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {(accepted.length > 0 || outgoingPending.length > 0) && (
              <Section title={t("family.members")}>
                <View style={styles.grid}>
                  {accepted.map((link) => (
                    <Link
                      key={link.id}
                      href={`/(tabs)/family/${link.id}` as Href}
                      asChild
                    >
                      <Pressable
                        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                      >
                        <View style={styles.cardAvatar}>
                          <Text style={styles.cardAvatarText}>{initials(link)}</Text>
                        </View>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {link.customName}
                        </Text>
                      </Pressable>
                    </Link>
                  ))}

                  {outgoingPending.map((link) => (
                    <View key={link.id} style={[styles.card, styles.cardPending]}>
                      <Pressable
                        onPress={() => confirmRemove(link)}
                        hitSlop={6}
                        style={styles.cardClose}
                      >
                        <Ionicons name="close" size={14} color={colors.textDim} />
                      </Pressable>
                      <View style={[styles.cardAvatar, styles.cardAvatarPending]}>
                        <Ionicons name="time-outline" size={18} color={colors.warning} />
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {link.customName}
                      </Text>
                      <Text style={styles.cardPendingNote}>
                        {t("family.statusPending")}
                      </Text>
                    </View>
                  ))}
                </View>
              </Section>
            )}

            {accepted.length === 0 &&
              outgoingPending.length === 0 &&
              incomingPending.length === 0 && (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color={colors.textDim} />
                  <Text style={styles.emptyTitle}>{t("family.emptyTitle")}</Text>
                  <Text style={styles.emptySubtitle}>{t("family.emptySubtitle")}</Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/family/add")}
                    style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="add" size={18} color={colors.bg} />
                    <Text style={styles.emptyBtnText}>{t("family.addButton")}</Text>
                  </Pressable>
                </View>
              )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function displayName(link: FamilyLink): string {
  return link.customName || partyDisplay(link.target ?? link.requester);
}

function partyDisplay(p?: FamilyParty): string {
  if (!p) return "";
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  if (name) return name;
  return p.phone ?? p.email ?? "";
}

function initials(link: FamilyLink): string {
  const name = link.customName.trim();
  if (name) return name.slice(0, 2);
  const p = link.target;
  if (p?.firstName) return p.firstName.slice(0, 2);
  return "?";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },

  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },

  incomingCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  incomingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  incomingTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  incomingBody: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4, lineHeight: 20 },
  incomingActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  responseBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  responseAccept: { backgroundColor: colors.primary, borderColor: colors.primary },
  responseAcceptText: { color: colors.bg, fontWeight: "700" },
  responseReject: { backgroundColor: "transparent", borderColor: colors.border },
  responseRejectText: { color: colors.text, fontWeight: "600" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPending: { opacity: 0.8 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  card: {
    flexBasis: "46%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  cardPending: { opacity: 0.85, position: "relative" },
  cardClose: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    padding: 4,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  cardAvatarPending: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  cardAvatarText: { color: colors.bg, fontWeight: "800", fontSize: fontSize.md },
  cardName: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  cardSub: { color: colors.textMuted, fontSize: fontSize.xs },
  cardPendingNote: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPending: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.warning },
  avatarText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.sm },
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  rowSubtitle: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  pendingNote: { color: colors.warning, fontSize: fontSize.xs, marginTop: 2, fontWeight: "600" },
  iconBtn: { padding: spacing.xs },

  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  emptyBtnText: { color: colors.bg, fontSize: fontSize.md, fontWeight: "700" },
});
