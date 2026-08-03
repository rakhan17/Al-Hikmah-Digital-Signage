export interface AppSettings {
  id: number;
  mosque_name: string;
  address: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  iqomah_subuh: number;
  iqomah_dzuhur: number;
  iqomah_ashar: number;
  iqomah_maghrib: number;
  iqomah_isya: number;
  standby_subuh?: number;
  standby_dzuhur?: number;
  standby_ashar?: number;
  standby_maghrib?: number;
  standby_isya?: number;
  subuh_override: string | null;
  syuruq_override: string | null;
  dzuhur_override: string | null;
  ashar_override: string | null;
  maghrib_override: string | null;
  isya_override: string | null;
  adhan_duration: number;
  standby_duration: number;
  jumat_adhan1_time?: string | null;
  jumat_adhan1_duration?: number;
  jumat_jeda_duration?: number;
  jumat_adhan2_duration?: number;
  jumat_khutbah_duration?: number;
  use_custom_datetime?: number;
  custom_date?: string;
  custom_time?: string;
  custom_set_timestamp?: number;
}

export interface RunningTextItem {
  id: number;
  text: string;
  is_active: number;
  created_at?: string;
}

export interface MosqueEvent {
  id: number;
  title: string;
  speaker?: string;
  event_date: string;
  event_time: string;
  description?: string;
  is_active: number;
  created_at?: string;
}

export interface FinanceRecord {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at?: string;
}

export interface FinanceItemBreakdown {
  category: string;
  description: string;
  totalAmount: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthlyIncome?: number;
  monthlyExpense?: number;
  monthlyIncomes?: FinanceItemBreakdown[];
  monthlyExpenses?: FinanceItemBreakdown[];
}

export interface PrayerItem {
  name: string;
  key: 'subuh' | 'syuruq' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya';
  time: string;
  iqomahMin: number;
  standbyMin?: number;
  isNext?: boolean;
}

export interface NextPrayerInfo {
  name: string;
  key: string;
  time: string;
  timeRemainingSec: number;
}

export type DisplayPhase =
  | 'EVENT_CAROUSEL'
  | 'ADHAN_COUNTDOWN'
  | 'ADHAN_ALERT'
  | 'IQOMAH_COUNTDOWN'
  | 'PRAYER_STANDBY'
  | 'JUMAT_ADHAN1'
  | 'JUMAT_JEDA_COUNTDOWN'
  | 'JUMAT_ADHAN2'
  | 'JUMAT_KHUTBAH_STANDBY';

export interface PrayerData {
  prayers: PrayerItem[];
  nextPrayer: NextPrayerInfo | null;
  gregorianDate: string;
  hijriDate: string;
  currentPhase: DisplayPhase;
  activePrayerContext: PrayerItem | null;
  timeRemainingSec: number;
  simulatedNow?: string;
}

export interface PublicSignageBundle {
  settings: AppSettings;
  prayerData: PrayerData;
  events: MosqueEvent[];
  runningTexts: RunningTextItem[];
  finances: FinanceSummary;
}
