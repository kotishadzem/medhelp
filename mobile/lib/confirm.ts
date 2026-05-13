import { Alert, Platform } from "react-native";

type Options = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

// Cross-platform confirm. On native we use Alert.alert (modal buttons).
// On web Alert.alert renders without buttons, so we fall back to
// window.confirm so the user can actually answer.
export function confirm(opts: Options): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const ok = globalThis.confirm(opts.body ? `${opts.title}\n\n${opts.body}` : opts.title);
      resolve(ok);
      return;
    }
    Alert.alert(opts.title, opts.body, [
      { text: opts.cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: opts.confirmLabel,
        style: opts.destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
