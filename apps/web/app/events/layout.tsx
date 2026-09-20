'use client';

import AuthGuard from '../../components/AuthGuard';

export default function EventsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard>{children}</AuthGuard>;
}
