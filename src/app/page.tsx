import type { Metadata } from 'next';
import Link from 'next/link';
import PulseBackground from './(patient)/components/PulseBackground';

export const metadata: Metadata = {
  title: 'Book Doctor Appointments Online in South Africa | Medical Syndicate',
  description:
    'Medical Syndicate helps patients book doctor appointments online in South Africa, while medical centers manage appointments, branches, and healthcare operations more efficiently.',
  keywords: [
    'book doctor appointment online South Africa',
    'medical centers South Africa',
    'clinic booking system',
    'hospital appointment booking',
    'online healthcare booking South Africa',
    'doctor consultation booking',
    'medical center management system',
  ],
  openGraph: {
    title: 'Medical Syndicate | Book Doctor Appointments Online in South Africa',
    description:
      'Book doctor appointments online and help medical centers manage appointments and branches more efficiently.',
    url: 'https://medical-syndicate.com',
    siteName: 'Medical Syndicate',
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medical Syndicate | Book Doctor Appointments Online',
    description:
      'Book doctor appointments online in South Africa and help medical centers manage appointments smartly.',
  },
  alternates: {
    canonical: 'https://medical-syndicate.com',
  },
};

const features = [
  {
    color: 'bg-violet-500',
    title: '24/7 Access',
    desc: 'Access healthcare booking services anytime, from anywhere, on your phone or computer.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    color: 'bg-blue-500',
    title: 'Secure & Private',
    desc: 'Your information is handled with strong security and privacy-focused protection.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
  {
    color: 'bg-purple-500',
    title: 'Expert Network',
    desc: 'Connect with qualified doctors, practitioners, and trusted medical centers in one place.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0zM7 10a2 2 0 11-4 0 2 2 0z"
      />
    ),
  },
];

export default function MedicalLandingPage() {
  return (
    <>
      <PulseBackground />

      <main className="relative z-10 min-h-screen px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center text-center min-h-screen">
          <div className="w-full">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200 sm:text-sm">
              Online Healthcare Booking Platform
            </p>

            <h1 className="mb-4 break-words text-3xl font-extrabold leading-snug text-white sm:mb-6 sm:text-4xl sm:leading-tight md:text-5xl lg:text-7xl">
              Book Doctor Appointments Online with{' '}
              <span className="block bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent sm:inline">
                Medical Syndicate
              </span>
            </h1>

            <p className="mx-auto mb-6 max-w-3xl text-sm leading-relaxed text-violet-100 sm:mb-10 sm:text-lg md:text-xl">
              Medical Syndicate helps patients in South Africa book appointments at the medical
              center of their choice. Medical centers can manage appointments more efficiently,
              connect branches under one network, and improve the healthcare booking experience.
            </p>

            <div className="mx-2 mb-8 w-full max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-lg sm:mx-auto sm:mb-12 sm:p-8 lg:p-10">
              <p className="mb-6 text-sm text-violet-200 sm:text-base">
                Select your role to start using the platform
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap sm:gap-6">
                <Link
                  href="/createprofile"
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-500 hover:-translate-y-1 hover:from-violet-700 hover:to-purple-700 hover:shadow-2xl sm:w-auto sm:px-10 sm:py-4 sm:text-base"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Patient
                  </span>
                  <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </Link>

                <Link
                  href="/medical"
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-500 hover:-translate-y-1 hover:from-blue-600 hover:to-cyan-600 hover:shadow-2xl sm:w-auto sm:px-10 sm:py-4 sm:text-base"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Medical Center
                  </span>
                  <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </Link>

                <Link
                  href="/doctorLogin"
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-500 hover:-translate-y-1 hover:from-violet-700 hover:to-purple-700 hover:shadow-2xl sm:w-auto sm:px-10 sm:py-4 sm:text-base"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Doctor / Practitioner
                  </span>
                  <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </Link>
              </div>
            </div>

            <section
              aria-label="Platform benefits"
              className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, i) => (
                <article
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-white backdrop-blur-lg sm:p-6 sm:text-left"
                >
                  <div
                    className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg sm:mx-0 sm:mb-4 sm:h-12 sm:w-12 ${feature.color}`}
                  >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.icon}
                    </svg>
                  </div>
                  <h2 className="mb-2 text-lg font-semibold sm:text-xl">{feature.title}</h2>
                  <p className="text-sm text-violet-200 sm:text-base">{feature.desc}</p>
                </article>
              ))}
            </section>

            <section className="mx-auto mt-10 max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-violet-100 backdrop-blur-lg sm:p-8">
              <h2 className="mb-3 text-xl font-bold text-white sm:text-2xl">
                Healthcare booking made easier in South Africa
              </h2>
              <p className="text-sm leading-relaxed sm:text-base">
                Patients can use Medical Syndicate to find medical centers, choose appointments, and
                book care more easily online. Medical centers can use the same platform to organize
                appointments, improve patient flow, and manage branches under one connected system.
                This helps create a better healthcare experience for both patients and providers.
              </p>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}