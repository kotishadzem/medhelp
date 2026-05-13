import {
  ActivityIndicator,
  Alert,
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

  const confirmRemove = (link: FamilyLink) => {
    Alert.alert(
      t("family.removeConfirmTitle"),
      t("family.removeConfirmBody", { name: displayName(link) }),
      [
        { text: t("family.cancel" as never, { defaultValue: "Cancel" }), style: "cancel" },
        { text: t("family.remove"), style: "destructive", onPress: () => remove.mutate(link.id) },
      ]
    );
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
                {accepted.map((link) => (
                  <Link key={link.id} href={`/(tabs)/family/${link.id}` as Href} asChild>
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(link)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{link.customName}</Text>
                        <Text style={styles.rowSubtitle}>{partyDisplay(link.target)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                    </Pressable>
                  </Link>
                ))}

                {outgoingPending.map((link) => (
                  <View key={link.id} style={[styles.row, styles.rowPending]}>
                    <View style={[styles.avatar, styles.avatarPending]}>
                      <Ionicons name="time-outline" size={18} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{link.customName}</Text>
                      <Text style={styles.rowSubtitle}>{partyDisplay(link.target)}</Text>
                      <Text style={styles.pendingNote}>{t("family.statusPending")}</Text>
                    </View>
                    <Pressable
                      onPress={() => confirmRemove(link)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Ionicons name="close" size={18} color={colors.textDim} />
                    </Pressable>
                  </View>
                ))}
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
