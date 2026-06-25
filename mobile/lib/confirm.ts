import { Alert, Platform } from "react-native";

type Options = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

// Cross-platform confirm. On native we use Alert.alert (modal buttons).
// On web Alert.alert renders without buttons, so we fall back to
// window.confirm so the user can actually answer.
//
// When `cancelLabel` is omitted the helper behaves as a one-button
// notice: it always resolves true, the button just acknowledges the
// message.
export function confirm(opts: Options): Promise<boolean> {
  const oneButton = !opts.cancelLabel;
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const text = opts.body ? `${opts.title}\n\n${opts.body}` : opts.title;
      if (oneButton) {
        globalThis.alert(text);
        resolve(true);
      } else {
        resolve(globalThis.confirm(text));
      }
      return;
    }
    if (oneButton) {
      Alert.alert(opts.title, opts.body, [
        { text: opts.confirmLabel, onPress: () => resolve(true) },
      ]);
      return;
    }
    Alert.alert(opts.title, opts.body, [
      { text: opts.cancelLabel!, style: "cancel", onPress: () => resolve(false) },
      {
        text: opts.confirmLabel,
        style: opts.destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
