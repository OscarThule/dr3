'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/app/redux/store';
import {
  fetchMedicalCenters,
  loadPatientInfo,
  setSearchTerm,
  setActiveFilter,
  logout,
  selectMedicalCenters,
  selectFilteredCenters,
  selectLoading,
  selectError,
  selectSearchTerm,
  selectActiveFilter,
  selectPatientInfo,
  selectStats,
  getInitials,
  formatAddress,
  getSpecialties,
  type FilterType,
  type MedicalCenter,
} from '@/app/reduxPatient/slices/patient/entrySlice';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

type SortByOption =
  | 'name'
  | 'rating'
  | 'patients'
  | 'practitioners'
  | 'price-low'
  | 'price-high'
  | 'distance';

type LatLng = {
  lat: number;
  lng: number;
};

type CenterWithComputed = MedicalCenter & {
  computedDistanceKm: number | null;
  computedCoords: LatLng | null;
  computedFullAddress: string;
};

interface PaymentSettings {
  consultationFee?: number;
  onlineConsultationFee?: number;
  bookingDeposit?: number;
  depositPercentage?: number;
  remainingAmount?: number;
  enablePayments?: boolean;
  paymentMethods?: string[];
  currency?: string;
}

const libraries: ('places')[] = ['places'];

const mapContainerStyle = { width: '100%', height: '300px' };
const smallMapStyle = { width: '100%', height: '200px' };
const fallbackCenter: LatLng = { lat: -25.746111, lng: 28.188056 };

const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <TSelected,>(selector: (state: RootState) => TSelected): TSelected =>
  useSelector<RootState, TSelected>(selector);

const getConsultationFee = (center: MedicalCenter): number => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  if (paymentSettings?.consultationFee !== undefined) {
    return paymentSettings.consultationFee;
  }
  return center?.settings?.consultationCosts?.private?.faceToFace || 0;
};

const getOnlineConsultationFee = (center: MedicalCenter): number => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  if (paymentSettings?.onlineConsultationFee !== undefined) {
    return paymentSettings.onlineConsultationFee;
  }
  return center?.settings?.consultationCosts?.private?.online || 0;
};

const getGovernmentFaceToFaceFee = (center: MedicalCenter): number => {
  return center?.settings?.consultationCosts?.government?.faceToFace || 0;
};

const getGovernmentOnlineFee = (center: MedicalCenter): number => {
  return center?.settings?.consultationCosts?.government?.online || 0;
};

const getDepositAmount = (center: MedicalCenter): number => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  if (paymentSettings?.bookingDeposit !== undefined) {
    return paymentSettings.bookingDeposit;
  }
  const consultationFee = getConsultationFee(center);
  const depositPercentage = paymentSettings?.depositPercentage || 0;
  return depositPercentage > 0 ? (consultationFee * depositPercentage) / 100 : 0;
};

const getRemainingAmount = (center: MedicalCenter): number => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  if (paymentSettings?.remainingAmount !== undefined) {
    return paymentSettings.remainingAmount;
  }
  const consultationFee = getConsultationFee(center);
  const depositAmount = getDepositAmount(center);
  return Math.max(0, consultationFee - depositAmount);
};

const arePaymentsEnabled = (center: MedicalCenter): boolean => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  return paymentSettings?.enablePayments || false;
};

const getPaymentMethods = (center: MedicalCenter): string[] => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  return paymentSettings?.paymentMethods || ['cash'];
};

const getCurrency = (center: MedicalCenter): string => {
  const paymentSettings = center?.paymentSettings as PaymentSettings | undefined;
  return paymentSettings?.currency || 'ZAR';
};

const formatCurrency = (amount: number, center: MedicalCenter): string => {
  const currency = getCurrency(center);
  const currencySymbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const symbol = currencySymbols[currency] || currency;
  return `${symbol} ${amount.toFixed(2)}`;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const calculateDistanceKm = (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const formatDistanceKm = (distanceKm: number | null): string => {
  if (distanceKm == null) return 'Distance unavailable';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

const getCenterCoords = (center: MedicalCenter): LatLng | null => {
  const anyCenter = center as unknown as {
    address?: {
      lat?: number | null;
      lng?: number | null;
      coordinates?: { lat?: number | null; lng?: number | null };
      location?: { lat?: number | null; lng?: number | null };
    };
    location?: {
      lat?: number | null;
      lng?: number | null;
      coordinates?: [number, number] | number[];
    };
  };

  const addressLat =
    anyCenter.address?.lat ??
    anyCenter.address?.coordinates?.lat ??
    anyCenter.address?.location?.lat ??
    null;

  const addressLng =
    anyCenter.address?.lng ??
    anyCenter.address?.coordinates?.lng ??
    anyCenter.address?.location?.lng ??
    null;

  const locationLat =
    anyCenter.location?.lat ??
    (Array.isArray(anyCenter.location?.coordinates) &&
    typeof anyCenter.location?.coordinates?.[1] === 'number'
      ? anyCenter.location.coordinates[1]
      : null);

  const locationLng =
    anyCenter.location?.lng ??
    (Array.isArray(anyCenter.location?.coordinates) &&
    typeof anyCenter.location?.coordinates?.[0] === 'number'
      ? anyCenter.location.coordinates[0]
      : null);

  const lat = addressLat ?? locationLat;
  const lng = addressLng ?? locationLng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return { lat, lng };
};

const getCenterFullAddress = (center: MedicalCenter): string => {
  const anyCenter = center as unknown as {
    address?: {
      formatted_address?: string;
      full_address?: string;
      line1?: string;
      line2?: string;
      city?: string;
      province?: string;
      postal?: string;
    };
  };

  const formattedAddress =
    anyCenter.address?.formatted_address || anyCenter.address?.full_address;

  if (formattedAddress) {
    return formattedAddress;
  }

  const parts = [
    anyCenter.address?.line1,
    anyCenter.address?.line2,
    anyCenter.address?.city,
    anyCenter.address?.province,
    anyCenter.address?.postal,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return formatAddress(center);
};

// Small map component for each center card
const CenterSmallMap = ({
  patientLocation,
  centerCoords,
  isLoaded,
}: {
  patientLocation: LatLng | null;
  centerCoords: LatLng | null;
  isLoaded: boolean;
}) => {
  if (!centerCoords) return null;

  const mapCenter = patientLocation
    ? {
        lat: (patientLocation.lat + centerCoords.lat) / 2,
        lng: (patientLocation.lng + centerCoords.lng) / 2,
      }
    : centerCoords;

  const zoom = patientLocation ? 12 : 14;

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={smallMapStyle}
        center={mapCenter}
        zoom={zoom}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {centerCoords && <Marker position={centerCoords} />}
        {patientLocation && <Marker position={patientLocation} />}
        {patientLocation && centerCoords && (
          <Polyline
            path={[patientLocation, centerCoords]}
            options={{
              strokeColor: '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default function EntryPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const medicalCenters = useAppSelector(selectMedicalCenters);
  const filteredCenters = useAppSelector(selectFilteredCenters);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const searchTerm = useAppSelector(selectSearchTerm);
  const activeFilter = useAppSelector(selectActiveFilter);
  const patientInfo = useAppSelector(selectPatientInfo);
  const stats = useAppSelector(selectStats);

  const [patientAddressInput, setPatientAddressInput] = useState<string>('');
  const [patientAddress, setPatientAddress] = useState<string>('');
  const [patientLocation, setPatientLocation] = useState<LatLng | null>(null);
  const [patientLocationMessage, setPatientLocationMessage] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortByOption>('name');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const {
    init,
    value: addressAutocompleteValue,
    setValue: setAddressAutocompleteValue,
    suggestions: { status: addressSuggestionStatus, data: addressSuggestionData },
    clearSuggestions,
  } = usePlacesAutocomplete({
    initOnMount: false,
    debounce: 300,
    requestOptions: {
      componentRestrictions: { country: 'za' },
    },
  });

  useEffect(() => {
    dispatch(loadPatientInfo());
    dispatch(fetchMedicalCenters());
  }, [dispatch]);

  useEffect(() => {
    if (isLoaded) {
      init();
    }
  }, [isLoaded, init]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/createprofile');
    router.refresh();
  };

  const handleBookAppointment = (centerId: string) => {
    localStorage.setItem('medicalCenterId', centerId);
    router.push(`/booking?medicalCenterId=${centerId}`);
  };

  const handleViewSchedule = (centerId: string) => {
    localStorage.setItem('medicalCenterId', centerId);
    router.push(`/booking?medicalCenterId=${centerId}&view=schedule`);
  };

  const handlePatientSuggestionSelect = async (placeId: string): Promise<void> => {
    const selected = addressSuggestionData.find((item) => item.place_id === placeId);
    if (!selected) return;

    try {
      const results = await getGeocode({ placeId: selected.place_id });
      const { lat, lng } = await getLatLng(results[0]);
      const formattedAddress = results[0].formatted_address;

      setPatientLocation({ lat, lng });
      setPatientAddress(formattedAddress);
      setPatientAddressInput(formattedAddress);
      setAddressAutocompleteValue(formattedAddress, false);
      clearSuggestions();
      setPatientLocationMessage('Patient location set successfully.');
    } catch (searchError) {
      console.error('Failed to select patient address:', searchError);
      setPatientLocationMessage('Could not set patient location from suggestion.');
    }
  };

  const handlePatientAddressSearch = async (): Promise<void> => {
    const trimmedValue = patientAddressInput.trim();
    if (!trimmedValue) {
      setPatientLocationMessage('Please enter your address first.');
      return;
    }

    try {
      const results = await getGeocode({
        address: trimmedValue,
        componentRestrictions: { country: 'ZA' },
      });

      if (!results.length) {
        setPatientLocationMessage('Address not found. Please enter a more complete address.');
        return;
      }

      const { lat, lng } = await getLatLng(results[0]);
      const formattedAddress = results[0].formatted_address;

      setPatientLocation({ lat, lng });
      setPatientAddress(formattedAddress);
      setPatientAddressInput(formattedAddress);
      setAddressAutocompleteValue(formattedAddress, false);
      clearSuggestions();
      setPatientLocationMessage('Patient location set successfully.');
    } catch (searchError) {
      console.error('Failed to search patient address:', searchError);
      setPatientLocationMessage('Could not verify that address.');
    }
  };

  const filterButtons = [
    { id: 'all' as FilterType, label: 'All Centers', count: stats.totalCenters },
    { id: 'hospital' as FilterType, label: 'Hospitals', count: stats.hospitals },
    { id: 'clinic' as FilterType, label: 'Clinics', count: stats.clinics },
    { id: 'verified' as FilterType, label: 'Verified', count: stats.verifiedCenters },
    { id: 'active' as FilterType, label: 'Active', count: stats.activeCenters },
    {
      id: 'affordable' as FilterType,
      label: 'Under R500',
      count: medicalCenters.filter((center) => getConsultationFee(center) < 500).length,
    },
    {
      id: 'premium' as FilterType,
      label: 'Premium',
      count: medicalCenters.filter((center) => getConsultationFee(center) > 800).length,
    },
  ];

  const centersWithDistance = useMemo<CenterWithComputed[]>(() => {
    return filteredCenters.map((center) => {
      const coords = getCenterCoords(center);
      const fullAddress = getCenterFullAddress(center);

      const computedDistanceKm =
        patientLocation && coords
          ? calculateDistanceKm(
              patientLocation.lat,
              patientLocation.lng,
              coords.lat,
              coords.lng
            )
          : null;

      return {
        ...center,
        computedDistanceKm,
        computedCoords: coords,
        computedFullAddress: fullAddress,
      };
    });
  }, [filteredCenters, patientLocation]);

  const displayedCenters = useMemo<CenterWithComputed[]>(() => {
    const list = [...centersWithDistance];

    switch (sortOption) {
      case 'price-low':
        list.sort((a, b) => getConsultationFee(a) - getConsultationFee(b));
        break;
      case 'price-high':
        list.sort((a, b) => getConsultationFee(b) - getConsultationFee(a));
        break;
      case 'distance':
        list.sort((a, b) => {
          if (a.computedDistanceKm == null && b.computedDistanceKm == null) return 0;
          if (a.computedDistanceKm == null) return 1;
          if (b.computedDistanceKm == null) return -1;
          return a.computedDistanceKm - b.computedDistanceKm;
        });
        break;
      case 'name':
        list.sort((a, b) => (a.facility_name || '').localeCompare(b.facility_name || ''));
        break;
      case 'rating':
        list.sort((a, b) => (b.statistics?.average_rating || 0) - (a.statistics?.average_rating || 0));
        break;
      case 'patients':
        list.sort((a, b) => (b.statistics?.total_patients || 0) - (a.statistics?.total_patients || 0));
        break;
      case 'practitioners':
        list.sort((a, b) => (b.practitioners?.length || 0) - (a.practitioners?.length || 0));
        break;
      default:
        break;
    }

    return list;
  }, [centersWithDistance, sortOption]);

  const nearestCenters = useMemo(() => {
    const withDistance = centersWithDistance
      .filter((center) => center.computedDistanceKm != null)
      .sort((a, b) => (a.computedDistanceKm ?? Number.MAX_VALUE) - (b.computedDistanceKm ?? Number.MAX_VALUE));
    return withDistance.slice(0, 5);
  }, [centersWithDistance]);

  // All centers map – shows all centers on one map
  const allCentersMapMarkers = useMemo(() => {
    return centersWithDistance
      .filter((c) => c.computedCoords)
      .map((center) => ({ id: center._id, coords: center.computedCoords! }));
  }, [centersWithDistance]);

  if (loading && medicalCenters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Medical Centers</h3>
          <p className="text-gray-500">Fetching healthcare facilities and pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Healthcare Connect</h1>
                <p className="text-xs text-gray-500">Find & book medical appointments</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => router.push('/appointments')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                My Appointments
              </button>

              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Patient:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {patientInfo
                      ? `${patientInfo.firstName} ${patientInfo.lastName}`
                      : 'Loading...'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm hover:from-red-600 hover:to-pink-700 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="space-y-5 sm:space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-purple-700 rounded-xl sm:rounded-2xl p-5 sm:p-6 text-white shadow-lg">
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                Find Your Healthcare Provider
              </h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                Compare prices, specialties, book instantly, and see the nearest center from your address.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/30 rounded-lg flex-shrink-0">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">{stats.totalCenters}</div>
                      <div className="text-blue-100 text-xs sm:text-sm">Medical Centers</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/30 rounded-lg flex-shrink-0">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">
                        {stats.totalPractitioners}
                      </div>
                      <div className="text-blue-100 text-xs sm:text-sm">Doctors</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/30 rounded-lg flex-shrink-0">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">
                        R{' '}
                        {medicalCenters.length > 0
                          ? Math.min(...medicalCenters.map((center) => getConsultationFee(center))).toFixed(0)
                          : '0'}
                      </div>
                      <div className="text-blue-100 text-xs sm:text-sm">Starting From</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/30 rounded-lg flex-shrink-0">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow">
                      <div className="text-xl sm:text-2xl font-bold mb-1">
                        {nearestCenters[0]?.computedDistanceKm != null
                          ? formatDistanceKm(nearestCenters[0].computedDistanceKm)
                          : '—'}
                      </div>
                      <div className="text-blue-100 text-xs sm:text-sm">Nearest Center</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
            <div className="relative mb-5 sm:mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 1114 0 7 7 0 01-14 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, location, specialty, or price..."
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white text-gray-900 caret-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 transition-all duration-300 placeholder-gray-500"
                value={searchTerm}
                onChange={(event) => dispatch(setSearchTerm(event.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                  {displayedCenters.length} centers
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Enter Your Address
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Your address is used to calculate real distance to each center and show the nearest one.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={patientAddressInput}
                  onChange={(event) => {
                    setPatientAddressInput(event.target.value);
                    setAddressAutocompleteValue(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handlePatientAddressSearch();
                    }
                  }}
                  placeholder="Enter your address e.g. 123 Mandela Street, Polokwane"
                  className="w-full pl-4 pr-14 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl bg-white text-gray-900 caret-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-300 placeholder-gray-500"
                  disabled={!isLoaded}
                />

                <button
                  type="button"
                  onClick={handlePatientAddressSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-lg p-2.5 hover:bg-blue-700 transition-colors shadow-sm"
                  title="Search patient address"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>

              {addressSuggestionStatus === 'OK' && addressSuggestionData.length > 0 && (
                <ul className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                  {addressSuggestionData.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      onClick={() => handlePatientSuggestionSelect(suggestion.place_id)}
                      className="px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      {suggestion.description}
                    </li>
                  ))}
                </ul>
              )}

              {patientAddress && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-800">
                  <span className="font-semibold text-blue-800">Selected patient address:</span>{' '}
                  {patientAddress}
                </div>
              )}

              {patientLocationMessage && (
                <div className="mt-2 text-sm text-gray-600">{patientLocationMessage}</div>
              )}

              {loadError && (
                <div className="mt-2 text-sm text-red-600">
                  Google Maps failed to load. Please check your API setup.
                </div>
              )}
            </div>

            <div className="mb-5 sm:mb-6">
              <div className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3 flex items-center gap-2">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                FILTER BY
              </div>
              <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {filterButtons.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => dispatch(setActiveFilter(filter.id))}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${
                      activeFilter === filter.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {filter.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeFilter === filter.id ? 'bg-white/30' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                  SORT BY
                </div>
                <div className="relative">
                  <select
                    className="appearance-none w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl sm:rounded-lg bg-white text-sm sm:text-base text-gray-900 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer pr-10"
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value as SortByOption)}
                  >
                    <option value="name">Name (A to Z)</option>
                    <option value="rating">Highest Rating</option>
                    <option value="patients">Most Patients</option>
                    <option value="practitioners">Most Doctors</option>
                    <option value="price-low">Price (Low to High)</option>
                    <option value="price-high">Price (High to Low)</option>
                    <option value="distance">Nearest First</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7l-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={() => dispatch(fetchMedicalCenters())}
                  disabled={loading}
                  className="group relative px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl sm:rounded-lg text-sm sm:text-base shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Refresh</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Nearest Medical Centers Section */}
          {nearestCenters.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Nearest Medical Centers</h2>
                <span className="text-xs text-gray-500">Based on your current address</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearestCenters.map((center) => (
                  <div
                    key={center._id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-800 truncate">{center.facility_name}</h3>
                    <p className="text-sm text-gray-600 mt-1 truncate">{center.computedFullAddress}</p>
                    <div className="mt-2 text-sm font-medium text-blue-600">
                      {formatDistanceKm(center.computedDistanceKm)}
                    </div>
                    <button
                      onClick={() => handleBookAppointment(center._id)}
                      className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two Maps: Patient Map and All Centers Map */}
          {isLoaded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Patient Map */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Patient Location</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={patientLocation || fallbackCenter}
                    zoom={patientLocation ? 14 : 6}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                    }}
                  >
                    {patientLocation && <Marker position={patientLocation} />}
                  </GoogleMap>
                </div>
                <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                  <div className="font-semibold text-gray-800 mb-1">Your address</div>
                  <div>{patientAddress || 'Enter your address to show your map.'}</div>
                </div>
              </div>

              {/* All Centers Map */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">All Medical Centers</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={fallbackCenter}
                    zoom={5}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                    }}
                  >
                    {allCentersMapMarkers.map((marker) => (
                      <Marker
                        key={marker.id}
                        position={marker.coords}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(32, 32),
                        }}
                      />
                    ))}
                    {patientLocation && <Marker position={patientLocation} />}
                  </GoogleMap>
                </div>
                <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl p-3 text-center">
                  Showing {allCentersMapMarkers.length} registered centers
                </div>
              </div>
            </div>
          )}

          {/* Center Cards */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 mt-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
              {displayedCenters.length} Medical Center{displayedCenters.length !== 1 ? 's' : ''} Found
            </h2>
            <div className="text-xs sm:text-sm text-gray-500">
              Showing {displayedCenters.length} of {medicalCenters.length} centers
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 sm:p-6 md:p-8 text-center mb-5 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-2">Error Loading Centers</h3>
              <p className="text-red-600 text-sm sm:text-base mb-4">{error}</p>
              <button
                onClick={() => dispatch(fetchMedicalCenters())}
                className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && displayedCenters.length > 0 && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {displayedCenters.map((center) => {
                const consultationFee = getConsultationFee(center);
                const onlineFee = getOnlineConsultationFee(center);
                const depositAmount = getDepositAmount(center);
                const remainingAmount = getRemainingAmount(center);
                const governmentFaceToFace = getGovernmentFaceToFaceFee(center);
                const governmentOnline = getGovernmentOnlineFee(center);
                const paymentsEnabled = arePaymentsEnabled(center);
                const paymentMethods = getPaymentMethods(center);
                const isNearest = nearestCenters.some((nc) => nc._id === center._id);

                return (
                  <div
                    key={center._id}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div
                      className="h-2 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${center.theme_colors?.primary || '#3B82F6'}, ${
                          center.theme_colors?.secondary || '#10B981'
                        })`,
                      }}
                    ></div>

                    <div className="p-4 sm:p-5 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3 sm:gap-0">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${center.theme_colors?.primary || '#3B82F6'}, ${
                                center.theme_colors?.secondary || '#10B981'
                              })`,
                            }}
                          >
                            {getInitials(center.facility_name)}
                          </div>

                          <div className="flex-grow">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 line-clamp-1">
                                  {center.facility_name || 'Unnamed Center'}
                                </h3>

                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                                  <span
                                    className={`px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                      center.facility_type === 'hospital'
                                        ? 'bg-red-100 text-red-800'
                                        : center.facility_type === 'clinic'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {(center.facility_type || 'unknown').toUpperCase()}
                                  </span>

                                  {center.is_verified && (
                                    <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      VERIFIED
                                    </span>
                                  )}

                                  {center.is_active && (
                                    <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      ACTIVE
                                    </span>
                                  )}

                                  {paymentsEnabled && (
                                    <span className="px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                      PAYMENTS
                                    </span>
                                  )}

                                  {isNearest && (
                                    <span className="px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                      NEAREST
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 sm:mt-0">
                                <div className="inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
                                  <span className="font-bold text-lg">
                                    {formatCurrency(consultationFee, center)}
                                  </span>
                                  <span className="text-xs ml-1 opacity-90">Consultation</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 space-y-2">
                              <div className="text-gray-700 text-xs sm:text-sm flex items-start">
                                <svg
                                  className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0 mt-0.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                <span className="line-clamp-2">{center.computedFullAddress}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-full font-medium">
                                  {formatDistanceKm(center.computedDistanceKm)}
                                </span>

                                {center.computedCoords && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps/search/?api=1&query=${center.computedCoords!.lat},${center.computedCoords!.lng}`,
                                        '_blank'
                                      )
                                    }
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
                                  >
                                    Open Full Location
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:block sm:text-right mt-3 sm:mt-0">
                          <div className="sm:hidden">
                            <span className="text-xs text-gray-500">
                              {formatDistanceKm(center.computedDistanceKm)}
                            </span>
                          </div>
                          
                          <div className="hidden sm:block text-xs sm:text-sm text-gray-500 mt-1">
                            {formatDistanceKm(center.computedDistanceKm)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-blue-700">
                            {center.practitioners?.length || 0}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">Doctors</div>
                        </div>

                        <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-green-700">
                            {(center.statistics?.total_patients || 0).toLocaleString()} 
                          </div>
                          <div className="text-xs text-green-600 font-medium">Patients</div>
                        </div>

                        <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-purple-700">
                            {formatCurrency(onlineFee, center)}
                          </div>
                          <div className="text-xs text-purple-600 font-medium">Online</div>
                        </div>

                        <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg sm:text-xl font-bold text-orange-700">
                            {depositAmount > 0 ? formatCurrency(depositAmount, center) : 'Full'}
                          </div>
                          <div className="text-xs text-orange-600 font-medium">Deposit</div>
                        </div>
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Pricing Details
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 border-b border-gray-200">
                              <h5 className="font-semibold text-sm text-blue-800">Private Consultation</h5>
                            </div>
                            <div className="p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Face-to-Face:</span>
                                <span className="font-bold text-gray-800">
                                  {formatCurrency(consultationFee, center)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Online:</span>
                                <span className="font-bold text-gray-800">
                                  {formatCurrency(onlineFee, center)}
                                </span>
                              </div>
                              {depositAmount > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Deposit:</span>
                                    <span className="font-semibold text-blue-600">
                                      {formatCurrency(depositAmount, center)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-gray-600">Remaining:</span>
                                    <span className="font-semibold text-gray-700">
                                      {formatCurrency(remainingAmount, center)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {(governmentFaceToFace > 0 || governmentOnline > 0) && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 border-b border-gray-200">
                                <h5 className="font-semibold text-sm text-green-800">Government/Insurance</h5>
                              </div>
                              <div className="p-3">
                                {governmentFaceToFace > 0 && (
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">Face-to-Face:</span>
                                    <span className="font-bold text-green-700">
                                      {formatCurrency(governmentFaceToFace, center)}
                                    </span>
                                  </div>
                                )}
                                {governmentOnline > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Online:</span>
                                    <span className="font-bold text-green-700">
                                      {formatCurrency(governmentOnline, center)}
                                    </span>
                                  </div>
                                )}
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500">* Covered by government medical aid</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {paymentsEnabled && paymentMethods.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-500 mb-2">Accepted Payment Methods:</div>
                            <div className="flex flex-wrap gap-2">
                              {paymentMethods.map((method: string, index: number) => {
                                const methodConfig = (
                                  {
                                    credit_card: {
                                      label: 'Credit Card',
                                      icon: '💳',
                                      color: 'bg-blue-100 text-blue-800',
                                    },
                                    debit_card: {
                                      label: 'Debit Card',
                                      icon: '💳',
                                      color: 'bg-indigo-100 text-indigo-800',
                                    },
                                    cash: {
                                      label: 'Cash',
                                      icon: '💰',
                                      color: 'bg-green-100 text-green-800',
                                    },
                                    insurance: {
                                      label: 'Insurance',
                                      icon: '🏥',
                                      color: 'bg-purple-100 text-purple-800',
                                    },
                                    eft: {
                                      label: 'EFT',
                                      icon: '🏦',
                                      color: 'bg-yellow-100 text-yellow-800',
                                    },
                                  } as const
                                )[method] || {
                                  label: method,
                                  icon: '💳',
                                  color: 'bg-gray-100 text-gray-800',
                                };

                                return (
                                  <span
                                    key={index}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${methodConfig.color}`}
                                  >
                                    <span>{methodConfig.icon}</span>
                                    {methodConfig.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {getSpecialties(center).length > 0 && (
                        <div className="mb-4 sm:mb-6">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            Available Specialties:
                          </h4>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {getSpecialties(center).map((specialty: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Small map inside card */}
                      {isLoaded && (
                        <CenterSmallMap
                          patientLocation={patientLocation}
                          centerCoords={center.computedCoords}
                          isLoaded={isLoaded}
                        />
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-gray-100 mt-4">
                        <div className="text-xs text-gray-500 w-full sm:w-auto truncate">
                          ID: {center._id?.slice(0, 8) || 'Unknown'}...
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleViewSchedule(center._id)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            View Schedule
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBookAppointment(center._id)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-sm hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && displayedCenters.length === 0 && medicalCenters.length > 0 && (
            <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-lg">
              <svg
                className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                No centers match your search
              </h3>
              <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
                Try adjusting your filters or search term
              </p>
              <button
                onClick={() => {
                  dispatch(setSearchTerm(''));
                  dispatch(setActiveFilter('all'));
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Clear Filters
              </button>
            </div>
          )}

          {!loading && !error && medicalCenters.length === 0 && (
            <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-lg">
              <svg
                className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Medical Centers Found</h3>
              <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
                There are no medical centers registered.
              </p>
              <button
                onClick={() => dispatch(fetchMedicalCenters())}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Refresh List
              </button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
}