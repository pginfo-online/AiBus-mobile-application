import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppButton, AppCard, AppInput, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { useBookingStore } from "../../stores/bookingStore";
import { useAuthStore } from "../../stores/authStore";
import { useWalletQuery } from "../../features/wallet/useWalletQuery";
import { useCreateCheckoutSessionMutation } from "../../features/booking/useBookingMutations";
import { useValidateCouponMutation } from "../../features/offers/useValidateCouponMutation";
import { RazorpayService } from "../../features/payments/RazorpayService";
import { PaymentCoordinator } from "../../features/payments/PaymentCoordinator";
import { PendingPaymentStorage } from "../../core/storage";
import { FlowSkeleton } from "../../features/booking/FlowSkeleton";

export default function PaymentScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const b = useBookingStore();
  const owner = useAuthStore((s) => s.user?.id);
  const wallet = useWalletQuery(Boolean(owner));
  const checkout = useCreateCheckoutSessionMutation();
  const coupon = useValidateCouponMutation();
  const [method, setMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(
    0,
    Math.floor((new Date(b.activeHold?.expiresAt || 0).getTime() - now) / 1000),
  );
  const gross =
    b.activeHold?.totalFare ??
    b.selectedSeats.reduce((sum, s) => sum + s.fare, 0);
  const discount = b.appliedCoupon?.discountAmount ?? 0;
  const fare = Math.max(0, gross - discount);
  const balance = Number(wallet.data?.walletBalance ?? 0);
  let walletUsed = b.useWallet ? Math.min(balance, fare) : 0;
  if (fare - walletUsed > 0 && fare - walletUsed < 1)
    walletUsed = Math.max(0, fare - 1);
  const payable = Math.max(0, fare - walletUsed);
  const apply = async () => {
    if (!code.trim() || coupon.isPending || busy) return;
    setError("");
    try {
      const result = await coupon.mutateAsync({
        code: code.trim().toUpperCase(),
        totalFare: gross,
        operatorName: b.selectedBus?.CompanyName,
        fromCityId: b.fromCity.providerCityId,
        toCityId: b.toCity.providerCityId,
        busId: b.selectedBus?.RouteBusId || b.selectedBus?.BusId,
      });
      if (result.valid && result.coupon)
        b.applyCoupon({
          code: result.coupon.code,
          title: result.coupon.title,
          discountAmount: result.discountAmount,
          coupon: result.coupon,
        });
      else setError(t("flow.offer_error"));
    } catch {
      setError(t("flow.offer_error"));
    }
  };
  const pay = async () => {
    if (lock.current) return;
    if (!owner) {
      router.push("/(auth)/login");
      return;
    }
    if (
      !seconds ||
      !b.activeHold ||
      !b.selectedBus ||
      !b.selectedBoardingPoint ||
      !b.selectedDroppingPoint ||
      !b.passengers.length
    ) {
      setError(t("flow.expired"));
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await checkout.mutateAsync({
        holdId: b.activeHold.id,
        fromCityId: b.fromCity.providerCityId,
        toCityId: b.toCity.providerCityId,
        fromCityName: b.fromCity.name,
        toCityName: b.toCity.name,
        journeyDate: b.journeyDate,
        busId: b.selectedBus.RouteBusId || b.selectedBus.BusId,
        tripId: String(
          b.selectedBus.TripId ||
            b.selectedBus.RouteBusId ||
            b.selectedBus.BusId,
        ),
        pickupCode: b.selectedBoardingPoint.code,
        pickupLocation: b.selectedBoardingPoint.name,
        pickupTime: b.selectedBoardingPoint.time,
        dropoffCode: b.selectedDroppingPoint.code,
        dropoffLocation: b.selectedDroppingPoint.name,
        dropoffTime: b.selectedDroppingPoint.time,
        operatorName: b.selectedBus.CompanyName,
        busType: b.selectedBus.BusTypeName || b.selectedBus.BusType,
        totalFare: gross,
        baseFare: b.selectedSeats.reduce((sum, s) => sum + s.baseFare, 0),
        serviceTax: b.selectedSeats.reduce((sum, s) => sum + s.tax, 0),
        contactName: b.contactName || b.passengers[0].name,
        contactEmail: b.contactEmail,
        contactPhone: b.contactPhone,
        passengers: b.passengers,
        cancellationPolicy: b.selectedBus.CancellationPolicy,
        pickupSnapshot: b.selectedBoardingPoint,
        dropoffSnapshot: b.selectedDroppingPoint,
        couponCode: b.appliedCoupon?.code,
        useWallet: b.useWallet,
        gateway: "RAZORPAY",
        paymentMode: method,
      });
      if (useAuthStore.getState().user?.id !== owner) return;
      const { booking, paymentIntent } = session;
      b.setActiveBooking(booking.id, booking.bookingNumber);
      const merchantTxnId =
        paymentIntent?.merchantTxnId || `WALLET-${booking.id}`;
      const pending = {
        userId: owner,
        bookingId: booking.id,
        merchantTxnId,
        amount: paymentIntent?.amount ?? Number(booking.totalFare),
        gateway: paymentIntent?.gateway || "WALLET",
        gatewayOrderId: paymentIntent?.gatewayOrderId,
        timestamp: Date.now(),
      };
      await PendingPaymentStorage.set(pending);
      const status = () =>
        router.replace({
          pathname: "/booking/processing",
          params: { bookingId: booking.id, merchantTxnId },
        });
      if (!paymentIntent) {
        if (["PAYMENT_SUCCESS", "CONFIRMED"].includes(booking.status)) {
          status();
          return;
        }
        throw new Error("Missing order");
      }
      const result = await RazorpayService.openCheckout(paymentIntent);
      if (
        useAuthStore.getState().user?.id !== owner ||
        PaymentCoordinator.isHandledByDeepLink()
      )
        return;
      if (result.gatewayPaymentId)
        await PendingPaymentStorage.set({
          ...pending,
          gatewayPaymentId: result.gatewayPaymentId,
          gatewaySignature: result.gatewaySignature,
        });
      if (result.status === "SUCCESS" || result.status === "PENDING") status();
      else
        Alert.alert(t("flow.retry_payment"), t("flow.pending_body"), [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("flow.check_status"), onPress: status },
        ]);
    } catch {
      setError(t("flow.checkout_error"));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <AppText variant="heading2">{t("flow.payment_title")}</AppText>
        <AppText
          style={{ color: seconds ? colors.textSecondary : colors.danger }}
        >
          {seconds
            ? t("flow.seat_timer", {
                time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
              })
            : t("flow.expired")}
        </AppText>
        <AppCard padding="base">
          <View style={{ gap: 12 }}>
            <AppText variant="heading3">
              {b.fromCity.name} → {b.toCity.name}
            </AppText>
            <AppText>{b.selectedBus?.CompanyName}</AppText>
            <AppText>
              {t("flow.fare")}: ₹{gross.toFixed(2)}
            </AppText>
            <AppText>
              {t("flow.discount")}: −₹{discount.toFixed(2)}
            </AppText>
            {walletUsed > 0 && (
              <AppText>
                {t("flow.wallet_used")}: −₹{walletUsed.toFixed(2)}
              </AppText>
            )}
            <AppText variant="heading3">
              {t("pax.amount")}: ₹{payable.toFixed(2)}
            </AppText>
          </View>
        </AppCard>
        <AppCard padding="base">
          <AppInput
            label={t("flow.coupon")}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            editable={!busy}
          />
          <AppButton
            title={t("flow.apply")}
            loading={coupon.isPending}
            onPress={() => {
              void apply();
            }}
            disabled={busy}
            variant="outline"
          />
          {b.appliedCoupon && (
            <AppButton
              title={`${b.appliedCoupon.code} · ${t("flow.remove")}`}
              onPress={b.removeCoupon}
              variant="ghost"
              disabled={busy}
            />
          )}
        </AppCard>
        {wallet.isError ? (
          <AppButton title={t("flow.load_error")} variant="outline" onPress={() => { void wallet.refetch(); }} />
        ) : wallet.isLoading ? (
          <FlowSkeleton kind="card" />
        ) : (
          balance > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                backgroundColor: colors.surface,
              }}
            >
              <AppText style={{ flex: 1 }}>
                {t("flow.use_wallet", { amount: balance.toFixed(2) })}
              </AppText>
              <Switch
                accessibilityLabel={t("flow.wallet_off")}
                value={b.useWallet}
                onValueChange={b.setUseWallet}
                disabled={busy}
              />
            </View>
          )
        )}
        {payable > 0 && (
          <AppCard padding="base">
            <AppText variant="heading3">{t("flow.payment_method")}</AppText>
            <View style={{ gap: 12, marginTop: 16 }}>
              {(["UPI", "CARD", "NETBANKING"] as const).map((item) => (
                <AppButton
                  key={item}
                  title={
                    item === "UPI"
                      ? "UPI"
                      : t(item === "CARD" ? "flow.card" : "flow.netbanking")
                  }
                  onPress={() => setMethod(item)}
                  variant={method === item ? "primary" : "outline"}
                  disabled={busy}
                />
              ))}
            </View>
          </AppCard>
        )}
        {error ? (
          <AppText
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
          >
            {error}
          </AppText>
        ) : null}
        {!seconds && (
          <AppButton
            title={t("pax.choose_seats")}
            onPress={() => router.navigate("/booking/seat-map")}
            variant="outline"
          />
        )}
      </ScrollView>
      <View style={{ padding: 16, backgroundColor: colors.surface }}>
        <AppButton
          title={t("flow.pay_now", { amount: payable.toFixed(2) })}
          onPress={() => {
            void pay();
          }}
          loading={busy}
          disabled={!seconds || coupon.isPending || (b.useWallet && (wallet.isLoading || wallet.isError))}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
