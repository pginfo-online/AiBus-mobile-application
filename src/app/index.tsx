import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type City = {
  id: number;
  name: string;
  state: string;
};

const CITIES: City[] = [
  { id: 1, name: "Mumbai", state: "Maharashtra" },
  { id: 2, name: "Delhi", state: "Delhi" },
  { id: 3, name: "Bengaluru", state: "Karnataka" },
  { id: 4, name: "Hyderabad", state: "Telangana" },
  { id: 5, name: "Ahmedabad", state: "Gujarat" },
  { id: 6, name: "Chennai", state: "Tamil Nadu" },
  { id: 7, name: "Kolkata", state: "West Bengal" },
  { id: 8, name: "Pune", state: "Maharashtra" },
  { id: 9, name: "Surat", state: "Gujarat" },
  { id: 10, name: "Jaipur", state: "Rajasthan" },
  { id: 11, name: "Lucknow", state: "Uttar Pradesh" },
  { id: 12, name: "Kanpur", state: "Uttar Pradesh" },
  { id: 13, name: "Nagpur", state: "Maharashtra" },
  { id: 14, name: "Indore", state: "Madhya Pradesh" },
  { id: 15, name: "Ghaziabad", state: "Uttar Pradesh" },
  { id: 16, name: "Coimbatore", state: "Tamil Nadu" },
  { id: 17, name: "Kochi", state: "Kerala" },
  { id: 18, name: "Patna", state: "Bihar" },
  { id: 19, name: "Kozhikode", state: "Kerala" },
  { id: 20, name: "Bhopal", state: "Madhya Pradesh" },
  { id: 21, name: "Vadodara", state: "Gujarat" },
  { id: 22, name: "Agra", state: "Uttar Pradesh" },
  { id: 23, name: "Visakhapatnam", state: "Andhra Pradesh" },
  { id: 24, name: "Thiruvananthapuram", state: "Kerala" },
  { id: 25, name: "Ludhiana", state: "Punjab" },
  { id: 26, name: "Nashik", state: "Maharashtra" },
  { id: 27, name: "Vijayawada", state: "Andhra Pradesh" },
  { id: 28, name: "Madurai", state: "Tamil Nadu" },
  { id: 29, name: "Varanasi", state: "Uttar Pradesh" },
  { id: 30, name: "Meerut", state: "Uttar Pradesh" },
  { id: 31, name: "Faridabad", state: "Haryana" },
  { id: 32, name: "Rajkot", state: "Gujarat" },
  { id: 33, name: "Jamshedpur", state: "Jharkhand" },
  { id: 34, name: "Srinagar", state: "Jammu & Kashmir" },
  { id: 35, name: "Jabalpur", state: "Madhya Pradesh" },
  { id: 36, name: "Ranchi", state: "Jharkhand" },
  { id: 37, name: "Raipur", state: "Chhattisgarh" },
  { id: 38, name: "Amritsar", state: "Punjab" },
  { id: 39, name: "Jodhpur", state: "Rajasthan" },
  { id: 40, name: "Gwalior", state: "Madhya Pradesh" },
];

const BUS_NAMES = [
  "Online Go",
  "Vighnaharta",
  "Siya Ram",
  "Keshari",
  "Pancham",
];

export default function Index() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 28 : 18;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>🚌</Text>
            </View>

            <View>
              <Text style={styles.brandName}>aiBus</Text>
              <Text style={styles.brandSubtitle}>
                Local bus booking network
              </Text>
            </View>
          </View>

          <View style={styles.networkBadge}>
            <View style={styles.networkDot} />
            <Text style={styles.networkText}>India Network</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextContainer}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>BUS TICKET BOOKING</Text>
            </View>

            <Text style={styles.heroTitle}>
              Book your bus journey through your local shop.
            </Text>

            <Text style={styles.heroDescription}>
              Simple, convenient and accessible bus ticket booking with the
              support of our local booking network across India.
            </Text>
          </View>

          <View style={styles.heroVisual}>
            <View style={styles.heroCircleLarge} />
            <View style={styles.heroCircleSmall} />
            <View style={styles.heroBusContainer}>
              <Text style={styles.heroBus}>🚌</Text>
            </View>
          </View>
        </View>

        {/* Bus Partners */}
        <View style={styles.busPartnersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>OUR BUS PARTNERS</Text>
            <Text style={styles.sectionTitle}>Our Buses</Text>
          </View>

          <View style={styles.busPartnersGrid}>
            {BUS_NAMES.map((name, index) => (
              <View key={name} style={styles.busPartnerCard}>
                <View style={styles.busPartnerNumber}>
                  <Text style={styles.busPartnerNumberText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={styles.busPartnerName}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Local Booking Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>LOCAL BOOKING</Text>
          <Text style={styles.sectionTitle}>Book From Our Local Shops</Text>
          <Text style={styles.sectionDescription}>
            Visit our local booking shop in your city for assistance with bus
            ticket booking.
          </Text>
        </View>

        <View style={styles.bookingInfoCard}>
          <View style={styles.bookingInfoTop}>
            <View style={styles.bookingInfoIcon}>
              <Text style={styles.bookingInfoIconText}>📍</Text>
            </View>

            <View style={styles.bookingInfoTextContainer}>
              <Text style={styles.bookingInfoTitle}>
                Local booking assistance
              </Text>
              <Text style={styles.bookingInfoDescription}>
                Our local booking service helps customers book bus tickets
                easily with in-person support.
              </Text>
            </View>
          </View>

          <View style={styles.contactContainer}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>☎</Text>
            </View>

            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>CONTACT NUMBER</Text>
              <Text style={styles.contactNumber}>8010097706</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.callButton,
                pressed && styles.callButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Contact local booking support"
            >
              <Text style={styles.callButtonText}>Contact</Text>
            </Pressable>
          </View>
        </View>

        {/* Cities */}
        <View style={styles.citiesHeader}>
          <View style={styles.citiesHeaderText}>
            <Text style={styles.sectionEyebrow}>OUR SERVICE NETWORK</Text>
            <Text style={styles.sectionTitle}>Cities We Serve</Text>
            <Text style={styles.sectionDescription}>
              Our local bus booking services are available across these
              cities.
            </Text>
          </View>

          <View style={styles.cityCountBadge}>
            <Text style={styles.cityCount}>{CITIES.length}</Text>
            <Text style={styles.cityCountLabel}>Cities</Text>
          </View>
        </View>

        <View style={styles.cityGrid}>
          {CITIES.map((city, index) => (
            <View key={city.id} style={styles.cityCard}>
              <View style={styles.cityIcon}>
                <Text style={styles.cityIconText}>⌖</Text>
              </View>

              <View style={styles.cityTextContainer}>
                <Text style={styles.cityName} numberOfLines={1}>
                  {city.name}
                </Text>

                <Text style={styles.cityState} numberOfLines={1}>
                  {city.state}
                </Text>
              </View>

              <View style={styles.cityNumber}>
                <Text style={styles.cityNumberText}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>aiBus</Text>
          <Text style={styles.footerText}>
            Your local connection for bus ticket booking.
          </Text>
          <Text style={styles.footerPhone}>8010097706</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  screen: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  contentContainer: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#14253B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    shadowColor: "#14253B",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },

  brandIconText: {
    fontSize: 22,
  },

  brandName: {
    color: "#14253B",
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  brandSubtitle: {
    color: "#7A8798",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 2,
  },

  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF1",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: "#229567",
    marginRight: 7,
  },

  networkText: {
    color: "#566477",
    fontSize: 10,
    fontWeight: "700",
  },

  /* Hero */
  heroCard: {
    minHeight: 170,
    borderRadius: 20,
    backgroundColor: "#14253B",
    padding: 18,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 22,
  },

  heroTextContainer: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 12,
  },

  heroPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#203852",
    marginBottom: 9,
  },

  heroPillText: {
    color: "#BBD0EF",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    maxWidth: 650,
  },

  heroDescription: {
    color: "#C5D0DE",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 620,
  },

  heroVisual: {
    width: 105,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  heroCircleLarge: {
    position: "absolute",
    width: 115,
    height: 115,
    borderRadius: 115,
    backgroundColor: "#1D334E",
    right: -28,
    top: 5,
  },

  heroCircleSmall: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 60,
    backgroundColor: "#284562",
    right: 20,
    bottom: 7,
  },

  heroBusContainer: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "#1B3048",
    borderWidth: 1,
    borderColor: "#38536F",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBus: {
    fontSize: 38,
  },

  /* Sections */
  sectionHeader: {
    marginBottom: 15,
  },

  busPartnersSection: {
    marginBottom: 10,
  },

  busPartnersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },

  busPartnerCard: {
    width: "50%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  busPartnerNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FC",
    marginRight: 9,
  },

  busPartnerNumberText: {
    color: "#345D92",
    fontSize: 10,
    fontWeight: "800",
  },

  busPartnerName: {
    flex: 1,
    color: "#1B2B3F",
    fontSize: 12,
    fontWeight: "800",
  },

  citiesHeader: {
    marginTop: 30,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  citiesHeaderText: {
    flex: 1,
  },

  sectionEyebrow: {
    color: "#56708F",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 1.15,
    marginBottom: 5,
  },

  sectionTitle: {
    color: "#182638",
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  sectionDescription: {
    color: "#748195",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 680,
  },

  /* Booking Information */
  bookingInfoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#14253B",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  bookingInfoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  bookingInfoIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#EEF4FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  bookingInfoIconText: {
    fontSize: 21,
  },

  bookingInfoTextContainer: {
    flex: 1,
  },

  bookingInfoTitle: {
    color: "#1C2C40",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  bookingInfoDescription: {
    color: "#738095",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 720,
  },

  contactContainer: {
    minHeight: 62,
    marginTop: 14,
    borderRadius: 15,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E6EBF2",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF1FC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  contactIconText: {
    fontSize: 17,
    color: "#345D92",
  },

  contactTextContainer: {
    flex: 1,
  },

  contactLabel: {
    color: "#8792A2",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  contactNumber: {
    color: "#17283D",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },

  callButton: {
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: "#173B6D",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginLeft: 10,
  },

  callButtonPressed: {
    opacity: 0.85,
  },

  callButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  /* City Header */
  cityCountBadge: {
    minWidth: 58,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9F0",
    paddingVertical: 8,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  cityCount: {
    color: "#173B6D",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
  },

  cityCountLabel: {
    color: "#7C8898",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
    marginTop: 1,
  },

  /* City Grid */
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },

  cityCard: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
    minHeight: 84,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAF1",
    paddingVertical: 11,
    paddingLeft: 11,
    paddingRight: 9,
    shadowColor: "#17283D",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },

  cityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  cityIconText: {
    color: "#345D92",
    fontSize: 19,
  },

  cityTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  cityName: {
    color: "#1B2B3F",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  cityState: {
    color: "#7B8798",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },

  cityNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F6F8FB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },

  cityNumberText: {
    color: "#8995A5",
    fontSize: 8,
    fontWeight: "800",
  },

  /* Footer */
  footer: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#EEF4FA",
    borderWidth: 1,
    borderColor: "#DFE7F0",
    alignItems: "center",
    paddingVertical: 19,
    paddingHorizontal: 20,
  },

  footerBrand: {
    color: "#173B6D",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },

  footerText: {
    color: "#708096",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    textAlign: "center",
  },

  footerPhone: {
    color: "#3E5978",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 7,
  },
});