import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton, AppCard, AppText } from '../../design-system';
import { useAppTheme } from '../../design-system/theme';
import { useTranslation } from '../../core/localization';
import { useBookingStore } from '../../stores/bookingStore';
export default function ReviewBookingScreen(){
 const router=useRouter();const {colors}=useAppTheme();const {t}=useTranslation();const b=useBookingStore();const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const remaining=Math.max(0,Math.floor((new Date(b.activeHold?.expiresAt||0).getTime()-now)/1000));
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}} edges={['bottom']}><ScrollView contentContainerStyle={{padding:20,gap:20}}>
  <AppText variant="heading2">{b.fromCity.name} → {b.toCity.name}</AppText><AppText style={{color:remaining?colors.textSecondary:colors.danger}}>{remaining?t('flow.seat_timer',{time:`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}):t('flow.expired')}</AppText>
  <AppCard padding="base"><View style={{gap:12}}><AppText variant="heading3">{b.selectedBus?.CompanyName}</AppText><AppText>{b.selectedBus?.BusTypeName||b.selectedBus?.BusType}</AppText><AppText>{b.journeyDate}</AppText><AppText>{t('pax.pickup')}: {b.selectedBoardingPoint?.name} · {b.selectedBoardingPoint?.time}</AppText><AppText>{t('pax.drop')}: {b.selectedDroppingPoint?.name} · {b.selectedDroppingPoint?.time}</AppText></View></AppCard>
  <AppCard padding="base"><View style={{gap:16}}><AppText variant="heading3">{t('pax.passenger_details')}</AppText>{b.passengers.map((p)=><View key={p.seatNo} style={{gap:4}}><AppText variant="bodyMedium">{p.name} · {t('pax.seat_assignment',{seat:p.seatNo})}</AppText><AppText style={{color:colors.textSecondary}}>{t(`pax.gender_${p.gender}`)}, {t('pax.years',{age:p.age})}</AppText></View>)}</View></AppCard>
  <AppCard padding="base"><View style={{gap:8}}><AppText variant="heading3">{t('passenger.contact_title')}</AppText><AppText>{b.contactPhone}</AppText><AppText>{b.contactEmail}</AppText>{b.contactState&&<AppText>{t(`state.${b.contactState}`)}</AppText>}</View></AppCard>
  {b.gstin&&<AppCard padding="base"><View style={{gap:8}}><AppText>{b.gstin}</AppText><AppText>{b.gstCompany}</AppText><AppText>{b.gstAddress}</AppText><AppText>{b.gstEmail}</AppText></View></AppCard>}
 </ScrollView><View style={{padding:16,backgroundColor:colors.surface,gap:12}}><AppText variant="heading3">{t('pax.amount')}: ₹{Number(b.activeHold?.totalFare??0).toFixed(2)}</AppText><AppButton title={t('flow.payment_title')} disabled={!remaining||!b.passengers.length} onPress={()=>router.push('/booking/payment')}/></View></SafeAreaView>;
}
