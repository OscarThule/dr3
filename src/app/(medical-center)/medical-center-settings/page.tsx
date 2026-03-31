'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/redux/lib/hooks';
import {
  fetchMedicalCenterProfile,
  updateMedicalCenterProfile,
  fetchPaymentSettings,
  updatePaymentSettings,
  updateBankDetails,
  clearMedicalCenterError,
  clearMedicalCenterSuccess,
} from '@/app/redux/slices/medicalCenterSettingsSlice';

type FacilityType =
  | 'surgery'
  | 'clinic'
  | 'hospital'
  | 'community_health'
  | 'mobile_unit'
  | 'other';

type LocationSource =
  | 'address'
  | 'geolocation'
  | 'address_and_geolocation';

type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'insurance'
  | 'eft';

type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postal: string;
  full_address: string;
  formatted_address: string;
  place_id: string;
  lat: string | number;
  lng: string | number;
  location_source: LocationSource;
};

type SuggestionItem = {
  description: string;
  place_id: string;
};

declare global {
  interface Window {
    google: typeof google;
    __googleMapsScriptLoading?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const SA_CENTER = { lat: -26.2041, lng: 28.0473 };

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M21 21L16.65 16.65M10.5 18a7.5 7.5 0 1 1 0-15a7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationPinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

async function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.maps?.places) return;

  if (window.__googleMapsScriptLoading) {
    await window.__googleMapsScriptLoading;
    return;
  }

  window.__googleMapsScriptLoading = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-google-maps="true"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google Maps'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  await window.__googleMapsScriptLoading;
}

export default function MedicalCenterSettingsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    profile,
    paymentSettings,
    profileLoading,
    paymentLoading,
    bankLoading,
    error,
    success,
  } = useAppSelector((state) => state.medicalCenterSettings);

  const [profileForm, setProfileForm] = useState({
    facility_name: '',
    company_reg_number: '',
    healthcare_reg_number: '',
    facility_type: 'clinic' as FacilityType,
    official_domain_email: '',
    phone: '',
    description: '',
    website: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      province: '',
      postal: '',
      full_address: '',
      formatted_address: '',
      place_id: '',
      lat: '' as string | number,
      lng: '' as string | number,
      location_source: 'address' as LocationSource,
    },
  });

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    enablePayments: false,
    consultationFee: 0,
    onlineConsultationFee: 0,
    bookingDeposit: 0,
    depositPercentage: 0,
    allowPartialPayments: false,
    paymentMethods: [] as PaymentMethod[],
    currency: 'ZAR',
  });

  const [googleReady, setGoogleReady] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<SuggestionItem[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressError, setAddressError] = useState('');
const [isSaving, setIsSaving] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const isPageLoading = profileLoading || paymentLoading;

  const inputClassName =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

  const sectionClassName =
    'rounded-3xl border border-slate-200 bg-white shadow-sm';

  const labelClassName =
    'mb-2 block text-sm font-semibold text-slate-700';

  const checkboxCardClass =
    'flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50';

  const depositAmountPreview = useMemo(() => {
    return Math.round(
      (Number(paymentForm.consultationFee) * Number(paymentForm.depositPercentage)) / 100
    );
  }, [paymentForm.consultationFee, paymentForm.depositPercentage]);

  const onlineDepositAmountPreview = useMemo(() => {
    return Math.round(
      (Number(paymentForm.onlineConsultationFee) * Number(paymentForm.depositPercentage)) / 100
    );
  }, [paymentForm.onlineConsultationFee, paymentForm.depositPercentage]);

  const remainingFaceToFace = useMemo(() => {
    return Math.max(Number(paymentForm.consultationFee) - depositAmountPreview, 0);
  }, [paymentForm.consultationFee, depositAmountPreview]);

  const remainingOnline = useMemo(() => {
    return Math.max(Number(paymentForm.onlineConsultationFee) - onlineDepositAmountPreview, 0);
  }, [paymentForm.onlineConsultationFee, onlineDepositAmountPreview]);

  const mapLat =
    profileForm.address.lat !== '' && profileForm.address.lat !== null
      ? Number(profileForm.address.lat)
      : SA_CENTER.lat;

  const mapLng =
    profileForm.address.lng !== '' && profileForm.address.lng !== null
      ? Number(profileForm.address.lng)
      : SA_CENTER.lng;

  useEffect(() => {
    dispatch(fetchMedicalCenterProfile());
    dispatch(fetchPaymentSettings());

    return () => {
      dispatch(clearMedicalCenterError());
      dispatch(clearMedicalCenterSuccess());
    };
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const bootGoogle = async () => {
      if (!GOOGLE_MAPS_API_KEY) {
        setAddressError('Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
        return;
      }

      try {
        await loadGoogleMaps();

        if (!mounted || !window.google?.maps?.places) return;

        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        geocoderRef.current = new window.google.maps.Geocoder();

        if (mapContainerRef.current && !mapRef.current) {
          mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
            center: SA_CENTER,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
          markerRef.current = new window.google.maps.Marker({
            map: mapRef.current,
            position: SA_CENTER,
          });
        }

        setGoogleReady(true);
        setAddressError('');
      } catch {
        if (mounted) {
          setAddressError('Failed to load Google Maps. Check API key, billing, Places API, and Maps JavaScript API.');
        }
      }
    };

    bootGoogle();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;

    const nextAddress: AddressForm = {
      line1: profile.address?.line1 || '',
      line2: profile.address?.line2 || '',
      city: profile.address?.city || '',
      province: profile.address?.province || '',
      postal: profile.address?.postal || '',
      full_address: profile.address?.full_address || '',
      formatted_address: profile.address?.formatted_address || '',
      place_id: profile.address?.place_id || '',
      lat: profile.address?.lat ?? '',
      lng: profile.address?.lng ?? '',
      location_source:
        (profile.address?.location_source as LocationSource) || 'address',
    };

    setProfileForm({
      facility_name: profile.facility_name || '',
      company_reg_number: profile.company_reg_number || '',
      healthcare_reg_number: profile.healthcare_reg_number || '',
      facility_type: (profile.facility_type || 'clinic') as FacilityType,
      official_domain_email: profile.official_domain_email || '',
      phone: profile.phone || '',
      description: profile.description || '',
      website: profile.website || '',
      address: nextAddress,
    });

    setAddressQuery(
      nextAddress.formatted_address ||
        nextAddress.full_address ||
        [
          nextAddress.line1,
          nextAddress.line2,
          nextAddress.city,
          nextAddress.province,
          nextAddress.postal,
        ]
          .filter(Boolean)
          .join(', ')
    );

    setBankForm({
      bank_name: profile.paystack?.bank_details?.bank_name || '',
      bank_code: profile.paystack?.bank_details?.bank_code || '',
      account_number: profile.paystack?.bank_details?.account_number || '',
      account_name: profile.paystack?.bank_details?.account_name || '',
    });
  }, [profile]);

  useEffect(() => {
    if (!paymentSettings) return;

    setPaymentForm({
      enablePayments: !!paymentSettings.enablePayments,
      consultationFee: Number(paymentSettings.consultationFee || 0),
      onlineConsultationFee: Number(paymentSettings.onlineConsultationFee || 0),
      bookingDeposit: Number(paymentSettings.bookingDeposit || 0),
      depositPercentage: Number(paymentSettings.depositPercentage || 0),
      allowPartialPayments: !!paymentSettings.allowPartialPayments,
      paymentMethods: Array.isArray(paymentSettings.paymentMethods)
        ? paymentSettings.paymentMethods
        : [],
      currency: paymentSettings.currency || 'ZAR',
    });
  }, [paymentSettings]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !googleReady) return;

    const position = { lat: mapLat, lng: mapLng };
    markerRef.current.setPosition(position);
    mapRef.current.setCenter(position);
    mapRef.current.setZoom(
      profileForm.address.lat !== '' && profileForm.address.lng !== '' ? 15 : 6
    );
  }, [googleReady, mapLat, mapLng, profileForm.address.lat, profileForm.address.lng]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileChange = (
    field: keyof Omit<typeof profileForm, 'address'>,
    value: string
  ) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (field: keyof AddressForm, value: string | number) => {
    setProfileForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleBankChange = (field: keyof typeof bankForm, value: string) => {
    setBankForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    setPaymentForm((prev) => {
      const exists = prev.paymentMethods.includes(method);

      return {
        ...prev,
        paymentMethods: exists
          ? prev.paymentMethods.filter((item) => item !== method)
          : [...prev.paymentMethods, method],
      };
    });
  };

  const fillAddressFromPlace = (
    place: google.maps.places.PlaceResult,
    fallbackDescription?: string
  ) => {
    const components = place.address_components || [];

    const getPart = (...types: string[]) =>
      components.find((component) =>
        types.some((type) => component.types.includes(type))
      )?.long_name || '';

    const streetNumber = getPart('street_number');
    const route = getPart('route');
    const sublocality =
      getPart('sublocality_level_1', 'sublocality', 'neighborhood');
    const city =
      getPart('locality', 'postal_town', 'administrative_area_level_2') || '';
    const province = getPart('administrative_area_level_1');
    const postal = getPart('postal_code');
    const line1 = [streetNumber, route].filter(Boolean).join(' ').trim();
    const line2 = sublocality || '';

    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();
    const formattedAddress = place.formatted_address || fallbackDescription || '';

    setProfileForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        line1,
        line2,
        city,
        province,
        postal,
        full_address: formattedAddress,
        formatted_address: formattedAddress,
        place_id: place.place_id || '',
        lat: typeof lat === 'number' ? lat : '',
        lng: typeof lng === 'number' ? lng : '',
        location_source: 'address',
      },
    }));

    setAddressQuery(formattedAddress);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressError('');
  };

  const fetchPredictions = (input: string) => {
    if (!googleReady || !autocompleteServiceRef.current) return;

    if (!input.trim()) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setAddressSearching(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'za' },
        types: ['geocode'],
      },
      (predictions, status) => {
        setAddressSearching(false);

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.length
        ) {
          setAddressSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        setAddressSuggestions(
          predictions.map((item) => ({
            description: item.description,
            place_id: item.place_id,
          }))
        );
        setShowSuggestions(true);
      }
    );
  };

  const handleAddressInput = (value: string) => {
    setAddressQuery(value);
    setShowSuggestions(true);

    setProfileForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        full_address: value,
        formatted_address: value,
        place_id: value ? prev.address.place_id : '',
        lat: value ? prev.address.lat : '',
        lng: value ? prev.address.lng : '',
      },
    }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 350);
  };

  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'name'],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place
        ) {
          setAddressError('Could not fetch selected address details.');
          return;
        }

        fillAddressFromPlace(place, suggestion.description);
      }
    );
  };

  const handleManualSearch = () => {
    if (!addressQuery.trim()) return;
    if (!geocoderRef.current) return;

    setAddressSearching(true);
    setShowSuggestions(false);

    geocoderRef.current.geocode(
      {
        address: addressQuery,
        componentRestrictions: { country: 'ZA' },
      },
      (results, status) => {
        setAddressSearching(false);

        if (
          status !== 'OK' ||
          !results ||
          !results[0]
        ) {
          setAddressError('Address not found. Try a more complete address.');
          return;
        }

        const top = results[0];
        fillAddressFromPlace(
          {
            address_components: top.address_components,
            formatted_address: top.formatted_address,
            geometry: top.geometry,
            place_id: top.place_id,
          } as google.maps.places.PlaceResult,
          top.formatted_address
        );
      }
    );
  };

 const handleSaveAll = async () => {
  if (isSaving) return;

  setIsSaving(true);
  dispatch(clearMedicalCenterError());
  dispatch(clearMedicalCenterSuccess());

  try {
    const profilePayload = {
      facility_name: profileForm.facility_name.trim(),
      company_reg_number: profileForm.company_reg_number.trim(),
      healthcare_reg_number: profileForm.healthcare_reg_number.trim(),
      facility_type: profileForm.facility_type,
      official_domain_email: profileForm.official_domain_email.trim(),
      phone: profileForm.phone.trim(),
      description: profileForm.description.trim(),
      website: profileForm.website.trim(),
      address: {
        line1: profileForm.address.line1.trim(),
        line2: profileForm.address.line2.trim(),
        city: profileForm.address.city.trim(),
        province: profileForm.address.province.trim(),
        postal: profileForm.address.postal.trim(),
        full_address: profileForm.address.full_address.trim(),
        formatted_address: profileForm.address.formatted_address.trim(),
        place_id: profileForm.address.place_id.trim(),
        lat:
          profileForm.address.lat === '' || profileForm.address.lat === null
            ? null
            : Number(profileForm.address.lat),
        lng:
          profileForm.address.lng === '' || profileForm.address.lng === null
            ? null
            : Number(profileForm.address.lng),
        location_source: profileForm.address.location_source,
      },
    };

    const paymentPayload = {
      enablePayments: paymentForm.enablePayments,
      consultationFee: Number(paymentForm.consultationFee) || 0,
      onlineConsultationFee: Number(paymentForm.onlineConsultationFee) || 0,
      bookingDeposit: Number(paymentForm.bookingDeposit) || 0,
      depositPercentage: Number(paymentForm.depositPercentage) || 0,
      allowPartialPayments: paymentForm.allowPartialPayments,
      paymentMethods: paymentForm.paymentMethods,
      currency: paymentForm.currency,
    };

    const bankPayload = {
      bank_name: bankForm.bank_name.trim(),
      bank_code: bankForm.bank_code.trim(),
      account_number: bankForm.account_number.trim(),
      account_name: bankForm.account_name.trim(),
    };

    await dispatch(updateMedicalCenterProfile(profilePayload)).unwrap();
    await dispatch(updatePaymentSettings(paymentPayload)).unwrap();

    const hasAllBankFields =
      bankPayload.bank_name &&
      bankPayload.bank_code &&
      bankPayload.account_number &&
      bankPayload.account_name;

    if (hasAllBankFields) {
      await dispatch(updateBankDetails(bankPayload)).unwrap();
    }
  } catch (err) {
    console.error('Save failed:', err);
  } finally {
    setIsSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Medical Center Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Medical Center Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Update your facility details, address, payout banking, and payment settings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/doctorLogin"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Doctor Schedule
            </Link>

            <Link
              href="/mainPage"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {(isPageLoading || isSaving || error || success || addressError) && (
          <div className="mb-6 space-y-3">
           {isPageLoading && (
  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
    Loading settings...
  </div>
)}

{isSaving && (
  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
    Saving settings...
  </div>
)}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {addressError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                {addressError}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Facility Information</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Basic information about your medical center.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClassName}>Facility Name</label>
                  <input
                    type="text"
                    value={profileForm.facility_name}
                    onChange={(e) => handleProfileChange('facility_name', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter facility name"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Company Registration Number</label>
                  <input
                    type="text"
                    value={profileForm.company_reg_number}
                    onChange={(e) => handleProfileChange('company_reg_number', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter company registration number"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Healthcare Registration Number</label>
                  <input
                    type="text"
                    value={profileForm.healthcare_reg_number}
                    onChange={(e) => handleProfileChange('healthcare_reg_number', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter healthcare registration number"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Facility Type</label>
                  <select
                    value={profileForm.facility_type}
                    onChange={(e) =>
                      handleProfileChange('facility_type', e.target.value as FacilityType)
                    }
                    className={inputClassName}
                  >
                    <option value="clinic">Clinic</option>
                    <option value="hospital">Hospital</option>
                    <option value="surgery">Surgery</option>
                    <option value="community_health">Community Health</option>
                    <option value="mobile_unit">Mobile Unit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClassName}>Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Official Email</label>
                  <input
                    type="email"
                    value={profileForm.official_domain_email}
                    onChange={(e) =>
                      handleProfileChange('official_domain_email', e.target.value)
                    }
                    className={inputClassName}
                    placeholder="Enter official email"
                  />
                </div>

                

                
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Address & Location</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Use one address input with live Google suggestions, search, and map preview.
                </p>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div ref={suggestionBoxRef} className="relative">
                  <label className={labelClassName}>Facility Address</label>

                  <div className="relative">
                    <LocationPinIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={addressQuery}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleManualSearch();
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-14 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="Start typing full address..."
                    />

                    <button
                      type="button"
                      onClick={handleManualSearch}
                      className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
                      aria-label="Search address"
                    >
                      <SearchIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {addressSuggestions.map((item) => (
                        <button
                          key={item.place_id}
                          type="button"
                          onClick={() => handleSuggestionSelect(item)}
                          className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                        >
                          <LocationPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span className="text-sm text-slate-700">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {addressSearching && (
                    <p className="mt-2 text-sm text-blue-600">Searching address...</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClassName}>Address Line 1</label>
                    <input
                      type="text"
                      value={profileForm.address.line1}
                      onChange={(e) => handleAddressChange('line1', e.target.value)}
                      className={inputClassName}
                      placeholder="Street and number"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Address Line 2</label>
                    <input
                      type="text"
                      value={profileForm.address.line2}
                      onChange={(e) => handleAddressChange('line2', e.target.value)}
                      className={inputClassName}
                      placeholder="Suite, unit, suburb"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>City</label>
                    <input
                      type="text"
                      value={profileForm.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className={inputClassName}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Province</label>
                    <input
                      type="text"
                      value={profileForm.address.province}
                      onChange={(e) => handleAddressChange('province', e.target.value)}
                      className={inputClassName}
                      placeholder="Province"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Postal Code</label>
                    <input
                      type="text"
                      value={profileForm.address.postal}
                      onChange={(e) => handleAddressChange('postal', e.target.value)}
                      className={inputClassName}
                      placeholder="Postal code"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Place ID</label>
                    <input
                      type="text"
                      value={profileForm.address.place_id}
                      onChange={(e) => handleAddressChange('place_id', e.target.value)}
                      className={inputClassName}
                      placeholder="Google place id"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Latitude</label>
                    <input
                      type="number"
                      value={profileForm.address.lat}
                      onChange={(e) => handleAddressChange('lat', e.target.value)}
                      className={inputClassName}
                      placeholder="-26.2041"
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>Longitude</label>
                    <input
                      type="number"
                      value={profileForm.address.lng}
                      onChange={(e) => handleAddressChange('lng', e.target.value)}
                      className={inputClassName}
                      placeholder="28.0473"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClassName}>Formatted Address</label>
                    <input
                      type="text"
                      value={profileForm.address.formatted_address}
                      onChange={(e) =>
                        handleAddressChange('formatted_address', e.target.value)
                      }
                      className={inputClassName}
                      placeholder="Google formatted address"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Map Preview</label>
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                    <div ref={mapContainerRef} className="h-[380px] w-full" />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    The map updates when you type, select a suggestion, or press the search icon.
                  </p>
                </div>
              </div>
            </section>

           <section className={sectionClassName}>
  <div className="border-b border-slate-200 px-6 py-5">
    <h2 className="text-lg font-bold text-slate-900">Payment Settings</h2>
    <p className="mt-1 text-sm text-slate-600">
      Enter consultation fee and booking deposit percentage only.
    </p>
  </div>

  <div className="space-y-6 px-6 py-6">
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div>
        <label className={labelClassName}>Consultation Fee</label>
        <input
          type="number"
          min="0"
          value={paymentForm.consultationFee}
          onChange={(e) =>
            setPaymentForm((prev) => ({
              ...prev,
              consultationFee: Number(e.target.value) || 0,
            }))
          }
          className={inputClassName}
          placeholder="Enter consultation fee"
        />
      </div>

      <div>
        <label className={labelClassName}>Booking Deposit Percentage</label>
        <input
          type="number"
          min="0"
          max="100"
          value={paymentForm.depositPercentage}
          onChange={(e) => {
            const value = Number(e.target.value) || 0;

            setPaymentForm((prev) => ({
              ...prev,
              depositPercentage: value > 100 ? 100 : value,
            }));
          }}
          className={inputClassName}
          placeholder="Enter deposit percentage"
        />
      </div>
    </div>

    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Deposit to pay during booking:
        <span className="ml-2 text-blue-700">
          R {Math.round((Number(paymentForm.consultationFee) * Number(paymentForm.depositPercentage)) / 100)}
        </span>
      </p>

      <p className="mt-2 text-sm text-slate-700">
        Remaining at medical center:
        <span className="ml-2 font-semibold text-slate-900">
          R {Math.max(
            Number(paymentForm.consultationFee) -
              Math.round((Number(paymentForm.consultationFee) * Number(paymentForm.depositPercentage)) / 100),
            0
          )}
        </span>
      </p>
    </div>
  </div>
</section>
          </div>

          <aside className="space-y-6">
            <section className={sectionClassName}>
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Bank Details</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Bank account for facility payouts.
                </p>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div>
                  <label className={labelClassName}>Bank Name</label>
                  <input
                    type="text"
                    value={bankForm.bank_name}
                    onChange={(e) => handleBankChange('bank_name', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Bank Code</label>
                  <input
                    type="text"
                    value={bankForm.bank_code}
                    onChange={(e) => handleBankChange('bank_code', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter bank code"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Account Number</label>
                  <input
                    type="text"
                    value={bankForm.account_number}
                    onChange={(e) => handleBankChange('account_number', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className={labelClassName}>Account Name</label>
                  <input
                    type="text"
                    value={bankForm.account_name}
                    onChange={(e) => handleBankChange('account_name', e.target.value)}
                    className={inputClassName}
                    placeholder="Enter account holder name"
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Quick Summary</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Overview before you save.
                </p>
              </div>

              <div className="space-y-3 px-6 py-6 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Facility</p>
                  <p className="mt-1">{profileForm.facility_name || 'Not set'}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Address</p>
                  <p className="mt-1 break-words">
                    {profileForm.address.formatted_address ||
                      profileForm.address.full_address ||
                      'No address selected yet'}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Payments</p>
                  <p className="mt-1">
                    {paymentForm.enablePayments ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                <button
  type="button"
  onClick={handleSaveAll}
  disabled={isSaving}
  className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
>
  {isSaving ? 'Saving...' : 'Save Changes'}
</button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}