import React from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { TicketResponseData } from "../../types/api";
import { TicketDocument } from "./TicketDocument";
import { generateAndShareTicketPdf } from "./ticketPdfGenerator";
export function FullTicketDocumentModal({
  visible,
  onClose,
  ticket,
}: {
  visible: boolean;
  onClose: () => void;
  ticket: TicketResponseData;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TicketDocument ticket={ticket} />
        </ScrollView>
        <View style={{ padding: 16, gap: 12 }}>
          <AppButton
            title={t("flow.share_ticket")}
            onPress={() => {
              void generateAndShareTicketPdf(ticket, language);
            }}
          />
          <AppButton
            title={t("pax.close")}
            variant="outline"
            onPress={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
